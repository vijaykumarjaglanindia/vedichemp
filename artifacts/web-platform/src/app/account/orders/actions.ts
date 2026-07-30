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
import { cancelOrder, findOrder, requestReturn as storeRequestReturn } from "@/lib/orders";

/**
 * The acting buyer, or nowhere. A cookie that fails verification must never
 * resolve to a substitute identity — every row written below (refunds, returns,
 * adverse events) is attributed to whoever this returns.
 */
async function assertOwner(reference: string): Promise<string> {
  const session = await getSession();
  if (!session?.email) redirect(`/signin?next=/account/orders/live-${reference}`);
  const email = session.email;
  const order = await findOrder(reference);
  if (!order || order.buyerEmail.toLowerCase() !== email.toLowerCase()) redirect("/account/orders");
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
  const reason = String(formData.get("reason") ?? "").trim();
  const email = await assertOwner(reference);

  const result = await storeRequestReturn(reference, email, reason);
  if (!result.ok) redirect(`/account/orders/live-${reference}?err=${result.reason}#return`);
  await writeAudit({ actor: email, action: "RETURN_REQUEST", target: reference, outcome: "OK", note: reason.slice(0, 80) });
  // Raise the return with everyone who can act on it: each seller on the
  // order, and the admin returns queue.
  const { notify } = await import("@/lib/notify");
  for (const seller of [...new Set(result.order.items.map((it) => it.seller))]) {
    await notify("seller", seller, {
      kind: "RETURN_REQUEST",
      title: `Return requested — ${reference}`,
      body: `A buyer wants to return an item: ${reason.slice(0, 120)}`,
      href: "/seller/orders#real-orders",
    });
  }
  await notify("admin", "admin", {
    kind: "RETURN_REQUEST",
    title: `Return to adjudicate — ${reference}`,
    body: `Buyer requested a return: ${reason.slice(0, 120)}`,
    href: "/admin/orders#returns",
  });
  redirect(`/account/orders/live-${reference}?ret=ok#return`);
}

/* ── Adverse event (side-effect) report — pharmacovigilance (A3) ──── */

export async function reportSideEffect(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const email = await assertOwner(reference);
  const severity = String(formData.get("severity") ?? "");
  const narrative = String(formData.get("narrative") ?? "").trim().slice(0, 1000);
  const order = await findOrder(reference);
  const { isSeverity, reportAdverseEvent } = await import("@/lib/adverse");
  if (!isSeverity(severity)) redirect(`/account/orders/live-${reference}?ae=severity#safety`);
  if (narrative.length < 12) redirect(`/account/orders/live-${reference}?ae=short#safety`);

  const item = order?.items[0];
  await reportAdverseEvent({
    ...(item?.productId ? { productId: item.productId } : {}),
    productTitle: item?.title ?? "Order item",
    orderRef: reference,
    reporter: email,
    reporterRole: "BUYER",
    severity,
    narrative,
  });
  // The narrative is health data — it is NEVER placed in the audit note.
  await writeAudit({ actor: email, action: "ADVERSE_EVENT_REPORT", target: reference, outcome: "OK", note: severity });
  const { notify } = await import("@/lib/notify");
  await notify("admin", "admin", {
    kind: "ADVERSE_EVENT",
    title: "New adverse-event report",
    body: `A ${severity.toLowerCase()} report was filed for review. Open the compliance console.`,
    href: "/admin/compliance#adverse",
  });
  redirect(`/account/orders/live-${reference}?ae=ok#safety`);
}
