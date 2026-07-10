# VEDIC HEMP — Engineering Constitution

Read this before writing any code. It is short on purpose.

Vedic Hemp is a regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda
and medical cannabis in India. Three consoles share one platform: buyer, seller, admin.

---

## 0. The rule that outranks every other rule

**The server is the only authority on money, eligibility and state. The client renders; it never decides.**

If a check exists only in React, it does not exist. Every gate in this document is a
database constraint or a server-side guard, and a test proves it.

---

## 1. The Six Prohibitions

These are **absences in the codebase**, not settings. Each is asserted by a test that
fails the build. A PR that deletes, skips or weakens one of these tests fails review
by a CODEOWNERS rule on `tests/prohibitions.test.ts`.

| Code | Prohibition | Enforcement |
|---|---|---|
| **A1** | No `MED_CANNABIS` product may be advertised or promoted, by anyone, ever | No column, no flag, no override endpoint. DB `CHECK` on `AdCampaign`. Filters at API, index and auction. |
| **A2** | No batch of a regulated class becomes sellable without an approved, batch-matched Certificate of Analysis | The publish gate reads `LabReport.status = APPROVED`. There is no `force_sellable`. No bulk CoA approve. |
| **A3** | Safety reports, adverse events, dispensing registers, recall records and audit logs cannot be deleted or altered | `REVOKE DELETE, UPDATE` at the DB role level. Object lock on the bucket. Corrections are new rows referencing the old. |
| **A4** | Health data is viewable only by Pharmacist/Compliance, only with a logged reason, and the buyer is notified | Scope claims on the token. `SensitiveAccessLog` with mandatory `reasonCode`. Buyer notification job. |
| **A5** | No retroactive fee increase | `CHECK (effectiveFrom >= noticeSentAt + interval '30 days')` on `CommissionSchedule`. |
| **A6** | No single admin moves money | `CHECK (makerId <> checkerId)` on every money table. Cumulative-threshold check to prevent split transactions. |

**A prohibition can change — in the open, with reasons, with sign-off, with a new test.
What it cannot do is change quietly.**

---

## 2. Non-negotiable invariants

- **Money is integer paise.** Never a float. Never a client-supplied price. `Int` in Prisma, `BIGINT` in Postgres.
- **Compliance class drives behaviour everywhere.** `HEMP_FOOD | AYURVEDA | CBD_WELLNESS | MED_CANNABIS`.
  Cart eligibility, checkout, shipping, notifications, ads and reviews all branch on it.
- **Restricted products are absent, not hidden.** No blur, no lock icon, no placeholder — those leak the catalogue.
  A buyer without a verified prescription simply does not see `MED_CANNABIS` in recommendations or search.
- **Fail closed on compliance gates; fail open on convenience.** A registry outage must not block a patient
  from viewing their own prescription. A copy-check failure must block a send.
- **Every mutating admin action carries a `reasonCode` plus, for high-impact actions, ≥20 chars of free text.**
  Actions without a reason are rejected at the API.
- **Denied actions are logged too.** What someone *tried* to do is often more informative than what they did.
- **Buyers are never collateral.** Refund the buyer first; recover from the seller afterwards.

---

## 3. Stack

- **Next.js 15** (App Router), TypeScript strict
- **Postgres 16** + **Prisma** — schema in `prisma/schema.prisma`; constraints and grants in raw SQL migrations
- **Auth.js** — passkeys for admin (SMS OTP is *not* accepted for admin auth), email+OTP for buyers
- **S3-compatible object storage** with object lock for CoAs, prescriptions and audit mirrors
- **Separate KMS key** for the sensitive bucket (prescriptions, medical notes)
- **Vitest** for tests; `tests/prohibitions.test.ts` is protected by CODEOWNERS

Data residency: all PII and payment data in Indian regions (`ap-south-1`/`ap-south-2`).

---

## 4. Conventions

- Server logic lives in `src/server/`. Route handlers are thin; they validate input, call a
  service, and return. No business rule lives in a React component.
- Every service function that mutates money, eligibility or state takes an `actor` and writes
  to `AuditLog` **synchronously, before returning**. Losing the log is worse than failing the action.
- Use `src/lib/prohibitions.ts` helpers rather than re-implementing a check. If you find yourself
  writing `if (product.complianceClass !== 'MED_CANNABIS')` inline, use `assertAdvertisable()`.
- Idempotency: every `POST`/`PATCH` that moves money or orders requires an `Idempotency-Key`
  header (UUIDv4, 24h replay window).
- Never return: a full card PAN, a full bank account number, a password hash, a 2FA secret,
  or a prescription image URL without going through the `SensitiveViewer` reason flow.

---

## 5. Build sequence

Work in this order. Each step is deployable and testable on its own.

1. **Schema + prohibitions** — `pnpm prisma migrate dev`, then `pnpm test:prohibitions` must pass.
2. **Auth + roles** — buyer/seller/admin, with the separation-of-duties matrix enforced at grant time.
3. **Catalogue + CoA gate (A2)** — a product cannot go live without an approved, batch-matched lab report.
4. **Orders + payments** — integer paise, idempotency keys, server-computed totals.
5. **Prescriptions (A4)** — encrypted at rest, signed URLs with 5-minute TTL, `SensitiveAccessLog` + buyer notice.
6. **Settlements (A6)** — maker–checker on every run; statements immutable once posted.
7. **Ads (A1)** — three independent layers: API rejects, index omits, auction drops with a logged violation.
8. **Admin console** — queues, maker–checker inbox, audit trail, the Prohibition Registry page.

---

## 6. What "done" means for a feature touching compliance

- [ ] The rule is a database constraint or a server guard, not a UI condition
- [ ] A test asserts the rule holds when the client lies
- [ ] The denied path writes an audit row
- [ ] The error tells the user what to do next (`remediation.label` + `href`), never a bare 403
- [ ] No health data appears in a log line, an analytics event, a push body, or an email subject

---

## 7. Things we deliberately did not build

- A "senior approval" override for the CoA gate. It was considered and rejected: an override
  is a licence to sell an untested cannabinoid product.
- A `force_sellable` flag.
- Screenshot detection on the prescription viewer. It would be theatre. The watermark is the deterrent.
- A superadmin role. `PLATFORM_OWNER` can appoint the people who read prescriptions, approve money
  and adjudicate disputes — it cannot do any of those things itself.

We cannot make insider abuse impossible. We can make it loud, attributable, and slow.
