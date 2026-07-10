# Getting this into your repo, and into Claude Code

Target: `https://github.com/vijaykumarjaglanindia/vedichemp.git`

---

## 1. Push the scaffold

From the folder containing `vedichemp/`:

```bash
cd vedichemp

git init
git branch -M main
git add .
git commit -m "Scaffold: schema, prohibitions A1-A6, guards, tests, constitution"

git remote add origin https://github.com/vijaykumarjaglanindia/vedichemp.git
git push -u origin main
```

If the repo already has commits (say, a README from GitHub's "create repo" screen):

```bash
git pull --rebase origin main
git push -u origin main
```

If `git push` is rejected because the remote has unrelated history and you're sure
the remote is empty of anything you want:

```bash
git push -u origin main --force-with-lease
```

`--force-with-lease` rather than `--force`: it refuses if someone else pushed
since you last fetched. Use it as a habit.

---

## 2. Protect the prohibitions on GitHub

Do this **before** the first feature PR, not after.

**Settings → Branches → Add rule** on `main`:
- ✅ Require a pull request before merging
- ✅ Require review from Code Owners  ← this is what activates `CODEOWNERS`
- ✅ Require status checks to pass — add `test:prohibitions`
- ✅ Do not allow bypassing the above settings *(including for admins — that's the point)*

Then edit `CODEOWNERS` and replace `@compliance-lead @security-lead @cto` with
real GitHub handles. Until you do, the rule matches nobody and protects nothing.

---

## 3. Open it in Claude Code

```bash
claude
```

Claude Code reads `CLAUDE.md` automatically on every task. That file is the
reason it will refuse to add a `force_sellable` column when a future prompt
asks for "a way to publish urgently."

### Your first task, pasted verbatim:

> Read CLAUDE.md. Then get the database up and the prohibitions enforced:
>
> 1. Start Postgres 16 (docker compose or local), create a database `vedichemp_dev`
> 2. Run `prisma/roles.sql` as superuser — the app role must NOT own the WORM tables
> 3. `pnpm prisma migrate dev --name init`
> 4. Apply `prisma/migrations/0001_prohibitions/migration.sql`
> 5. `pnpm db:verify` — all six rows must read `enforced = t`
>
> Then make the database-level prohibition tests pass. Skip the tests that import
> `src/server/*` for now — those services don't exist yet and the tests are their
> specification. Report which tests pass and which are blocked on missing services.
>
> Do not create seed data. Do not add an override flag to anything.

### Your second task:

> Build `src/server/rbac.ts` with the separation-of-duties matrix from CLAUDE.md,
> then make `test_a6_roles_mutually_exclusive` pass. One user may not hold both
> ADMIN_FINANCE and ADMIN_FINANCE_APPROVER, nor both ADMIN_DISPUTE and
> ADMIN_GRIEVANCE, nor both ADMIN_ANALYST and ADMIN_SUPPORT.

Work down the build sequence in `CLAUDE.md` §5 from there. Each step is
deployable on its own, and each depends on the guarantees of the one before.

---

## 4. What is not in this repo yet

Honest inventory, so nothing surprises you:

| Missing | Which test specifies it |
|---|---|
| `src/server/rbac.ts` | `test_a6_roles_mutually_exclusive` |
| `src/server/ads/auction.ts` | `test_a1_auction_drops_class` |
| `src/server/catalogue/publish.ts` | `test_a2_publish_gate` |
| `src/server/compliance/labReports.ts` | `test_a2_no_bulk_approve` |
| `src/server/health/prescriptions.ts` | `test_a4_route_scopes`, `test_a4_log_precedes_url` |
| `src/server/money/settlements.ts` | `test_a6_service_account_cannot_check` |
| `src/server/money/refunds.ts` | `test_a6_threshold_splitting` |
| `tests/setup.ts` | creates the `seed` handles the tests use |
| The Next.js app itself | `src/app/**` — the UI from the three React modules |

The tests were written before the services on purpose. Each one tells Claude Code
exactly what the service must refuse to do.

---

## 5. Before you take real orders

These are decisions, not code, and the specs flagged every one of them:

- **Payment acquirer.** Hemp is high-risk MCC. Razorpay, PayU, Paytm, Stripe and
  PayPal all list cannabis/CBD as prohibited. Get written confirmation from your
  acquirer that they permit the category, in your name, before launch.
- **Supplier of record for `MED_CANNABIS`** — you or the seller? This decides who
  holds the drug licence and who issues the tax invoice.
- **Pharmacist roster.** The 4-hour prescription SLA is unachievable without one.
- **State-wise serviceability matrix** for medical cannabis.
- **Grievance Officer** appointed and contact details published (Consumer
  Protection (E-Commerce) Rules 2020).
- **DPDP**: confirm whether you cross the significant-data-fiduciary threshold
  and therefore need a Data Protection Officer.

None of these block step 1. All of them block launch.
