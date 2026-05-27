# MTG Codex Backend Decisions

## Architecture
- TanStack Start fullstack framework.
- Modular layout, not monolithic.
- Use `src/` for all frontend and backend code.
- Server and routes follow TanStack Start file-based conventions.

## Server and Runtime
- Node 24 LTS runtime.
- pnpm package manager.
- TanStack Start server runtime (no separate Fastify app).
- Env-based config with defaults (location TBD).
- Server error handling follows TanStack Start conventions.

## API Conventions
- UI routes do not use `/api` prefix.
- If rare API-only endpoints are needed, they may use `/api`.
- Routes and server functions defined via TanStack Start.
- Response shapes follow Start handler conventions (no response envelope).
- Validation deferred; Valibot preferred when added.

## Health Check
- Health endpoint location TBD under TanStack Start routing.

## Auth
- Better Auth with TanStack Start cookies plugin.
- Current provider: Google OAuth.
- Email and password sign-in is not currently configured or exposed in the login UI; treat it as future work unless product requirements change.
- Use Drizzle adapter with SQLite.
- Require username setup after first OAuth login (no existing users).
- Usernames are editable later via account settings.
- Env vars (initial, may expand as Better Auth config is finalized):
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

## Data and Storage
- SQLite for minimal overhead.
- SQLite access uses `better-sqlite3`, not Node's native `node:sqlite`.
- Drizzle ORM with `drizzle-kit` for schema/migrations (schema defined in TypeScript).
- Scryfall cache in same DB.

## Scryfall Integration
- Existing client handles rate and caching policy.

## Codex Expiration and Cleanup
- Cleanup on the fly for expired codices (no cleanup endpoint).
- Current expiration duration is 30 days hardcoded in `src/actions/createCodex.ts`.
- Env-configurable expiration is future work if still desired.

## Deployment
- Nitro deployment target.
- No containerization planned.
- `.env` support.

## Minimal Folder Layout
```
src/
  routes/
  db/
    schema.ts
```

## Cleanup Endpoint
- Removed in favor of on-the-fly cleanup.
