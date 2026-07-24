# Vedic Hemp Web Platform — Launch Runbook

What is real today, what runs in demo mode, and the exact seams where
production services attach. Everything below each seam is already built and
enforced — attaching infrastructure activates it; no application code changes.

## Working end-to-end today (no external services)

| Capability | How it works |
|---|---|
| Browse, search, filter | Server-rendered; synonym + typo-tolerant search; A1 keeps the medical catalogue absent for public visitors |
| **Cart & checkout** | httpOnly cookie; totals in integer paise computed server-side; shipping/coupons/gift cards from admin-set commerce settings; payment methods are whatever the admin enabled (prepaid-only by default, COD is a switch) |
| **Sessions & sign-in** | Three separate doors — `/signin` (buyers), `/seller-login` (sellers), `/vh-admin` (operators, unlisted). Email, phone OTP, Google and Facebook seams; HMAC-signed httpOnly cookie; middleware guards `/account`, `/seller`, `/admin` |
| **Consoles** | Buyer / Seller / Admin, incl. every A1–A6 surface, maker–checker inboxes, audit trail with denials |
| **CMS layer** | WYSIWYG everywhere, page builder, media library, menus, revisions, scheduled publishing, feature switchboard, theme presets (light only), JSON export/import — every public copy surface is editable and claims-checked |
| **Legal pages** | `/legal/terms`, `/legal/privacy`, `/legal/returns`, `/legal/shipping` — content-managed like everything else |
| SEO | sitemap, robots, canonicals, OG image, Organization/WebSite+SearchAction/Product/Article/FAQPage/Breadcrumb JSON-LD |
| Security headers | frame-ancestors allow-list, nosniff, Referrer-Policy, Permissions-Policy, HSTS (see `next.config.mjs`) |

## Deploy on Replit (Postgres + durable data)

The workspace already targets Replit (`nodejs-24` + `postgresql-16` modules,
`.replit` at the repo root). To bring the web platform up on Replit with a real,
**persistent** database:

1. **Create the database.** Add Replit's PostgreSQL — it injects `DATABASE_URL`.
   (Optionally set `MIGRATE_DATABASE_URL` to a role that can create roles; the
   setup falls back to `DATABASE_URL`.)
2. **Provision the schema, constraints and roles — one command:**
   ```
   pnpm --filter vedichemp run db:setup
   ```
   This runs `prisma db push` (creates every table incl. `AppSnapshot`), applies
   the raw A1–A6 constraint/trigger migrations `0001–0004`, and prints
   `prohibition_status` — **every row must read `enforced = t` before serving.**
3. **Set the secrets** (Replit → Secrets): at minimum `AUTH_SECRET` (a long
   random string — the app now **refuses to start signing sessions with the dev
   default in production**). See "Environment variables" below for the rest.
4. **Deploy as a single instance.** The pilot data layer (below) assumes ONE
   writer, so use a **Reserved VM**, not Autoscale. Autoscale runs multiple
   instances that would overwrite each other's snapshots.

### Durable data — the pilot persistence bridge

The live application stores (catalogue, orders, accounts, … — the
`globalThis.__vh*` seam) are snapshotted to the `AppSnapshot` table:
`src/instrumentation.ts` **hydrates** them on boot and **flushes** them every few
seconds and on shutdown (`SIGTERM`), so data survives a redeploy or restart. It
is a no-op without `DATABASE_URL`. Limits, stated honestly:

- **Single writer only** (Reserved VM). Two instances corrupt each other's snapshots.
- **A few seconds of the most recent writes** can be lost on a hard crash.
- It holds **no money/eligibility authority** — the compliance tables and their
  A1–A6 constraints remain the source of truth; a forged snapshot cannot bypass
  a DB `CHECK`, a WORM trigger, or maker–checker.

This is the bridge that makes a hosted pilot durable now. Each store is meant to
graduate to its own relational model over time (`src/lib/persist.ts` → drop the
key from `STORE_KEYS` once its table lands); that is the path to a multi-instance,
zero-loss production database.

## Attach production services (the seams)

1. **Database — `DATABASE_URL` (+ `MIGRATE_DATABASE_URL`)**
   - `psql -f prisma/roles.sql` → `pnpm prisma migrate dev` → apply
     `prisma/migrations/0001_prohibitions/migration.sql` → `pnpm test:prohibitions`
     **must pass before serving traffic** (28 checks incl. all six prohibitions).
   - Seams: `src/lib/cart.ts` (catalogue lookup → Prisma), `placeOrder` in
     `src/app/(site)/cart/actions.ts` (confirmation cookie → `db.order.create`
     with the idempotency key), the `globalThis.__vh*` stores (each one is a
     single-table swap: site content, CMS posts/revisions, media, features,
     payments, commerce, commissions, audit log).
2. **Auth — `AUTH_SECRET`**
   - Signs sessions and OTP challenges; **rotate from the dev default in every
     environment.**
   - `SMS_API_KEY` — phone OTP delivery. Unset = sandbox mode (code shown
     on-screen); set = codes go out via your SMS provider at the seam in
     `src/app/(site)/signin/actions.ts`.
   - `GOOGLE_CLIENT_ID`, `FACEBOOK_CLIENT_ID`, `OAUTH_REDIRECT_BASE` — real
     OAuth consent screens. Unset = sandbox chooser. Seam:
     `src/app/api/v1/auth/[provider]/route.ts`.
   - Admin auth stays passkey-first: SMS OTP is **not** accepted for admin,
     and the operator door (`/vh-admin`) is never linked from public pages.
3. **Payments** — the admin picks the gateway (Razorpay / PhonePe / Cashfree /
   Stripe) and switches methods in Admin → Finance → Payments. PSP API keys
   attach at the `payment` branch of `placeOrder` (PSP-hosted fields,
   PCI-DSS SAQ-A); the server-side whitelist already rejects any method the
   admin has not enabled.
4. **AI — `ANTHROPIC_API_KEY`** (optional `OPENAI_API_KEY` label support).
   Unset = deterministic fallbacks so every AI surface still renders; set =
   live model calls through `src/lib/ai.ts`. All AI output passes the claims
   copy-check before display — a key does not bypass compliance.
5. **Object storage** — `SENSITIVE_BUCKET`, `SENSITIVE_KMS_KEY_ID`,
   `COA_BUCKET`. CoA + prescription buckets (object lock; separate KMS CMK
   for health data). Seam: `src/server/health/storage.ts` presigner.
6. **Notifications** — order/Rx/security events. Seam:
   `SensitiveAccessLog.buyerNotifiedAt` writer + order lifecycle hooks.

## Hard gates before real buyers

- [ ] `pnpm test:prohibitions` green against the production database
- [ ] `SELECT * FROM prohibition_status;` → all six `enforced = t`
- [ ] `AUTH_SECRET` rotated from the dev default
- [ ] Data residency: DB/buckets in ap-south-1/ap-south-2
- [ ] Legal pages reviewed by counsel (defaults are launch drafts, editable at
      Admin → Site content → Legal & policies)
- [ ] Seller Marketplace Agreement flow attached to seller onboarding
- [ ] Age verification on delivery handover instructed to couriers (CBD, 21+)
- [ ] PSP account live + webhook secret configured before enabling real charges

## Environment variables

| Var | Purpose |
|---|---|
| `DATABASE_URL` | App role (`vedichemp_app`) — no UPDATE/DELETE on WORM tables |
| `MIGRATE_DATABASE_URL` | Migrator role, migrations only |
| `AUTH_SECRET` | Session + OTP signing — rotate per environment |
| `SMS_API_KEY` | Phone-OTP delivery (unset = on-screen sandbox codes) |
| `GOOGLE_CLIENT_ID` / `FACEBOOK_CLIENT_ID` | Real OAuth sign-in (unset = sandbox chooser) |
| `OAUTH_REDIRECT_BASE` | Public origin for OAuth callbacks, e.g. `https://vedichemp.in` |
| `ANTHROPIC_API_KEY` | Live AI suites (unset = deterministic fallbacks) |
| `BASE_PATH` | Optional path prefix (Replit sets `/web-platform`) |
| `SENSITIVE_BUCKET`, `SENSITIVE_KMS_KEY_ID`, `COA_BUCKET` | Object storage seams |

PSP (gateway) API keys are configured per-gateway once the PSP account
exists — they attach at the `placeOrder` seam, not as app-wide env vars,
so a leaked app environment never contains charge credentials.
