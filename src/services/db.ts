/**
 * NEXORA Markets — Gateway SQLite Service Layer (src/services/db.ts)
 * Manages SQLite interactions for gateway nonces, expiration policies,
 * idempotency checks, and trusted server-side approvals with content fingerprint binding.
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: any = null;
const dbPath = path.resolve(process.cwd(), 'nexora_gateway_service.sqlite');

export async function initGatewayServiceDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS service_nonces (
      nonce TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_idempotency (
      run_id TEXT PRIMARY KEY,
      status TEXT NOT NULL, -- 'IN_FLIGHT', 'SUCCESS', 'FAILED'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_trusted_approvals (
      run_id TEXT PRIMARY KEY,
      approval_status TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  saveServiceDb();
  console.log('📦 Gateway Service Layer SQLite database initialized successfully.');
  return db;
}

function saveServiceDb() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error('Failed to save service database to disk:', err);
  }
}

/**
 * Checks if a nonce has been used or expired. If valid, stores it with an expiration time (e.g. 5 minutes).
 */
export function checkAndStoreNonce(nonce: string, timestamp: number, ttlSeconds: number = 300): { isValid: boolean; reason?: string } {
  if (!db) return { isValid: false, reason: 'Database not initialized' };

  const now = Math.floor(Date.now() / 1000);

  // Cleanup expired nonces first
  db.run(`DELETE FROM service_nonces WHERE expires_at < ?;`, [now]);

  // Check if nonce exists
  const res = db.exec(`SELECT nonce FROM service_nonces WHERE nonce = '${nonce.replace(/'/g, "''")}';`);
  if (res.length > 0 && res[0].values.length > 0) {
    return { isValid: false, reason: 'Nonce already used (Replay attack detected)' };
  }

  const expiresAt = timestamp + ttlSeconds;
  db.run(
    `INSERT INTO service_nonces (nonce, timestamp, expires_at, created_at) VALUES (?, ?, ?, ?);`,
    [nonce, timestamp, expiresAt, new Date().toISOString()]
  );
  saveServiceDb();

  return { isValid: true };
}

/**
 * Manages idempotency state (IN_FLIGHT, SUCCESS, FAILED).
 */
export function checkAndReserveIdempotency(runId: string): { status: 'ALLOWED' | 'ALREADY_SUCCESS' | 'IN_FLIGHT'; error?: string } {
  if (!db) return { status: 'ALLOWED' };

  const res = db.exec(`SELECT status FROM service_idempotency WHERE run_id = '${runId.replace(/'/g, "''")}';`);
  if (res.length > 0 && res[0].values.length > 0) {
    const currentStatus = res[0].values[0][0];
    if (currentStatus === 'SUCCESS') {
      return { status: 'ALREADY_SUCCESS', error: 'This run_id has already been successfully published.' };
    }
    if (currentStatus === 'IN_FLIGHT') {
      return { status: 'IN_FLIGHT', error: 'A publication request for this run_id is currently IN_FLIGHT.' };
    }
  }

  const nowIso = new Date().toISOString();
  db.run(
    `INSERT OR REPLACE INTO service_idempotency (run_id, status, created_at, updated_at) VALUES (?, 'IN_FLIGHT', ?, ?);`,
    [runId, nowIso, nowIso]
  );
  saveServiceDb();

  return { status: 'ALLOWED' };
}

export function updateIdempotencyStatus(runId: string, status: 'SUCCESS' | 'FAILED') {
  if (!db) return;
  const nowIso = new Date().toISOString();
  db.run(
    `UPDATE service_idempotency SET status = ?, updated_at = ? WHERE run_id = ?;`,
    [status, nowIso, runId]
  );
  saveServiceDb();
}

/**
 * Manages trusted approvals bound to content fingerprints.
 */
export function registerTrustedApproval(runId: string, approvalStatus: string, contentHash: string) {
  if (!db) return;
  db.run(
    `INSERT OR REPLACE INTO service_trusted_approvals (run_id, approval_status, content_hash, updated_at) VALUES (?, ?, ?, ?);`,
    [runId, approvalStatus, contentHash, new Date().toISOString()]
  );
  saveServiceDb();
}

export function verifyTrustedApproval(runId: string, contentHash: string): { isApproved: boolean; reason?: string } {
  if (!db) return { isApproved: false, reason: 'Database not initialized' };

  const res = db.exec(`SELECT approval_status, content_hash FROM service_trusted_approvals WHERE run_id = '${runId.replace(/'/g, "''")}';`);
  if (res.length === 0 || res[0].values.length === 0) {
    return { isApproved: false, reason: 'No approval record found for this run_id.' };
  }

  const [approvalStatus, storedHash] = res[0].values[0];

  if (approvalStatus !== 'APPROVED') {
    return { isApproved: false, reason: `Content is not approved (Status: ${approvalStatus})` };
  }

  if (storedHash !== contentHash) {
    return { isApproved: false, reason: 'Content fingerprint mismatch. The content was modified after approval.' };
  }

  return { isApproved: true };
}
