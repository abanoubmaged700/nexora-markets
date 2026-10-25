-- ============================================================================
-- NEXORA Markets Production Database Migration (SQLite 3 / WAL Mode)
-- Migration: 001_initial_schema.sqlite.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- 1. Agent Executions Table
CREATE TABLE IF NOT EXISTS agent_executions (
  run_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name_ar TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  cairo_time TEXT NOT NULL,
  source TEXT NOT NULL,
  model_requested TEXT NOT NULL,
  model_used TEXT NOT NULL,
  failover_occurred INTEGER NOT NULL DEFAULT 0,
  failover_reason TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  attempt_history_json TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  token_usage INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL,
  validation_checks_json TEXT NOT NULL,
  multi_layer_validation_json TEXT,
  approval_status TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  content_hash TEXT NOT NULL,
  approved_content_hash TEXT,
  publication_status TEXT NOT NULL DEFAULT 'NOT_PUBLISHED',
  published_at TEXT,
  error_code TEXT,
  error_details_json TEXT NOT NULL,
  sanitized_contract_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_timestamp ON agent_executions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_validation ON agent_executions(validation_status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_approval ON agent_executions(approval_status);

-- 2. Agent Health Table
CREATE TABLE IF NOT EXISTS agent_health (
  agent_id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IDLE',
  last_successful_execution TEXT,
  last_run_id TEXT,
  total_runs INTEGER NOT NULL DEFAULT 0,
  successful_runs INTEGER NOT NULL DEFAULT 0,
  failed_runs INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER NOT NULL DEFAULT 0,
  api_error_count INTEGER NOT NULL DEFAULT 0,
  last_api_error TEXT,
  last_model_used TEXT NOT NULL,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_total_cost_usd REAL NOT NULL DEFAULT 0,
  last_validation_result TEXT NOT NULL DEFAULT 'NOT_RUN',
  updated_at TEXT NOT NULL
);

-- 3. Approval Decisions Audit Trail Table
CREATE TABLE IF NOT EXISTS approval_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  content_hash_at_decision TEXT NOT NULL,
  notes TEXT,
  decided_at_iso TEXT NOT NULL,
  decided_at_cairo TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES agent_executions(run_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_decisions_run_id ON approval_decisions(run_id);

-- 4. Publication Logs Table
CREATE TABLE IF NOT EXISTS publication_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  channel TEXT NOT NULL,
  approved_content_hash TEXT NOT NULL,
  publication_status TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at_iso TEXT NOT NULL,
  published_at_cairo TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES agent_executions(run_id)
);

CREATE INDEX IF NOT EXISTS idx_publication_logs_run_id ON publication_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_publication_logs_idempotency ON publication_logs(idempotency_key);

-- 5. API Error Logs Table
CREATE TABLE IF NOT EXISTS api_error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  model TEXT NOT NULL,
  error_code TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  error_message TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  occurred_at_iso TEXT NOT NULL,
  occurred_at_cairo TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_error_logs_agent_id ON api_error_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_occurred_at ON api_error_logs(occurred_at_iso DESC);

-- 6. Webhook Nonces & Idempotency Store Table
CREATE TABLE IF NOT EXISTS webhook_nonces (
  nonce TEXT PRIMARY KEY,
  timestamp_sec INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  idempotency_key TEXT,
  request_body_sha256 TEXT NOT NULL,
  response_run_id TEXT,
  response_status INTEGER,
  response_body_json TEXT,
  consumed_at_iso TEXT NOT NULL,
  expires_at_sec INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_nonces_expires ON webhook_nonces(expires_at_sec);
CREATE INDEX IF NOT EXISTS idx_webhook_nonces_idempotency ON webhook_nonces(idempotency_key);
