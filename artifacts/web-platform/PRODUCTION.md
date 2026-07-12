# Vedic Hemp Web Platform — Go-Live Checklist

What is real today, what runs in demo mode, and the exact seams where
production services attach. Everything below the seam is already built and
enforced — attaching infrastructure activates it.

## Working end-to-end today (no external services)

| Capability | How it works |
|---|---|
| Browse, search, filter | Server-rendered; generative search parses natural-language queries; A1 keeps the medical catalogue absent for public visitors |
| **Cart** | httpOnly cookie; totals computed server-side in integer paise; ₹100/free-≥₹5,000 shipping rule |
| **Checkout → order** | Server-action validation (name/mobile/PIN/age-gate), draft preserved on error, server-issued order reference, confirmation page with the marketplace flow |
| **Sessions** | Signed (HMAC) httpOnly cookie via `/signin`; middleware protects `/account`, `/seller`, `/admin`; sign-out in Profile |
| Consoles | Buyer / Seller / Admin render the full operating model incl. every A1–A6 surface |
| SEO | sitemap, robots, Product/FAQ/Breadcrumb/Organization JSON-LD |

## Attach production services (the seams)

1. **Database — `DATABASE_URL` (+ `MIGRATE_DATABASE_URL`)**
   - `psql -f prisma/roles.sql` → `pnpm prisma migrate dev` → apply
     `prisma/migrations/0001_prohibitions/migration.sql` → `pnpm test:prohibitions`
     **must pass before serving traffic.**
   - Seams: `src/lib/cart.ts` (catalogue lookup → Prisma), `placeOrder` in
     `src/app/(site)/cart/actions.ts` (confirmation cookie → `db.order.create`
     with the idempotency key), console pages (sample data → `src/server/*`
     services, which are already DB-backed).
2. **Auth — `AUTH_SECRET` (+ Auth.js providers)**
   - Today `AUTH_SECRET` signs the lite session; set it in every environment.
   - Production: Auth.js issuers — **email+OTP for buyers, passkeys for admins
     (SMS OTP is not accepted for admin)**. Consumers (`getSession`,
     middleware, header chip) keep working unchanged; roles then come from the
     account record instead of the sign-in form.
3. **Payments** — PSP-hosted fields (PCI-DSS SAQ-A). Seam: the `payment`
   branch in `placeOrder`; UPI/card today record the method and confirm.
4. **Object storage** — CoA + prescription buckets (object lock; separate KMS
   CMK for health data). Seam: `src/server/health/storage.ts` presigner.
5. **Notifications** — order/Rx/security events per §0.9 matrix. Seam:
   `SensitiveAccessLog.buyerNotifiedAt` writer + order lifecycle hooks.

## Hard gates before real buyers

- [ ] `pnpm test:prohibitions` green against the production database
- [ ] `SELECT * FROM prohibition_status;` → all six `enforced = t`
- [ ] `AUTH_SECRET` rotated from the dev default
- [ ] Data residency: DB/buckets in ap-south-1/ap-south-2
- [ ] Seller Marketplace Agreement flow attached to seller onboarding
- [ ] Age verification on delivery handover instructed to couriers (CBD)

## Environment variables

| Var | Purpose |
|---|---|
| `DATABASE_URL` | App role (`vedichemp_app`) — no UPDATE/DELETE on WORM tables |
| `MIGRATE_DATABASE_URL` | Migrator role, migrations only |
| `AUTH_SECRET` | Session signing (lite today, Auth.js later) |
| `BASE_PATH` | Optional path prefix (Replit sets `/web-platform`) |
| `SENSITIVE_BUCKET`, `SENSITIVE_KMS_KEY_ID`, `COA_BUCKET` | Object storage seams |
