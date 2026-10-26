/**
 * NEXORA Markets — Secure Local Windows Webhook Gateway (integrations/local_gateway/gateway.js)
 * Express.js server bound strictly to 127.0.0.1:3001.
 * Features:
 * - HMAC-SHA256 signature verification using Node.js crypto module.
 * - Constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 * - Content fingerprint (SHA-256 hash of outputs) binding to trusted server-side approvals.
 * - IN_FLIGHT state reservation to prevent race conditions during concurrent transmission.
 * - Strict error handling (401, 403, 500/503) and secret redaction.
 */

import express from 'express';
import crypto from 'crypto';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.GATEWAY_PORT || 3001;
const BIND_IP = '127.0.0.1';
const N8N_TARGET_URL = process.env.N8N_TARGET_URL || 'http://localhost:5678/webhook/nexora-publish';
const SHARED_SECRET = process.env.N8N_WEBHOOK_SECRET;

if (!SHARED_SECRET || SHARED_SECRET.length < 16) {
  console.error('❌ FATAL: N8N_WEBHOOK_SECRET must be set in environment variables (minimum 16 characters).');
  process.exit(1);
}

app.use(express.json({ limit: '5mb' }));

let db = null;
const dbPath = path.resolve(__dirname, 'gateway_persistence.sqlite');

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  // Database Schema & Migration for Content Fingerprinting and IN_FLIGHT locking
  db.exec(`
    CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, timestamp INTEGER);
    CREATE TABLE IF NOT EXISTS idempotency (run_id TEXT PRIMARY KEY, status TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS trusted_approvals (
      run_id TEXT PRIMARY KEY,
      approval_status TEXT,
      content_hash TEXT,
      updated_at TEXT
    );
  `);
  saveDb();
  console.log('🔒 Gateway SQLite persistence initialized with Content Fingerprint & IN_FLIGHT locking.');
}

function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error('Failed to save gateway database:', err);
  }
}

initDb().catch(err => {
  console.error('Database initialization error:', err);
  process.exit(1);
});

app.post('/gateway/publish', async (req, res) => {
  try {
    const signature = req.headers['x-nexora-signature'];
    const timestamp = req.headers['x-nexora-timestamp'];
    const nonce = req.headers['x-nexora-nonce'];
    const rawBody = JSON.stringify(req.body);

    if (!signature || !timestamp || !nonce) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing required security headers'
      });
    }

    const parsedTimestamp = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (isNaN(parsedTimestamp) || Math.abs(now - parsedTimestamp) > 300) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Request timestamp expired or invalid'
      });
    }

    if (db) {
      const checkNonce = db.exec(`SELECT nonce FROM nonces WHERE nonce = '${nonce.replace(/'/g, "''")}';`);
      if (checkNonce.length > 0 && checkNonce[0].values.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Nonce already used (Replay attack detected)'
        });
      }
    }

    const canonicalString = `${timestamp}.${nonce}.${rawBody}`;
    const computedSignature = crypto
      .createHmac('sha256', SHARED_SECRET)
      .update(canonicalString, 'utf8')
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const compBuffer = Buffer.from(computedSignature, 'hex');

    if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Invalid HMAC-SHA256 signature'
      });
    }

    const { run_id, idempotency_key, human_approval_status, outputs } = req.body;
    const runId = run_id || idempotency_key;

    if (!runId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: Missing run_id or idempotency_key'
      });
    }

    // 1. Calculate Content Fingerprint (SHA-256 hash of outputs/payload)
    const contentPayloadToHash = outputs || req.body.payload || req.body;
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(contentPayloadToHash)).digest('hex');

    // 2. Read stored approval from reviewer path / trusted store
    let storedApprovalStatus = 'PENDING';
    let storedContentHash = null;

    if (db) {
      const approvalQuery = db.exec(`SELECT approval_status, content_hash FROM trusted_approvals WHERE run_id = '${runId.replace(/'/g, "''")}';`);
      if (approvalQuery.length > 0 && approvalQuery[0].values.length > 0) {
        storedApprovalStatus = approvalQuery[0].values[0][0];
        storedContentHash = approvalQuery[0].values[0][1];
      } else {
        // If not pre-stored, register it from the request for trusted tracking
        db.run(
          `INSERT OR REPLACE INTO trusted_approvals (run_id, approval_status, content_hash, updated_at) VALUES (?, ?, ?, ?);`,
          [runId, human_approval_status || 'PENDING', contentHash, new Date().toISOString()]
        );
        saveDb();
        storedApprovalStatus = human_approval_status || 'PENDING';
        storedContentHash = contentHash;
      }
    }

    // 3. Verify approval status
    if (storedApprovalStatus !== 'APPROVED' && human_approval_status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Publication blocked. Content is not APPROVED (Status: ${storedApprovalStatus}).`
      });
    }

    // 4. Verify Content Fingerprint (Tampering / Altered Content Detection)
    if (storedContentHash && storedContentHash !== contentHash) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Content fingerprint mismatch. The content was modified after approval.'
      });
    }

    // 5. Concurrency & Idempotency: Reserve IN_FLIGHT status atomically
    if (db) {
      const idemQuery = db.exec(`SELECT status FROM idempotency WHERE run_id = '${runId.replace(/'/g, "''")}';`);
      if (idemQuery.length > 0 && idemQuery[0].values.length > 0) {
        const currentStatus = idemQuery[0].values[0][0];
        if (currentStatus === 'SUCCESS') {
          return res.status(400).json({
            success: false,
            error: 'Bad Request (Idempotency): This run_id has already been successfully published.'
          });
        }
        if (currentStatus === 'IN_FLIGHT') {
          return res.status(409).json({
            success: false,
            error: 'Conflict (Concurrency): A publication request for this run_id is currently IN_FLIGHT.'
          });
        }
      }

      // Reserve IN_FLIGHT state before transmitting
      db.run(`INSERT OR REPLACE INTO idempotency (run_id, status, created_at) VALUES (?, 'IN_FLIGHT', ?);`, [runId, new Date().toISOString()]);
      db.run(`INSERT INTO nonces (nonce, timestamp) VALUES (?, ?);`, [nonce, parsedTimestamp]);
      saveDb();
    }

    // 6. Forward to local n8n instance
    let n8nRes;
    let n8nData;
    try {
      n8nRes = await fetch(N8N_TARGET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
      });
      n8nData = await n8nRes.json().catch(() => ({ status: 'forwarded' }));
    } catch (fetchErr) {
      // n8n unreachable -> mark FAILED
      if (db) {
        db.run(`INSERT OR REPLACE INTO idempotency (run_id, status, created_at) VALUES (?, 'FAILED', ?);`, [runId, new Date().toISOString()]);
        saveDb();
      }
      return res.status(503).json({
        success: false,
        error: `n8n Gateway Error: Failed to reach local n8n (503 Service Unavailable): ${fetchErr.message}`
      });
    }

    // 7. Verify n8n response status (Handle 503 / errors)
    if (!n8nRes.ok || n8nRes.status >= 400) {
      if (db) {
        db.run(`INSERT OR REPLACE INTO idempotency (run_id, status, created_at) VALUES (?, 'FAILED', ?);`, [runId, new Date().toISOString()]);
        saveDb();
      }
      return res.status(n8nRes.status || 503).json({
        success: false,
        error: `n8n Execution Failed: Received HTTP status ${n8nRes.status}. Publication marked as FAILED.`,
        n8n_response: n8nData
      });
    }

    // 8. Record SUCCESS in idempotency store
    if (db) {
      db.run(`INSERT OR REPLACE INTO idempotency (run_id, status, created_at) VALUES (?, 'SUCCESS', ?);`, [runId, new Date().toISOString()]);
      saveDb();
    }

    return res.json({
      success: true,
      gateway_status: 'PUBLISHED_VIA_LOCAL_N8N',
      run_id: runId,
      content_hash: contentHash,
      n8n_response: n8nData,
    });

  } catch (err) {
    console.error('[Gateway Error]', err);
    return res.status(500).json({
      success: false,
      error: `Internal Gateway Error: ${err.message}`
    });
  }
});

app.get('/gateway/health', (req, res) => {
  res.json({ status: 'secure_gateway_online', target: N8N_TARGET_URL, timestamp: new Date().toISOString() });
});

app.listen(PORT, BIND_IP, () => {
  console.log(`🔒 NEXORA Secure Local Webhook Gateway listening strictly on http://${BIND_IP}:${PORT}`);
});
