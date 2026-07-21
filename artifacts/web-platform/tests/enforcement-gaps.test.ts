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
import { PrismaClient, ComplianceClass, ListingState } from "@prisma/client";

const db = new PrismaClient();

interface Seed {
  sellerId: string;
  orderId: string;
  postedSettlementId: string;
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

describe("A1 — the auction resolves the product's true class, not the caller's label", () => {
  it("drops a real MED_CANNABIS product even when it is relabelled HEMP_FOOD in the bid", async () => {
    const { runAuction } = await import("../src/server/ads/auction");
    // A genuine MED_CANNABIS product exists (they are sold on prescription; only
    // their advertising is barred). Submit it to the auction claiming HEMP_FOOD.
    const med = await db.product.create({
      data: {
        sellerId: seed().sellerId,
        title: "Relabel Test — medical cannabis",
        slug: `med-relabel-${crypto.randomUUID()}`,
        complianceClass: ComplianceClass.MED_CANNABIS,
        listingState: ListingState.DRAFT,
        mrpPaise: 500_000,
        pricePaise: 400_000,
      },
    });
    const result = await runAuction({
      candidates: [{ productId: med.id, complianceClass: ComplianceClass.HEMP_FOOD, bidPaise: 999_00 }],
    });
    expect(result.winners).toHaveLength(0);
    expect(result.dropped).toContain(med.id);
    const violation = await db.adClassViolation.findFirst({ where: { productId: med.id } });
    expect(violation?.blocked).toBe(true);
  });

  it("still admits a genuinely advertisable product", async () => {
    const { runAuction } = await import("../src/server/ads/auction");
    const hemp = await db.product.create({
      data: {
        sellerId: seed().sellerId,
        title: "Advertisable hemp food",
        slug: `hemp-ok-${crypto.randomUUID()}`,
        complianceClass: ComplianceClass.HEMP_FOOD,
        listingState: ListingState.LIVE,
        mrpPaise: 10_000,
        pricePaise: 8_000,
      },
    });
    const result = await runAuction({
      candidates: [{ productId: hemp.id, complianceClass: ComplianceClass.HEMP_FOOD, bidPaise: 50_00 }],
    });
    expect(result.winners.map((w) => w.productId)).toContain(hemp.id);
  });
});

describe("§4 — a money-moving POST requires a well-formed Idempotency-Key", () => {
  const withKey = (key?: string) =>
    new Request("https://x/api/v1/money/settlements/s/approve", {
      method: "POST",
      headers: key ? { "Idempotency-Key": key } : {},
    });

  it("rejects a missing Idempotency-Key", async () => {
    const { requireIdempotencyKey } = await import("../src/server/http");
    expect(() => requireIdempotencyKey(withKey())).toThrow(/IDEMPOTENCY_KEY_REQUIRED/);
  });

  it("rejects a malformed (non-UUID) key", async () => {
    const { requireIdempotencyKey } = await import("../src/server/http");
    expect(() => requireIdempotencyKey(withKey("not-a-uuid"))).toThrow(/IDEMPOTENCY_KEY_REQUIRED/);
  });

  it("accepts a UUIDv4 key and echoes it back", async () => {
    const { requireIdempotencyKey } = await import("../src/server/http");
    const key = crypto.randomUUID();
    expect(requireIdempotencyKey(withKey(key))).toBe(key);
  });
});

describe("A3 — a posted settlement cannot be re-posted (idempotent, immutable)", () => {
  it("rejects re-posting an already-POSTED run with a clean guard, not a DB trigger error", async () => {
    const { approveSettlement } = await import("../src/server/money/settlements");
    await expectRejection(
      () => approveSettlement({ settlementId: seed().postedSettlementId, checker: seed().adminOwner, note: "x".repeat(25) }),
      /SETTLEMENT_ALREADY_POSTED/,
    );
  });
});
