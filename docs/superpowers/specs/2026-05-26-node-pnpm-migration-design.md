# Node and pnpm Migration Design

## Summary

Migrate the repo fully from Bun to Node 24 LTS and pnpm. This is a runtime, package manager, script, test, and documentation migration. After the migration, the app, database migrations, data generators, and tests should run without Bun.

## Goals

- Use Node 24 LTS as the supported runtime.
- Use pnpm as the only package manager.
- Preserve exact direct dependency versions resolved in the current `bun.lock`.
- Configure pnpm with a one-week minimum release age.
- Remove Bun-specific runtime APIs from application, scripts, and tests.
- Update project docs and memory-bank decisions so they no longer contradict the new runtime choice.

## Non-Goals

- Do not change the product behavior or UI.
- Do not change the TanStack Start architecture.
- Do not move away from local SQLite.
- Do not introduce a separate API server.
- Do not broadly upgrade dependencies beyond what the migration requires.

## Package Management

`package.json` will declare Node 24 LTS support through `engines.node` and pin pnpm through `packageManager`. Direct dependencies and dev dependencies will be pinned to exact versions from the current `bun.lock` rather than range specifiers.

The repository will use `pnpm-lock.yaml` and no longer use `bun.lock`. Project pnpm settings will live in `pnpm-workspace.yaml`, including:

```yaml
packages:
  - .

minimumReleaseAge: 10080
```

`10080` is seven days expressed in minutes.

## Runtime Changes

SQLite access will move from `bun:sqlite` and `drizzle-orm/bun-sqlite` to `better-sqlite3` and `drizzle-orm/better-sqlite3`. Do not use Node's native `node:sqlite` module for this migration. This keeps the current synchronous SQLite usage model while using the Drizzle adapter with stronger ecosystem support.

Tests will move from `bun:test` to Vitest. Existing test files should keep their current structure where possible, replacing only imports and script wiring.

TypeScript scripts will run under `tsx` for database migrations and static data generation scripts.

Filesystem access will use Node APIs:

- `Bun.file(...).text()` becomes `readFile(..., "utf8")`.
- `Bun.write(...)` becomes `writeFile(...)`.

## Scripts

`package.json` scripts will use pnpm and Node-compatible commands:

- `dev`: Vite dev server.
- `build`: Vite build.
- `typecheck`: unchanged TypeScript no-emit check.
- `test`: Vitest.
- `db:generate`: Drizzle Kit generation.
- `db:migrate`: Node-compatible execution of `src/db/migrate.ts`.
- static data generators: Node-compatible execution of the existing TypeScript generator files.
- `auth:generate`: pnpm execution of the Better Auth CLI.

## Documentation and Memory Bank

The migration will update:

- `AGENTS.md`: dev environment changes from Bun-only to pnpm-only.
- `README.md`: replace Bun init/install/run instructions with pnpm install, dev, build, test, and migration commands.
- `memory-bank/backend-decisions.md`: runtime changes to Node 24 LTS and pnpm.
- `memory-bank/design.md`: storage/runtime and generation command references change from Bun commands to pnpm commands.

## Verification

Verification should include:

- Generate `pnpm-lock.yaml` with pnpm.
- Confirm direct dependency versions in `package.json` match the versions resolved in `bun.lock`.
- Compare relevant pnpm lock resolutions against `bun.lock` and document unavoidable transitive differences, if any.
- Run typecheck.
- Run tests.
- Run build.
- Run at least one Node-converted script or database migration command when safe.
- Search for remaining Bun-specific runtime usage and remove it unless it is intentionally historical documentation.

## Risks

The main implementation risk is native SQLite dependency installation. `better-sqlite3` is still the recommended path because it maps closely to current synchronous SQLite behavior and has a supported Drizzle adapter.

pnpm peer resolution may not produce byte-for-byte transitive parity with Bun. The requirement is exact direct dependency preservation from the current lockfile, with any unavoidable transitive differences documented during implementation.

The one-week pnpm release age can block newly added packages. New runtime packages should use versions older than the threshold when possible.

## Open Questions

None.
