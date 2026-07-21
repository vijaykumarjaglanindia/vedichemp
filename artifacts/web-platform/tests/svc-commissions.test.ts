/**
 * VEDIC HEMP — A5 COMMISSION-SCHEDULE SERVICE TESTS
 *
 * A5: no retroactive fee increase. A change to a seller's commission takes effect
 * only after at least 30 days' notice, and only a finance admin may make it.
 * These talk to the same real Postgres as the prohibition suite (migration 0001,
 * constraint a5_thirty_day_notice) over the shared seed in tests/setup.ts.
 *
 * The notice clock is anchored SERVER-SIDE: the service stamps noticeSentAt = now
 * and is not given it by the caller, so the 30-day window is measured from a real
 * server instant and cannot be collapsed by back-dating notice. effectiveFrom is
 * the only date the caller supplies. The app-layer guard fires first with a clean
 * ProhibitionError — the caller never sees a raw Prisma/DB CHECK error.
 */

import { describe, it, expect } from "vitest";
import { PrismaClient, ComplianceClass } from "@prisma/client";

const db = new PrismaClient();

interface Seed {
  adminFinance: string;
  adminOrderOps: string;
  adminOwner: string;
}
const seed = () => (globalThis as unknown as { seed: Seed }).seed;

const expectRejection = async (fn: () => Promise<unknown>, matcher: RegExp) => {
  await expect(fn()).rejects.toThrow(matcher);
};

const DAY_MS = 24 * 3600 * 1000;
// effectiveFrom must be >= now + 30d. Use a small margin past 30d so the tiny
// wall-clock drift between the test computing `now` and the service computing its
// own `now` cannot flip a boundary case; the exact-boundary behaviour is proven
// by the DB CHECK a5_thirty_day_notice in the prohibition suite.
const lawful = () => new Date(Date.now() + 31 * DAY_MS);

describe("A5 — commission schedule needs 30 days notice (anchored server-side)", () => {
  it("(a) rejects a change effective only 10 days out — under the 30-day notice", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 120_000,
          effectiveFrom: new Date(Date.now() + 10 * DAY_MS),
          actor: seed().adminFinance,
        }),
      /A5_NOTICE_TOO_SHORT/,
    );
  });

  it("(b) accepts a change effective 30+ days out, persists a row, and stamps noticeSentAt to ~now", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    const before = Date.now();
    const res = await scheduleCommissionChange({
      complianceClass: ComplianceClass.CBD_WELLNESS,
      ratePpm: 110_000,
      effectiveFrom: lawful(),
      actor: seed().adminFinance,
    });
    expect(res.id).toBeTruthy();
    const row = await db.commissionSchedule.findUnique({ where: { id: res.id } });
    expect(row).not.toBeNull();
    expect(row?.ratePpm).toBe(110_000);
    expect(row?.createdById).toBe(seed().adminFinance);
    // noticeSentAt is the server's own clock, not a caller value — it lands at ~now.
    expect(row!.noticeSentAt.getTime()).toBeGreaterThanOrEqual(before);
    // and the row satisfies the 30-day relation the DB CHECK enforces.
    expect(row!.effectiveFrom.getTime()).toBeGreaterThanOrEqual(row!.noticeSentAt.getTime() + 30 * DAY_MS);
  });

  it("(c) a caller cannot back-date notice: there is no noticeSentAt input, so a near-term effective date is always refused", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    // The old bypass — passing a noticeSentAt 40 days in the past with effectiveFrom
    // tomorrow — is structurally impossible: the service takes no noticeSentAt. A
    // tomorrow-effective increase is therefore refused regardless of anything the
    // caller supplies.
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 200_000,
          effectiveFrom: new Date(Date.now() + 1 * DAY_MS),
          actor: seed().adminFinance,
        }),
      /A5_NOTICE_TOO_SHORT/,
    );
  });

  it("(c2) fails CLOSED on an unparseable effectiveFrom — no NaN-comparison bypass", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    // An Invalid Date must be rejected by a clean guard, not slip past because
    // `NaN < earliest` is false. The compliance gate never fails open.
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 200_000,
          effectiveFrom: new Date("not-a-date"),
          actor: seed().adminFinance,
        }),
      /INVALID_EFFECTIVE_DATE/,
    );
  });

  it("(d) rejects a non-finance human even with a lawful (30-day) date", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 110_000,
          effectiveFrom: lawful(),
          actor: seed().adminOrderOps,
        }),
      /FORBIDDEN_FEE_CHANGE/,
    );
  });

  it("(e) rejects the owner — §7 no superadmin, realised via the missing finance role", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 110_000,
          effectiveFrom: lawful(),
          actor: seed().adminOwner,
        }),
      /FORBIDDEN_FEE_CHANGE/,
    );
  });
});
