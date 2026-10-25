/**
 * NEXORA Markets — Secure Local Windows Webhook Gateway (integrations/local_gateway/gateway.js)
 * Express.js server bound strictly to 127.0.0.1:3001.
 * Features:
 * - HMAC-SHA256 signature verification using Node.js crypto module.
 * - Constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 * - Proper error handling and HTTP status codes (401 Unauthorized, 403 Forbidden, 500 Internal Error, 502 Bad Gateway).
 * - SQLite persistence for nonce replay protection and idempotency.
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

// Enforce secure HMAC secret from environment variables
if (!SHARED_SECRET || SHARED_SECRET.length < 16) {
  console.error('❌ FATAL: N8N_WEBHOOK_SECRET must be set in environment variables (minimum 16 characters).');
  process.exit(1);
}

// Payload size limit (5MB)
app.use(express.json({ limit: '5mb' }));

// SQLite persistence store for nonces and idempotency
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
    CREATE TABLE IF NOT EXISTS idempotency (run_id TEXT PRIMARY KEY, created_at TEXT);
  `);
  saveDb();
  console.log('🔒 Gateway SQLite persistence initialized.');
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

// Secure Webhook Publication Endpoint
app.post('/gateway/publish', async (req, res) => {
  try {
    const signature = req.headers['x-nexora-signature'];
    const timestamp = req.headers['x-nexora-timestamp'];
    const nonce = req.headers['x-nexora-nonce'];
    const rawBody = JSON.stringify(req.body);

    // 401 Unauthorized: Missing security headers
    if (!signature || !timestamp || !nonce) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing required security headers (X-NEXORA-Signature, X-NEXORA-Timestamp, X-NEXORA-Nonce)'
      });
    }

    const parsedTimestamp = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    // 401 Unauthorized: Expired timestamp (> 300 seconds replay protection)
    if (isNaN(parsedTimestamp) || Math.abs(now - parsedTimestamp) > 300) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Request timestamp expired or invalid (Replay protection)'
      });
    }

    // 403 Forbidden: Nonce replay check
    if (db) {
      const checkNonce = db.exec(`SELECT nonce FROM nonces WHERE nonce = '${nonce.replace(/'/g, "''")}';`);
      if (checkNonce.length > 0 && checkNonce[0].values.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Nonce already used (Replay attack detected)'
        });
      }
    }

    // Canonical HMAC-SHA256 string: "<timestamp>.<nonce>.<rawBody>"
    const canonicalString = `${timestamp}.${nonce}.${rawBody}`;
    const computedSignature = crypto
      .createHmac('sha256', SHARED_SECRET)
      .update(canonicalString, 'utf8')
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const compBuffer = Buffer.from(computedSignature, 'hex');

    // 403 Forbidden: Constant-time signature comparison (crypto.timingSafeEqual)
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

    // 403 Forbidden: Require human approval
    if (human_approval_status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Publication blocked. human_approval_status must be 'APPROVED' (got '${human_approval_status}').`
      });
    }

    // Idempotency check
    if (db) {
      const checkIdem = db.exec(`SELECT run_id FROM idempotency WHERE run_id = '${runId.replace(/'/g, "''")}';`);
      if (checkIdem.length > 0 && checkIdem[0].values.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request (Idempotency): This run_id has already been successfully published.'
        });
      }
    }

    // Record Nonce and Idempotency key in SQLite
    if (db) {
      db.run(`INSERT INTO nonces (nonce, timestamp) VALUES (?, ?);`, [nonce, parsedTimestamp]);
      db.run(`INSERT INTO idempotency (run_id, created_at) VALUES (?, ?);`, [runId, new Date().toISOString()]);
      saveDb();
    }

    // Forward to local n8n instance
    const n8nRes = await fetch(N8N_TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody,
    });

    const n8nData = await n8nRes.json().catch(() => ({ status: 'forwarded' }));

    return res.json({
      success: true,
      gateway_status: 'PUBLISHED_VIA_LOCAL_N8N',
      run_id: runId,
      n8n_response: n8nData,
    });

  } catch (err) {
    // 500 Internal Server Error / 502 Bad Gateway
    console.error('[Gateway Error]', err);
    return res.status(502).json({
      success: false,
      error: `Gateway Error: Failed to reach local n8n or internal failure: ${err.message}`
    });
  }
});

app.get('/gateway/health', (req, res) => {
  res.json({ status: 'secure_gateway_online', target: N8N_TARGET_URL, timestamp: new Date().toISOString() });
});

// Bind strictly to 127.0.0.1
app.listen(PORT, BIND_IP, () => {
  console.log(`🔒 NEXORA Secure Local Webhook Gateway listening strictly on http://${BIND_IP}:${PORT}`);
});
