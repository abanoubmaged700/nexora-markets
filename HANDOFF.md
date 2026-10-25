# NEXORA Markets Multi-Agent AI System — Handoff Document (HANDOFF.md)

## System Overview

NEXORA Markets is an institutional-grade multi-agent AI research and market analysis platform featuring six specialized AI agents, real-time Gemini API integration, strict JSON schema validation, deterministic risk math, SQLite persistence, and a secure n8n / Telegram approval workflow.

## Key Architecture Components

- **Frontend**: React SPA with Tailwind CSS, Arabic RTL typography, and institutional Navy & Gold styling.
- **Backend**: Express + Vite server (`server.ts`) running on port 3000.
- **Database**: SQLite (`sql.js`) with atomic file persistence (`nexora_persistence.sqlite`) and automatic startup migrations for 5 tables.
- **Security**: HMAC webhook signature verification (`X-NEXORA-Signature`), idempotency checks, and backend-enforced human approval gates.
- **AI Engine**: Google GenAI SDK (`@google/genai`) utilizing `gemini-3.8-flash` and `gemini-3.1-flash-lite` with bounded exponential backoff and model failover.
