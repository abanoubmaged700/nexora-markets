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
const APPROVAL_SECRET = process.env.NEXORA_APPROVAL_SIGNING_SECRET;

function equalHex(supplied, expected) {
  return typeof supplied === 'string' && /^[a-f0-9]{64}$/.test(supplied) &&
    crypto.timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'));
}

function validApprovalReceipt(receipt, runId, contentHash) {
  if (typeof receipt !== 'string') return false;
  const parts = receipt.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0])) return false;
  const expected = crypto.createHmac('sha256', APPROVAL_SECRET).update(parts[0]).digest('hex');
  if (!equalHex(parts[1], expected)) return false;
  try {
    const proof = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return proof.run_id === runId && proof.content_hash === contentHash && proof.decision === 'APPROVE';
  } catch { return false; }
}

if (!SHARED_SECRET || SHARED_SECRET.length < 32 || !APPROVAL_SECRET || APPROVAL_SECRET.length < 32) {
  console.error('FATAL: both gateway secrets must have at least 32 characters.');
  process.exit(1);
}

app.use(express.json({ limit: '256kb', verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); } }));

let db = null;
const dbPath = path.resolve(process.env.GATEWAY_DB_PATH || path.join(__dirname, 'gateway_persistence.sqlite'));

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
  `);
  const idempotencyColumns = db.exec('PRAGMA table_info(idempotency)')[0].values.map(row => row[1]);
  if (!idempotencyColumns.includes('status')) db.exec('ALTER TABLE idempotency ADD COLUMN status TEXT');
  db.run("UPDATE idempotency SET status = 'UNKNOWN' WHERE status IS NULL OR status = ''");
  saveDb();
  console.log('🔒 Gateway SQLite persistence initialized with Content Fingerprint & IN_FLIGHT locking.');
}

function saveDb() {
  if (!db) throw new Error('DATABASE_UNAVAILABLE');
  const temporary = dbPath + '.tmp';
  try {
    fs.writeFileSync(temporary, Buffer.from(db.export()));
    fs.renameSync(temporary, dbPath);
  } catch (err) {
    try { fs.rmSync(temporary, { force: true }); } catch { /* preserve original failure */ }
    throw err;
  }
}

app.post('/gateway/publish', async (req, res) => {
  let reservationTransaction = false;
  try {
    const signature = req.headers['x-nexora-signature'];
    const timestamp = req.headers['x-nexora-timestamp'];
    const nonce = req.headers['x-nexora-nonce'];
    const rawBody = req.rawBody;

    if (!signature || typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp) ||
        typeof nonce !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || !rawBody) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing required security headers'
      });
    }

    const parsedTimestamp = Number(timestamp);
    const now = Math.floor(Date.now() / 1000);

    if (isNaN(parsedTimestamp) || Math.abs(now - parsedTimestamp) > 300) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Request timestamp expired or invalid'
      });
    }

    const canonicalString = `${timestamp}.${nonce}.${rawBody}`;
    const computedSignature = crypto
      .createHmac('sha256', SHARED_SECRET)
      .update(canonicalString, 'utf8')
      .digest('hex');

    if (!equalHex(signature, computedSignature)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Invalid HMAC-SHA256 signature'
      });
    }

    const { run_id: runId, outputs, approval_receipt: receipt } = req.body;

    if (typeof runId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(runId) ||
        !outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD'
      });
    }

    // 1. Calculate Content Fingerprint (SHA-256 hash of outputs/payload)
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(outputs)).digest('hex');

    // The review server signs this receipt only after persisting a real reviewer decision.
    // Caller-supplied approval status and the old self-populated local table are ignored.
    if (!validApprovalReceipt(receipt, runId, contentHash)) {
      return res.status(403).json({ success: false, error: 'APPROVAL_PROOF_REQUIRED' });
    }

    // 5. Concurrency & Idempotency: Reserve IN_FLIGHT status atomically
    if (!db) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
    {
      db.run('BEGIN IMMEDIATE'); reservationTransaction = true;
      const nonceQuery = db.exec('SELECT nonce FROM nonces WHERE nonce = ?', [nonce]);
      if (nonceQuery.length > 0 && nonceQuery[0].values.length > 0) {
        db.run('ROLLBACK'); reservationTransaction = false;
        return res.status(409).json({ success: false, error: 'NONCE_REPLAY' });
      }
      const idemQuery = db.exec('SELECT status FROM idempotency WHERE run_id = ?', [runId]);
      if (idemQuery.length > 0 && idemQuery[0].values.length > 0) {
        const currentStatus = idemQuery[0].values[0][0];
        db.run('ROLLBACK'); reservationTransaction = false;
        return res.status(409).json({ success: false, error: 'DELIVERY_ALREADY_RESERVED', state: currentStatus });
      }

      // Reserve IN_FLIGHT state before transmitting
      db.run(`INSERT INTO idempotency (run_id, status, created_at) VALUES (?, 'IN_FLIGHT', ?);`, [runId, new Date().toISOString()]);
      db.run(`INSERT INTO nonces (nonce, timestamp) VALUES (?, ?);`, [nonce, parsedTimestamp]);
      db.run('COMMIT'); reservationTransaction = false;
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
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      n8nData = await n8nRes.json().catch(() => null);
    } catch (fetchErr) {
      // A lost response may follow a successful send. The durable reservation
      // blocks automatic retries until the operator reconciles delivery.
      return res.status(502).json({ success: false, error: 'DELIVERY_UNCONFIRMED', state: 'IN_FLIGHT' });
    }

    // 7. Verify n8n response status (Handle 503 / errors)
    if (!n8nRes.ok || n8nRes.status >= 400) {
      return res.status(502).json({ success: false, error: 'DOWNSTREAM_ERROR', downstream_status: n8nRes.status, state: 'IN_FLIGHT' });
    }

    if (n8nData?.publication_status !== 'PUBLISHED' || n8nData?.run_id !== runId ||
        !Number.isSafeInteger(n8nData?.telegram_message_id) || n8nData.telegram_message_id <= 0) {
      return res.status(502).json({ success: false, error: 'DELIVERY_UNCONFIRMED', state: 'IN_FLIGHT' });
    }

    // 8. Record SUCCESS in idempotency store
    if (db) {
      db.run("UPDATE idempotency SET status = 'SUCCESS' WHERE run_id = ? AND status = 'IN_FLIGHT'", [runId]);
      saveDb();
    }

    return res.json({
      success: true,
      gateway_status: 'PUBLISHED',
      run_id: runId,
      content_hash: contentHash,
      telegram_message_id: n8nData.telegram_message_id,
    });

  } catch (err) {
    if (reservationTransaction) try { db.run('ROLLBACK'); } catch { /* keep original failure */ }
    console.error('[Gateway Error]', err?.name || 'Error');
    return res.status(503).json({ success: false, error: 'GATEWAY_UNAVAILABLE' });
  }
});

app.get('/gateway/health', (req, res) => {
  res.json({ status: 'ready' });
});

initDb().then(() => app.listen(PORT, BIND_IP, () => {
  console.log(`NEXORA local gateway listening on http://${BIND_IP}:${PORT}`);
})).catch(err => { console.error('Gateway database initialization failed:', err); process.exitCode = 1; });
