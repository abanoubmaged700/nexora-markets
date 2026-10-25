-- ============================================================================
-- NEXORA Markets Production Database Migration (PostgreSQL 15+)
-- Migration: 001_initial_schema.postgres.sql
-- Clean migration path for Cloud SQL / Managed PostgreSQL production hosting
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Agent Executions Table
CREATE TABLE IF NOT EXISTS agent_executions (
  run_id VARCHAR(128) PRIMARY KEY,
  agent_id VARCHAR(64) NOT NULL,
  agent_name_ar TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  cairo_time VARCHAR(64) NOT NULL,
  source VARCHAR(128) NOT NULL,
  model_requested VARCHAR(64) NOT NULL,
  model_used VARCHAR(64) NOT NULL,
  failover_occurred BOOLEAN NOT NULL DEFAULT FALSE,
  failover_reason TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  attempt_history_json JSONB NOT NULL,
  latency_ms INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  token_usage INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  validation_status VARCHAR(32) NOT NULL,
  validation_checks_json JSONB NOT NULL,
  multi_layer_validation_json JSONB,
  approval_status VARCHAR(64) NOT NULL,
  approved_by VARCHAR(128),
  approved_at VARCHAR(64),
  content_hash VARCHAR(64) NOT NULL,
  approved_content_hash VARCHAR(64),
  publication_status VARCHAR(32) NOT NULL DEFAULT 'NOT_PUBLISHED',
  published_at VARCHAR(64),
  error_code VARCHAR(64),
  error_details_json JSONB NOT NULL,
  sanitized_contract_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_pg_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_pg_agent_executions_timestamp ON agent_executions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pg_agent_executions_validation ON agent_executions(validation_status);
CREATE INDEX IF NOT EXISTS idx_pg_agent_executions_approval ON agent_executions(approval_status);

-- 2. Agent Health Table
CREATE TABLE IF NOT EXISTS agent_health (
  agent_id VARCHAR(64) PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
  last_successful_execution VARCHAR(64),
  last_run_id VARCHAR(128),
  total_runs INTEGER NOT NULL DEFAULT 0,
  successful_runs INTEGER NOT NULL DEFAULT 0,
  failed_runs INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER NOT NULL DEFAULT 0,
  api_error_count INTEGER NOT NULL DEFAULT 0,
  last_api_error TEXT,
  last_model_used VARCHAR(64) NOT NULL,
  total_tokens_used BIGINT NOT NULL DEFAULT 0,
  estimated_total_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  last_validation_result VARCHAR(32) NOT NULL DEFAULT 'NOT_RUN',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Approval Decisions Audit Trail Table
CREATE TABLE IF NOT EXISTS approval_decisions (
  id BIGSERIAL PRIMARY KEY,
  run_id VARCHAR(128) NOT NULL REFERENCES agent_executions(run_id) ON DELETE CASCADE,
  agent_id VARCHAR(64) NOT NULL,
  decision VARCHAR(32) NOT NULL,
  reviewer_name VARCHAR(128) NOT NULL,
  reviewer_role VARCHAR(128) NOT NULL,
  content_hash_at_decision VARCHAR(64) NOT NULL,
  notes TEXT,
  decided_at_iso TIMESTAMPTZ NOT NULL,
  decided_at_cairo VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_approval_decisions_run_id ON approval_decisions(run_id);

-- 4. Publication Logs Table
CREATE TABLE IF NOT EXISTS publication_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id VARCHAR(128) NOT NULL REFERENCES agent_executions(run_id) ON DELETE CASCADE,
  agent_id VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  channel VARCHAR(64) NOT NULL,
  approved_content_hash VARCHAR(64) NOT NULL,
  publication_status VARCHAR(32) NOT NULL,
  published_by VARCHAR(128) NOT NULL,
  published_at_iso TIMESTAMPTZ NOT NULL,
  published_at_cairo VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_publication_logs_run_id ON publication_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_pg_publication_logs_idempotency ON publication_logs(idempotency_key);

-- 5. API Error Logs Table
CREATE TABLE IF NOT EXISTS api_error_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id VARCHAR(128) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  attempt_number INTEGER NOT NULL,
  model VARCHAR(64) NOT NULL,
  error_code VARCHAR(64) NOT NULL,
  http_status INTEGER NOT NULL,
  error_message TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  occurred_at_iso TIMESTAMPTZ NOT NULL,
  occurred_at_cairo VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_api_error_logs_agent_id ON api_error_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_pg_api_error_logs_occurred_at ON api_error_logs(occurred_at_iso DESC);

-- 6. Webhook Nonces & Idempotency Store Table
CREATE TABLE IF NOT EXISTS webhook_nonces (
  nonce VARCHAR(128) PRIMARY KEY,
  timestamp_sec BIGINT NOT NULL,
  endpoint VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128),
  request_body_sha256 VARCHAR(64) NOT NULL,
  response_run_id VARCHAR(128),
  response_status INTEGER,
  response_body_json JSONB,
  consumed_at_iso TIMESTAMPTZ NOT NULL,
  expires_at_sec BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_webhook_nonces_expires ON webhook_nonces(expires_at_sec);
CREATE INDEX IF NOT EXISTS idx_pg_webhook_nonces_idempotency ON webhook_nonces(idempotency_key);
