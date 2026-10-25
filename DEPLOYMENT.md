# NEXORA Markets Multi-Agent AI System — Deployment Guide (DEPLOYMENT.md)

## Production Requirements

1. **Node.js Runtime**: v18+ or v20+.
2. **Environment Variables**: Set up `.env` with the required keys (see `.env.example`).
3. **Database File**: `nexora_persistence.sqlite` will be automatically created in the root working directory upon initialization. Ensure write permissions on the directory.

## Deployment Steps

1. Clone or sync the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   N8N_WEBHOOK_SECRET=your_secure_random_secret_string
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_EDITORIAL_CHAT_ID=your_chat_id_here
   ```
4. Build and start the production server:
   ```bash
   npm run build
   npm start
   ```
