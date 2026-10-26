import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: any = null;
const dbPath = path.resolve(process.cwd(), 'nexora_persistence.sqlite');

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('📦 Loaded existing SQLite database from disk.');
  } else {
    db = new SQL.Database();
    console.log('📦 Created new in-memory SQLite database instance.');
  }

  runMigrations();
  saveDatabaseToDisk();
}

function runMigrations() {
  if (!db) return;

  const migrationQueries = [
    `CREATE TABLE IF NOT EXISTS agent_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT UNIQUE NOT NULL,
      agent_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      timezone TEXT NOT NULL,
      source TEXT NOT NULL,
      model_requested TEXT NOT NULL,
      model_used TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      estimated_cost_usd REAL NOT NULL,
      validation_status TEXT NOT NULL,
      human_approval_status TEXT NOT NULL,
      errors_json TEXT,
      contract_json TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS agent_health (
      agent_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      total_runs INTEGER DEFAULT 0,
      successful_runs INTEGER DEFAULT 0,
      failed_runs INTEGER DEFAULT 0,
      avg_latency_ms INTEGER DEFAULT 0,
      last_successful_run TEXT,
      last_error TEXT,
      total_tokens INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0.0,
      last_model_used TEXT,
      last_validation TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS approval_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      decision TEXT NOT NULL, -- 'APPROVE' or 'REJECT'
      editor_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      notes TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS publication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      channel TEXT NOT NULL, -- 'TELEGRAM_PUBLIC', 'LINKEDIN', 'NOTION'
      payload_json TEXT NOT NULL,
      published_at TEXT NOT NULL,
      status TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS api_error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      agent_id TEXT,
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      timestamp TEXT NOT NULL
    );`
  ];

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const query of migrationQueries) {
      db.exec(query);
    }
    db.exec('COMMIT;');
    console.log('✅ SQLite migrations successfully executed for all 5 tables.');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

export function saveDatabaseToDisk() {
  if (!db) throw new Error('DATABASE_UNAVAILABLE');
  const temporary = dbPath + '.tmp';
  try {
    fs.writeFileSync(temporary, Buffer.from(db.export()), { mode: 0o600, flush: true });
    fs.renameSync(temporary, dbPath);
  } catch {
    // Fail closed until restart reloads the last durable snapshot.
    db.close(); db = null;
    throw new Error('DATABASE_PERSISTENCE_FAILED');
  }
}

export function getDb() {
  return db;
}
