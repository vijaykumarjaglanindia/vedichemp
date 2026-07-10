# Vedic Hemp

A compliance-first hemp/cannabis commerce foundation: six prohibitions (A1–A6) are enforced directly in PostgreSQL via constraints and triggers, with a small web page and API endpoint that report live enforcement status.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter vedichemp run dev` — run the imported Next.js marketplace (`artifacts/web-platform`, port 21596, preview path `/web-platform/`; needs `PORT` and `BASE_PATH` env, set in its artifact.toml)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only, Drizzle side)
- `pnpm --filter @workspace/api-server exec prisma generate` — regenerate the Prisma client after editing `schema.prisma`
- `pnpm --filter @workspace/api-server exec prisma db push` — push Prisma schema to the dev DB (then re-apply `prisma/migrations/0001_prohibitions/migration.sql` if tables were recreated)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Prisma ORM v6 (domain schema; ported from the Vercel import) alongside the scaffold's Drizzle setup (`lib/db`, currently empty)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle); `@prisma/client` is marked external in `artifacts/api-server/build.mjs`

## Where things live

- `artifacts/api-server/prisma/schema.prisma` — source of truth for the domain schema (Prisma)
- `artifacts/api-server/prisma/migrations/0001_prohibitions/migration.sql` — DB-level prohibition enforcement (constraints, triggers, `prohibition_status` view)
- `artifacts/api-server/prisma/roles.sql` — DB roles (`vedichemp_app`, `vedichemp_migrator`, NOLOGIN) and grants
- `artifacts/api-server/src/lib/prohibitions.ts` — application-level guard functions (defense in depth on top of DB enforcement)
- `artifacts/api-server/src/routes/prohibitions.ts` — `GET /api/prohibitions` reads the `prohibition_status` view
- `artifacts/api-server/tests/`, `artifacts/api-server/scripts/fixture.ts` — ported vitest tests and fixture script (see Gotchas)
- `artifacts/vedichemp/src/pages/prohibition-registry.tsx` — status page at `/`
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `VEDICHEMP.md`, `CLAUDE.md`, `PUSH.md` — ported project docs describing the prohibition model

## Architecture decisions

- Prohibitions A1–A6 are enforced in the database itself (CHECK constraints, triggers, immutable views), not just in application code — one bug must not produce an unlawful outcome.
- Kept Prisma (not migrated to Drizzle) for fidelity with the imported schema and its migration SQL.
- DB roles are created NOLOGIN on Replit; the app connects via `DATABASE_URL` (Replit-managed credentials) rather than dedicated login roles.
- Contract-first API: OpenAPI spec → Orval codegen → Zod schemas (server) + React Query hooks (frontend).

## Product

- Prohibition Registry page (`/`) showing live enforcement status of A1–A6 read from the `prohibition_status` view.
- `GET /api/prohibitions` — enforcement status endpoint.
- Marketplace (`artifacts/web-platform`, Next.js 15, preview path `/web-platform/`): full buyer/seller/admin marketplace built externally by the user via Claude (GitHub PR #1) and imported. Do NOT build features here — the user develops it with Claude; Replit only hosts/wires it. Routes live under `src/app` (`(site)` group: catalogue, products, sell, store, trust, about; plus `admin`, `seller`, `account`, `api`). Own Prisma schema identical to api-server's (same DB). Package name is `vedichemp` (not `@workspace/*`).
- Mobile companion (`artifacts/vedichemp-mobile`, Expo, preview path `/vedichemp-mobile/`): single-screen Prohibition Registry mirroring the web app, using the shared `useGetProhibitionStatus` hook from `@workspace/api-client-react` (base URL wired from `EXPO_PUBLIC_DOMAIN` in `app/_layout.tsx`). Theme tokens synced from the web app into `constants/colors.ts`. iOS bundle id: `com.replit.vedichempmobile` (do not change).

## User preferences

- The marketplace (`artifacts/web-platform`) is developed by the user with Claude via GitHub — do not build features in it here; Replit only configures/wires/hosts it.

## Gotchas

- The ported vitest tests import `src/server/*` modules that never existed in the import (spec-first scaffold); they can't run as-is. Enforcement was verified directly via SQL against the `prohibition_status` view and rejection smoke tests.
- `scripts/fixture.ts` refuses to run unless the database is named `vedichemp_dev` (by design); the Replit dev DB has a different name.
- After any `prisma db push` that recreates tables, re-apply `prisma/migrations/0001_prohibitions/migration.sql` or the prohibitions lose enforcement — check `SELECT * FROM prohibition_status`.
- Prisma must stay on v6 (v7 breaks the generated client setup here); prisma packages are listed in `onlyBuiltDependencies` in `pnpm-workspace.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
