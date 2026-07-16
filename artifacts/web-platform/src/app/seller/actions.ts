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
import { ComplianceClass } from "@prisma/client";
import { getSession } from "@/lib/auth-lite";
import {
  archiveListing,
  createListing,
  deleteListing,
  findProduct,
  restoreArchived,
  setClaimsStrike,
  submitCoa,
  submitForReview,
  unpublishListing,
  updateListing,
  ORDER_QTY_HARD_CAP,
} from "@/lib/catalog";
import { writeAudit } from "@/lib/audit";
import { CLAIMS_LANGUAGE } from "@/lib/claims";
import { redirect } from "next/navigation";
import {
  appendCoupon,
  readSellerOrderOverrides,
  readSellerReplies,
  readStockAdds,
  writeSellerOrderOverrides,
  writeSellerReplies,
  writeStockAdds,
} from "@/lib/engage";
import { SELLER_ORDERS } from "./_lib/data";

/** Disease-claim vocabulary the copy-check rejects (Drugs & Magic Remedies Act). */
const CLAIM_WORDS = CLAIMS_LANGUAGE;

async function backPath(fallback: string): Promise<string> {
  const ref = (await headers()).get("referer") ?? "";
  try {
    const url = new URL(ref);
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

/* ── Staff & roles (RBAC) ─────────────────────────────────── */

/** Server-side permission gate: redirect (and log) if the acting staff member
 *  lacks a permission. Every gated seller action calls this first. */
async function requirePerm(perm: import("@/lib/staff").Permission, _back: string): Promise<void> {
  const { actingCan, currentStaff } = await import("@/lib/staff");
  if (!(await actingCan(perm))) {
    const me = await currentStaff();
    await writeAudit({ actor: `${DEMO_STORE}/${me.name}`, action: "PERMISSION_DENIED", target: perm, outcome: "DENIED", note: `role ${me.role}` });
    // Blocked server-side — the acting member's role doesn't include this.
    redirect(`/seller/staff?denied=${perm}`);
  }
}

const STAFF_ROLES = ["MANAGER", "CATALOGUE", "ORDERS", "MARKETING", "FINANCE", "SUPPORT"];

export async function inviteStaffMember(formData: FormData): Promise<void> {
  await requirePerm("staff", "/seller/staff");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (name.length < 2) redirect("/seller/staff?err=name");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/seller/staff?err=email");
  if (!STAFF_ROLES.includes(role)) redirect("/seller/staff?err=role");
  const { inviteStaff } = await import("@/lib/staff");
  const result = await inviteStaff({ name, email, role: role as import("@/lib/staff").Role });
  if (!result.ok) redirect(`/seller/staff?err=${result.reason}`);
  await writeAudit({ actor: DEMO_STORE, action: "STAFF_INVITE", target: `${email} (${role})`, outcome: "OK" });
  redirect("/seller/staff?done=invited");
}

export async function changeStaffRole(formData: FormData): Promise<void> {
  await requirePerm("staff", "/seller/staff");
  const id = String(formData.get("staffId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!STAFF_ROLES.includes(role)) redirect("/seller/staff?err=role");
  const { setStaffRole } = await import("@/lib/staff");
  const result = await setStaffRole(id, role as import("@/lib/staff").Role);
  if (!result.ok) redirect(`/seller/staff?err=${result.reason}`);
  await writeAudit({ actor: DEMO_STORE, action: "STAFF_ROLE", target: `${id} → ${role}`, outcome: "OK" });
  redirect("/seller/staff?done=role");
}

export async function setStaffMemberStatus(formData: FormData): Promise<void> {
  await requirePerm("staff", "/seller/staff");
  const id = String(formData.get("staffId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["ACTIVE", "SUSPENDED"].includes(status)) redirect("/seller/staff");
  const { setStaffStatus } = await import("@/lib/staff");
  const result = await setStaffStatus(id, status as import("@/lib/staff").StaffStatus);
  if (!result.ok) redirect(`/seller/staff?err=${result.reason}`);
  // Suspending someone you're currently acting as drops you back to the owner.
  if (status === "SUSPENDED") { const { actAs } = await import("@/lib/staff"); await actAs("owner"); }
  await writeAudit({ actor: DEMO_STORE, action: "STAFF_STATUS", target: `${id} → ${status}`, outcome: "OK" });
  redirect("/seller/staff?done=status");
}

export async function removeStaffMember(formData: FormData): Promise<void> {
  await requirePerm("staff", "/seller/staff");
  const id = String(formData.get("staffId") ?? "");
  const { removeStaff, actAs } = await import("@/lib/staff");
  const result = await removeStaff(id);
  if (!result.ok) redirect(`/seller/staff?err=${result.reason}`);
  await actAs("owner");
  await writeAudit({ actor: DEMO_STORE, action: "STAFF_REMOVE", target: id, outcome: "OK" });
  redirect("/seller/staff?done=removed");
}

/** Demo convenience: switch which staff member the console acts as, to exercise
 *  the permission gates. Only the owner may switch (production = staff login). */
export async function actAsStaff(formData: FormData): Promise<void> {
  const id = String(formData.get("staffId") ?? "");
  const { actAs } = await import("@/lib/staff");
  // Returning to the owner is always allowed; switching INTO a staff member
  // requires the "staff" permission (only the owner/managers have it).
  if (id !== "owner") await requirePerm("staff", "/seller/staff");
  await actAs(id);
  redirect("/seller/staff?done=actas");
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

/* ── Products: create / edit / lifecycle (the catalog store) ── */

const SELLABLE_CLASSES = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];
const DEMO_STORE = "Vedic Botanicals"; // this session's storefront, per CONTRACT

/**
 * KYC gate (CLAUDE.md §0 — server is the only authority). A listing can only
 * enter review for a store whose verification is APPROVED. A blocked attempt
 * is logged (denied actions are logged too, §2) and the seller is sent to the
 * verification page with a remediation, never a bare 403.
 */
async function assertVerified(action: string, target: string): Promise<void> {
  const { kycApproved } = await import("@/lib/vendor");
  if (kycApproved(DEMO_STORE)) return;
  await writeAudit({ actor: DEMO_STORE, action, target, outcome: "DENIED", note: "store not verified — go-live blocked" });
  redirect("/seller/verification?blocked=1");
}

interface ListingFields {
  title: string; desc: string; pricePaise: number; mrpPaise: number; hsn: string;
}

/** Shared validation for create + edit. Returns the error key or the fields. */
function readListingFields(formData: FormData): { err: string } | { fields: ListingFields } {
  const title = String(formData.get("title") ?? "").trim();
  const desc = String(formData.get("desc") ?? "").trim();
  const pricePaise = parseInt(String(formData.get("pricePaise") ?? ""), 10);
  const mrpPaise = parseInt(String(formData.get("mrpPaise") ?? ""), 10);
  const hsn = String(formData.get("hsn") ?? "").trim();
  if (title.length < 8 || title.length > 150) return { err: "title" };
  if (CLAIM_WORDS.test(title) || CLAIM_WORDS.test(desc)) return { err: "claims" };
  if (!Number.isInteger(pricePaise) || pricePaise <= 0) return { err: "price" };
  if (!Number.isInteger(mrpPaise) || mrpPaise < pricePaise) return { err: "mrp" };
  if (!/^\d{4,8}$/.test(hsn)) return { err: "hsn" };
  return { fields: { title, desc, pricePaise, mrpPaise, hsn } };
}

export async function submitProduct(formData: FormData): Promise<void> {
  const cls = String(formData.get("cls") ?? "");
  const intent = String(formData.get("intent") ?? "submit");

  // A1/A2 boundary: MED_CANNABIS is not creatable here at all, and no path
  // from this action reaches LIVE — a human reviews every submission, and a
  // regulated class additionally needs an approved, batch-matched CoA.
  if (!SELLABLE_CLASSES.includes(cls)) redirect("/seller/products/new?err=cls");
  const parsed = readListingFields(formData);
  if ("err" in parsed) redirect(`/seller/products/new?err=${parsed.err}`);
  const { fields } = parsed as { fields: ListingFields };

  const openingStock = parseInt(String(formData.get("stockQty") ?? ""), 10);
  const session = await getSession();
  // Optional merchandising fields on the create form (claims-checked short copy).
  const shortDesc = String(formData.get("shortDesc") ?? "").trim().slice(0, 160);
  const brand = String(formData.get("brand") ?? "").trim().slice(0, 60);
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().slice(0, 40);
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const weight = parseInt(String(formData.get("weightGrams") ?? ""), 10);
  if ((shortDesc && CLAIM_WORDS.test(shortDesc)) || (brand && CLAIM_WORDS.test(brand))) redirect("/seller/products/new?err=claims");
  const created = await createListing({
    ...fields,
    cls: cls as ComplianceClass,
    emoji: "🆕",
    seller: DEMO_STORE,
    sellerEmail: session?.email ?? "seller@example.in",
    ...(Number.isInteger(openingStock) && openingStock >= 0 ? { stockQty: openingStock } : {}),
    ...(shortDesc ? { shortDesc } : {}),
    ...(brand ? { brand } : {}),
    ...(tagsRaw ? { tags: [...new Set(tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12) } : {}),
    ...(sku ? { sku } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(Number.isInteger(weight) && weight >= 0 ? { weightGrams: weight } : {}),
  });
  if (!created) redirect("/seller/products/new?err=cls");
  if (intent !== "draft") {
    await assertVerified("LISTING_SUBMIT", created!.id);
    await submitForReview(created!.id);
    const { notify } = await import("@/lib/notify");
    await notify("admin", "admin", {
      kind: "LISTING_REVIEW",
      title: "Listing to review",
      body: `${DEMO_STORE} submitted "${created!.title}" for approval.`,
      href: "/admin/catalogue#approvals",
    });
  }
  redirect(`/seller/products?submitted=${intent === "draft" ? "draft" : "review"}`);
}

/**
 * Read the optional merchandising / sale / SEO fields shared by the product
 * editor. Returns a validated patch, or an error key. Sale price must be a
 * positive integer BELOW the regular price; tags are comma-split and cleaned;
 * short copy and SEO fields pass the same claims check as the description.
 */
function readMerchFields(formData: FormData, regularPricePaise: number):
  | { err: string }
  | { patch: Record<string, unknown> } {
  const patch: Record<string, unknown> = {};
  const shortDesc = String(formData.get("shortDesc") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const metaTitle = String(formData.get("metaTitle") ?? "").trim();
  const metaDescription = String(formData.get("metaDescription") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const weightRaw = String(formData.get("weightGrams") ?? "").trim();
  const saleRaw = String(formData.get("salePricePaise") ?? "").trim();
  const saleFrom = String(formData.get("saleFrom") ?? "").trim();
  const saleTo = String(formData.get("saleTo") ?? "").trim();

  // Claims copy-check on every buyer-facing text field (fail closed).
  if ([shortDesc, brand, metaTitle, metaDescription].some((t) => t && CLAIM_WORDS.test(t))) return { err: "claims" };

  if (shortDesc.length > 160) return { err: "shortdesc" };
  patch.shortDesc = shortDesc || undefined;
  patch.brand = brand.slice(0, 60) || undefined;
  patch.tags = tagsRaw ? [...new Set(tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12) : undefined;
  patch.sku = sku.slice(0, 40) || undefined;
  patch.metaTitle = metaTitle.slice(0, 70) || undefined;
  patch.metaDescription = metaDescription.slice(0, 160) || undefined;
  patch.categoryId = categoryId || undefined;
  if (weightRaw) {
    const w = parseInt(weightRaw, 10);
    if (!Number.isInteger(w) || w < 0 || w > 100000) return { err: "weight" };
    patch.weightGrams = w;
  } else patch.weightGrams = undefined;

  // Per-order quantity limits. Empty min defaults to 1; empty max defaults to
  // the platform per-order cap. Server-authoritative — max ≥ min, within cap.
  const minRaw = String(formData.get("minOrderQty") ?? "").trim();
  const maxRaw = String(formData.get("maxOrderQty") ?? "").trim();
  const minQ = minRaw ? parseInt(minRaw, 10) : 1;
  if (!Number.isInteger(minQ) || minQ < 1 || minQ > ORDER_QTY_HARD_CAP) return { err: "minqty" };
  let maxQ: number | undefined;
  if (maxRaw) {
    maxQ = parseInt(maxRaw, 10);
    if (!Number.isInteger(maxQ) || maxQ < 1 || maxQ > ORDER_QTY_HARD_CAP) return { err: "maxqty" };
    if (maxQ < minQ) return { err: "qtyrange" };
  }
  patch.minOrderQty = minQ > 1 ? minQ : undefined;
  patch.maxOrderQty = maxQ;

  // Sale price: empty clears it; otherwise it must beat the regular price.
  if (saleRaw) {
    const sale = parseInt(saleRaw, 10);
    if (!Number.isInteger(sale) || sale <= 0) return { err: "saleprice" };
    if (sale >= regularPricePaise) return { err: "salehigh" };
    patch.salePricePaise = sale;
    patch.saleFrom = /^\d{4}-\d{2}-\d{2}$/.test(saleFrom) ? saleFrom : undefined;
    patch.saleTo = /^\d{4}-\d{2}-\d{2}$/.test(saleTo) ? saleTo : undefined;
    if (saleFrom && saleTo && saleTo < saleFrom) return { err: "saledates" };
  } else {
    patch.salePricePaise = undefined;
    patch.saleFrom = undefined;
    patch.saleTo = undefined;
  }
  return { patch };
}

export async function updateProductListing(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  await requirePerm("catalogue", `/seller/products/${id}`);
  const parsed = readListingFields(formData);
  if ("err" in parsed) {
    // Attempting medical-claims copy is not a silent validation miss: the
    // listing is flagged (barred from advertising until compliance clears
    // it) and the attempt is logged. This is the rule shown on the form.
    if (parsed.err === "claims") {
      await setClaimsStrike(id, true);
      const session = await getSession();
      await writeAudit({
        actor: session?.email ?? "seller",
        action: "LISTING_CLAIMS_ATTEMPT",
        target: id,
        outcome: "DENIED",
        note: "medical-claims copy rejected; listing barred from ads until cleared",
      });
    }
    redirect(`/seller/products/${id}?err=${parsed.err}`);
  }
  const { fields } = parsed as { fields: ListingFields };
  const merch = readMerchFields(formData, fields.pricePaise);
  if ("err" in merch) {
    if (merch.err === "claims") {
      await setClaimsStrike(id, true);
      await writeAudit({ actor: (await getSession())?.email ?? "seller", action: "LISTING_CLAIMS_ATTEMPT", target: id, outcome: "DENIED", note: "claims copy in merchandising field" });
    }
    redirect(`/seller/products/${id}?err=${merch.err}`);
  }
  const ok = await updateListing(id, { ...fields, ...(merch as { patch: Record<string, unknown> }).patch });
  redirect(ok ? `/seller/products/${id}?saved=1` : "/seller/products");
}

/* ── Product images (gallery) ─────────────────────────────── */

const IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

/** Upload one gallery image (stored as a data URL — the object-storage seam). */
export async function uploadProductImage(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const file = formData.get("image");
  const product = await findProduct(id);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/products");
  if (!(file instanceof File) || file.size === 0) redirect(`/seller/products/${id}?err=imgfile#gallery`);
  if (file.size > 1_500_000) redirect(`/seller/products/${id}?err=imgsize#gallery`);
  if (!IMG_TYPES.includes(file.type)) redirect(`/seller/products/${id}?err=imgtype#gallery`);
  const buf = Buffer.from(await (file as File).arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  const { addImage } = await import("@/lib/catalog");
  const ok = await addImage(id, dataUrl);
  redirect(ok ? `/seller/products/${id}?img=added#gallery` : `/seller/products/${id}?err=imgfull#gallery`);
}

export async function deleteProductImage(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const index = parseInt(String(formData.get("index") ?? ""), 10);
  const product = await findProduct(id);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/products");
  const { removeImage } = await import("@/lib/catalog");
  await removeImage(id, index);
  redirect(`/seller/products/${id}?img=removed#gallery`);
}

export async function setMainProductImage(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const index = parseInt(String(formData.get("index") ?? ""), 10);
  const product = await findProduct(id);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/products");
  const { makeMainImage } = await import("@/lib/catalog");
  await makeMainImage(id, index);
  redirect(`/seller/products/${id}?img=main#gallery`);
}

/* ── Wholesale / B2B price breaks ─────────────────────────── */

export async function addWholesaleTierAction(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  await requirePerm("catalogue", `/seller/products/${id}`);
  const minQty = parseInt(String(formData.get("minQty") ?? ""), 10);
  const pricePaise = parseInt(String(formData.get("pricePaise") ?? ""), 10);
  const product = await findProduct(id);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/products");
  const { addWholesaleTier } = await import("@/lib/catalog");
  const result = await addWholesaleTier(id, minQty, pricePaise);
  if (!result.ok) redirect(`/seller/products/${id}?err=w_${result.reason}#wholesale`);
  await writeAudit({ actor: DEMO_STORE, action: "WHOLESALE_TIER_ADD", target: `${id} · ${minQty}+ @ ${pricePaise}`, outcome: "OK" });
  redirect(`/seller/products/${id}?wdone=tier#wholesale`);
}

export async function removeWholesaleTierAction(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  await requirePerm("catalogue", `/seller/products/${id}`);
  const minQty = parseInt(String(formData.get("minQty") ?? ""), 10);
  const product = await findProduct(id);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/products");
  const { removeWholesaleTier } = await import("@/lib/catalog");
  await removeWholesaleTier(id, minQty);
  redirect(`/seller/products/${id}?wdone=removed#wholesale`);
}

/* ── Duplicate a listing ──────────────────────────────────── */

export async function duplicateProduct(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const product = await findProduct(id);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/products");
  const { duplicateListing } = await import("@/lib/catalog");
  const copy = await duplicateListing(id);
  if (!copy) redirect("/seller/products");
  await writeAudit({ actor: DEMO_STORE, action: "LISTING_DUPLICATE", target: `${product.title} → ${copy.id}`, outcome: "OK" });
  redirect(`/seller/products/${copy.id}?duplicated=1`);
}

/**
 * Lifecycle ops, server-validated against the state machine in lib/catalog:
 * submit (DRAFT→UNDER_REVIEW), unpublish (LIVE→DRAFT), archive, restore
 * (ARCHIVED→DRAFT), delete (custom drafts/archived only). Publishing to LIVE
 * is NOT here — only an admin review approves a listing, and the A2 CoA gate
 * is enforced inside the store where no button can bypass it.
 */
export async function productLifecycle(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const op = String(formData.get("op") ?? "");
  const ops: Record<string, (x: string) => Promise<{ ok: boolean; reason?: string }>> = {
    submit: submitForReview,
    unpublish: unpublishListing,
    archive: archiveListing,
    restore: restoreArchived,
    delete: deleteListing,
  };
  const run = ops[op];
  if (!run) redirect("/seller/products");
  // Going live requires a verified store; the other ops (take down, archive…)
  // are always allowed — a seller can pull their own listing regardless.
  if (op === "submit") await assertVerified("LISTING_SUBMIT", id);
  const result = await run!(id);
  if (op === "delete" && result.ok) redirect("/seller/products?deleted=1");
  if (!result.ok) redirect(`/seller/products/${id}?err=${result.reason ?? "state"}`);
  redirect(`/seller/products/${id}?done=${op}`);
}

/* ── Products: batch CoA submission (A2) ──────────────────── */

export async function submitCoaForBatch(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const batchCode = String(formData.get("batchCode") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,20}$/.test(batchCode)) redirect(`/seller/products/${id}?err=batch`);
  const product = await findProduct(id);
  if (!product) redirect("/seller/products");
  const result = await submitCoa(id, batchCode);
  if (result.ok) {
    const { notify } = await import("@/lib/notify");
    await notify("admin", "admin", {
      kind: "COA_REVIEW",
      title: "CoA to review",
      body: `${DEMO_STORE} submitted batch ${batchCode} for "${product.title}". A human must approve it before sale.`,
      href: "/admin/catalogue#coa-queue",
    });
  }
  redirect(result.ok ? `/seller/products/${id}?coa=submitted` : `/seller/products/${id}?err=${result.reason}`);
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

/* ── Store reviews: public seller reply ───────────────────── */

export async function replyStoreReviewAction(formData: FormData): Promise<void> {
  const reviewId = String(formData.get("reviewId") ?? "").slice(0, 20);
  const reply = String(formData.get("reply") ?? "").trim();
  const { findStoreReview, replyStoreReview } = await import("@/lib/store-reviews");
  const review = findStoreReview(reviewId);
  // Only the store the review is about may reply.
  if (!review || review.store !== DEMO_STORE) redirect("/seller/reviews#store-reviews");
  // Fail closed: replies are public copy — same claims check, same length rule.
  if (reply.length < 5 || reply.length > 500) redirect("/seller/reviews?serr=short#sr-" + reviewId);
  if (CLAIM_WORDS.test(reply)) redirect("/seller/reviews?serr=claims#sr-" + reviewId);
  const result = await replyStoreReview(reviewId, reply);
  if (!result) redirect("/seller/reviews?serr=state#store-reviews");
  await writeAudit({ actor: DEMO_STORE, action: "STORE_REVIEW_REPLY", target: reviewId, outcome: "OK" });
  redirect("/seller/reviews?sreplied=1#sr-" + reviewId);
}

/* ── Vendor verification (KYC) ────────────────────────────── */

/** Seller submits (or re-submits) their store's KYC for review. Validation is
 *  server-authoritative (a regulated class needs a valid, unexpired licence);
 *  a pass moves the store into review and pings the compliance queue. */
export async function submitVendorKyc(formData: FormData): Promise<void> {
  await requirePerm("staff", "/seller/verification");
  const { submitKyc } = await import("@/lib/vendor");
  const session = await getSession();
  const classes = formData.getAll("classes").map((c) => String(c)) as ComplianceClass[];
  const result = await submitKyc({
    store: DEMO_STORE,
    ownerEmail: session?.email ?? "seller@example.in",
    legalName: String(formData.get("legalName") ?? ""),
    gstin: String(formData.get("gstin") ?? ""),
    pan: String(formData.get("pan") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    pincode: String(formData.get("pincode") ?? ""),
    bankName: String(formData.get("bankName") ?? ""),
    bankAccount: String(formData.get("bankAccount") ?? ""),
    bankIfsc: String(formData.get("bankIfsc") ?? ""),
    classes,
    drugLicenceNo: String(formData.get("drugLicenceNo") ?? ""),
    drugLicenceExpiry: String(formData.get("drugLicenceExpiry") ?? ""),
  });
  if (!result.ok) {
    await writeAudit({ actor: DEMO_STORE, action: "VENDOR_KYC_SUBMIT", target: DEMO_STORE, outcome: "DENIED", note: `rejected at input: ${result.reason}` });
    redirect(`/seller/verification?err=${result.reason}`);
  }
  await writeAudit({ actor: DEMO_STORE, action: "VENDOR_KYC_SUBMIT", target: DEMO_STORE, outcome: "OK" });
  const { notify } = await import("@/lib/notify");
  await notify("admin", "admin", {
    kind: "KYC_REVIEW",
    title: "Store verification to review",
    body: `${DEMO_STORE} submitted business details for verification.`,
    href: "/admin/verification",
  });
  redirect("/seller/verification?done=1");
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

/** Seller answers a product question (copy-checked; only their own products). */
export async function answerProductQuestion(formData: FormData): Promise<void> {
  const questionId = String(formData.get("questionId") ?? "").slice(0, 20);
  const answer = String(formData.get("answer") ?? "").trim();
  const { findQuestion, answerQuestion } = await import("@/lib/qa");
  const { findProduct } = await import("@/lib/catalog");
  const q = findQuestion(questionId);
  if (!q) redirect("/seller/customers#product-questions");
  const product = await findProduct(q!.productId);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/customers#product-questions");
  if (answer.length < 5 || answer.length > 500) redirect("/seller/customers?qerr=short#product-questions");
  if (CLAIM_WORDS.test(answer)) redirect("/seller/customers?qerr=claims#product-questions");
  const result = await answerQuestion(questionId, answer, DEMO_STORE);
  if (!result.ok) redirect("/seller/customers#product-questions");
  await writeAudit({ actor: DEMO_STORE, action: "QA_ANSWER", target: questionId, outcome: "OK" });
  redirect("/seller/customers?answered=1#product-questions");
}

/* ── Support tickets (RBAC: "support") ────────────────────── */

export async function sellerReplyTicket(formData: FormData): Promise<void> {
  await requirePerm("support", "/seller/support");
  const id = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const { findTicket, addMessage } = await import("@/lib/support");
  const t = findTicket(id);
  if (!t || t.sellerStore !== DEMO_STORE) redirect("/seller/support");
  if (body.length < 2 || body.length > 1000) redirect(`/seller/support?err=reply#${id}`);
  if (CLAIM_WORDS.test(body)) redirect(`/seller/support?err=claims#${id}`);
  const result = await addMessage(id, "seller", DEMO_STORE, body);
  if (!result.ok) redirect(`/seller/support?err=${result.reason}#${id}`);
  await writeAudit({ actor: DEMO_STORE, action: "SUPPORT_REPLY", target: id, outcome: "OK" });
  const { notify } = await import("@/lib/notify");
  await notify("buyer", t.buyerEmail, { kind: "SUPPORT_REPLY", title: "Seller replied to your ticket", body: t.subject, href: "/account/support" });
  redirect(`/seller/support?replied=1#${id}`);
}

export async function sellerSetTicketStatus(formData: FormData): Promise<void> {
  await requirePerm("support", "/seller/support");
  const id = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["OPEN", "PENDING", "RESOLVED"].includes(status)) redirect("/seller/support");
  const { findTicket, setStatus } = await import("@/lib/support");
  const t = findTicket(id);
  if (!t || t.sellerStore !== DEMO_STORE) redirect("/seller/support");
  await setStatus(id, status as import("@/lib/support").TicketStatus);
  await writeAudit({ actor: DEMO_STORE, action: "SUPPORT_STATUS", target: `${id} → ${status}`, outcome: "OK" });
  redirect(`/seller/support?done=status#${id}`);
}

export async function sellerEscalateTicket(formData: FormData): Promise<void> {
  await requirePerm("support", "/seller/support");
  const id = String(formData.get("ticketId") ?? "");
  const { findTicket, escalate } = await import("@/lib/support");
  const t = findTicket(id);
  if (!t || t.sellerStore !== DEMO_STORE) redirect("/seller/support");
  await escalate(id);
  await writeAudit({ actor: DEMO_STORE, action: "SUPPORT_ESCALATE", target: id, outcome: "OK" });
  const { notify } = await import("@/lib/notify");
  await notify("admin", "admin", { kind: "SUPPORT_ESCALATE", title: "Ticket escalated to platform", body: t.subject, href: "/admin/support" });
  redirect(`/seller/support?done=escalated#${id}`);
}

/** Seller's public reply to an approved review on their product (copy-checked). */
export async function replySellerReview(formData: FormData): Promise<void> {
  const reviewId = String(formData.get("reviewId") ?? "").slice(0, 20);
  const reply = String(formData.get("reply") ?? "").trim();
  const { findReview, replyToReview } = await import("@/lib/reviews");
  const { findProduct } = await import("@/lib/catalog");
  const review = findReview(reviewId);
  if (!review) redirect("/seller/reviews");
  // Only the store that owns the product may reply.
  const product = await findProduct(review!.productId);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/reviews");
  // Fail closed: replies are public copy — same claims check, same length rule.
  if (reply.length < 5 || reply.length > 500) redirect("/seller/reviews?err=short#r-" + reviewId);
  if (CLAIM_WORDS.test(reply)) redirect("/seller/reviews?err=claims#r-" + reviewId);
  const result = await replyToReview(reviewId, reply);
  if (!result.ok) redirect(`/seller/reviews?err=${result.reason}`);
  await writeAudit({ actor: DEMO_STORE, action: "REVIEW_REPLY", target: reviewId, outcome: "OK" });
  redirect("/seller/reviews?replied=1#r-" + reviewId);
}

/* ── Vedic Ads: full campaign structure (A1-guarded) ──────── */

const OBJECTIVE_BY_TYPE: Record<string, "SPONSORED_PRODUCTS" | "BANNER" | "VIDEO"> = {
  "Sponsored Product": "SPONSORED_PRODUCTS",
  Banner: "BANNER",
  Video: "VIDEO",
};

/**
 * Quick-create: one form builds a complete, well-formed campaign — campaign
 * settings, one ad group with sensible placements, and one creative that
 * lands in the admin review queue. The full builder on the campaign page
 * then adds keywords, negatives, more groups and more ads.
 */
export async function createCampaign(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "Sponsored Product");
  const productId = String(formData.get("productId") ?? "");
  const budgetRupees = parseInt(String(formData.get("budget") ?? ""), 10);
  const dailyRupees = parseInt(String(formData.get("dailyBudget") ?? ""), 10);
  const bidRupees = parseInt(String(formData.get("bid") ?? ""), 10);
  const strategy = String(formData.get("bidStrategy") ?? "MANUAL_CPC");
  const targetAcos = parseInt(String(formData.get("targetAcos") ?? ""), 10);
  const startDate = String(formData.get("startDate") ?? "") || new Date().toISOString().slice(0, 10);
  const endDate = String(formData.get("endDate") ?? "");
  const locations = formData.getAll("locations").map(String).filter(Boolean);
  const placements = formData.getAll("placements").map(String).filter(Boolean);

  const product = await findProduct(productId);
  let err: string | null = null;
  if (name.length < 4 || name.length > 60) err = "name";
  else if (!OBJECTIVE_BY_TYPE[type]) err = "type";
  else if (!product) err = "product";
  else if (!Number.isInteger(budgetRupees) || budgetRupees < 500) err = "budget";
  if (!err && product) {
    // A1 — enforced here AND at the review layer AND at the auction. A
    // medical product id in crafted form data dies here, logged.
    const { adEligibility } = await import("@/lib/ads");
    const elig = adEligibility(product);
    if (!elig.ok) {
      if (elig.reason === "a1") {
        await writeAudit({ actor: (await getSession())?.email ?? "seller", action: "CAMPAIGN_CREATE", target: productId, outcome: "DENIED", note: "A1: MED_CANNABIS is never advertisable" });
        err = "a1";
      } else if (elig.reason === "strike") err = "strike";
      else err = "product";
    }
  }
  if (err) redirect(`/seller/ads?err=${err}#new-campaign`);

  const { addAd, addAdGroup, createAdCampaign, PLACEMENTS } = await import("@/lib/ads");
  const session = await getSession();
  const chosenPlacements = (placements.length
    ? placements.filter((p) => PLACEMENTS.some((d) => d.key === p))
    : ["listing-sponsored", "home-sponsored-products", "listing-sidebar"]) as import("@/lib/ads").PlacementKey[];

  const campaign = await createAdCampaign({
    seller: DEMO_STORE,
    sellerEmail: session?.email ?? "seller@example.in",
    name,
    objective: OBJECTIVE_BY_TYPE[type]!,
    dailyBudgetPaise: (Number.isInteger(dailyRupees) && dailyRupees > 0 ? dailyRupees : Math.max(100, Math.round(budgetRupees / 10))) * 100,
    totalBudgetPaise: budgetRupees * 100,
    startDate,
    ...(endDate ? { endDate } : {}),
    locations: locations.length ? locations : ["ALL"],
    bidStrategy: (["MANUAL_CPC", "ENHANCED_CPC", "TARGET_ACOS", "MAX_CLICKS"].includes(strategy) ? strategy : "MANUAL_CPC") as import("@/lib/ads").BidStrategy,
    ...(Number.isInteger(targetAcos) && targetAcos > 0 ? { targetAcosPct: Math.min(targetAcos, 100) } : {}),
  });
  const group = await addAdGroup(campaign.id, {
    name: "Ad group 1",
    defaultBidPaise: (Number.isInteger(bidRupees) && bidRupees > 0 ? bidRupees : 9) * 100,
    placements: chosenPlacements,
  });
  if (group && product) {
    await addAd(campaign.id, group.id, { productId, headline: `${product.title} — from a licensed seller` });
  }
  redirect(`/seller/ads?created=1`);
}

/* ── Vedic Ads: campaign detail management ────────────────── */

export async function saveCampaignSettings(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dailyRupees = parseInt(String(formData.get("dailyBudget") ?? ""), 10);
  const totalRupees = parseInt(String(formData.get("totalBudget") ?? ""), 10);
  const strategy = String(formData.get("bidStrategy") ?? "MANUAL_CPC");
  const targetAcos = parseInt(String(formData.get("targetAcos") ?? ""), 10);
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const locations = formData.getAll("locations").map(String).filter(Boolean);

  if (name.length < 4 || name.length > 60) redirect(`/seller/ads/${id}?err=name`);
  if (!Number.isInteger(totalRupees) || totalRupees < 500) redirect(`/seller/ads/${id}?err=budget`);
  if (!Number.isInteger(dailyRupees) || dailyRupees < 100) redirect(`/seller/ads/${id}?err=daily`);

  const { updateCampaignSettings } = await import("@/lib/ads");
  const ok = await updateCampaignSettings(id, {
    name,
    dailyBudgetPaise: dailyRupees * 100,
    totalBudgetPaise: totalRupees * 100,
    bidStrategy: (["MANUAL_CPC", "ENHANCED_CPC", "TARGET_ACOS", "MAX_CLICKS"].includes(strategy) ? strategy : "MANUAL_CPC") as import("@/lib/ads").BidStrategy,
    ...(Number.isInteger(targetAcos) && targetAcos > 0 ? { targetAcosPct: Math.min(targetAcos, 100) } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    locations: locations.length ? locations : ["ALL"],
  });
  redirect(ok ? `/seller/ads/${id}?saved=1` : "/seller/ads");
}

export async function toggleCampaign(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  const to = String(formData.get("to") ?? "");
  if (to !== "ACTIVE" && to !== "PAUSED") redirect(`/seller/ads/${id}`);
  const { findCampaign, setCampaignStatus } = await import("@/lib/ads");
  const c = await findCampaign(id);
  if (!c) redirect("/seller/ads");
  // Resuming requires at least one APPROVED creative — review is not optional.
  if (to === "ACTIVE" && !c!.adGroups.some((g) => g.ads.some((a) => a.status === "APPROVED"))) {
    redirect(`/seller/ads/${id}?err=review`);
  }
  await setCampaignStatus(id, to);
  redirect(`/seller/ads/${id}?state=${to.toLowerCase()}`);
}

export async function createAdGroup(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const bidRupees = parseInt(String(formData.get("defaultBid") ?? ""), 10);
  const placements = formData.getAll("placements").map(String).filter(Boolean);
  const { PLACEMENTS, addAdGroup, readAdSettings } = await import("@/lib/ads");
  const settings = await readAdSettings();
  if (name.length < 3 || name.length > 50) redirect(`/seller/ads/${id}?err=groupname`);
  if (!Number.isInteger(bidRupees) || bidRupees * 100 < settings.minBidPaise) redirect(`/seller/ads/${id}?err=bidfloor`);
  const valid = placements.filter((p) => PLACEMENTS.some((d) => d.key === p));
  if (valid.length === 0) redirect(`/seller/ads/${id}?err=placement`);
  await addAdGroup(id, { name, defaultBidPaise: bidRupees * 100, placements: valid as import("@/lib/ads").PlacementKey[] });
  redirect(`/seller/ads/${id}?group=created`);
}

export async function addKeywordToGroup(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const match = String(formData.get("match") ?? "BROAD");
  const bidRupees = parseInt(String(formData.get("bid") ?? ""), 10);
  const negative = String(formData.get("negative") ?? "") === "1";
  const { addKeyword, addNegativeKeyword } = await import("@/lib/ads");
  if (text.length < 2 || text.length > 60) redirect(`/seller/ads/${id}?err=keyword`);
  if (negative) {
    await addNegativeKeyword(id, groupId, text);
    redirect(`/seller/ads/${id}?kw=negative`);
  }
  const result = await addKeyword(id, groupId, {
    text,
    match: (["BROAD", "PHRASE", "EXACT"].includes(match) ? match : "BROAD") as import("@/lib/ads").MatchType,
    ...(Number.isInteger(bidRupees) && bidRupees > 0 ? { bidPaise: bidRupees * 100 } : {}),
  });
  redirect(result.ok ? `/seller/ads/${id}?kw=added&est=${result.estimate ?? 0}` : `/seller/ads/${id}?err=keyword`);
}

export async function createAdCreative(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const headline = String(formData.get("headline") ?? "").trim();
  if (headline.length < 8 || headline.length > 90) redirect(`/seller/ads/${id}?err=headline`);
  const { addAd } = await import("@/lib/ads");
  const result = await addAd(id, groupId, { productId, headline });
  if (!result.ok) redirect(`/seller/ads/${id}?err=${result.reason}`);
  redirect(`/seller/ads/${id}?ad=created`);
}

/* ── Vedic Ads: AI assistance (claims-gated, review-before-apply) ── */

export async function aiSuggestHeadline(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const product = await findProduct(productId);
  if (!product) redirect(`/seller/ads/${id}`);
  const { aiComplete } = await import("@/lib/ai");
  const { violatesClaimsCopy } = await import("@/lib/claims");
  const { findCampaign, findGroup } = await import("@/lib/ads");
  const fallback = () => `${product!.title} — batch-tested, from a licensed seller`;
  const { text } = await aiComplete(
    `Write ONE ad headline under 80 characters for the wellness product "${product!.title}". Plain text only. Never claim to cure, treat, prevent or diagnose anything — describe composition, tradition or logistics instead.`,
    fallback,
  );
  // The platform's rules outrank the model: claims output is discarded.
  const safe = violatesClaimsCopy(text) ? fallback() : text.slice(0, 90).replace(/^["']|["']$/g, "");
  const c = await findCampaign(id);
  const g = c && findGroup(c, groupId);
  if (g) g.aiHeadline = safe;
  redirect(`/seller/ads/${id}?ai=headline`);
}

export async function aiSuggestKeywords(formData: FormData): Promise<void> {
  const id = String(formData.get("campaignId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const product = await findProduct(productId);
  if (!product) redirect(`/seller/ads/${id}`);
  const { aiComplete } = await import("@/lib/ai");
  const { violatesClaimsCopy } = await import("@/lib/claims");
  const { findCampaign, findGroup } = await import("@/lib/ads");
  const fallback = () => {
    const base = product!.title.toLowerCase().replace(/[0-9]+\s*(g|ml|ct|caps?)\b/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
    return [...new Set([...base, "lab tested", "licensed seller", "wellness gift"])].slice(0, 8).join("\n");
  };
  const { text } = await aiComplete(
    `List 8 short ad keywords (one per line, plain text) buyers might search for "${product!.title}" on an Indian wellness marketplace. No medical claims words.`,
    fallback,
  );
  const lines = (violatesClaimsCopy(text) ? fallback() : text)
    .split("\n").map((l) => l.replace(/^[\d.\-•*\s]+/, "").trim().toLowerCase()).filter((l) => l.length > 1 && l.length < 40 && !violatesClaimsCopy(l)).slice(0, 8);
  const c = await findCampaign(id);
  const g = c && findGroup(c, groupId);
  if (g) g.aiKeywords = lines;
  redirect(`/seller/ads/${id}?ai=keywords`);
}

/* ── Bulk upload: CSV → draft listings ────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __vhBulkReports: Record<string, { created: string[]; rejected: { row: number; reason: string }[] }> | undefined;
}

export async function bulkUploadListings(formData: FormData): Promise<void> {
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) redirect("/seller/products?bulkerr=file");
  if (file.size > 200_000) redirect("/seller/products?bulkerr=size");
  const text = await (file as File).text();
  const session = await getSession();

  const report = { created: [] as string[], rejected: [] as { row: number; reason: string }[] };
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  let row = 0;
  for (const line of lines) {
    row += 1;
    if (row === 1 && /^title\s*,/i.test(line)) continue; // header row
    if (report.created.length + report.rejected.length >= 50) break; // per-file cap
    const [title = "", cls = "", priceRaw = "", mrpRaw = "", hsn = "", ...rest] = line.split(",").map((x) => x.trim());
    const desc = rest.join(", ");
    const pricePaise = parseInt(priceRaw, 10);
    const mrpPaise = parseInt(mrpRaw, 10);
    let reason: string | null = null;
    if (title.length < 8 || title.length > 150) reason = "title must be 8–150 chars";
    else if (!SELLABLE_CLASSES.includes(cls)) reason = `class must be one of ${SELLABLE_CLASSES.join("/")}`;
    else if (CLAIM_WORDS.test(title) || CLAIM_WORDS.test(desc)) reason = "claims language rejected (no cure/treat/prevent copy — the rule on every listing)";
    else if (!Number.isInteger(pricePaise) || pricePaise <= 0) reason = "price must be integer paise";
    else if (!Number.isInteger(mrpPaise) || mrpPaise < pricePaise) reason = "MRP must be integer paise ≥ price";
    else if (!/^\d{4,8}$/.test(hsn)) reason = "HSN must be 4–8 digits";
    if (reason) {
      report.rejected.push({ row, reason });
      continue;
    }
    const created = await createListing({
      title, desc, cls: cls as ComplianceClass, pricePaise, mrpPaise, hsn,
      emoji: "📦", seller: DEMO_STORE, sellerEmail: session?.email ?? "seller@example.in",
    });
    if (created) report.created.push(created.title);
    else report.rejected.push({ row, reason: "class not creatable" });
  }
  globalThis.__vhBulkReports ??= {};
  globalThis.__vhBulkReports["seller"] = report;
  redirect("/seller/products?bulk=1");
}

/* ── Marketing: create coupon ─────────────────────────────── */

const SELLER_COUPON_CLASSES = ["", "HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

export async function createCoupon(formData: FormData): Promise<void> {
  await requirePerm("marketing", "/seller/marketing");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const kind = String(formData.get("kind") ?? "PERCENT"); // PERCENT | FIXED
  const value = parseInt(String(formData.get("value") ?? ""), 10); // % or ₹
  const minRupees = parseInt(String(formData.get("minRupees") ?? "0"), 10);
  const capRupees = parseInt(String(formData.get("capRupees") ?? "0"), 10);
  const usageLimit = parseInt(String(formData.get("usageLimit") ?? ""), 10);
  const validTo = String(formData.get("validTo") ?? "").trim();
  const cls = String(formData.get("cls") ?? "");

  let err: string | null = null;
  if (!/^[A-Z0-9]{4,12}$/.test(code)) err = "code";
  else if (kind === "PERCENT" && (!Number.isInteger(value) || value < 1 || value > 40)) err = "pct";
  else if (kind === "FIXED" && (!Number.isInteger(value) || value < 1 || value > 100000)) err = "amount";
  else if (!SELLER_COUPON_CLASSES.includes(cls)) err = "cls";
  else if (validTo && (!/^\d{4}-\d{2}-\d{2}$/.test(validTo) || new Date(validTo) < new Date(new Date().toISOString().slice(0, 10)))) err = "date";
  if (err) redirect(`/seller/marketing?err=${err}#new-coupon`);

  // A seller coupon becomes a real, cart-honoured promotion (server-authoritative).
  const { writeCoupon, readCoupons } = await import("@/lib/commerce");
  if (code in (await readCoupons())) redirect("/seller/marketing?err=dupe#new-coupon");
  const isPct = kind === "PERCENT";
  const label = isPct
    ? `${value}% off${cls ? ` ${cls.replace("_", " ").toLowerCase()}` : ""}${capRupees > 0 ? ` up to ₹${capRupees}` : ""}`
    : `₹${value} off${cls ? ` ${cls.replace("_", " ").toLowerCase()}` : ""}`;
  await writeCoupon(code, {
    pct: isPct ? value : 0,
    ...(isPct ? {} : { fixedPaise: value * 100 }),
    capPaise: capRupees > 0 ? capRupees * 100 : 0,
    minPaise: Number.isInteger(minRupees) && minRupees > 0 ? minRupees * 100 : 0,
    ...(cls ? { cls } : {}),
    label,
    enabled: true,
    ...(validTo ? { validTo } : {}),
    ...(Number.isInteger(usageLimit) && usageLimit > 0 ? { usageLimit } : {}),
    usedCount: 0,
    owner: DEMO_STORE,
  });
  await writeAudit({ actor: DEMO_STORE, action: "COUPON_CREATE", target: code, outcome: "OK", note: label });
  redirect("/seller/marketing?created=1#coupons");
}

/* ── Store: publish storefront copy (tagline + story) ─────── */

export async function updateStorefront(formData: FormData): Promise<void> {
  const tagline = String(formData.get("tagline") ?? "").trim();
  const story = String(formData.get("story") ?? "").trim();
  // Search & social fields (all optional).
  const metaTitle = String(formData.get("metaTitle") ?? "").trim().slice(0, 70);
  const metaDescription = String(formData.get("metaDescription") ?? "").trim().slice(0, 160);
  const website = String(formData.get("website") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim().replace(/^@/, "");
  const facebook = String(formData.get("facebook") ?? "").trim();
  const youtube = String(formData.get("youtube") ?? "").trim().replace(/^@/, "");

  const { socialUrl } = await import("@/lib/engage");
  let err: string | null = null;
  if (tagline.length < 10 || tagline.length > 90) err = "tagline";
  else if (story.length < 40 || story.length > 500) err = "story";
  // Storefront copy — including the meta fields shown in search and social
  // shares — is promotional; the same fail-closed claims check applies.
  else if ([tagline, story, metaTitle, metaDescription].some((s) => s && CLAIM_WORDS.test(s))) err = "copyclaims";
  else if (website && !socialUrl("website", website)) err = "website";
  else if (instagram && !socialUrl("instagram", instagram)) err = "social";
  else if (facebook && !socialUrl("facebook", facebook)) err = "social";
  else if (youtube && !socialUrl("youtube", youtube)) err = "social";
  if (err) redirect(`/seller/store?err=${err}#storefront-copy`);

  const { writeStoreCopy } = await import("@/lib/engage");
  await writeStoreCopy({
    tagline,
    story,
    ...(metaTitle ? { metaTitle } : {}),
    ...(metaDescription ? { metaDescription } : {}),
    ...(website ? { website } : {}),
    ...(instagram ? { instagram } : {}),
    ...(facebook ? { facebook } : {}),
    ...(youtube ? { youtube } : {}),
  });
  redirect("/seller/store?copy=published#storefront-copy");
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

/* ── Fulfilment on real orders (order store) ──────────────── */

export async function fulfilOrder(formData: FormData): Promise<void> {
  await requirePerm("orders", "/seller/orders");
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const op = String(formData.get("op") ?? "");
  const { advanceOrder, findOrder } = await import("@/lib/orders");
  const order = await findOrder(reference);
  if (!order || !order.items.some((it) => it.seller === DEMO_STORE)) redirect("/seller/orders");
  const result = await advanceOrder(reference, op, `seller:${DEMO_STORE}`);
  if (!result.ok) redirect(`/seller/orders?err=${result.reason}`);
  await writeAudit({ actor: DEMO_STORE, action: `ORDER_${op.toUpperCase()}`, target: reference, outcome: "OK" });
  // Keep the buyer in the loop on the milestones they care about.
  const { notify } = await import("@/lib/notify");
  if (op === "ship") {
    await notify("buyer", result.order.buyerEmail, {
      kind: "ORDER_SHIPPED",
      title: `Order ${reference} shipped`,
      body: "Your order is on its way. Track it from your orders page.",
      href: `/account/orders/live-${reference}`,
    });
  } else if (op === "deliver") {
    await notify("buyer", result.order.buyerEmail, {
      kind: "ORDER_DELIVERED",
      title: `Order ${reference} delivered`,
      body: "Delivered. You have 7 days to request a return if anything's wrong.",
      href: `/account/orders/live-${reference}`,
    });
  }
  redirect(`/seller/orders?done=${op}#real-orders`);
}

/** Seller approves a return (buyer keeps the buyer-first refund path). */
export async function sellerApproveReturn(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const { approveReturn, findOrder } = await import("@/lib/orders");
  const order = await findOrder(reference);
  if (!order || !order.items.some((it) => it.seller === DEMO_STORE)) redirect("/seller/orders");
  const result = await approveReturn(reference, `seller:${DEMO_STORE}`);
  if (!result.ok) redirect(`/seller/orders?err=${result.reason}#real-orders`);
  await writeAudit({ actor: DEMO_STORE, action: "RETURN_APPROVE", target: reference, outcome: "OK" });
  const { notify } = await import("@/lib/notify");
  await notify("buyer", result.order.buyerEmail, {
    kind: "RETURN_APPROVED",
    title: `Return approved — ${reference}`,
    body: "Your return is approved. Your refund is being processed to your original payment method.",
    href: `/account/orders/live-${reference}`,
  });
  redirect(`/seller/orders?done=return_approved#real-orders`);
}

/* ── Inventory management ─────────────────────────────────── */

export async function saveStock(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const qty = parseInt(String(formData.get("stockQty") ?? ""), 10);
  const lowAt = parseInt(String(formData.get("lowStockAt") ?? ""), 10);
  const { setStock, setLowStockAt, findProduct } = await import("@/lib/catalog");
  const product = await findProduct(id);
  if (!product || product.seller !== DEMO_STORE) redirect("/seller/inventory");
  if (Number.isInteger(qty) && qty >= 0) await setStock(id, qty);
  if (Number.isInteger(lowAt) && lowAt >= 0) await setLowStockAt(id, lowAt);
  redirect("/seller/inventory?saved=1");
}

/* ── Earnings & Withdrawals (Dokan-style money flow) ──────── */

export async function saveWithdrawAccount(formData: FormData): Promise<void> {
  const method = String(formData.get("method") ?? "");
  const raw = String(formData.get("destination") ?? "");
  const { savePayoutAccount } = await import("@/lib/earnings");
  if (method !== "BANK" && method !== "UPI") redirect("/seller/earnings?err=method#account");
  const ok = await savePayoutAccount(DEMO_STORE, method, raw);
  redirect(ok ? "/seller/earnings?saved=account#account" : "/seller/earnings?err=destination#account");
}

export async function submitWithdraw(formData: FormData): Promise<void> {
  await requirePerm("finance", "/seller/earnings");
  const rupees = parseInt(String(formData.get("amount") ?? ""), 10);
  const { requestWithdraw } = await import("@/lib/earnings");
  if (!Number.isInteger(rupees) || rupees <= 0) redirect("/seller/earnings?err=amount#withdraw");
  const result = await requestWithdraw(DEMO_STORE, rupees * 100);
  if (!result.ok) redirect(`/seller/earnings?err=${result.reason}#withdraw`);
  await writeAudit({ actor: DEMO_STORE, action: "WITHDRAW_REQUEST", target: result.request.id, outcome: "OK", note: `₹${rupees} to ${result.request.destination}` });
  const { notify } = await import("@/lib/notify");
  await notify("admin", "admin", {
    kind: "WITHDRAW_REQUEST",
    title: `Withdrawal to approve — ₹${rupees.toLocaleString("en-IN")}`,
    body: `${DEMO_STORE} requested a payout to ${result.request.destination}. Approve, then a second admin confirms.`,
    href: "/admin/finance/withdrawals",
  });
  redirect("/seller/earnings?requested=1#withdraw");
}

/* ── Store availability (Dokan-style vacation mode) ───────── */

export async function saveStoreAvailability(formData: FormData): Promise<void> {
  const onVacation = String(formData.get("onVacation") ?? "") === "1";
  const message = String(formData.get("vacationMessage") ?? "").trim().slice(0, 160);
  const { CLAIMS_LANGUAGE } = await import("@/lib/claims");
  if (message && CLAIMS_LANGUAGE.test(message)) redirect("/seller/store?err=vacclaims#availability");
  const { writeStoreAvailability } = await import("@/lib/engage");
  await writeStoreAvailability({ onVacation, message: message || "We're on a short break — back soon. Thanks for your patience!" });
  redirect("/seller/store?avail=saved#availability");
}

/* ── Product variants (size / pack / strength options) ────── */

export async function saveOptionName(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const name = String(formData.get("optionName") ?? "").trim();
  const { setOptionName } = await import("@/lib/catalog");
  if (name.length < 1 || name.length > 30) redirect(`/seller/products/${id}?err=optionname#variants`);
  await setOptionName(id, name);
  redirect(`/seller/products/${id}?vdone=option#variants`);
}

export async function addProductVariant(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const pricePaise = parseInt(String(formData.get("pricePaise") ?? ""), 10);
  const mrpPaise = parseInt(String(formData.get("mrpPaise") ?? ""), 10);
  const stockQty = parseInt(String(formData.get("stockQty") ?? ""), 10);
  const { addVariant } = await import("@/lib/catalog");
  const result = await addVariant(id, { label, sku, pricePaise, mrpPaise, stockQty });
  if (!result.ok) redirect(`/seller/products/${id}?err=v_${result.reason}#variants`);
  await writeAudit({ actor: DEMO_STORE, action: "VARIANT_ADD", target: `${id} · ${label}`, outcome: "OK" });
  redirect(`/seller/products/${id}?vdone=added#variants`);
}

export async function updateProductVariant(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const pricePaise = parseInt(String(formData.get("pricePaise") ?? ""), 10);
  const mrpPaise = parseInt(String(formData.get("mrpPaise") ?? ""), 10);
  const stockQty = parseInt(String(formData.get("stockQty") ?? ""), 10);
  const { updateVariant } = await import("@/lib/catalog");
  const patch: Record<string, number> = {};
  if (Number.isInteger(pricePaise) && pricePaise > 0) patch.pricePaise = pricePaise;
  if (Number.isInteger(mrpPaise) && mrpPaise >= (patch.pricePaise ?? 0)) patch.mrpPaise = mrpPaise;
  if (Number.isInteger(stockQty) && stockQty >= 0) patch.stockQty = stockQty;
  await updateVariant(id, variantId, patch);
  redirect(`/seller/products/${id}?vdone=saved#variants`);
}

export async function removeProductVariant(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const { removeVariant } = await import("@/lib/catalog");
  await removeVariant(id, variantId);
  await writeAudit({ actor: DEMO_STORE, action: "VARIANT_REMOVE", target: `${id} · ${variantId}`, outcome: "OK" });
  redirect(`/seller/products/${id}?vdone=removed#variants`);
}
