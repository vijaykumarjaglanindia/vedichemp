"use server";

/**
 * VEDIC HEMP — SUBSCRIPTION ACTIONS
 *
 * Create / skip / pause / resume / cancel against a server-side state machine
 * (src/lib/subscriptions.ts). Skip is idempotent — repeating it never
 * double-skips. A regulated subscription auto-paused for a lapsed Rx cannot be
 * resumed from here; only a verified prescription lifts that pause (enforced by
 * the page, which computes the pause from live prescriptions).
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { applySubOp, createSubscription, findSub, CADENCES } from "@/lib/subscriptions";
import { findLiveBySlug } from "@/lib/catalog";
import { permittedClasses } from "@/lib/compliance";

export async function subscriptionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("subId") ?? "").slice(0, 12);
  const op = String(formData.get("op") ?? "");
  const session = await getSession();
  if (!session?.email) redirect("/signin?next=/account/subscriptions");
  const email = session.email;

  const sub = findSub(id);
  if (!sub || sub.buyerEmail.toLowerCase() !== email.toLowerCase() || !["skip", "unskip", "pause", "resume", "cancel"].includes(op)) {
    redirect("/account/subscriptions");
  }
  const res = await applySubOp(id, op as "skip" | "unskip" | "pause" | "resume" | "cancel");
  redirect(res.ok ? `/account/subscriptions?done=${op}` : `/account/subscriptions?err=${res.reason}`);
}

export async function createSubscriptionAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const email = session?.email;
  if (!email) redirect("/signin?next=/account/subscriptions");

  // Platform capability switch (two-person to flip — /admin/settings). Existing
  // subscriptions keep running; only new ones are refused, and the refusal is
  // made here rather than by hiding a form.
  const { capabilityOn } = await import("@/lib/flags");
  if (!(await capabilityOn("buyer_subscriptions"))) redirect("/account/subscriptions?err=switched-off");

  const slug = String(formData.get("productSlug") ?? "").trim();
  const cadenceDays = parseInt(String(formData.get("cadenceDays") ?? ""), 10);
  if (!slug) redirect("/account/subscriptions?err=product");
  if (!(CADENCES as readonly number[]).includes(cadenceDays)) redirect("/account/subscriptions?err=cadence");

  // The product must be a LIVE listing the viewer may see (A1). A regulated
  // MED_CANNABIS item can never reach here — it isn't in the permitted set and
  // has no public listing anyway.
  const product = await findLiveBySlug(slug);
  if (!product || !permittedClasses({ hasRx: false }).includes(product.cls)) {
    redirect("/account/subscriptions?err=product");
  }
  const res = await createSubscription({
    buyerEmail: email!,
    productId: product!.slug,
    product: product!.title,
    emoji: product!.emoji,
    cls: product!.cls,
    pricePaise: product!.pricePaise,
    cadenceDays,
  });
  redirect(res.ok ? "/account/subscriptions?done=create" : `/account/subscriptions?err=${res.reason}`);
}
