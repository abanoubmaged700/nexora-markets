# NEXORA Gateway Setup & Startup Script for Windows PowerShell
# Requires Node.js installed

Write-Host "🔒 Setting up NEXORA Secure Local Webhook Gateway..." -ForegroundColor Cyan

# 1. Create .env file if not exists
$envPath = ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "Creating default .env configuration..." -ForegroundColor Yellow
    @"
GATEWAY_PORT=3001
N8N_TARGET_URL=http://localhost:5678/webhook/nexora-publish
N8N_WEBHOOK_SECRET=nexora_secure_random_production_secret_$(Get-Random -Minimum 100000 -Maximum 999999)
"@ | Out-File -Encoding utf8 $envPath
}

# 2. Install dependencies
Write-Host "Installing dependencies (express, sql.js)..." -ForegroundColor Yellow
npm init -y
npm install express sql.js

Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "To start the gateway, run: node gateway.js" -ForegroundColor Cyan
Write-Host "To expose securely via ngrok, run: ngrok http 3001" -ForegroundColor Cyan
