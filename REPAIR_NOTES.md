# NEXORA repair batch 1 — 25 October 2026

This is a patched copy of the supplied application, not a rebuild. The original ZIP and audit extraction remain unchanged. No AI Studio deployment or live n8n workflow was modified. Production readiness remains FAIL pending the integration work below.

## Implemented

- Reviewer authentication on application APIs, excluding health and the disabled webhook. Single configured reviewer via HTTP Basic; caller editorId is ignored. No password is embedded in browser code or persisted by application JavaScript.
- Approval requires an existing content_creator_agent run, VALIDATED and PENDING_HUMAN_APPROVAL, and the exact SHA256 revision of its outputs. Anonymous requests return 401, missing run 404, stale/repeated/noneligible transitions 409, malformed action/revision 400. Cross-origin mutation requests are rejected. Mutation content type must be JSON.
- Approval decision and execution contract update in one synchronous SQLite transaction. The response waits for disk persistence. Persistence writes a flushed temporary file and renames it; failures invalidate the DB until restart and return 503. Single-process only; do not run multiple replicas against this sql.js snapshot file.
- Server owns contract identity and approval state. Model-supplied contract fields are rejected. Unknown agent, missing input fields and prompt/model overrides are rejected; the existing UI now sends only agent ID and payload.
- Required output fields checked, empty/array output rejected, numeric actual=0 mismatch caught. This is not yet full recursive JSON Schema or source provenance validation.
- Empty/nonfinite/nonpositive required risk inputs rejected. Remaining risk semantics require further tests; no trade execution is enabled.
- Nonretryable SDK errors fail immediately; bounded retries retained for 408/429/500/502/503/504. Whole-call deadlines, Retry-After and real-model verification remain outstanding.
- Unsafe webhook and fabricated benchmark endpoints return explicit 503. HMAC/replay protection is NOT claimed implemented. Existing UI buttons may show disabled-endpoint errors until that batch is completed.
- Bound server to localhost by default; Vite denies runtime SQLite/cache paths. Package excludes database, WAL and AI Studio backups. esbuild updated to satisfy installed Vite peer constraints; package-lock.json records resolved dependencies.

## Setup and review

Use Node 24.21 or compatible Node 24 with TypeScript stripping for tests. Run `npm ci`, `npm run lint`, `npm test`, `npm run build` in this folder.

Configure server secrets (never send them in chat): NEXORA_REVIEWER_USER and a random NEXORA_REVIEWER_PASSWORD of at least 24 characters. Set NEXORA_PUBLIC_ORIGIN to the exact browser origin, including port locally. Missing reviewer configuration rejects access. Configure GEMINI_API_KEY separately for later live inference. Basic authentication is for one reviewer; require HTTPS for any remote deployment, a persistent disk, and one process. HOST defaults to 127.0.0.1; set a remote bind address only behind the authenticated HTTPS deployment boundary.

Run `npm start` locally. Browser requests to protected APIs require reviewer login. Legacy drafts without draft_revision cannot be approved; regenerate and validate a new draft instead of retroactively approving old data. The included UI sends the displayed draft revision and surfaces approval errors.

Before replacing any deployed files, back up the live database and compare the deployed code with this supplied ZIP version. Do not copy databases, node_modules, .npm-cache, .env, or dist from the working directory. The accompanying repair ZIP excludes those files. No actual password/key is supplied.

## Test evidence and limits

- TypeScript `npm run lint`: PASS.
- Vite production build: PASS (sandboxed attempt failed at helper spawn; same build succeeded with permitted process execution).
- HTTP approval tests use real Express and real Node SQLite via a small adapter, with synthetic reviewer credentials and temporary data. Persistence test uses the production sql.js module, reloads durable state, and injects a failed rename. Contract/retry tests execute functions extracted from the patched source with mocked SDK/timers.
- See ../audit/repair-test-results.txt for exact test counts. No real Gemini, Telegram or Notion request is made by this suite. No full browser login flow, proxy deployment, power-loss durability, multi-process concurrency or news publication was tested.

## Remaining blockers

Implement and test consistent HMAC/raw-body signatures, durable nonce/event deduplication, full output schemas and source provenance; complete Economic News → Content Creator → authenticated review → publisher; enforce stable publication idempotency and ambiguous-send recovery. Then test the chosen deployment against real services using one approved private test. The old audit remains historical evidence, not a claim that every finding was repaired.
