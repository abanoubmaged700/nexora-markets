# NEXORA local gateway preparation. Run from the repository root.
# Configure real secrets in the process environment or an untracked local file.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath 'package-lock.json')) {
    throw 'Run setup.ps1 from the NEXORA repository root.'
}
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
Write-Host 'Dependencies installed. Set N8N_WEBHOOK_SECRET and NEXORA_APPROVAL_SIGNING_SECRET privately before starting the gateway.'
Write-Host 'Run the isolated checks with npm test. Keep the gateway on 127.0.0.1 until delivery is verified.'
