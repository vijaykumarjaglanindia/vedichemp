/**
 * VEDIC HEMP — ENFORCEMENT-GAP REGRESSION TESTS
 *
 * These pin closed two constitution-enforcement gaps an adversarial audit found
 * in the production-shape server layer, where the guard had drifted from its
 * sibling:
 *
 *   A6 (refunds) — issueRefund resolves both parties against AdminUser, exactly
 *   as approveSettlement does. A service-account maker cannot move money, and a
 *   caller cannot invent a bogus `checkerId` string to satisfy maker≠checker (or
 *   to slip past the cumulative-split guard by making the row non-null).
 *
 *   §7 (grants) — server/rbac.grantRole refuses a self-grant and carries the
 *   ADMIN_OWNER SoD bars, so the owner can never hand itself (or be handed) a
 *   money/health/dispute role. This matches the console roles service.
 *
 * They talk to the same real Postgres as the prohibition suite, over the shared
 * seed in tests/setup.ts. They assert rejections — success is the server saying no.
 */

import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface Seed {
  orderId: string;
  adminOwner: string;
  adminFinance: string;
  adminSupport: string;
  adminOrderOps: string;
  serviceAccount: string;
}
const seed = () => (globalThis as unknown as { seed: Seed }).seed;

const expectRejection = async (fn: () => Promise<unknown>, matcher: RegExp) => {
  await expect(fn()).rejects.toThrow(matcher);
};

describe("A6 — issueRefund authenticates both parties (no bogus checker, no service maker)", () => {
  it("rejects a made-up (non-human) checker id on a large refund", async () => {
    const { issueRefund } = await import("../src/server/money/refunds");
    // Human maker, but the 'checker' is an arbitrary string that resolves to no
    // AdminUser — previously this satisfied the maker≠checker string compare.
    await expectRejection(
      () => issueRefund({ orderId: seed().orderId, actor: seed().adminOrderOps, amountPaise: 600_000, reasonCode: "QUALITY", checkerId: "not-a-real-admin" }),
      /CHECKER_MUST_BE_HUMAN/,
    );
  });

  it("rejects a service-account maker even for a small refund", async () => {
    const { issueRefund } = await import("../src/server/money/refunds");
    await expectRejection(
      () => issueRefund({ orderId: seed().orderId, actor: seed().serviceAccount, amountPaise: 10_000, reasonCode: "QUALITY" }),
      /CHECKER_MUST_BE_HUMAN/,
    );
  });

  it("cannot slip past the cumulative-split guard by inventing a checker id", async () => {
    const { issueRefund } = await import("../src/server/money/refunds");
    // A bogus non-null checkerId used to (a) skip the split guard and (b) exclude
    // the row from the cumulative sum. It now fails as a non-human checker before
    // any money moves — the split evasion is closed at the door.
    await expectRejection(
      () => issueRefund({ orderId: seed().orderId, actor: seed().adminOrderOps, amountPaise: 499_900, reasonCode: "QUALITY", checkerId: "phantom-checker" }),
      /CHECKER_MUST_BE_HUMAN/,
    );
  });

  it("still allows a legitimate two-human refund above the threshold", async () => {
    const { issueRefund } = await import("../src/server/money/refunds");
    const res = await issueRefund({ orderId: seed().orderId, actor: seed().adminOrderOps, amountPaise: 600_000, reasonCode: "QUALITY", checkerId: seed().adminOwner });
    expect(res.walletEntryId).toBeTruthy();
  });
});

describe("§7 — server/rbac.grantRole refuses self-grant and the owner bars", () => {
  it("refuses a self-grant (privilege must come from a different admin)", async () => {
    const { grantRole } = await import("../src/server/rbac");
    await expectRejection(
      () => grantRole({ userId: seed().adminSupport, role: "ADMIN_ADS", grantedBy: seed().adminSupport }),
      /SELF_GRANT/,
    );
  });

  it("refuses granting a money role to the owner (§7 no superadmin)", async () => {
    const { grantRole } = await import("../src/server/rbac");
    await expectRejection(
      () => grantRole({ userId: seed().adminOwner, role: "ADMIN_FINANCE", grantedBy: seed().adminFinance }),
      /SEPARATION_OF_DUTIES/,
    );
  });

  it("refuses granting a health role to the owner (§7/A4)", async () => {
    const { grantRole } = await import("../src/server/rbac");
    await expectRejection(
      () => grantRole({ userId: seed().adminOwner, role: "ADMIN_PHARMACIST", grantedBy: seed().adminFinance }),
      /SEPARATION_OF_DUTIES/,
    );
  });

  it("still allows a normal, non-conflicting grant from a different admin", async () => {
    const { grantRole } = await import("../src/server/rbac");
    await grantRole({ userId: seed().adminSupport, role: "ADMIN_ADS", grantedBy: seed().adminOwner });
    const admin = await db.adminUser.findUnique({ where: { id: seed().adminSupport } });
    expect(admin?.roles).toContain("ADMIN_ADS");
  });
});
