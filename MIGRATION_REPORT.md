# NEXORA Markets — GitHub / existing AI Studio migration

Date: 25 October 2026, Africa/Cairo.

## Destination now verified — supersedes the initial unlinked state below

User authorized `abanoubmaged700/nexora-markets`. GitHub confirms push permission. Existing `main` at `2fb6bf268f137bf0898fd931d1e7339a4e538a78` matches the audited original ZIP (comparison normalized CRLF/LF). The delivery branch `codex/hardening` is based on that existing commit, with the tracked local hardening snapshot overlaid; unrelated Git histories were not merged. Delivery checkout: `outputs/nexora/github-sync`.

The branch removes `.aistudio/`, `.data/`, and `nexora_persistence.sqlite` from Git tracking only; local files and prior history remain. The stale `bun.lock` is also untracked locally and excluded from the branch; `package-lock.json` is the canonical tested npm lockfile. This is not a history purge. Both SQL migration source files remain tracked. `main` is not modified by pushing this branch. Review the PR before merging, then pull reviewed changes into the same existing AI Studio app; no app deployment or sync is implied by GitHub delivery.

The connection instructions below document the earlier preparation stage; the repository URL is now known: https://github.com/abanoubmaged700/nexora-markets.git.

## Result

Prepared the latest local hardening candidate in a clean Git repository on `codex/hardening`. Application code stays at the repository root; build paths and regression tests are preserved. No original source, live database, unrelated workflow or primary branch was deleted or replaced. This is a tested migration candidate, not a production-ready news publisher.

Initial `git status` at the workspace and application folder returned “not a git repository.” No existing local Git history or origin was available. GitHub connector identity is `abanoubmaged700`; repository searches for NEXORA in that account/accessible installations returned no match in the returned results. No verified destination repository is known. No push, force push, main-branch update, PR merge, AI Studio import or deployment was performed.

Repository path:
`C:\Users\compuremo\Documents\Codex\2026-10-25\referenced-chatgpt-conversation-this-is-an\outputs\nexora\app`

Existing app to retain:
https://aistudio.google.com/apps/4ff56221-7c23-4e68-b503-a37198ec0ac0

## Changes preserved

Compared with the supplied original application ZIP, modified application files are server.ts, src/components/TabExecutionLogs.tsx, src/components/TabLiveRunner.tsx, src/db/sqliteDatabase.ts, vite.config.ts, package.json, .gitignore and .env.example. Added src/security/approval.ts, three regression-test files, package-lock.json and REPAIR_NOTES.md. These preserve reviewer authentication, revision-bound approval, server-owned contract fields, guarded persistence, API policy checks and bounded transient retries.

Migration additions: this report, updated README, docs/MIGRATION_FILE_CHANGES.json, docs/VALIDATION_RESULTS.md, copied project context/decisions/handoff, and separately labeled n8n candidates. Original README preserved in docs/history because it claimed features absent from the inspected implementation. Historical documents are provenance, not current readiness evidence. The exact initial comparison list is in docs/MIGRATION_FILE_CHANGES.json; this report and validation record were added after that comparison.

No application modules were moved. `tests/` remains where the test scripts expect it. `integrations/n8n/` contains three legacy candidate JSON files, not runtime credentials or deployed workflow state. Cloud sync does not activate them.

## Validation executed

| Check | Result | Scope |
|---|---|---|
| npm test | PASS | 16 reported tests, 0 failures (includes one parent test). Real Express/SQLite approval cases; production sql.js persistence test; isolated contract/SDK retry cases. |
| npm run lint | PASS | TypeScript no-emit check. |
| npm run build | PASS | Vite 8.3.5, 1672 modules; CSS 48.09 kB, JS 406.41 kB. |
| Warning | Non-blocking | Vite warns about __dirname and a future native config loader. |
| Live Gemini / Telegram / public publishing | NOT TESTED | Not exercised by this migration. |
| Current AI Studio revision and repository binding | NOT VERIFIED | No access evidence establishing the currently linked repository or deployed revision. |

See docs/VALIDATION_RESULTS.md. Re-running tests needs Node 24 with TypeScript stripping; use Node 24.21 to match validation. Existing package-lock.json retained. No dependency upgrade was made for this migration.

## Configuration and excluded state

`.env.example` contains names with empty values only. Actual values belong in server secrets or an untracked local .env.

| Variable | Purpose / status |
|---|---|
| GEMINI_API_KEY | Required for later real inference, server only. |
| NEXORA_REVIEWER_USER | Reviewer identity. |
| NEXORA_REVIEWER_PASSWORD | Random secret at least 24 characters; no default. |
| NEXORA_PUBLIC_ORIGIN | Exact browser origin for mutation requests. |
| HOST | Defaults to 127.0.0.1; configure remote bind only in a protected HTTPS environment. |
| DISABLE_HMR | Optional dev-server watcher setting. |
| APP_URL | Retained placeholder; not currently read by server.ts. |
| N8N_WEBHOOK_SECRET | Reserved; webhook is deliberately disabled. |
| TELEGRAM_BOT_TOKEN | Reserved in app template; no active publisher. Existing n8n credential is separate. |
| TELEGRAM_EDITORIAL_CHAT_ID | Reserved integration configuration. |
| NOTION_INTELLIGENCE_DB_ID | Reserved integration configuration. |

Excluded from Git: .env and variants, key/certificate files, known credential JSON names, SQLite/DB files and sidecars, .data, .aistudio backups, logs, temporary files, node_modules, npm cache, build output and coverage. Original files remain on disk. Pattern exclusions do not replace secret scanning or review of unfamiliar credential formats.

Not transferred automatically: API keys, reviewer password, n8n credentials/activation/data tables/execution history, Telegram editorial/public destinations, Notion content, SQLite live data, cloud secrets/storage settings, AI Studio app-to-repository binding or unpublished AI Studio edits. Current sql.js snapshots require a durable disk and one process; a successful frontend build does not establish cloud persistence. Webhook/benchmark endpoints remain disabled and the full approval-to-Telegram chain is incomplete.

## Exact connection steps — retain the existing application

1. Open the existing app URL above. Save/export its current unpublished edits first so they can be compared with this local snapshot. In **Settings → GitHub**, inspect the currently linked repository. If none is linked, link the intended existing repository there. Do not choose a new-app import or replace the app. Copy the repository HTTPS URL; authenticate GitHub through the standard browser/credential-manager flow, never embed a token in the URL.
2. Use the existing repository's history when it contains commits. The local branch here is an initial snapshot, so do not merge unrelated histories or force-push over an existing branch. Use a fresh clone and overlay only these tracked files:

```powershell
$nexoraSource = 'C:\Users\compuremo\Documents\Codex\2026-10-25\referenced-chatgpt-conversation-this-is-an\outputs\nexora\app'
$nexoraRemote = 'https://github.com/OWNER/REPOSITORY.git' # replace with verified app-linked URL
$nexoraClone = 'C:\Users\compuremo\Documents\Codex\nexora-github-review' # new, unused folder
$nexoraSnapshot = Join-Path $env:TEMP 'nexora-hardening-tracked.zip'
git -C $nexoraSource archive --format=zip -o $nexoraSnapshot codex/hardening
git clone $nexoraRemote $nexoraClone
git -C $nexoraClone switch -c codex/hardening
Expand-Archive -LiteralPath $nexoraSnapshot -DestinationPath $nexoraClone -Force
git -C $nexoraClone diff --stat
git -C $nexoraClone diff
git -C $nexoraClone status --short
```

The archive contains tracked files only; overlay does not delete remote-only files. Review overlapping AI Studio changes rather than silently discarding them. If codex/hardening already exists, stop and inspect it instead of resetting it. Once the diff is reconciled:

```powershell
Set-Location $nexoraClone
npm ci
npm run lint
npm test
npm run build
git add .
git diff --cached --stat
git diff --cached --check
git commit -m "Preserve NEXORA hardening and migration tests"
git push -u origin codex/hardening
```

3. If and only if the verified destination is empty (no branch history), link this prepared repository directly instead:

```powershell
Set-Location $nexoraSource
git remote add origin $nexoraRemote
git ls-remote --heads origin
# Continue only when output confirms there are no remote branches.
git push -u origin codex/hardening
```

4. Review the branch in GitHub. For an existing repository, open a PR against its existing default branch and review before any merge. In the **same existing AI Studio app**, use Settings → GitHub to pull the reviewed changes from its linked branch. If that UI syncs only the default branch, review and merge the PR first; do not force-push to work around it. Resolve any sync conflicts individually. Reconfigure server secrets separately, confirm the app ID remains unchanged, and rerun preview/approval checks. Do not claim production deployment based on a successful pull.

Google documents two-way sync and pulling external edits via Settings → GitHub: [official AI Studio Build documentation](https://ai.google.dev/gemini-api/docs/aistudio-build-mode). Actual account UI and repository binding still need verification. If the current app offers no linking/pull control, stop at that binding issue rather than create a replacement app.
