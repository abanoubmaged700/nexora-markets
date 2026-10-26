# NEXORA local publishing gateway

This single-process gateway listens on 127.0.0.1. The current n8n publishing workflow and actual Telegram delivery are **not verified**. Do not expose the port or enable a public publishing route until the workflow returns a real Telegram receipt and a private end-to-end test passes.

## Required environment

Set `N8N_WEBHOOK_SECRET` and `NEXORA_APPROVAL_SIGNING_SECRET` to two distinct random secrets of at least 32 characters. Set the same approval signing secret on the review server and the local gateway; keep both out of Git, browser code, and chat. Optional: `N8N_TARGET_URL` (defaults to the local n8n webhook), `GATEWAY_PORT` (3001), and `GATEWAY_DB_PATH` (local SQLite path). The Node process reads environment variables; it does not automatically load `.env`.

The review API authenticates a reviewer and persists an `APPROVE` decision tied to `run_id` and `draft_revision`. Only then does its response contain `approval_receipt`. If the signing secret is absent, the review still succeeds but `publication_ready` is false and no receipt is issued. The publisher must pass that receipt with the exact approved `outputs`. A claim such as `human_approval_status: APPROVED` has no authority at the gateway.

The receipt is `base64url(JSON({run_id,content_hash,decision:"APPROVE"})).HMAC-SHA256-hex` signed by the review server. The gateway verifies the signature and compares the hash with `SHA-256(JSON.stringify(outputs))`. The request HMAC uses `N8N_WEBHOOK_SECRET` over the **raw request bytes** as `timestamp + "." + nonce + "." + rawBody`. Supply headers `X-NEXORA-Timestamp`, `X-NEXORA-Nonce`, and `X-NEXORA-Signature`. `nonce` must be 16–128 URL-safe characters. Send JSON with `run_id`, `outputs`, and `approval_receipt`.

Before forwarding, the gateway saves an `IN_FLIGHT` reservation. Any later request for that `run_id` returns 409, including after a 503 or timeout, because the downstream side effect may be uncertain. A manual reconciliation process must inspect n8n/Telegram before deciding whether to clear such a record. Existing idempotency rows without a status migrate to `UNKNOWN` and stay blocked. The old `trusted_approvals` table may remain on disk for history; it is never used as authority.

A successful n8n response must be HTTP 2xx **and** JSON `{ "publication_status": "PUBLISHED", "run_id": "...", "telegram_message_id": 123 }` obtained from an actual Telegram send. A plain webhook 200 is not accepted as proof of publication. Run the isolated regression suite from the repository root with `npm test`; it uses a disposable local downstream server and does not contact the real n8n service.
