# NEXORA Markets — integration hardening candidate

Existing Google AI Studio application: https://aistudio.google.com/apps/4ff56221-7c23-4e68-b503-a37198ec0ac0

This repository preserves the supplied application and the tested first hardening batch. Production readiness remains FAIL; no live news-to-Telegram end-to-end pass is claimed.

## Run and verify

Use Node 24.21 or compatible Node 24. From this repository root:

```sh
npm ci
npm run lint
npm test
npm run build
npm start
```

Configure server secrets using variable names in .env.example; values are intentionally empty. See [setup and repair limits](REPAIR_NOTES.md) and [migration report](MIGRATION_REPORT.md). Missing reviewer configuration rejects protected requests. No secrets should be committed.

## Layout

- server.ts, src/, index.html, metadata.json and Vite/TypeScript/package files: application; build paths unchanged.
- tests/: runnable regression tests; preserve these in GitHub.
- integrations/n8n/: earlier candidate exports, not automatically imported or activated. See its README.
- docs/: project documents and test evidence. docs/history preserves the older audit and original README for provenance; their claims must not be interpreted as current implementation guarantees.

Current storage uses sql.js snapshots with guarded disk persistence, not the node:sqlite/WAL implementation described in the original README. Webhook and benchmark endpoints are deliberately disabled pending further hardening. Cloud deployment needs durable storage and separate verification.
