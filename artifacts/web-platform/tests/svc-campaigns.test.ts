/**
 * VEDIC HEMP — A1 LAYER 1 (ad-campaign create) SERVER TESTS
 *
 * The first of the three independent A1 layers: the API rejects a campaign for a
 * MED_CANNABIS product at creation. The class is resolved SERVER-SIDE from the
 * real product, so a caller cannot relabel a MED_CANNABIS product as HEMP_FOOD
 * to buy it a campaign — the service ignores any caller-supplied class and reads
 * the product's true one. A product that resolves to nothing fails closed.
 *
 * These talk to the same real Postgres as the prohibition suite, over the shared
 * seed in tests/setup.ts. Feature-specific rows are created inline. A rejection
 * is the server saying no; every refusal must leave a blocked violation behind,
 * and a blocked=false violation must never exist.
 */

import { describe, it, expect } from "vitest";
import { PrismaClient, ComplianceClass, ListingState } from "@prisma/client";

const db = new PrismaClient();

interface Seed {
  sellerId: string;
}
const seed = () => (globalThis as unknown as { seed: Seed }).seed;

const expectRejection = async (fn: () => Promise<unknown>, matcher: RegExp) => {
  await expect(fn()).rejects.toThrow(matcher);
};

describe("A1 layer 1 — campaign create rejects MED_CANNABIS by RESOLVING the real class", () => {
  it("(a) creates a campaign for an advertisable HEMP_FOOD product and returns an id", async () => {
    const { createCampaign } = await import("../src/server/ads/campaigns");
    const hemp = await db.product.create({
      data: {
        sellerId: seed().sellerId,
        title: "Campaign Test — hemp food",
        slug: `camp-hemp-${crypto.randomUUID()}`,
        complianceClass: ComplianceClass.HEMP_FOOD,
        listingState: ListingState.LIVE,
        mrpPaise: 20_000,
        pricePaise: 15_000,
      },
    });

    const res = await createCampaign({
      sellerId: seed().sellerId,
      name: "Summer hemp promo",
      productId: hemp.id,
      dailyBudgetPaise: 50_000,
      actor: seed().sellerId,
    });

    expect(res.id).toBeTruthy();
    const row = await db.adCampaign.findUnique({ where: { id: res.id } });
    expect(row).not.toBeNull();
    // Persisted with the REAL resolved class, not a caller-supplied one.
    expect(row?.complianceClass).toBe(ComplianceClass.HEMP_FOOD);
    expect(row?.active).toBe(false);
  });

  it("(b) rejects a MED_CANNABIS product (real class resolved) and logs a blocked API violation", async () => {
    const { createCampaign } = await import("../src/server/ads/campaigns");
    // A genuine MED_CANNABIS product exists — they are sold on prescription; only
    // their advertising is barred, by A1.
    const med = await db.product.create({
      data: {
        sellerId: seed().sellerId,
        title: "Campaign Test — medical cannabis",
        slug: `camp-med-${crypto.randomUUID()}`,
        complianceClass: ComplianceClass.MED_CANNABIS,
        listingState: ListingState.LIVE,
        mrpPaise: 500_000,
        pricePaise: 400_000,
      },
    });

    await expectRejection(
      () =>
        createCampaign({
          sellerId: seed().sellerId,
          name: "Sneaky MED promo",
          productId: med.id,
          dailyBudgetPaise: 50_000,
          actor: seed().sellerId,
        }),
      /CLASS_NOT_ADVERTISABLE/
    );

    const violation = await db.adClassViolation.findFirst({
      where: { productId: med.id, layer: "API", blocked: true },
    });
    expect(violation).not.toBeNull();

    // No campaign was created for the barred product.
    const camp = await db.adCampaign.findFirst({ where: { sellerId: seed().sellerId, name: "Sneaky MED promo" } });
    expect(camp).toBeNull();
  });

  it("(c) rejects a made-up productId (fail closed) and STILL logs a blocked API violation", async () => {
    const { createCampaign } = await import("../src/server/ads/campaigns");
    const missingId = "no-such-product";

    await expectRejection(
      () =>
        createCampaign({
          sellerId: seed().sellerId,
          name: "Phantom product promo",
          productId: missingId,
          dailyBudgetPaise: 50_000,
          actor: seed().sellerId,
        }),
      /PRODUCT_NOT_FOUND/
    );

    const violation = await db.adClassViolation.findFirst({
      where: { productId: missingId, layer: "API", blocked: true },
    });
    expect(violation).not.toBeNull();
  });

  it("(d) never records a blocked=false violation (that would be a SEV-1)", async () => {
    const leaked = await db.adClassViolation.findFirst({ where: { blocked: false } });
    expect(leaked).toBeNull();
  });
});
