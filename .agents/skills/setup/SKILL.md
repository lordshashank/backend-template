---
name: setup
description: Interactive project setup after cloning the backend-template. Use when the user says "setup", "configure", "initialize", or "I just cloned this". Asks which features to keep, removes everything else, and configures env vars.
---

# Setup

Interactive setup for a freshly cloned backend-template. Ask the user what they need, then remove everything else.

## Procedure

### 1. Ask project basics

Ask the user for:
- **Project name** (update in `package.json`)
- **Database name** (update in `.env` and `docker-compose.yml`)
- **Port** (update in `.env`, default 3001)

### 2. Ask which auth strategies to keep

Present all available strategies and ask the user to pick which ones they need:

- **Cookie** — session-based auth (`src/auth/strategies/cookie.ts`)
- **SIWE** — Sign-In With Ethereum (`src/auth/strategies/siwe.ts`, requires `npm install siwe ethers`)
- **Bearer** — static API key auth (`src/auth/strategies/bearer.ts`)

### 3. Ask which features to keep

Present all optional features:

- **Real-time** — WebSocket invalidation via Postgres LISTEN/NOTIFY (`src/server/ws.ts`)
- **Errorping** — error tracking with Telegram notifications (`src/app/routes/errorping.ts`)
- **Example routes** — messages CRUD + auth routes (`src/app/routes/messages.ts`, `src/app/routes/auth-routes.ts`)

If user selects Errorping, follow up: **which errorping capabilities?**
- Telegram notifications
- Postgres storage (query errors via CLI)
- Both

### 4. Remove unselected features

For each unselected auth strategy, delete its file from `src/auth/strategies/`.

If no cookie AND no siwe selected:
- Delete `src/auth/session.ts`

If no auth strategies at all:
- Delete `migrations/001_sessions.sql`

If no real-time:
- Delete `src/server/ws.ts`
- Remove `ENABLE_REALTIME` block from `src/index.ts`
- Remove `WS_PORT` from `.env` and `docker-compose.yml`

If no errorping:
- Delete `src/app/routes/errorping.ts`
- Delete `migrations/003_error_events.sql`
- Remove `ENABLE_ERRORPING` block from `src/index.ts`
- Remove errorping env vars from `.env` and `docker-compose.yml`
- If bearer was only needed for errorping, also delete `src/auth/strategies/bearer.ts`

If errorping telegram-only (no storage):
- Delete `migrations/003_error_events.sql`
- Remove GET /errorping, GET /errorping/summary, POST /resolve, POST /unresolve routes from `src/app/routes/errorping.ts`
- Remove bearer auth strategy if not independently selected (storage routes need it, telegram-only doesn't)

If errorping storage-only (no telegram):
- Remove Telegram formatting functions and `sendToTelegram` from `src/app/routes/errorping.ts`
- Remove `ERRORPING_BOT_TOKEN` and `ERRORPING_CHAT_ID` from config, `.env`, `docker-compose.yml`

If no example routes:
- Delete `src/app/routes/messages.ts`
- Delete `src/app/routes/auth-routes.ts`
- Delete `migrations/002_messages.sql`
- Remove their registration from `src/index.ts`

### 5. Update src/index.ts

Remove imports and registration blocks for all deleted features. Only keep imports and code for selected features.

### 6. Update src/config.ts

Remove config fields for deleted features:
- `wsPort` if no real-time
- `errorpingBotToken`, `errorpingChatId` if no errorping-telegram
- `errorpingApiKey` if no errorping-storage

### 7. Update .env and docker-compose.yml

- Set project-specific database name
- Remove env vars for deleted features
- Keep only what's needed

### 8. Update package.json

- Set project name
- Remove `ws` and `@types/ws` from dependencies if no real-time
- Add `siwe` and `ethers` if SIWE selected

### 9. Clean up

- Delete `ARCHITECTURE.md` if it exists
- Delete `examples/` directory if it exists
- Run `npm install`
- Run `npx tsc --noEmit` to verify everything compiles

### 10. Confirm

Tell the user what was kept, what was removed, and how to start:
```
docker compose up
curl http://localhost:<port>/health
```
