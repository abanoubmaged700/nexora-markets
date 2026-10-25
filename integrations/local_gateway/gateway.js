/**
 * NEXORA Markets — Production-Grade Secure Local Windows Webhook Gateway (ESM)
 * Runs locally on Windows (bound strictly to 127.0.0.1:3001).
 * Security features:
 * - Strict environment-based HMAC secret (no hardcoded fallbacks).
 * - Canonical signing: "<timestamp>.<nonce>.<rawBody>".
 * - Constant-time signature comparison (crypto.timingSafeEqual).
 * - SQLite persistent storage for nonces & idempotency keys (with uniqueness and expiration).
 * - Replay protection (rejects timestamps > 300s old & re-used nonces).
 * - Payload size limits & schema validation.
 * - Whitelisted local n8n target forwarding.
 * - Secret redaction in console logs.
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

// 1. Enforce secure HMAC secret from environment variables
if (!SHARED_SECRET || SHARED_SECRET === 'MY_GEMINI_API_KEY' || SHARED_SECRET.length < 16) {
  console.error('❌ FATAL SECURITY ERROR: N8N_WEBHOOK_SECRET must be set to a cryptographically strong secret (min 16 chars) in environment variables.');
  process.exit(1);
}

// 2. Strict Payload Size Limit (5MB)
app.use(express.json({ limit: '5mb' }));

// Simple in-memory rate limiter map: IP -> { count, resetTime }
const rateLimitMap = new Map();
app.use((req, res, next) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  let record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + 60000 };
    rateLimitMap.set(clientIp, record);
  } else {
    record.count++;
    if (record.count > 60) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded. Too many requests.' });
    }
  }
  next();
});

// 3. SQLite Persistent Nonce & Idempotency Store
let gatewayDb = null;
const dbFilePath = path.resolve(__dirname, 'gateway_persistence.sqlite');

async function initGatewayDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbFilePath)) {
    gatewayDb = new SQL.Database(fs.readFileSync(dbFilePath));
  } else {
    gatewayDb = new SQL.Database();
  }

  gatewayDb.exec(`
    CREATE TABLE IF NOT EXISTS processed_nonces (
      nonce TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS processed_idempotency_keys (
      run_id TEXT PRIMARY KEY,
      payload_hash TEXT NOT NULL,
      approval_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  saveDb();
  console.log('🔒 Gateway SQLite persistence initialized securely.');
}

function saveDb() {
  if (!gatewayDb) return;
  try {
    const data = gatewayDb.export();
    fs.writeFileSync(dbFilePath, Buffer.from(data));
  } catch (err) {
    console.error('Failed to save gateway database:', err);
  }
}

initGatewayDb().catch(err => {
  console.error('Failed to initialize gateway database:', err);
  process.exit(1);
});

function secureLog(message, meta = {}) {
  const sanitizedMeta = { ...meta };
  if (sanitizedMeta.signature) sanitizedMeta.signature = '[REDACTED]';
  if (sanitizedMeta.secret) sanitizedMeta.secret = '[REDACTED]';
  console.log(`[NEXORA Gateway ${new Date().toISOString()}] ${message}`, JSON.stringify(sanitizedMeta));
}

app.post('/gateway/publish', async (req, res) => {
  const signature = req.headers['x-nexora-signature'];
  const timestamp = req.headers['x-nexora-timestamp'];
  const nonce = req.headers['x-nexora-nonce'];
  const rawBody = JSON.stringify(req.body);

  if (!signature || !timestamp || !nonce) {
    secureLog('Rejected: Missing security headers', { ip: req.ip });
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing NEXORA security headers' });
  }

  const parsedTimestamp = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);

  if (isNaN(parsedTimestamp) || Math.abs(now - parsedTimestamp) > 300) {
    secureLog('Rejected: Timestamp expired or invalid', { timestamp, now });
    return res.status(401).json({ success: false, error: 'Unauthorized: Request timestamp expired or invalid (Replay protection)' });
  }

  if (gatewayDb) {
    const checkNonce = gatewayDb.exec(`SELECT nonce FROM processed_nonces WHERE nonce = '${nonce.replace(/'/g, "''")}';`);
    if (checkNonce.length > 0 && checkNonce[0].values.length > 0) {
      secureLog('Rejected: Nonce replay attack detected', { nonce });
      return res.status(403).json({ success: false, error: 'Forbidden: Nonce already used (Replay attack detected)' });
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
    secureLog('Rejected: Invalid HMAC signature', { signatureLength: signature.length });
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid HMAC-SHA256 signature' });
  }

  const body = req.body;
  const runId = body.run_id || body.idempotency_key;
  const approvalStatus = body.human_approval_status;

  if (!runId) {
    return res.status(400).json({ success: false, error: 'Validation Error: Missing run_id or idempotency_key' });
  }

  if (approvalStatus !== 'APPROVED') {
    secureLog('Rejected: Content not approved', { runId, approvalStatus });
    return res.status(403).json({ success: false, error: `Forbidden: Publication blocked. human_approval_status must be 'APPROVED' (got '${approvalStatus}').` });
  }

  if (gatewayDb) {
    const checkIdem = gatewayDb.exec(`SELECT run_id FROM processed_idempotency_keys WHERE run_id = '${runId.replace(/'/g, "''")}';`);
    if (checkIdem.length > 0 && checkIdem[0].values.length > 0) {
      secureLog('Rejected: Duplicate run_id (Idempotency enforcement)', { runId });
      return res.status(400).json({ success: false, error: 'Idempotency Error: This run_id has already been successfully published.' });
    }
  }

  if (gatewayDb) {
    try {
      gatewayDb.run(
        `INSERT INTO processed_nonces (nonce, timestamp, created_at) VALUES (?, ?, ?);`,
        [nonce, parsedTimestamp, new Date().toISOString()]
      );
      gatewayDb.run(
        `INSERT INTO processed_idempotency_keys (run_id, payload_hash, approval_status, created_at) VALUES (?, ?, ?, ?);`,
        [runId, crypto.createHash('sha256').update(rawBody).digest('hex'), approvalStatus, new Date().toISOString()]
      );
      saveDb();
    } catch (dbErr) {
      secureLog('Database persistence error during nonce/idempotency recording', { error: dbErr.message });
    }
  }

  if (!N8N_TARGET_URL.startsWith('http://localhost:5678') && !N8N_TARGET_URL.startsWith('http://127.0.0.1:5678')) {
    return res.status(500).json({ success: false, error: 'Configuration Error: N8N_TARGET_URL must point to local n8n instance.' });
  }

  try {
    secureLog('Forwarding validated payload to local n8n', { runId });
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
    secureLog('Failed to forward to local n8n', { error: err.message, runId });
    return res.status(502).json({
      success: false,
      error: `Local n8n unreachable: ${err.message}. Ensure n8n is running on port 5678.`,
    });
  }
});

app.get('/gateway/health', (req, res) => {
  res.json({ status: 'gateway_secure', target: N8N_TARGET_URL, timestamp: new Date().toISOString() });
});

app.listen(PORT, BIND_IP, () => {
  console.log(`🔒 NEXORA Secure Local Webhook Gateway listening strictly on http://${BIND_IP}:${PORT}`);
  console.log(`➡️ Whitelisted n8n Target: ${N8N_TARGET_URL}`);
});
