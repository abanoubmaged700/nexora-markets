# NEXORA Markets — Local Windows Webhook Gateway

This directory contains the secure local webhook gateway for bridging the Google AI Studio cloud backend with the user's local Windows n8n instance (`http://localhost:5678`).

## Security Features
- Strict HMAC-SHA256 signature verification (`<timestamp>.<nonce>.<rawBody>`).
- Constant-time signature comparison (`crypto.timingSafeEqual`).
- SQLite persistence for nonces and idempotency keys (preventing replay attacks and duplicate publishing).
- Replay protection (rejects timestamps older than 300 seconds).
- Payload size limitation (5MB) and rate limiting.
- Localhost binding (`127.0.0.1:3001`) by default.

## Installation & Setup on Windows
1. Install Node.js (v18+).
2. Copy `.env.example` to `.env` and set your secure `N8N_WEBHOOK_SECRET`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the gateway:
   ```bash
   npm start
   ```
5. Run automated tests:
   ```bash
   npm test
   ```
6. Expose securely via ngrok (exposing ONLY port 3001):
   ```bash
   ngrok http 3001
   ```
