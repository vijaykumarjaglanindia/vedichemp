/**
 * VEDIC HEMP — A5 COMMISSION-SCHEDULE SERVICE TESTS
 *
 * A5: no retroactive fee increase. A change to a seller's commission takes effect
 * only after at least 30 days' written notice, and only a finance admin may make
 * it. These talk to the same real Postgres as the prohibition suite (migration
 * 0001, constraint a5_thirty_day_notice) over the shared seed in tests/setup.ts.
 *
 * The app-layer guard must fire first with a clean ProhibitionError — the caller
 * never sees a raw Prisma/DB CHECK error.
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

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

describe("A5 — commission schedule needs 30 days notice", () => {
  it("(a) rejects a change effective 10 days after notice", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    const noticeSentAt = new Date();
    const effectiveFrom = new Date(noticeSentAt.getTime() + 10 * 24 * 3600 * 1000);
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 120_000,
          noticeSentAt,
          effectiveFrom,
          actor: seed().adminFinance,
        }),
      /A5_NOTICE_TOO_SHORT/,
    );
  });

  it("(b) accepts a change effective exactly 30 days after notice and persists a row", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    const noticeSentAt = new Date();
    const effectiveFrom = new Date(noticeSentAt.getTime() + THIRTY_DAYS_MS);
    const res = await scheduleCommissionChange({
      complianceClass: ComplianceClass.CBD_WELLNESS,
      ratePpm: 110_000,
      noticeSentAt,
      effectiveFrom,
      actor: seed().adminFinance,
    });
    expect(res.id).toBeTruthy();
    const row = await db.commissionSchedule.findUnique({ where: { id: res.id } });
    expect(row).not.toBeNull();
    expect(row?.ratePpm).toBe(110_000);
    expect(row?.createdById).toBe(seed().adminFinance);
  });

  it("(c) rejects a non-finance human even with a lawful (30-day) date", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    const noticeSentAt = new Date();
    const effectiveFrom = new Date(noticeSentAt.getTime() + THIRTY_DAYS_MS);
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 110_000,
          noticeSentAt,
          effectiveFrom,
          actor: seed().adminOrderOps,
        }),
      /FORBIDDEN_FEE_CHANGE/,
    );
  });

  it("(d) rejects the owner — §7 no superadmin, realised via the missing finance role", async () => {
    const { scheduleCommissionChange } = await import("../src/server/money/commissions");
    const noticeSentAt = new Date();
    const effectiveFrom = new Date(noticeSentAt.getTime() + THIRTY_DAYS_MS);
    await expectRejection(
      () =>
        scheduleCommissionChange({
          complianceClass: ComplianceClass.CBD_WELLNESS,
          ratePpm: 110_000,
          noticeSentAt,
          effectiveFrom,
          actor: seed().adminOwner,
        }),
      /FORBIDDEN_FEE_CHANGE/,
    );
  });
});
