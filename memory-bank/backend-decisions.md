# MTG Codex Backend Decisions

## Architecture
- Modular layout, not monolithic.
- Keep backend flat at `backend/` (no `src`).
- Create `backend/routes/` and add other folders as needed later.

## Server and Runtime
- Bun runtime.
- Fastify with default logger enabled.
- Env-based config with defaults.
- Default Fastify error handling for now.
- Centralized backend config module in `backend/config.ts` for env access.

## API Conventions
- All routes prefixed with `/api`.
- No response envelope.
- Validation deferred; Valibot preferred when added.

## Health Check
- `GET /api/health`, raw `200`, unauthenticated.

## Auth
- Sessions table in SQLite.
- Use Fastify OAuth plugin for Google flow.
- Auth guard via `preHandler`.

## Data and Storage
- Bun built-in SQLite driver.
- Drizzle ORM with `drizzle-kit` for schema/migrations (schema defined in TypeScript).
- Scryfall cache in same DB.

## Scryfall Integration
- Existing client handles rate and caching policy.

## Codex Expiration and Cleanup
- Scheduled deletion, not lazy refresh.
- Daily cleanup via endpoint(s) invoked by external scheduler.
- Cleanup removes expired codices and old sessions.
- Expiration duration configured by env var.

## Deployment
- Containerized deployment via podman.
- `.env` support.

## Minimal Folder Layout
```
backend/
  index.ts
  routes/
    health.ts
    cleanup.ts
  db/
    schema.ts
```

## Cleanup Endpoint
- `POST /api/maintenance/cleanup`
- Auth: protected with a shared secret header.
- Response: `{ "deletedCodices": number, "deletedSessions": number }`
  - Header: `x-cleanup-secret`

## Scheduler
- External scheduler triggers cleanup daily.
- Env vars:
  - `CLEANUP_SHARED_SECRET`
  - `CLEANUP_CRON` (default `0 3 * * *`)
