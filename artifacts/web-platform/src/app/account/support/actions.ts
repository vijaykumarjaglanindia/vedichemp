"use server";

/**
 * VEDIC HEMP — SUPPORT TICKET ACTIONS (buyer)
 *
 * A ticket is a real thread. An order ticket routes to that order's seller;
 * everything else — and always a prescription/medical topic (A4) — routes to
 * the platform. Replies are copy-checked, server-issued, and re-open the thread.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { CLAIMS_LANGUAGE } from "@/lib/claims";
import { addMessage, createTicket as storeCreate, findTicket } from "@/lib/support";

const TOPICS = ["Order issue", "Wallet / refund", "Prescription / Medical", "Account & security", "Something else"];

export async function createTicket(formData: FormData): Promise<void> {
  const topic = String(formData.get("topic") ?? "");
  const orderRef = String(formData.get("orderref") ?? "").trim().slice(0, 20).toUpperCase();
  const desc = String(formData.get("desc") ?? "").trim();

  if (!TOPICS.includes(topic)) redirect("/account/support?err=topic");
  if (desc.length < 20 || desc.length > 1000) redirect("/account/support?err=desc");
  if (orderRef && !/^VH[0-9]{8,14}$/i.test(orderRef)) redirect("/account/support?err=orderref");

  const session = await getSession();
  const buyerEmail = session?.email ?? "guest@vedichemp.in";

  // Route: an order issue with a real order goes to that seller; a medical
  // topic (A4) and everything else goes to the platform.
  let sellerStore: string | undefined;
  if (topic === "Order issue" && orderRef) {
    const { findOrder } = await import("@/lib/orders");
    const order = await findOrder(orderRef);
    if (order && order.buyerEmail === buyerEmail) sellerStore = order.items[0]?.seller;
  }

  const subject = orderRef ? `${topic} · ${orderRef}` : `${topic} · ${desc.slice(0, 40)}${desc.length > 40 ? "…" : ""}`;
  const ticket = await storeCreate({
    buyerEmail,
    subject,
    category: topic === "Prescription / Medical" ? "Medical" : topic,
    body: desc,
    ...(orderRef ? { orderRef } : {}),
    ...(sellerStore ? { sellerStore } : {}),
  });

  // Notify whoever owns the queue.
  const { notify } = await import("@/lib/notify");
  if (sellerStore) await notify("seller", sellerStore, { kind: "SUPPORT_NEW", title: "New support ticket", body: `${ticket.subject}`, href: "/seller/support" });
  else await notify("admin", "admin", { kind: "SUPPORT_NEW", title: "New support ticket", body: `${ticket.subject}`, href: "/admin/support" });

  redirect(`/account/support?ok=${ticket.id}#${ticket.id}`);
}

export async function replyTicket(formData: FormData): Promise<void> {
  const id = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const session = await getSession();
  const email = session?.email ?? "guest@vedichemp.in";
  const t = findTicket(id);
  if (!t || t.buyerEmail !== email) redirect("/account/support");
  if (body.length < 2 || body.length > 1000) redirect(`/account/support?err=reply#${id}`);
  if (CLAIMS_LANGUAGE.test(body)) redirect(`/account/support?err=claims#${id}`);
  const result = await addMessage(id, "buyer", email.split("@")[0]!, body);
  if (!result.ok) redirect(`/account/support?err=${result.reason}#${id}`);

  const { notify } = await import("@/lib/notify");
  if (t.sellerStore) await notify("seller", t.sellerStore, { kind: "SUPPORT_REPLY", title: "Buyer replied to a ticket", body: t.subject, href: "/seller/support" });
  else await notify("admin", "admin", { kind: "SUPPORT_REPLY", title: "Buyer replied to a ticket", body: t.subject, href: "/admin/support" });
  redirect(`/account/support?replied=1#${id}`);
}
