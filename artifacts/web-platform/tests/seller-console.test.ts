/**
 * VEDIC HEMP — SELLER CONSOLE READ MODELS
 *
 * The seller console renders from the live stores; nothing it shows is seeded.
 * These prove the parts a seller relies on to be true: what a scheduled fee
 * change looks like BEFORE it applies (A5 in the open, not merely enforced),
 * that a settlement statement only exists once two people signed it off (A6),
 * and that the buyer's delivery address is carried on the order rather than
 * fabricated at label time.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { resolveCommission, pendingCommissionChanges, LAUNCH_COMMISSION_PCT } from "@/lib/commissions";
import { addCommission } from "@/lib/adminstate";
import { createOrder, advanceOrder, ordersForSeller, sellerSubtotal, type OrderItem } from "@/lib/orders";
import { createRun, postRun, runsForSeller } from "@/lib/settlements";

const g = globalThis as Record<string, unknown>;

const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  g.__vhCommissions = undefined;
  g.__vhOrders = undefined;
  g.__vhSettlements = undefined;
  g.__vhEarnings = undefined;
});

describe("a scheduled fee change is visible before it bites (A5)", () => {
  const STORE = "Test Botanicals";

  it("a future increase is listed, with the notice it was given", async () => {
    await addCommission({
      scope: "SELLER", target: STORE, cls: "", ratePct: 14,
      noticeSentAt: iso(0), effectiveFrom: iso(31), by: "finance.rao",
    });
    const [change] = await pendingCommissionChanges({ SELLER: STORE });
    expect(change).toBeDefined();
    expect(change!.ratePct).toBe(14);
    expect(change!.isIncrease).toBe(true);
    expect(change!.noticeDays).toBe(31);
    // It is NOT yet what the seller is charged.
    expect((await resolveCommission({ SELLER: STORE })).ratePct).toBe(LAUNCH_COMMISSION_PCT);
  });

  it("a change already in force is not listed as pending", async () => {
    await addCommission({
      scope: "SELLER", target: STORE, cls: "", ratePct: 8,
      noticeSentAt: iso(-40), effectiveFrom: iso(-1), by: "finance.rao",
    });
    expect(await pendingCommissionChanges({ SELLER: STORE })).toHaveLength(0);
    expect((await resolveCommission({ SELLER: STORE })).ratePct).toBe(8);
  });

  it("another store's schedule is not this store's business", async () => {
    await addCommission({
      scope: "SELLER", target: "Someone Else", cls: "", ratePct: 20,
      noticeSentAt: iso(0), effectiveFrom: iso(31), by: "finance.rao",
    });
    expect(await pendingCommissionChanges({ SELLER: STORE })).toHaveLength(0);
  });
});

describe("a settlement statement exists only because two people made it", () => {
  const STORE = "Test Botanicals";
  const item = (): OrderItem => ({
    productId: "p1", title: "Hemp Seed Oil", emoji: "🫒", seller: STORE, qty: 2, unitPaise: 50_000, linePaise: 100_000,
  });

  async function deliveredOrder(ref: string) {
    await createOrder({
      idempotencyKey: `k-${ref}`, buyerEmail: "buyer@example.in", reference: ref,
      city: "Pune", state: "maharashtra", pincode: "411001", payment: "upi",
      items: [item()], subtotalPaise: 100_000, discountPaise: 0, couponCode: null,
      shippingPaise: 0, totalPaise: 100_000,
    });
    for (const op of ["accept", "pack", "ship", "deliver"]) {
      await advanceOrder(ref, op, `seller:${STORE}`);
    }
  }

  it("there is nothing to download until a run is created and posted", async () => {
    expect(await runsForSeller(STORE)).toHaveLength(0);

    await deliveredOrder("VH-TEST-1");
    const created = await createRun(STORE, "finance.rao");
    expect(created.ok).toBe(true);

    const [run] = await runsForSeller(STORE);
    expect(run!.status).toBe("AWAITING_CHECKER");

    // A6: the maker cannot also be the checker.
    expect(await postRun(run!.id, "finance.rao")).toEqual({ ok: false, reason: "maker" });
    expect((await runsForSeller(STORE))[0]!.status).toBe("AWAITING_CHECKER");

    const posted = await postRun(run!.id, "finance.approver.iyer");
    expect(posted.ok).toBe(true);
    expect((await runsForSeller(STORE))[0]!.status).toBe("POSTED");
  });

  it("the net is derived from the delivered lines, never typed in", async () => {
    await deliveredOrder("VH-TEST-2");
    await createRun(STORE, "finance.rao");
    const [run] = await runsForSeller(STORE);
    expect(run!.grossPaise).toBe(100_000);
    expect(run!.netPaise).toBe(run!.grossPaise - run!.commissionPaise);
    expect(run!.commissionPaise).toBe(Math.round((100_000 * LAUNCH_COMMISSION_PCT) / 100));
  });
});

describe("the seller sees their own lines and the real ship-to", () => {
  const MINE = "Test Botanicals";
  const THEIRS = "Other Store";

  it("a shared basket shows this store only its own share", async () => {
    await createOrder({
      idempotencyKey: "k-split", buyerEmail: "buyer@example.in", reference: "VH-SPLIT",
      city: "Pune", state: "maharashtra", pincode: "411001", payment: "upi",
      shipName: "A Buyer", shipLine1: "12 Rose Villa, Kothrud", shipMobile: "9876543210",
      items: [
        { productId: "p1", title: "Hemp Oil", emoji: "🫒", seller: MINE, qty: 1, unitPaise: 40_000, linePaise: 40_000 },
        { productId: "p2", title: "Ashwagandha", emoji: "🌿", seller: THEIRS, qty: 1, unitPaise: 60_000, linePaise: 60_000 },
      ],
      subtotalPaise: 100_000, discountPaise: 0, couponCode: null, shippingPaise: 0, totalPaise: 100_000,
    });
    const [order] = await ordersForSeller(MINE);
    expect(order).toBeDefined();
    expect(sellerSubtotal(order!, MINE)).toBe(40_000);
    expect(sellerSubtotal(order!, THEIRS)).toBe(60_000);

    // The delivery address the buyer entered is kept on the order, so the label
    // prints where the parcel actually goes.
    expect(order!.shipName).toBe("A Buyer");
    expect(order!.shipLine1).toBe("12 Rose Villa, Kothrud");
    expect(order!.shipMobile).toBe("9876543210");
  });

  it("an order with no address supplied carries none — nothing is invented", async () => {
    await createOrder({
      idempotencyKey: "k-bare", buyerEmail: "buyer@example.in", reference: "VH-BARE",
      city: "Kochi", pincode: "682016", payment: "cod",
      items: [{ productId: "p3", title: "Hemp Tea", emoji: "🍵", seller: MINE, qty: 1, unitPaise: 20_000, linePaise: 20_000 }],
      subtotalPaise: 20_000, discountPaise: 0, couponCode: null, shippingPaise: 0, totalPaise: 20_000,
    });
    const bare = (await ordersForSeller(MINE)).find((o) => o.reference === "VH-BARE");
    expect(bare!.shipName).toBeUndefined();
    expect(bare!.shipLine1).toBeUndefined();
  });
});
