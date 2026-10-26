# Post-sync reconciliation — 26 October 2026

PR #1 was merged at 87bb390. User reports pulling into the same AI Studio app. Remote main then advanced through 41dcda5, 2b95d88 and 37a607a. Comparison with the reviewed commit proved that authentication, revision-bound approvals, persistence safeguards, regression tests and lockfile had been removed; database/WAL/checkpoint files were reintroduced. Do not treat the earlier 16-test pass as evidence for that revision.

This branch is based on 37a607a and restores the reviewed safeguards plus the missing-figures regression fix. New gateway files and integration UI are retained. The unsafe diagnostic route previously accepted any caller target and forwarded a shared secret; replacement is behind reviewer auth, uses only server-configured N8N_HEALTH_URL, GET with no credentials, redirect rejection and a three-second timeout. HTTP errors do not count as success. Configure a dedicated HTTPS health endpoint, not a publishing webhook.

Validation: 18 tests PASS, TypeScript PASS, Vite build PASS locally. Includes synthetic upstream diagnostic failure; no real remote connection or public publishing performed. GitHub CI added for future pushes/PRs. Tests count includes one parent test. Existing cloud credentials and durable disk remain unverified. UI may require reviewer credentials after sync; configure secrets privately, not in Git or chat.

Remaining: local_gateway is preserved but not accepted for production. It trusts caller-supplied APPROVED, signs reserialized JSON rather than raw bytes, can acknowledge upstream HTTP failures as published, and persists idempotency before delivery without recovery states. Its existing test script prints expectations rather than asserting them and can contact real n8n: it was NOT run. Do not expose or activate this gateway before correcting these issues and testing against a disposable downstream adapter. No financial or public-channel action was performed.

Next acceptance gate: authoritative approval tied to stored content in the gateway/publisher, durable delivery state and receipt, failure/replay/concurrency tests; then one explicitly approved private end-to-end message. Full News→Content→Approval→Telegram remains NOT TESTED. Production readiness remains FAIL.

Runtime/checkpoint files are untracked in this branch only, preserved on local disk and in prior history. New source files and SQL migrations are preserved. No forced reset of main or history rewrite.
