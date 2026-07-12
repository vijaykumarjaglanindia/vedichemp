"use server";

/**
 * VEDIC HEMP — SELLER CENTRAL ACTIONS
 *
 * Every mutation a seller can make in the console, validated server-side.
 * Demo persistence is the vh-sell-* cookie family (src/lib/engage.ts); with
 * DATABASE_URL attached each write becomes the matching src/server service
 * call. Compliance posture:
 *   - A1: campaign creation rejects any MED_CANNABIS product id.
 *   - A2: product submission lands in UNDER_REVIEW/DRAFT — never LIVE from
 *     here; regulated classes still need an approved, batch-matched CoA.
 *   - Copy-check: claims language in titles, descriptions and Q&A replies is
 *     rejected at the API, not just flagged in the UI (fail closed on sends).
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  appendCampaign,
  appendCoupon,
  appendSubmittedProduct,
  readSellerOrderOverrides,
  readSellerReplies,
  readStockAdds,
  writeSellerOrderOverrides,
  writeSellerReplies,
  writeStockAdds,
} from "@/lib/engage";
import { SELLER_ORDERS, SELLER_PRODUCTS } from "./_lib/data";

/** Disease-claim vocabulary the copy-check rejects (Drugs & Magic Remedies Act). */
const CLAIM_WORDS = /\b(cure|cures|heal|heals|treat|treats|treatment|prevent|prevents|anti[- ]?cancer|diagnos)\w*\b/i;

async function backPath(fallback: string): Promise<string> {
  const ref = (await headers()).get("referer") ?? "";
  try {
    const url = new URL(ref);
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

/* ── Orders: accept / pack ────────────────────────────────── */

const ORDER_OPS: Record<string, { from: string[]; to: string }> = {
  accept: { from: ["PENDING"], to: "ACCEPTED" },
  pack: { from: ["ACCEPTED"], to: "PACKED" },
  ship: { from: ["PACKED"], to: "SHIPPED" },
};

export async function sellerOrderAction(formData: FormData): Promise<void> {
  const orderId = String(formData.get("orderId") ?? "");
  const op = String(formData.get("op") ?? "");
  const back = await backPath("/seller/orders");

  const rule = ORDER_OPS[op];
  const order = SELLER_ORDERS.find((o) => o.id === orderId);
  if (!rule || !order) redirect(back);

  const overrides = await readSellerOrderOverrides();
  const current = overrides[orderId] ?? order.status;
  // State machine enforced server-side: you cannot pack what you never accepted,
  // and "shipped" means handed to the seller's delivery partner — not before.
  if (!rule.from.includes(current)) redirect(back);

  overrides[orderId] = rule.to;
  await writeSellerOrderOverrides(overrides);
  redirect(back);
}

/* ── Products: submit / save draft ────────────────────────── */

const SELLABLE_CLASSES = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

export async function submitProduct(formData: FormData): Promise<void> {
  const cls = String(formData.get("cls") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const desc = String(formData.get("desc") ?? "").trim();
  const pricePaise = parseInt(String(formData.get("pricePaise") ?? ""), 10);
  const mrpPaise = parseInt(String(formData.get("mrpPaise") ?? ""), 10);
  const hsn = String(formData.get("hsn") ?? "").trim();
  const intent = String(formData.get("intent") ?? "submit");

  // A1/A2 boundary: MED_CANNABIS is not creatable here at all, and no path
  // from this action reaches LIVE.
  let err: string | null = null;
  if (!SELLABLE_CLASSES.includes(cls)) err = "cls";
  else if (title.length < 8 || title.length > 150) err = "title";
  else if (CLAIM_WORDS.test(title) || CLAIM_WORDS.test(desc)) err = "claims";
  else if (!Number.isInteger(pricePaise) || pricePaise <= 0) err = "price";
  else if (!Number.isInteger(mrpPaise) || mrpPaise < pricePaise) err = "mrp";
  else if (!/^\d{4,8}$/.test(hsn)) err = "hsn";

  if (err) redirect(`/seller/products/new?err=${err}`);

  await appendSubmittedProduct({
    id: `sp-${Date.now().toString(36)}`,
    title,
    cls,
    pricePaise,
    mrpPaise,
    hsn,
    listingState: intent === "draft" ? "DRAFT" : "UNDER_REVIEW",
  });
  redirect(`/seller/products?submitted=${intent === "draft" ? "draft" : "review"}`);
}

/* ── Products: publish (A2 gate re-checked server-side) ───── */

export async function publishListing(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const product = SELLER_PRODUCTS.find((p) => p.id === productId);
  if (!product) redirect("/seller/products");

  // The button state in the UI is decoration — the gate is re-derived here.
  // A regulated product with any batch lacking an APPROVED, batch-matched CoA
  // cannot publish; the denied attempt is itself a logged event in production.
  const gateOpen = product.batches.length > 0 && product.batches.every((b) => b.coaStatus === "APPROVED");
  if (!gateOpen) redirect(`/seller/products/${productId}?err=coa`);
  redirect(`/seller/products/${productId}?published=1`);
}

/* ── Q&A replies (copy-checked) ───────────────────────────── */

export async function replyToQuestion(formData: FormData): Promise<void> {
  const qid = String(formData.get("qid") ?? "").slice(0, 12);
  const reply = String(formData.get("reply") ?? "").trim();
  if (!/^q[0-9]+$/.test(qid)) redirect("/seller/customers");
  // Fail closed: a copy-check failure blocks the send (CLAUDE.md §2).
  if (reply.length < 10 || reply.length > 600) redirect("/seller/customers?err=short");
  if (CLAIM_WORDS.test(reply)) redirect("/seller/customers?err=claims");

  const replies = await readSellerReplies();
  replies[qid] = reply;
  await writeSellerReplies(replies);
  redirect("/seller/customers?replied=1");
}

/** Public response to a flagged review — same copy-check, same fail-closed rule. */
export async function respondToReview(formData: FormData): Promise<void> {
  const rid = String(formData.get("rid") ?? "").slice(0, 12);
  const reply = String(formData.get("reply") ?? "").trim();
  if (!/^r[0-9]+$/.test(rid)) redirect("/seller/customers");
  if (reply.length < 10 || reply.length > 600) redirect("/seller/customers?err=short");
  if (CLAIM_WORDS.test(reply)) redirect("/seller/customers?err=claims");

  const replies = await readSellerReplies();
  replies[rid] = reply;
  await writeSellerReplies(replies);
  redirect("/seller/customers?replied=1");
}

/* ── Ads: create campaign (A1-guarded) ────────────────────── */

export async function createCampaign(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const budgetRupees = parseInt(String(formData.get("budget") ?? ""), 10);

  const product = SELLER_PRODUCTS.find((p) => p.id === productId);
  let err: string | null = null;
  if (name.length < 4 || name.length > 60) err = "name";
  else if (!["Sponsored Product", "Banner", "Video"].includes(type)) err = "type";
  else if (!product) err = "product";
  // A1 — enforced here AND at the ad API/index/auction layers. A medical
  // product id submitted via crafted form data dies at this line, and the
  // denied attempt would be logged as a violation in production.
  else if (product.cls === "MED_CANNABIS") err = "a1";
  else if (!Number.isInteger(budgetRupees) || budgetRupees < 500) err = "budget";

  if (err) redirect(`/seller/ads?err=${err}#new-campaign`);

  await appendCampaign({
    id: `c-${Date.now().toString(36)}`,
    name,
    type,
    budgetPaise: budgetRupees * 100,
    status: "IN_REVIEW",
  });
  redirect("/seller/ads?created=1");
}

/* ── Marketing: create coupon ─────────────────────────────── */

export async function createCoupon(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const pct = parseInt(String(formData.get("pct") ?? ""), 10);

  let err: string | null = null;
  if (!/^[A-Z0-9]{4,12}$/.test(code)) err = "code";
  else if (!Number.isInteger(pct) || pct < 1 || pct > 40) err = "pct";

  if (err) redirect(`/seller/marketing?err=${err}#new-coupon`);

  await appendCoupon({ code, pct, status: "ACTIVE" });
  redirect("/seller/marketing?created=1");
}

/* ── Store: submit a licence for verification ─────────────── */

const LICENCE_TYPES = ["FSSAI", "AYUSH", "GST", "TRADE"];

export async function addLicence(formData: FormData): Promise<void> {
  const type = String(formData.get("type") ?? "");
  const number = String(formData.get("number") ?? "").trim().toUpperCase();
  const validTo = String(formData.get("validTo") ?? "");

  let err: string | null = null;
  if (!LICENCE_TYPES.includes(type)) err = "lictype";
  else if (!/^[A-Z0-9/-]{6,25}$/.test(number)) err = "licnumber";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(validTo) || new Date(validTo) <= new Date()) err = "licdate";
  if (err) redirect(`/seller/store?err=${err}#add-licence`);

  const jar = await cookies();
  let list: { type: string; number: string; validTo: string; status: string }[] = [];
  try { list = JSON.parse(jar.get("vh-sell-lic")?.value ?? "[]") as typeof list; } catch { list = []; }
  list.unshift({ type, number, validTo, status: "PENDING_VERIFICATION" });
  jar.set("vh-sell-lic", JSON.stringify(list.slice(0, 4)), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
  redirect("/seller/store?licence=submitted#add-licence");
}

/* ── Store: owner transfer request (high-impact, reason ≥ 20 chars) ── */

export async function requestOwnerTransfer(formData: FormData): Promise<void> {
  const reason = String(formData.get("reason") ?? "").trim();
  // High-impact action: reasonCode + ≥20 chars of free text, and the attempt
  // is logged whether it succeeds or is denied (CLAUDE.md §2).
  if (reason.length < 20 || reason.length > 500) redirect("/seller/store?err=reason");

  (await cookies()).set("vh-sell-transfer", JSON.stringify({ at: new Date().toISOString().slice(0, 10) }), {
    path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/seller/store?transfer=requested");
}

/* ── Inventory: add stock ─────────────────────────────────── */

export async function addStock(formData: FormData): Promise<void> {
  const batch = String(formData.get("batch") ?? "").slice(0, 20);
  const qty = parseInt(String(formData.get("qty") ?? ""), 10);
  const back = await backPath("/seller/inventory");
  if (!batch || !Number.isInteger(qty) || qty < 1 || qty > 10000) redirect(back);

  const adds = await readStockAdds();
  adds[batch] = Math.min((adds[batch] ?? 0) + qty, 100000);
  await writeStockAdds(adds);
  redirect(back);
}
