"use server";

/**
 * VEDIC HEMP — BUYER ORDER ACTIONS (cancel, return)
 *
 * Refund-first, by constitution: a buyer cancels before dispatch (immediate
 * refund + restock) or requests a return after delivery. When the return is
 * settled the buyer is refunded first and the platform recovers from the
 * seller afterwards — the buyer is never the collateral (lib/orders).
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { ORDERS } from "@/lib/sample";
import { readReturns, writeReturns } from "@/lib/engage";
import { cancelOrder, findOrder, requestReturn as storeRequestReturn } from "@/lib/orders";

async function assertOwner(reference: string): Promise<string> {
  const session = await getSession();
  const email = session?.email ?? "guest@vedichemp.in";
  const order = await findOrder(reference);
  if (!order || order.buyerEmail !== email) redirect("/account/orders");
  return email;
}

export async function cancelOwnOrder(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const email = await assertOwner(reference);
  const result = await cancelOrder(reference, email, "cancelled by buyer before dispatch");
  if (!result.ok) redirect(`/account/orders/live-${reference}?err=${result.reason}`);
  await writeAudit({ actor: email, action: "ORDER_CANCEL", target: reference, outcome: "OK", note: "buyer cancel; restocked + refunded" });
  redirect(`/account/orders/live-${reference}?cancelled=1`);
}

export async function requestReturn(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const orderId = String(formData.get("orderId") ?? "").slice(0, 30);
  const reason = String(formData.get("reason") ?? "").trim();

  // Real order path (order store, full lifecycle).
  const session = await getSession();
  const email = session?.email ?? "guest@vedichemp.in";
  const real = await findOrder(reference);
  if (real) {
    if (real.buyerEmail !== email) redirect("/account/orders");
    const result = await storeRequestReturn(reference, email, reason);
    if (!result.ok) redirect(`/account/orders/live-${reference}?err=${result.reason}#return`);
    await writeAudit({ actor: email, action: "RETURN_REQUEST", target: reference, outcome: "OK", note: reason.slice(0, 80) });
    redirect(`/account/orders/live-${reference}?ret=ok#return`);
  }

  // Sample-order fallback (illustrative history — cookie-backed).
  const sample = ORDERS.find((o) => o.id === orderId && o.status === "DELIVERED");
  if (!sample) redirect("/account/orders");
  const map = await readReturns();
  map[orderId] = { reason: reason || "Return requested", at: new Date().toISOString().slice(0, 10) };
  await writeReturns(map);
  redirect(`/account/orders/${orderId}?ret=ok#return`);
}
