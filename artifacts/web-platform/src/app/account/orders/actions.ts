"use server";

/**
 * VEDIC HEMP — RETURN REQUEST ACTION
 *
 * Refund-first, by constitution: the buyer's refund is issued on pickup
 * confirmation; recovery from the seller happens afterwards through
 * settlement — the buyer is never the collateral.
 */

import { redirect } from "next/navigation";
import { ORDERS } from "@/lib/sample";
import { readReturns, writeReturns } from "@/lib/engage";

const REASONS = ["Damaged in transit", "Wrong item received", "Expired or near expiry", "Quality not as described", "No longer needed"];

export async function requestReturn(formData: FormData): Promise<void> {
  const orderId = String(formData.get("orderId") ?? "").slice(0, 30);
  const reason = String(formData.get("reason") ?? "");

  // Only a DELIVERED order can enter the return flow — enforced here, not in
  // the button's visibility.
  const order = ORDERS.find((o) => o.id === orderId && o.status === "DELIVERED");
  if (!order) redirect("/account/orders");
  if (!REASONS.includes(reason)) redirect(`/account/orders/${orderId}?ret=reason#return`);

  const map = await readReturns();
  map[orderId] = { reason, at: new Date().toISOString().slice(0, 10) };
  await writeReturns(map);
  redirect(`/account/orders/${orderId}?ret=ok#return`);
}
