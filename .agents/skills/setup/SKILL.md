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
- **SIWE** — Sign-In With Ethereum (`src/auth/strategies/siwe.ts`)
- **JWT** — stateless token auth (`src/auth/strategies/jwt.ts`) — requires `JWT_SECRET` env var
- **Bearer** — static API key auth (`src/auth/strategies/bearer.ts`)
- **Custom / None of the above** — user will implement their own strategy later

If the user picks custom/none: delete all strategy files from `src/auth/strategies/`, delete `src/auth/session.ts`, delete `migrations/001_sessions.sql`, and leave a stub comment in `src/index.ts` showing where to register their strategy:
```ts
// Register your auth strategy here:
// auth.registerStrategy(createMyStrategy());
```

### 3. Ask which features to keep

Present all optional features:

- **Real-time** — WebSocket invalidation via Postgres LISTEN/NOTIFY (`src/server/ws.ts`)
- **Errorping** — error tracking with Telegram notifications (`src/app/routes/errorping.ts`)
- **Feedback** — user feedback forum with voting, comments, admin management (`src/app/routes/feedback.ts`)
- **Example routes** — messages CRUD + auth routes (`src/app/routes/messages.ts`, `src/app/routes/auth-routes.ts`)

If user selects Errorping, follow up: **which errorping capabilities?**
- Telegram notifications
- Postgres storage (query errors via CLI)
- Both

### 4. Remove unselected features

For each unselected auth strategy, delete its file from `src/auth/strategies/` and clean up all references — registration in `src/index.ts`, config fields in `src/config.ts`, env vars in `.env`/`.env.example`/`docker-compose.yml`, or any other thing you find related to unselected things.

If no cookie AND no siwe (no session-based auth at all):
- Delete `src/auth/session.ts`
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

If no feedback:
- Delete `src/app/routes/feedback.ts`
- Delete `migrations/004_feedback.sql`
- Remove `ENABLE_FEEDBACK` block from `src/index.ts`
- Remove feedback env vars from `.env` and `docker-compose.yml`
- If bearer was only needed for feedback, also delete `src/auth/strategies/bearer.ts`

If no example routes:
- Delete `src/app/routes/messages.ts`
- Delete `src/app/routes/auth-routes.ts`
- Delete `migrations/002_messages.sql`
- Remove their registration from `src/index.ts`

### 5. Renumber remaining migrations

After deleting unused migration files, renumber the remaining ones sequentially starting from `001_`. For example, if the user only keeps feedback, rename `004_feedback.sql` to `001_feedback.sql`. Migrations run in alphabetical order — gaps in numbering work but clean numbering is preferred.

### 6. Update src/index.ts

Remove imports and registration blocks for all deleted features. Only keep imports and code for selected features.

### 7. Update src/config.ts

Remove config fields for deleted features:
- `wsPort` if no real-time
- `errorpingBotToken`, `errorpingChatId` if no errorping-telegram
- `errorpingApiKey` if no errorping-storage
- `feedbackAdminKey` if no feedback
- Add `jwtSecret` if JWT selected

### 8. Update .env and docker-compose.yml

- Set project-specific database name
- Remove env vars for deleted features
- Add `JWT_SECRET` if JWT selected
- Keep only what's needed

### 9. Update package.json

- Set project name
- Remove `ws` and `@types/ws` if no real-time
- Remove `siwe` and `ethers` if no SIWE
- Remove `jsonwebtoken` and `@types/jsonwebtoken` if no JWT

### 10. Clean up

- Delete `ARCHITECTURE.md` if it exists
- Delete `examples/` directory if it exists
- Run `npm install`
- Run `npx tsc --noEmit` to verify everything compiles

### 11. Confirm and guide next steps

**Note to agent:** The next steps below are a guide. Use your judgement — if you notice something relevant to the user's choices that isn't listed here (e.g. a dependency conflict, a better migration order, additional cleanup, relevant warnings), go ahead and include it.

Tell the user what was kept, what was removed, and then provide a **Next steps** checklist tailored to their choices:

**Always:**
- [ ] Review and set env vars in `.env` (database name, ports, API keys, secrets)
- [ ] Start the app: `docker compose up`
- [ ] Verify: `curl http://localhost:<port>/health`
- [ ] Create your DB schema — add migration files in `migrations/` for your app's tables (e.g. `001_users.sql`, `002_products.sql`)
- [ ] Add your routes in `src/app/routes/` and register them in `src/index.ts`

**If custom auth selected:**
- [ ] Implement your auth strategy in `src/auth/strategies/` — it must export a function returning `{ name, authenticate(req, body) }` (see `AuthStrategy` in `src/auth/types.ts`)
- [ ] Register it in `src/index.ts` where the stub comment is
- [ ] If your strategy needs sessions, create a sessions migration and use the `SessionStore` from `src/auth/session.ts`

**If JWT selected:**
- [ ] Set `JWT_SECRET` in `.env` — use a strong random string (e.g. `openssl rand -hex 32`)
- [ ] Create a login route that verifies credentials and returns a signed token using `signJwt()` from `src/auth/strategies/jwt.ts`

**If cookie/SIWE selected:**
- [ ] Replace the example login route (`src/app/routes/auth-routes.ts`) with your real authentication logic — the current one accepts any username without a password

**If errorping selected:**
- [ ] Set `ERRORPING_BOT_TOKEN` and `ERRORPING_CHAT_ID` for Telegram notifications, `ERRORPING_API_KEY` for query access

**If feedback selected:**
- [ ] Set `FEEDBACK_ADMIN_KEY` for admin operations (status updates, moderation)
