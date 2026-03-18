# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Commands

```bash
# Development (hot reload via tsx watch)
npm run dev                              # requires DATABASE_URL env var
docker compose up                        # starts Postgres + app with hot reload

# Build & run production
npm run build                            # tsc → dist/
npm start                                # node dist/index.js

# Tests (node:test runner via tsx)
npm test                                 # all tests
npx tsx --test tests/router.test.ts      # single test file
```

## Architecture

Minimal Node.js backend template: raw `node:http` server, PostgreSQL via `pg`, optional WebSocket via `ws`. ESM throughout (`"type": "module"`).

### Request pipeline

Route match → rate limit (in-memory sliding window) → parse JSON body → validate → authenticate → handler → JSON response.

### Key interfaces

- **`RouteConfig`** (`src/server/router.ts`) — route definition: method, path (`:param` syntax), auth requirement, optional rate limit/validate, handler function
- **`HandlerContext`** — injected into handlers: `req`, `params`, `body`, `db`, `auth`, `changes`
- **`DbAdapter`** (`src/db/pool.ts`) — `query()` + `transaction()`, no ORM, parameterized SQL only
- **`AuthStrategy`** (`src/auth/types.ts`) — `name` + `authenticate()` returning `AuthContext | null`
- **`ChangeNotifier`** (`src/db/changes.ts`) — `notify(resource, ...scope)` for real-time invalidation signals; Postgres LISTEN/NOTIFY or noop implementation
- **`AuthRequirement`** — `"public"` | `{ strategy: string }` | `Array<{ strategy: string }>`

### Where app code lives

All application code goes in `src/app/`. Routes in `src/app/routes/`, each exporting `RouteConfig` or `RouteConfig[]`. Routes are registered in `src/index.ts`.

### Imports

Use `.js` extensions in all imports (ESM + NodeNext resolution): `import { foo } from "./bar.js"`.

### Migrations

Numbered SQL files in `migrations/` (e.g., `002_users.sql`). Auto-run on startup in order, tracked in `_migrations` table. Each runs in a transaction.

### Optional features (env-gated in `src/index.ts`)

- **Real-time**: `ENABLE_REALTIME=true` — starts WS server on `WS_PORT`, uses Postgres LISTEN/NOTIFY
- **Errorping**: `ENABLE_ERRORPING=true` — error tracking routes with Telegram notifications
- **Feedback**: `ENABLE_FEEDBACK=true` — user feedback forum (bug reports, feature requests) with admin management via bearer auth
- **CORS**: `CORS_ORIGIN=*` — set allowed origin for cross-origin requests

### Auth strategies requiring extra packages

- **SIWE** (`src/auth/strategies/siwe.ts`): uses `siwe` + `ethers` (pre-installed, remove if unused)
- **JWT** (`src/auth/strategies/jwt.ts`): uses `jsonwebtoken` (pre-installed, remove if unused)
- Cookie, Bearer: no extra packages needed

### Agent skills

- **`/setup`** — interactive post-clone setup. Asks which features to keep, removes everything else, updates config files. Run this after cloning.

### Tests

Uses Node.js built-in test runner (`node:test`) with `assert/strict`. Tests are in `tests/*.test.ts`. No external test framework.
