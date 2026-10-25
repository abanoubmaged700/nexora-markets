# NEXORA Markets Multi-Agent AI System — Test Report (TEST_REPORT.md)

## Test Execution Summary

| Test Category | Test Case | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **Database Persistence** | SQLite table creation & migration | **PASS** | Tables `agent_executions`, `agent_health`, `approval_decisions`, `publication_logs`, `api_error_logs` initialized successfully on server start. |
| **Database Recovery** | Persistence across server restarts | **PASS** | Database file `nexora_persistence.sqlite` persists and reloads state successfully. |
| **Webhook Security** | HMAC / X-NEXORA-Signature validation | **PASS** | Requests without correct signature return `401 Unauthorized`. |
| **Replay & Idempotency** | Duplicate `run_id` webhook submission | **PASS** | Duplicate `run_id` requests are rejected with `400 Idempotency Error`. |
| **Human Approval Gate** | Backend enforcement for publishing | **PASS** | Unapproved executions (`PENDING` or `REJECTED`) are blocked from queuing for Telegram (`403 Forbidden`). |
| **Gemini Integration** | Real API calls for 6 agents | **PASS** | Successfully tested via Live Runner and Live Benchmarks (`gemini-3.8-flash` & `gemini-3.1-flash-lite`). |
| **Deterministic Math** | Risk Guardian validation rules | **PASS** | Correctly rejects non-compliant trades (risk > 2%, drawdown > 5%, R:R < 1.5). |
| **n8n Integration** | Webhook orchestration & queueing | **PASS** | Verified via secure endpoint with signature and approval verification. |
| **Telegram Integration** | End-to-end publishing test | **NOT TESTED** | Marked as `NOT TESTED` (requires live bot token and live test channel setup). |
