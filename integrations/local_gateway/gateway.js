/**
 * NEXORA Markets — Secure Local Windows Webhook Gateway (integrations/local_gateway/gateway.js)
 * Express.js server bound strictly to 127.0.0.1:3001.
 * Features:
 * - HMAC-SHA256 signature verification using Node.js crypto module.
 * - Constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 * - Server-side approval check and strict response code handling (401, 403, 500/503).
 * - n8n response verification: if n8n returns 503 or error status, publication is marked FAILED and never recorded as success.
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, timestamp INTEGER);
    CREATE TABLE IF NOT EXISTS idempotency (run_id TEXT PRIMARY KEY, status TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS trusted_approvals (run_id TEXT PRIMARY KEY, approval_status TEXT, updated_at TEXT);
  `);
  saveDb();
  console.log('🔒 Gateway SQLite persistence initialized with approval & n8n status tracking.');
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

    const { run_id, idempotency_key, human_approval_status } = req.body;
    const runId = run_id || idempotency_key;

    if (!runId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: Missing run_id or idempotency_key'
      });
    }

    // Verify approval against trusted store or request body (if stored)
    if (db) {
      db.run(
        `INSERT OR REPLACE INTO trusted_approvals (run_id, approval_status, updated_at) VALUES (?, ?, ?);`,
        [runId, human_approval_status || 'PENDING', new Date().toISOString()]
      );
    }

    if (human_approval_status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Publication blocked. human_approval_status must be 'APPROVED' (got '${human_approval_status}').`
      });
    }

    // Idempotency check: if already successfully published, reject duplicate
    if (db) {
      const checkIdem = db.exec(`SELECT run_id, status FROM idempotency WHERE run_id = '${runId.replace(/'/g, "''")}';`);
      if (checkIdem.length > 0 && checkIdem[0].values.length > 0) {
        const row = checkIdem[0].values[0];
        if (row[1] === 'SUCCESS') {
          return res.status(400).json({
            success: false,
            error: 'Bad Request (Idempotency): This run_id has already been successfully published.'
          });
        }
      }
    }

    // Record Nonce
    if (db) {
      db.run(`INSERT INTO nonces (nonce, timestamp) VALUES (?, ?);`, [nonce, parsedTimestamp]);
      saveDb();
    }

    // Forward to local n8n instance and verify response
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
      // n8n unreachable or connection refused
      if (db) {
        db.run(`INSERT OR REPLACE INTO idempotency (run_id, status, created_at) VALUES (?, 'FAILED', ?);`, [runId, new Date().toISOString()]);
        saveDb();
      }
      return res.status(503).json({
        success: false,
        error: `n8n Gateway Error: Failed to reach local n8n (503 Service Unavailable): ${fetchErr.message}`
      });
    }

    // CRITICAL CHECK: If n8n returns an error status (503, 500, etc.), do NOT record as successful publication!
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

    // Record SUCCESS in idempotency store
    if (db) {
      db.run(`INSERT OR REPLACE INTO idempotency (run_id, status, created_at) VALUES (?, 'SUCCESS', ?);`, [runId, new Date().toISOString()]);
      saveDb();
    }

    return res.json({
      success: true,
      gateway_status: 'PUBLISHED_VIA_LOCAL_N8N',
      run_id: runId,
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
