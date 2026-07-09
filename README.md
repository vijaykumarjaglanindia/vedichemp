# Vedic Hemp — Platform

A regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda and medical
cannabis in India. Three consoles, one platform: **buyer**, **seller**, **admin**.

Read **[CLAUDE.md](./CLAUDE.md)** first. It is the engineering constitution and it
is short on purpose.

---

## Quick start

```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL

# 1. Roles first — the app role must NOT own the WORM tables.
psql "$MIGRATE_DATABASE_URL" -f prisma/roles.sql

# 2. Schema.
pnpm prisma migrate dev

# 3. The prohibitions. This is the step people skip. Do not skip it.
psql "$MIGRATE_DATABASE_URL" -f prisma/migrations/0001_prohibitions/migration.sql

# 4. Prove they hold.
pnpm test:prohibitions
```

If step 4 fails, **stop**. The application is not safe to run.

Check enforcement at any time, including in production:

```sql
SELECT * FROM prohibition_status;
--  code | enforced
--  A1   | t
--  A2   | t   ... all six must be true
```

---

## What is real, and what is not

There is **no seed data and no demo mode**. Every list starts empty. A product
appears when a verified seller creates it; a prescription exists when a buyer
uploads one and a pharmacist signs it. This is deliberate: demo data in a
compliance system teaches the wrong lesson about what the system guarantees.

To develop against something, use `pnpm db:fixture` — it creates a *throwaway*
seller and product **in a database named `vedichemp_dev` only**, and refuses to
run if `NODE_ENV=production`.

---

## The application

One Next.js 15 (App Router) codebase serves the public website and all three
consoles. Route handlers are thin; every business rule lives in `src/server/`
and, for the prohibitions, in the database.

```
src/
├── app/
│   ├── (site)/            Public website — home, catalogue, product, trust, sell
│   ├── account/           Buyer dashboard (Module 1)
│   ├── seller/            Seller Central (Module 2)
│   ├── admin/             Marketplace Operations Console (Module 3)
│   └── api/v1/            Thin route handlers → services (publish, refunds,
│                          settlements approve, Rx signed-URL, ad auction, …)
├── components/
│   ├── ui/                Shared library (§0.5): MoneyText, StatusPill,
│   │                      ComplianceBadge, DataTable, Timeline, Banner, …
│   └── shell/             ConsoleShell chrome shared by the three consoles
├── lib/                   money (integer paise → ₹ Indian grouping), compliance
│                          class metadata, prohibition guards, db client
└── server/               Services: catalogue/publish (A2), health/prescriptions
                          (A4), money/settlements + refunds (A6), ads/auction
                          (A1), compliance/labReports (A2), rbac (SoD)
```

Run it:

```bash
pnpm dev        # http://localhost:3000  → website + /account /seller /admin
pnpm typecheck  # strict, noUncheckedIndexedAccess
```

**Where compliance is visible in the UI.** The consoles render what the server
decided, and they make the prohibitions legible: MED_CANNABIS is *absent* from
every public and recommendation surface (A1); a batch shows its CoA state and a
disabled Publish with remediation when the CoA is missing (A2); the admin
Prohibition Registry (`/admin/prohibitions`) mirrors the `prohibition_status`
view; the maker–checker inbox refuses self-approval (A6); the prescription view
is a reason-code flow that notifies the buyer, never a bare image link (A4).

> The UI is fed by `src/lib/sample.ts` — *illustrative* data so the consoles can
> be reviewed without a live Postgres. It is not database seed: the real system
> still starts empty (see below), and the sample set deliberately contains no
> advertisable MED_CANNABIS surface.

## Build sequence

Each step is deployable and testable on its own. Do them in order; later steps
depend on the guarantees of earlier ones.

1. **Schema + prohibitions** — `pnpm test:prohibitions` green
2. **Auth + roles** — separation of duties enforced at grant time
3. **Catalogue + CoA gate (A2)**
4. **Orders + payments** — integer paise, idempotency keys, server-computed totals
5. **Prescriptions (A4)** — encrypted, signed URLs, access log, buyer notice
6. **Settlements (A6)** — maker–checker, statements immutable once posted
7. **Ads (A1)** — API rejects, index omits, auction drops
8. **Admin console** — queues, maker–checker inbox, audit trail

---

## The six prohibitions

| Code | Prohibition |
|---|---|
| A1 | No `MED_CANNABIS` product may be advertised or promoted, by anyone, ever |
| A2 | No batch becomes sellable without an approved, batch-matched CoA |
| A3 | Safety, adverse-event, dispensing, recall and audit records cannot be deleted or altered |
| A4 | Health data: Pharmacist/Compliance only, logged reason, buyer notified |
| A5 | No retroactive fee increase (30 days' notice, DB-enforced) |
| A6 | No single admin moves money (maker ≠ checker, both human) |

They live in `prisma/migrations/0001_prohibitions/migration.sql` as constraints and
triggers, in `src/lib/prohibitions.ts` as guards, and in `tests/prohibitions.test.ts`
as tests that fail the build.

`CODEOWNERS` protects the test file. A pull request that weakens one of these tests
fails review by policy and by CI.

**A prohibition can change — in the open, with reasons, with sign-off, with a new
test. What it cannot do is change quietly.**
