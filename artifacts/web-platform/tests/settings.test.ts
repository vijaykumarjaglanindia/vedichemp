/**
 * VEDIC HEMP — THE OPERATOR'S NUMBERS
 *
 * Several figures used to exist twice: once as a literal in a guard, once as a
 * different literal in the sentence beside it. They are one setting now, and
 * these prove the guard reads it — so changing the number in the console
 * changes what the platform actually does, not only what it says.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readCommerce, writeCommerce, COMMERCE_DEFAULTS, commerceNow } from "@/lib/commerce";
import { createOrder, advanceOrder, requestReturn, findOrder, type OrderItem } from "@/lib/orders";
import { requestWithdraw, minWithdrawPaise } from "@/lib/earnings";

const g = globalThis as Record<string, unknown>;
const SELLER = "Test Botanicals";

const item = (): OrderItem => ({
  productId: "p1", title: "Hemp Seed Oil", emoji: "🫒", seller: SELLER, qty: 1, unitPaise: 100_000, linePaise: 100_000,
});

beforeEach(() => {
  g.__vhCommerce = undefined;
  g.__vhOrders = undefined;
  g.__vhEarnings = undefined;
  g.__vhShipping = undefined;
  g.__vhPayments = undefined;
});

describe("the settings store", () => {
  it("ships defaults and overlays only what an operator changed", async () => {
    expect((await readCommerce()).returnWindowDays).toBe(COMMERCE_DEFAULTS.returnWindowDays);
    await writeCommerce({ returnWindowDays: 30 });
    const s = await readCommerce();
    expect(s.returnWindowDays).toBe(30);
    // Everything else is untouched.
    expect(s.maxSavedAddresses).toBe(COMMERCE_DEFAULTS.maxSavedAddresses);
    expect(s.loyaltyPtsPer100).toBe(COMMERCE_DEFAULTS.loyaltyPtsPer100);
  });

  it("the synchronous mirror agrees with the async read", async () => {
    await writeCommerce({ defaultLowStockAt: 42, maxProductImages: 3 });
    expect(commerceNow().defaultLowStockAt).toBe(42);
    expect(commerceNow().maxProductImages).toBe(3);
    expect((await readCommerce()).defaultLowStockAt).toBe(42);
  });
});

describe("the return window is enforced, not just printed", () => {
  async function deliveredOrder(ref: string, deliveredDaysAgo: number) {
    await createOrder({
      idempotencyKey: `k-${ref}`, buyerEmail: "buyer@example.in", reference: ref,
      city: "Pune", state: "maharashtra", pincode: "411001", payment: "upi",
      items: [item()], subtotalPaise: 100_000, discountPaise: 0, couponCode: null,
      shippingPaise: 0, totalPaise: 100_000,
    });
    for (const op of ["accept", "pack", "ship", "deliver"]) await advanceOrder(ref, op, `seller:${SELLER}`);
    // Back-date the DELIVERED event so the window can be exercised without waiting.
    const order = await findOrder(ref);
    const ev = order!.timeline.find((e) => e.status === "DELIVERED")!;
    ev.at = new Date(Date.now() - deliveredDaysAgo * 86_400_000).toISOString();
  }

  it("accepts a return inside the window", async () => {
    await writeCommerce({ returnWindowDays: 7 });
    await deliveredOrder("VH-IN", 3);
    const r = await requestReturn("VH-IN", "buyer@example.in", "Damaged in transit — outer seal broken");
    expect(r.ok).toBe(true);
  });

  it("refuses a return past it, with a reason the page can explain", async () => {
    await writeCommerce({ returnWindowDays: 7 });
    await deliveredOrder("VH-OUT", 9);
    expect(await requestReturn("VH-OUT", "buyer@example.in", "Damaged in transit — outer seal broken"))
      .toEqual({ ok: false, reason: "window" });
  });

  it("a longer window set by the operator lets the same order through", async () => {
    await writeCommerce({ returnWindowDays: 30 });
    await deliveredOrder("VH-LONG", 9);
    expect((await requestReturn("VH-LONG", "buyer@example.in", "Damaged in transit — outer seal broken")).ok).toBe(true);
  });
});

describe("the payout floor is the operator's, and the guard reads it", () => {
  it("refuses below the configured minimum and accepts at it", async () => {
    await writeCommerce({ minWithdrawPaise: 100_000 });
    expect(await minWithdrawPaise()).toBe(100_000);
    // Nothing earned yet, so both refuse — but for different, correct reasons:
    // the small one on the floor, the large one on the balance.
    expect(await requestWithdraw(SELLER, 99_999)).toEqual({ ok: false, reason: "min" });
    const atFloor = await requestWithdraw(SELLER, 100_000);
    expect(atFloor.ok).toBe(false);
    expect((atFloor as { reason: string }).reason).not.toBe("min");
  });

  it("lowering the floor changes what is refused", async () => {
    await writeCommerce({ minWithdrawPaise: 10_000 });
    const r = await requestWithdraw(SELLER, 50_000);
    expect((r as { reason?: string }).reason).not.toBe("min");
  });
});

describe("a payment method with a floor is refused, not just described", () => {
  it("EMI is offered above its minimum and absent below it", async () => {
    const { writePaymentMethod, methodsForAmount } = await import("@/lib/payments");
    await writePaymentMethod("emi", { enabled: true });
    const small = await methodsForAmount(2_999_00);
    const large = await methodsForAmount(3_000_00);
    expect(small.some((m) => m.key === "emi")).toBe(false);
    expect(large.some((m) => m.key === "emi")).toBe(true);
    // A method with no floor is unaffected either way.
    expect(small.some((m) => m.key === "upi")).toBe(true);
  });
});

describe("shipping zones are the operator's, end to end", () => {
  it("a changed delivery window reaches the quote a buyer sees", async () => {
    const { writeShipping, readShipping, shippingQuote, etaLabel } = await import("@/lib/shipping");
    await writeShipping({ rates: { metro: { etaMinDays: 1, etaMaxDays: 1, basePaise: 5_00 } } });
    const zone = (await readShipping()).zones.find((z) => z.id === "metro")!;
    expect(etaLabel(zone)).toBe("1 days");
    const q = await shippingQuote({ subtotalPaise: 100_00, weightGrams: 200, destState: "maharashtra" });
    expect(q.etaMaxDays).toBe(1);
    expect(q.paise).toBe(5_00);
  });

  it("a window that ends before it starts is refused, leaving the old one", async () => {
    const { writeShipping, readShipping } = await import("@/lib/shipping");
    await writeShipping({ rates: { remote: { etaMinDays: 9, etaMaxDays: 2 } } });
    const zone = (await readShipping()).zones.find((z) => z.id === "remote")!;
    expect(zone.etaMinDays).toBeLessThanOrEqual(zone.etaMaxDays);
  });

  it("moving a state moves the zone it resolves to", async () => {
    const { writeShipping, resolveZone } = await import("@/lib/shipping");
    await writeShipping({ rates: { remote: { states: ["goa"] }, metro: { states: ["maharashtra"] } } });
    expect((await resolveZone("goa")).id).toBe("remote");
    expect((await resolveZone("maharashtra")).id).toBe("metro");
    // Anything unlisted still lands in the fallback zone.
    expect((await resolveZone("bihar")).id).toBe("national");
  });
});
