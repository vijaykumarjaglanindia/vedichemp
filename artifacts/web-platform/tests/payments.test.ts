/**
 * Payment confirmation — the PSP webhook's authority over an order's paid state.
 *
 * With a real PSP, an order is created PENDING and only the verified webhook
 * flips it to CAPTURED. These prove that transition is correct and idempotent
 * (a replayed webhook is a no-op), an unknown order is refused, and the sandbox
 * path (no PSP) is unchanged — an order is CAPTURED on creation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createOrder, confirmPayment, findOrder, type PlaceOrderInput } from "@/lib/orders";

beforeEach(() => { (globalThis as Record<string, unknown>).__vhOrders = undefined; });

function base(reference: string, over: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    idempotencyKey: `idem-${reference}`, buyerEmail: "buyer@t.in", reference,
    city: "Pune", pincode: "411001", payment: "razorpay",
    items: [{ productId: "p1", title: "Hemp Oil", emoji: "🌿", seller: "Store", qty: 1, unitPaise: 100000, linePaise: 100000 }],
    subtotalPaise: 100000, discountPaise: 0, couponCode: null, shippingPaise: 0, totalPaise: 100000,
    ...over,
  };
}

describe("payment confirmation (PSP webhook)", () => {
  it("flips a PENDING order to CAPTURED and records the payment", async () => {
    await createOrder(base("ORD1", { paymentStatus: "PENDING", gatewayRef: "psp_order_1" }));
    expect((await findOrder("ORD1"))!.paymentStatus).toBe("PENDING");

    const r = await confirmPayment("ORD1", "pay_abc");
    expect(r.ok).toBe(true);
    const o = (await findOrder("ORD1"))!;
    expect(o.paymentStatus).toBe("CAPTURED");
    expect(o.gatewayRef).toBe("pay_abc");
    expect(o.timeline.some((t) => t.note === "Payment captured")).toBe(true);
  });

  it("is idempotent — a replayed webhook does not re-capture or overwrite", async () => {
    await createOrder(base("ORD2", { paymentStatus: "PENDING" }));
    await confirmPayment("ORD2", "pay_first");
    const replay = await confirmPayment("ORD2", "pay_second");
    expect(replay.ok).toBe(true);
    expect((await findOrder("ORD2"))!.gatewayRef).toBe("pay_first"); // unchanged after capture
  });

  it("refuses an unknown order reference", async () => {
    const r = await confirmPayment("DOES-NOT-EXIST", "pay_x");
    expect(r.ok).toBe(false);
  });

  it("sandbox orders (no PSP) are CAPTURED on creation — unchanged", async () => {
    await createOrder(base("SBX", { payment: "cod" }));
    expect((await findOrder("SBX"))!.paymentStatus).toBe("CAPTURED");
  });
});
