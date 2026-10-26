# NEXORA integration audit — 2026-10-25

**Release decision: FAIL — not ready for production.** This is an audit of the supplied ZIP and the inspected local n8n database, not proof of the currently deployed AI Studio revision. No new public message, financial action, paid inference, or workflow activation was performed.

## First blocking issue, correction, next test

**P0: Human approval is not authoritative.** `server.ts:530` accepts approval without authentication, reviewer authorization, existence/state checks or content revision binding. `server.ts:551` trusts model-supplied contract identity and approval fields. Isolated tests A03/A04 reproduce self-approval and approval of a nonexistent run. The public publisher is also absent, so this is a release-blocking exposure before completing integration, not evidence that an unauthorized public message was sent.

Correct the existing server: authenticate the reviewer; allow only APPROVE/REJECT for an existing VALIDATED pending run; derive reviewer identity from the session; bind the decision to an immutable draft hash/revision; atomically persist decision and state transition. Always construct run_id, agent_id and approval state on the server, ignoring model values. Fail closed if DB persistence fails. Only a publisher consuming that approved revision may send.

Next verifiable test: on an isolated real Express/SQLite instance, POST approval anonymously and expect 401/403 and zero writes. An authorized request for a nonexistent run must return 404; a stale revision or repeat transition must return 409. A valid pending revision must transition exactly once. Inject model output with APPROVED and verify it remains pending. Then test private Telegram delivery with stored message_id; public publication still requires an actual human decision.

**Live-test prerequisite:** both localhost:5678/healthz and localhost:3000/api/health refused connections during the final probe (`app-inventory.json`). Restore the actual services and identify the deployed revision before live E2E testing; restarting alone cannot remedy the code defects.

## Evidence and boundaries

- Input: `nexora-markets-multi-agent-ai-system.zip`; SHA256 `eaba02918f55c6bbf42e371312b3e9ff32779aaa7f5dc072d042dd46803b5414`. Extracted copy: workspace `work/audit/app-source`. Original archive unchanged.
- `app-inventory.json`: hashes for all 53 extracted files, bounded secret scan including backups/SQLite/WAL bytes, empty exported application tables, final connectivity probe. Archive entries include directories, hence 71 entries versus 53 files.
- `live-inventory.json`: read-only local n8n SQLite snapshot at 2026-10-25T13:50:27Z. Ten workflows, only one NEXORA workflow: private Telegram Connection Test. No deployed six-agent/news chain found in that database. Another deployment is not ruled out.
- `arfrbirrvBFSdqBQ.sanitized.json`: actual local workflow export with private Chat ID redacted. `app-template.json`: extracted application template, NOT a live n8n export. Original three workflow candidates remain under `../workflows/`.
- `execution-evidence.json`: persisted n8n executions 33/34 contain Telegram API success, private message IDs 4/5. Execution 32 is preparation only. This verifies historical private transport, not the new app or current availability.
- `app-test-results.json`: 12 isolated cases executing the supplied server functions/route callbacks, TypeScript stripped by Node. SDK, DB, HTTP adapters and timers mocked; no network inference, real HTTP middleware, SQLite crash recovery or live E2E coverage implied.
- `test-results.json`: 11 earlier checks of legacy candidate/schema artifacts. Keep separate from new application findings.
- Exported `nexora_persistence.sqlite` has zero rows in executions, approvals, publications and errors. It provides no historical test evidence. Orphan `.data` WAL is not treated as a complete operational database.
- Browser inspection unavailable due local CUA initialization failure. Full npm install/build/typecheck and deployed frontend bundle inspection NOT TESTED. Source review is not a build pass.

## PASS / FAIL / NOT TESTED matrix

| Requirement | Status | Evidence and scope |
|---|---|---|
| Six agent definitions connected to executable SDK path | PASS | Six prompts/schemas in agentDefinitions.ts, shared server route calls generateContent; agent-map.json. More than UI cards, but shared wrappers rather than six verified autonomous integrations. |
| Six agents produce correct real outputs | NOT TESTED | No live Gemini calls or retained app execution rows; benchmark claims not accepted. |
| Historical private Telegram connection | PASS | n8n executions 33/34, message IDs 4/5; current service not established. |
| Current local service reachability | FAIL | Both final local probes connection-refused. |
| Economic News → Content → approval → publish implementation | FAIL | Six-node app template calls only one chosen agent, never chains Content, no approval callback receiver/publisher/response node. |
| Real end-to-end news publication | NOT TESTED | Incomplete chain, stopped services, no human-approved draft or current public destination verified. |
| Authoritative human approval | FAIL | A03/A04; server.ts:530/551; no identity/revision/state enforcement. |
| Required content schema enforcement | FAIL | A02 accepts {}; server validates only minimal news/risk fields. JSON schemas are sent to model but not fully enforced server-side. |
| Source provenance and numeric fidelity | FAIL | No source connector/allowlist/freshness proof in app; economic comparison is truthiness-based, so actual=0 bypasses comparison. Source text defaults to an assertion of authorization. |
| Deduplication / replay / idempotency | FAIL | A06 inserts twice; random run IDs are not stable event IDs; no publication uniqueness or replay store. Legacy candidate has separate check/insert without unique source_id. |
| Webhook missing signature rejected | PASS | A05, isolated callback. |
| Documented HMAC integration | FAIL | A07: UI signs timestamp.nonce.rawBody but server compares header with raw secret; ignores timestamp/nonce. Embedded fallback shared secret. |
| UI security suite backed by route | FAIL | A09: /api/n8n/test-suite absent from server. |
| Bounded 503 fallback and eventual recovery | PASS | A08-503: six synthetic failures exhaust; A08-recover: third synthetic call succeeds on fallback. Local logic only. |
| Nonretryable errors / timeout / cost bounds | FAIL | A08-400 retries six times. No explicit whole-request deadline, Retry-After handling, concurrency/rate budget; client can select model/systemInstruction. |
| Real 503 recovery, model availability, quotas | NOT TESTED | No live inference; configured model IDs and pricing claims not accepted as verified. |
| Honest benchmark scoring | FAIL | A10 empty response scores PASSED, 100 hallucination score, schema_compliant=true without checking. |
| Deterministic risk rejection | FAIL | A01 empty input isCompliant=true. Backend duplicates and diverges from frontend math; execution_permitted from model not authoritatively overridden. |
| Durable error and publication recovery | FAIL | saveDatabaseToDisk catches write errors; overwrites whole sql.js file non-atomically. Agent error path does not update health failure counters; err.message persisted without redaction. |
| Process crash, disk-full, Telegram ambiguous send recovery | NOT TESTED | No destructive failure injection on live data. |
| Recognizable Google/Telegram keys absent in supplied files | PASS | app-inventory.json bounded byte-pattern scan: zero matches. Earlier JSON candidates scan also clean. Not proof of all secret forms or deployed bundle. |
| Overall secret/config hygiene | FAIL | Compiled webhook fallback secret; local SQLite/WAL and backup source included. Remove fallback and exclude runtime data from distributable packages. |

## Integration map

All six agents share `POST /api/gemini/agent-run`: input agentId, inputPayload, optional systemInstruction/model/forceDeterministicRisk; output success, contract, modelUsed, attempts, rawTokens. Trigger is manual UI or caller HTTP. Authentication/agent allowlist/input schema validation are absent. `agent-map.json` contains exact input fields and output schema keys for each of the six definitions. Market data feed names and destination handles in definitions are documentation; no verified credentials or subscriptions follow from them.

| Route / integration | Inputs → outputs | Credentials / persistence / gaps |
|---|---|---|
| GET /api/health | none → healthy, hasApiKey, model labels | hasApiKey checks object creation, not inference; no DB readiness probe |
| GET /api/telemetry/metrics | none → health plus last 50 contracts | No app auth in source; potential payload disclosure |
| POST /api/gemini/agent-run | agent + payload → contract | GEMINI_API_KEY server env; SDK call; agent_executions and health; request can override policy prompt/model |
| POST /api/benchmarks/run | none → six scores | Same key; billable loop; unvalidated scores |
| POST /api/n8n/webhook | signature header + payload → random run ID | N8N_WEBHOOK_SECRET or compiled fallback; inserts publication_logs QUEUED; no dispatch |
| POST /api/executions/:runId/approval | action, editorId → approval status | No trusted identity; approval_decisions + execution column, contract_json not updated |
| POST /api/n8n/test-suite | UI button → expected test results | No implementation |
| n8n template POST /webhook/nexora-agent-trigger | external event → normalized payload → one SDK agent | No trigger auth configured; webhook body wrapper not normalized explicitly; responseMode=responseNode but no Respond to Webhook node |
| n8n HTTP node | NEXORA_APP_URL default localhost:3000 | Deployment network reachability must be configured; local/cloud URLs not interchangeable |
| n8n Telegram review node | contract.news_draft_ar → editorial chat | TELEGRAM_EDITORIAL_CHAT_ID; template has no credential binding; inline buttons alone do not implement decision handling |
| n8n Notion node | run/agent/validation/approval → database row | NOTION_INTELLIGENCE_DB_ID; template has no credential binding; logs alongside review, not publication result |
| Historical private transport workflow | manual → prepared private test → Telegram | Existing Telegram account credential reference; secret never exported/decrypted |

App `.env.example` includes GEMINI_API_KEY, N8N_WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_EDITORIAL_CHAT_ID, NOTION_INTELLIGENCE_DB_ID, APP_URL placeholders. Server reads Gemini/shared secret only; Telegram/Notion placeholders do not establish implemented adapters. App template additionally needs NEXORA_APP_URL. Credential readiness for Gemini/Notion/news feeds and public Telegram destination is NOT TESTED.

## Targeted correction sequence

1. Repair authoritative approval and contract construction first; add focused regression tests A02–A04. Reject unknown agent IDs, disallow caller policy/model overrides except server-approved choices, parameterize agent_health lookup (currently interpolated agentId at server.ts:384).
2. Make webhook protocol consistent: required server secret, raw-body HMAC, constant-time comparison, bounded timestamp, unique nonce and stable event/content idempotency key in persistent storage. Reject missing configuration at startup. Remove misleading unimplemented security-suite UI until backed by tests.
3. Complete existing template only: source validation and acquisition → Economic News → Content Creator → durable pending draft → authenticated decision → atomic publish claim → Telegram → persist message_id. Add reject/error branches and webhook response. Do not activate automatic public publishing during repair.
4. Enforce schemas, exact source URL/domain/timestamps and numeric preservation (including zero), fail closed on missing inputs. Centralize risk math, require finite positive values and valid stop/direction; override execution permission deterministically.
5. Retry only transient failures with bounded jitter/backoff/deadline; respect retry hints, use a server model allowlist verified by one minimal inference per permitted model, cap budget. Record actual tokens, never invented fallback token counts. Do not use static pricing claims as billing proof. See [official Gemini troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting).
6. Make state writes durable and atomic, bubble persistence failures, redact logs, count failed runs, reconcile uncertain Telegram sends manually before retry. Test restart recovery and concurrency on a disposable DB, never the live database.
7. Re-run build/typecheck, real HTTP/SQLite integration tests, negative security tests and one approved private E2E with a trusted source. Verify exactly one message and persisted message_id on duplicate request; then obtain an explicit editorial approval for the final public draft.

Legacy candidate defects are separately recorded in test-results.json: Telegram response message_id path should use result.message_id for the observed raw response; NEXORA_News_Log still lacks verification_status, gemini_input_tokens, gemini_output_tokens, gemini_model; no unique source_id. Do not automatically merge the legacy candidate with the AI Studio template. Select one canonical orchestration after comparing the intended deployment.

## Reproduction

Existing Notion records updated successfully (properties only, no duplicate tasks): [News Engine task](https://www.notion.so/40474ccb6c0d8178a40ce5d3b209ac8b), [Workflow Library record](https://www.notion.so/40474ccb6c0d817690c1f9effaaf2d40). Status retained In Progress/Building, Sellable No. Async queue initially returned 503; synchronous retry succeeded. No production readiness claim was written.

From workspace root, Node 24.21.0:

```powershell
node outputs/nexora/audit/test-app.cjs
node outputs/nexora/audit/map-agents.cjs
node outputs/nexora/audit/run-audit-tests.js
```

Harnesses do not connect to Telegram/Gemini. `test-app.cjs` strips TypeScript and substitutes adapters, so a PASS there must not be represented as a deployed HTTP or E2E pass. `work/audit/scan_app.py` uses bundled Python and opens packaged SQLite read-only. Original files/workflows remain unchanged.
