"use server";

/**
 * VEDIC HEMP — ADMIN CONSOLE ACTIONS
 *
 * Every mutation here demonstrates the constitution's admin rules, enforced
 * server-side in this demo exactly as they would be against the DB:
 *  - high-impact actions demand a reasonCode + ≥20 chars of free text;
 *  - maker–checker (A6): the initiator can never also be the approver;
 *  - denied attempts redirect with an error AND would be logged — what
 *    someone tried to do is often more informative than what they did.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PERIOD_CLOSE_CHECKLIST } from "./_lib/data";
import { MAX_BODY, SAMPLE_POSTS, deletePostOverride, findPost, listRevisions, pushRevision, slugify, writePostOverride } from "@/lib/cms";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { addCommission, minEffectiveFrom, readCommissions, readOpenRecall, setOpenRecall } from "@/lib/adminstate";
import { LAUNCH_COMMISSION_PCT } from "@/lib/commissions";
import { CLAIMS_LANGUAGE } from "@/lib/claims";
import { SITE_FIELDS, writeSiteContent } from "@/lib/sitecontent";

const OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 30 };

async function actor(): Promise<string> {
  return (await getSession())?.email ?? "unknown-admin";
}

/* ── Finance: period close (maker step) ───────────────────── */

export async function initiatePeriodClose(formData: FormData): Promise<void> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 20) redirect("/admin/finance?close=reason#close-period");

  // Fail closed: a close cannot even be INITIATED while checklist items are
  // open — the checklist is server data, not a UI suggestion.
  if (PERIOD_CLOSE_CHECKLIST.some((c) => !c.done)) {
    redirect("/admin/finance?close=blocked#close-period");
  }

  (await cookies()).set("vh-adm-close", "initiated", OPTS);
  redirect("/admin/finance?close=initiated#close-period");
}

/* ── Compliance: product recall (maker–checker pair) ──────── */

export async function initiateRecall(formData: FormData): Promise<void> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 20) redirect("/admin/compliance?recall=reason#recall");

  const who = await actor();
  const ref = `RC${Date.now().toString(36).toUpperCase().slice(-5)}`;
  // Shared server-side record — a DIFFERENT admin must be able to see and
  // close it (A6), so it cannot live in the maker's cookies.
  await setOpenRecall({ ref, at: new Date().toISOString().slice(0, 10), initiator: who, reason });
  await writeAudit({ actor: who, action: "RECALL_INITIATE", target: ref, outcome: "OK", note: reason });
  redirect(`/admin/compliance?recall=initiated&ref=${ref}#recall`);
}

export async function closeRecall(): Promise<void> {
  const open = await readOpenRecall();
  if (!open) redirect("/admin/compliance?recall=none#recall");
  const who = await actor();
  // A6: the admin who initiated the recall cannot also close it. A different
  // admin signing in CAN. Either way, the attempt is an audit event.
  if (open.initiator === who) {
    await writeAudit({ actor: who, action: "RECALL_CLOSE", target: open.ref, outcome: "DENIED", note: "A6: maker cannot be checker" });
    redirect("/admin/compliance?recall=denied#recall");
  }
  await setOpenRecall(null);
  await writeAudit({ actor: who, action: "RECALL_CLOSE", target: open.ref, outcome: "OK", note: `initiated by ${open.initiator}` });
  redirect(`/admin/compliance?recall=closed&ref=${open.ref}#recall`);
}

/* ── Finance: commission schedules (A5 — 30-day notice, never retroactive) ── */

export async function saveCommissionSchedule(formData: FormData): Promise<void> {
  const scope = String(formData.get("scope") ?? "CATEGORY") as "GLOBAL" | "CATEGORY" | "SELLER" | "PRODUCT";
  const cls = String(formData.get("cls") ?? "");
  const freeTarget = String(formData.get("target") ?? "").trim().slice(0, 80);
  const ratePct = Number(formData.get("ratePct"));
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "");
  const who = await actor();

  if (!["GLOBAL", "CATEGORY", "SELLER", "PRODUCT"].includes(scope)) redirect("/admin/finance/commissions?cs=cls");
  const target = scope === "GLOBAL" ? "GLOBAL" : scope === "CATEGORY" ? cls : freeTarget;
  if (scope === "CATEGORY" && !["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"].includes(cls)) redirect("/admin/finance/commissions?cs=cls");
  if ((scope === "SELLER" || scope === "PRODUCT") && !target) redirect("/admin/finance/commissions?cs=target");
  if (!Number.isFinite(ratePct) || ratePct <= 0 || ratePct > 40) redirect("/admin/finance/commissions?cs=rate");

  // A5 protects sellers from INCREASES: a rise needs 30 days' notice
  // (mirrored by CHECK a5_thirty_day_notice). A decrease only ever benefits
  // the seller and may apply from today.
  const rows = await readCommissions();
  const today = new Date().toISOString().slice(0, 10);
  const current =
    rows.find((r) => (r.scope ?? "CATEGORY") === scope && r.target === target && r.effectiveFrom <= today)?.ratePct
    ?? LAUNCH_COMMISSION_PCT;
  const isIncrease = ratePct > current;
  const noticeSentAt = new Date();
  const from = new Date(`${effectiveFrom}T00:00:00Z`);
  if (!effectiveFrom || Number.isNaN(from.getTime())) redirect("/admin/finance/commissions?cs=date");
  if (isIncrease && from < minEffectiveFrom(noticeSentAt)) {
    await writeAudit({ actor: who, action: "COMMISSION_SCHEDULE", target: `${scope}:${target}`, outcome: "DENIED", note: `A5: increase to ${ratePct}% (from ${current}%) inside 30-day notice window` });
    redirect("/admin/finance/commissions?cs=date");
  }

  await addCommission({ scope, target, cls: scope === "CATEGORY" ? cls : "", ratePct, noticeSentAt: noticeSentAt.toISOString().slice(0, 10), effectiveFrom, by: who });
  await writeAudit({ actor: who, action: "COMMISSION_SCHEDULE", target: `${scope}:${target} → ${ratePct}%`, outcome: "OK", note: `effective ${effectiveFrom}, notice ${noticeSentAt.toISOString().slice(0, 10)}${isIncrease ? "" : " (decrease — immediate allowed)"}` });
  redirect("/admin/finance/commissions?cs=saved");
}

/* ── Users: restrict / suspend / reinstate / impersonate ──── */

const USER_OPS: Record<string, string | null> = {
  restrict: "RESTRICTED",
  suspend: "SUSPENDED",
  reinstate: "ACTIVE",
  impersonate: null, // no status change — read-only session, logged
};

export async function applyUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "").slice(0, 8);
  const op = String(formData.get("op") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!(op in USER_OPS) || !/^u\d+$/.test(userId)) redirect("/admin/users");
  // Every mutating admin action — impersonation included — carries a reason
  // of at least 20 characters; without it the action is rejected AND the
  // rejection is logged (CLAUDE.md §2).
  if (reason.length < 20) {
    await writeAudit({ actor: await actor(), action: `USER_${op.toUpperCase()}`, target: userId, outcome: "DENIED", note: "reason under 20 chars" });
    redirect(`/admin/users?act=${op}&u=${userId}&err=reason#act-form`);
  }

  const newStatus = USER_OPS[op];
  if (newStatus) {
    const jar = await cookies();
    let map: Record<string, string> = {};
    try { map = JSON.parse(jar.get("vh-adm-users")?.value ?? "{}") as Record<string, string>; } catch { map = {}; }
    map[userId] = newStatus;
    jar.set("vh-adm-users", JSON.stringify(map), OPTS);
  }
  await writeAudit({ actor: await actor(), action: `USER_${op.toUpperCase()}`, target: userId, outcome: "OK", note: reason });
  redirect(`/admin/users?done=${op}&u=${userId}`);
}

/* ── CMS: WordPress-style save / publish / unpublish / delete ── */

const CMS_CLAIMS = CLAIMS_LANGUAGE;

export async function savePost(formData: FormData): Promise<void> {
  const intent = String(formData.get("intent") ?? "draft"); // draft | publish | unpublish | delete
  const existingSlug = String(formData.get("slug") ?? "").slice(0, 60);
  const postTitle = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const editorUrl = (slug: string, q: string) => `/admin/cms/editor?slug=${encodeURIComponent(slug)}&${q}`;

  if (intent === "delete") {
    const post = existingSlug ? await findPost(existingSlug) : undefined;
    if (!post) redirect("/admin/cms");
    // Deletion gate: high-traffic pages (the sample posts) are maker–checker —
    // a single editor's delete is DENIED here and the denial logged.
    if (post.sample) {
      await writeAudit({ actor: await actor(), action: "CMS_DELETE", target: existingSlug, outcome: "DENIED", note: "maker-checker: high-traffic page" });
      redirect(editorUrl(existingSlug, "cms=delete-denied"));
    }
    await deletePostOverride(existingSlug);
    redirect("/admin/cms?cms=deleted");
  }

  // Save/publish/unpublish all validate content the same way.
  let err: string | null = null;
  if (postTitle.length < 6 || postTitle.length > 90) err = "title";
  else if (body.length < 40 || body.length > MAX_BODY) err = "body";
  else if (CMS_CLAIMS.test(postTitle) || CMS_CLAIMS.test(body)) err = "claims";
  if (err) redirect(editorUrl(existingSlug || slugify(postTitle) || "new", `cms=${err}`));

  const slug = existingSlug || slugify(postTitle);
  if (!slug) redirect("/admin/cms/editor?cms=title");
  const prior = await findPost(slug);
  const status =
    intent === "publish" ? "PUBLISHED"
    : intent === "unpublish" ? "DRAFT"
    : (prior && prior.status === "PUBLISHED" && intent === "draft" ? "PUBLISHED" : "DRAFT");
  // "Save draft" on an already-published post keeps it live with new copy —
  // matching WordPress's "Update" semantics.

  // WordPress-style revisions: the state being replaced is kept (last 10).
  if (prior) {
    await pushRevision(slug, { at: new Date().toISOString(), by: await actor(), title: prior.title, body: prior.body });
  }

  // Scheduled publishing: "Publish" with a future time stores the schedule;
  // the post flips live automatically when the moment passes.
  const publishAtRaw = String(formData.get("publishAt") ?? "").trim();
  let publishAt: string | undefined;
  let effectiveStatus: "DRAFT" | "PUBLISHED" = status;
  if (intent === "publish" && publishAtRaw) {
    const when = new Date(publishAtRaw);
    if (!Number.isNaN(when.getTime()) && when.getTime() > Date.now()) {
      publishAt = when.toISOString();
      effectiveStatus = "DRAFT";
    }
  }

  const result = await writePostOverride({
    slug,
    title: postTitle,
    body,
    status: effectiveStatus,
    ...(publishAt ? { publishAt } : {}),
    updatedAt: new Date().toISOString().slice(0, 10),
    sample: SAMPLE_POSTS.some((p) => p.slug === slug),
  });
  if (result === "limit") redirect(editorUrl(slug, "cms=limit"));
  await writeAudit({ actor: await actor(), action: `CMS_${intent.toUpperCase()}`, target: slug, outcome: "OK" });
  redirect(editorUrl(slug, `cms=${publishAt ? "scheduled" : intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : "saved"}`));
}

/* ── CMS: restore a revision ──────────────────────────────── */

export async function restorePostRevision(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const index = Number(formData.get("rev"));
  const post = await findPost(slug);
  const rev = (await listRevisions(slug))[index];
  if (!post || !rev) redirect(`/admin/cms/editor?slug=${encodeURIComponent(slug)}&cms=norev`);
  // The current state becomes a revision itself — restoring never loses work.
  await pushRevision(slug, { at: new Date().toISOString(), by: await actor(), title: post.title, body: post.body });
  await writePostOverride({ ...post, title: rev.title, body: rev.body, updatedAt: new Date().toISOString().slice(0, 10) });
  await writeAudit({ actor: await actor(), action: "CMS_RESTORE_REVISION", target: `${slug}@${rev.at}`, outcome: "OK" });
  redirect(`/admin/cms/editor?slug=${encodeURIComponent(slug)}&cms=restored`);
}

/* ── CMS: site content (every public copy surface) ────────── */

export async function saveSiteContent(formData: FormData): Promise<void> {
  const group = String(formData.get("group") ?? "");
  const fields = SITE_FIELDS.filter((f) => f.group === group);
  const anchor = `#g-${encodeURIComponent(group)}`;
  if (fields.length === 0) redirect("/admin/cms/site");

  const patch: Record<string, string | null> = {};
  for (const f of fields) {
    const raw = formData.get(f.key);
    if (raw === null) continue; // field not submitted — leave untouched
    const value = String(raw).replace(/\r\n?/g, "\n").trim();
    // Same copy-check as products, reviews and the journal — the homepage
    // hero cannot carry a disease claim either (Drugs & Magic Remedies Act).
    // Disclosure fields that NAME the forbidden verbs are the one exception.
    if (!f.allowClaimVerbs && CMS_CLAIMS.test(value)) {
      await writeAudit({ actor: await actor(), action: "SITE_CONTENT_SAVE", target: `${group}.${f.key}`, outcome: "DENIED", note: "claims language" });
      redirect(`/admin/cms/site?site=claims&f=${f.key}${anchor}`);
    }
    if (value.length > f.max) redirect(`/admin/cms/site?site=long&f=${f.key}${anchor}`);
    patch[f.key] = value || null; // empty resets to the default copy
  }
  await writeSiteContent(patch);
  await writeAudit({ actor: await actor(), action: "SITE_CONTENT_SAVE", target: group, outcome: "OK", note: `${Object.keys(patch).length} fields` });
  redirect(`/admin/cms/site?site=saved&g=${encodeURIComponent(group)}${anchor}`);
}

/* ── CMS: new blog post draft ─────────────────────────────── */

export async function createPost(formData: FormData): Promise<void> {
  const postTitle = String(formData.get("title") ?? "").trim();
  if (postTitle.length < 6 || postTitle.length > 90) redirect("/admin/cms?post=title#new-post");
  // Copy-check applies to CMS content too — no disease claims on any surface.
  if (/\b(cure|treat|prevent|heal)\w*\b/i.test(postTitle)) redirect("/admin/cms?post=claims#new-post");

  const jar = await cookies();
  let posts: string[] = [];
  try { posts = JSON.parse(jar.get("vh-adm-posts")?.value ?? "[]") as string[]; } catch { posts = []; }
  posts.unshift(postTitle.slice(0, 90));
  jar.set("vh-adm-posts", JSON.stringify(posts.slice(0, 5)), OPTS);
  redirect("/admin/cms?post=created#new-post");
}

/* ── Catalogue: listing moderation (approve / reject / takedown) ── */

import {
  approveListing as storeApproveListing,
  decideCoa,
  rejectListing as storeRejectListing,
  restoreListing as storeRestoreListing,
  suspendListing as storeSuspendListing,
} from "@/lib/catalog";
import { createCategory, deleteCategory, updateCategory } from "@/lib/categories";

/**
 * Approve or reject an UNDER_REVIEW listing. Approval is where A2 bites: the
 * store refuses a regulated class without an APPROVED, batch-matched CoA and
 * the DENIED attempt is audited — an admin cannot wave a listing past the
 * gate any more than a seller can.
 */
export async function moderateListing(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();

  if (decision === "approve") {
    const result = await storeApproveListing(id);
    if (!result.ok && result.reason === "coa") {
      await writeAudit({ actor: who, action: "LISTING_APPROVE", target: id, outcome: "DENIED", note: "A2: no approved batch-matched CoA" });
      redirect(`/admin/catalogue?mod=coa&id=${id}#approvals`);
    }
    if (!result.ok) redirect(`/admin/catalogue?mod=state#approvals`);
    await writeAudit({ actor: who, action: "LISTING_APPROVE", target: id, outcome: "OK" });
    redirect(`/admin/catalogue?mod=approved#approvals`);
  }

  if (decision === "reject") {
    // Rejection is high-impact for the seller: reviewer note ≥ 20 chars.
    if (note.length < 20) {
      await writeAudit({ actor: who, action: "LISTING_REJECT", target: id, outcome: "DENIED", note: "note under 20 chars" });
      redirect(`/admin/catalogue?mod=note#approvals`);
    }
    const result = await storeRejectListing(id, note);
    if (!result.ok) redirect(`/admin/catalogue?mod=state#approvals`);
    await writeAudit({ actor: who, action: "LISTING_REJECT", target: id, outcome: "OK", note });
    redirect(`/admin/catalogue?mod=rejected#approvals`);
  }

  redirect("/admin/catalogue");
}

/** Take a LIVE listing down (reason ≥ 20 chars, seller sees it) or restore it. */
export async function takedownListing(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const op = String(formData.get("op") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();

  if (op === "suspend") {
    if (note.length < 20) {
      await writeAudit({ actor: who, action: "LISTING_SUSPEND", target: id, outcome: "DENIED", note: "reason under 20 chars" });
      redirect(`/admin/catalogue?mod=note&id=${id}#live`);
    }
    const result = await storeSuspendListing(id, note);
    if (!result.ok) redirect(`/admin/catalogue?mod=state#live`);
    await writeAudit({ actor: who, action: "LISTING_SUSPEND", target: id, outcome: "OK", note });
    redirect(`/admin/catalogue?mod=suspended#live`);
  }

  if (op === "restore") {
    const result = await storeRestoreListing(id);
    if (!result.ok && result.reason === "coa") {
      await writeAudit({ actor: who, action: "LISTING_RESTORE", target: id, outcome: "DENIED", note: "A2: CoA no longer approved" });
      redirect(`/admin/catalogue?mod=coa&id=${id}#live`);
    }
    if (!result.ok) redirect(`/admin/catalogue?mod=state#live`);
    await writeAudit({ actor: who, action: "LISTING_RESTORE", target: id, outcome: "OK" });
    redirect(`/admin/catalogue?mod=restored#live`);
  }

  redirect("/admin/catalogue");
}

/**
 * Decide ONE batch's CoA — a per-batch legal assertion by a human reviewer,
 * with a note ≥ 20 chars either way. There is deliberately no bulk approve.
 * Rejecting the CoA of a LIVE regulated listing suspends it (fails closed).
 */
export async function decideCoaReview(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const action = decision === "approve" ? "COA_APPROVE" : "COA_REJECT";

  if (note.length < 20) {
    await writeAudit({ actor: who, action, target: id, outcome: "DENIED", note: "reviewer note under 20 chars" });
    redirect(`/admin/catalogue?coa=note&id=${id}#coa-queue`);
  }
  const result = await decideCoa(id, decision === "approve", note);
  if (!result.ok) redirect(`/admin/catalogue?coa=state#coa-queue`);
  await writeAudit({ actor: who, action, target: id, outcome: "OK", note });
  redirect(`/admin/catalogue?coa=${decision === "approve" ? "approved" : "rejected"}#coa-queue`);
}

/* ── Catalogue: category CRUD (editorial taxonomy) ────────── */

export async function saveCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const blurb = String(formData.get("blurb") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim().slice(0, 4);
  const cls = String(formData.get("cls") ?? "");
  const q = String(formData.get("q") ?? "").trim().slice(0, 60);
  const who = await actor();

  if (name.length < 3 || name.length > 40) redirect("/admin/catalogue/categories?cat=name");
  if (blurb.length > 140) redirect("/admin/catalogue/categories?cat=blurb");
  // Category copy is public marketing copy — same claims check as everything.
  if (CLAIMS_LANGUAGE.test(name) || CLAIMS_LANGUAGE.test(blurb)) {
    await writeAudit({ actor: who, action: id ? "CATEGORY_UPDATE" : "CATEGORY_CREATE", target: name, outcome: "DENIED", note: "claims language" });
    redirect("/admin/catalogue/categories?cat=claims");
  }

  const result = id
    ? await updateCategory(id, { name, blurb, emoji, cls, q })
    : await createCategory({ name, blurb, emoji, ...(cls ? { cls } : {}), ...(q ? { q } : {}) });
  if (!result.ok) {
    // "class" = attempted MED_CANNABIS collection (A1) — log the attempt.
    await writeAudit({ actor: who, action: id ? "CATEGORY_UPDATE" : "CATEGORY_CREATE", target: name, outcome: "DENIED", note: result.reason === "class" ? "A1: medical collection refused" : result.reason });
    redirect(`/admin/catalogue/categories?cat=${result.reason === "class" ? "a1" : "state"}`);
  }
  await writeAudit({ actor: who, action: id ? "CATEGORY_UPDATE" : "CATEGORY_CREATE", target: name, outcome: "OK" });
  redirect("/admin/catalogue/categories?cat=saved");
}

export async function toggleCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("categoryId") ?? "");
  const visible = String(formData.get("visible") ?? "") === "1";
  const result = await updateCategory(id, { visible });
  if (result.ok) await writeAudit({ actor: await actor(), action: "CATEGORY_TOGGLE", target: `${id} → ${visible ? "visible" : "hidden"}`, outcome: "OK" });
  redirect("/admin/catalogue/categories?cat=saved");
}

export async function removeCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("categoryId") ?? "");
  const who = await actor();
  const result = await deleteCategory(id);
  if (!result.ok) {
    await writeAudit({ actor: who, action: "CATEGORY_DELETE", target: id, outcome: "DENIED", note: result.reason === "fixture" ? "launch categories can be hidden, not deleted" : result.reason });
    redirect(`/admin/catalogue/categories?cat=${result.reason === "fixture" ? "fixture" : "state"}`);
  }
  await writeAudit({ actor: who, action: "CATEGORY_DELETE", target: id, outcome: "OK" });
  redirect("/admin/catalogue/categories?cat=deleted");
}

/* ── Catalogue: full admin control, incl. on behalf of sellers ── */

import {
  archiveListing as storeArchiveListing,
  createListing as storeCreateListing,
  deleteListing as storeDeleteListing,
  findProduct as storeFindProduct,
  restoreArchived as storeRestoreArchived,
  submitCoa as storeSubmitCoa,
  submitForReview as storeSubmitForReview,
  unpublishListing as storeUnpublishListing,
  updateListing as storeUpdateListing,
} from "@/lib/catalog";
import { ComplianceClass } from "@prisma/client";
import { writeStoreCopy } from "@/lib/engage";
import { SELLERS } from "@/lib/sample";

const ADMIN_CREATABLE: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

/**
 * Create or edit ANY listing, on behalf of the seller who owns it. Same
 * validation and claims copy-check as Seller Central — being an admin buys
 * operational reach, never a compliance bypass: no MED_CANNABIS creation
 * (A1), no path to LIVE except review + the CoA gate (A2). Every save is
 * audited with the seller it was done for.
 */
export async function adminSaveListing(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const desc = String(formData.get("desc") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim().slice(0, 4);
  const pricePaise = parseInt(String(formData.get("pricePaise") ?? ""), 10);
  const mrpPaise = parseInt(String(formData.get("mrpPaise") ?? ""), 10);
  const hsn = String(formData.get("hsn") ?? "").trim();
  const who = await actor();
  const back = id ? `/admin/catalogue/products/${id}` : "/admin/catalogue/products";

  let err: string | null = null;
  if (title.length < 8 || title.length > 150) err = "title";
  else if (CLAIMS_LANGUAGE.test(title) || CLAIMS_LANGUAGE.test(desc)) err = "claims";
  else if (!Number.isInteger(pricePaise) || pricePaise <= 0) err = "price";
  else if (!Number.isInteger(mrpPaise) || mrpPaise < pricePaise) err = "mrp";
  else if (!/^\d{4,8}$/.test(hsn)) err = "hsn";
  if (err === "claims") {
    await writeAudit({ actor: who, action: id ? "LISTING_EDIT_OBO" : "LISTING_CREATE_OBO", target: title, outcome: "DENIED", note: "claims language" });
  }
  if (err) redirect(`${back}?err=${err}`);

  if (id) {
    const product = await storeFindProduct(id);
    if (!product) redirect("/admin/catalogue/products");
    const ok = await storeUpdateListing(id, { title, desc, pricePaise, mrpPaise, hsn, ...(emoji ? { emoji } : {}) });
    if (!ok) redirect("/admin/catalogue/products");
    await writeAudit({ actor: who, action: "LISTING_EDIT_OBO", target: `${title} (for ${product!.seller})`, outcome: "OK" });
    redirect(`/admin/catalogue/products/${id}?saved=1`);
  }

  const seller = String(formData.get("seller") ?? "").trim();
  const cls = String(formData.get("cls") ?? "");
  if (!SELLERS.some((s) => s.name === seller)) redirect(`${back}?err=seller`);
  if (!ADMIN_CREATABLE.includes(cls as ComplianceClass)) {
    // A1: an admin cannot conjure a medical listing either — log the attempt.
    await writeAudit({ actor: who, action: "LISTING_CREATE_OBO", target: `${title} (for ${seller})`, outcome: "DENIED", note: "A1/A2: class not creatable" });
    redirect(`${back}?err=cls`);
  }
  const created = await storeCreateListing({
    title, desc, cls: cls as ComplianceClass, pricePaise, mrpPaise, hsn,
    emoji: emoji || "🏷️", seller, sellerEmail: `obo:${who}`,
  });
  if (!created) redirect(`${back}?err=cls`);
  await writeAudit({ actor: who, action: "LISTING_CREATE_OBO", target: `${created!.title} (for ${seller})`, outcome: "OK", note: `id ${created!.id}, DRAFT` });
  redirect(`/admin/catalogue/products/${created!.id}?created=1`);
}

/**
 * Admin lifecycle ops on any listing — submit for review, unpublish,
 * archive, restore, hard-delete — done on the seller's behalf and audited.
 * Deleting is destructive, so it demands a written reason (≥ 20 chars);
 * approve/reject/suspend/restore live in moderateListing/takedownListing
 * (same gates for everyone — A2 is enforced in the store).
 */
export async function adminListingLifecycle(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const op = String(formData.get("op") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const who = await actor();
  const product = await storeFindProduct(id);
  if (!product) redirect("/admin/catalogue/products");
  const obo = `(for ${product!.seller})`;

  if (op === "delete") {
    if (reason.length < 20) {
      await writeAudit({ actor: who, action: "LISTING_DELETE_OBO", target: `${product!.title} ${obo}`, outcome: "DENIED", note: "reason under 20 chars" });
      redirect(`/admin/catalogue/products/${id}?err=reason`);
    }
    const result = await storeDeleteListing(id);
    if (!result.ok) {
      await writeAudit({ actor: who, action: "LISTING_DELETE_OBO", target: `${product!.title} ${obo}`, outcome: "DENIED", note: result.reason === "fixture" ? "launch listings archive, never hard-delete" : "not a draft/archived listing" });
      redirect(`/admin/catalogue/products/${id}?err=${result.reason}`);
    }
    await writeAudit({ actor: who, action: "LISTING_DELETE_OBO", target: `${product!.title} ${obo}`, outcome: "OK", note: reason });
    redirect("/admin/catalogue/products?deleted=1");
  }

  const ops: Record<string, { run: (x: string) => Promise<{ ok: boolean; reason?: string }>; action: string }> = {
    submit: { run: storeSubmitForReview, action: "LISTING_SUBMIT_OBO" },
    unpublish: { run: storeUnpublishListing, action: "LISTING_UNPUBLISH_OBO" },
    archive: { run: storeArchiveListing, action: "LISTING_ARCHIVE_OBO" },
    restore: { run: storeRestoreArchived, action: "LISTING_UNARCHIVE_OBO" },
  };
  const entry = ops[op];
  if (!entry) redirect("/admin/catalogue/products");
  const result = await entry!.run(id);
  if (!result.ok) redirect(`/admin/catalogue/products/${id}?err=${result.reason ?? "state"}`);
  await writeAudit({ actor: who, action: entry!.action, target: `${product!.title} ${obo}`, outcome: "OK" });
  redirect(`/admin/catalogue/products/${id}?done=${op}`);
}

/** Submit a batch CoA on the seller's behalf (e.g. emailed PDF) — still lands
 *  in the same PENDING_REVIEW queue; submission is not approval (A2). */
export async function adminSubmitCoa(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const batchCode = String(formData.get("batchCode") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,20}$/.test(batchCode)) redirect(`/admin/catalogue/products/${id}?err=batch`);
  const product = await storeFindProduct(id);
  if (!product) redirect("/admin/catalogue/products");
  const result = await storeSubmitCoa(id, batchCode);
  if (!result.ok) redirect(`/admin/catalogue/products/${id}?err=${result.reason}`);
  await writeAudit({ actor: await actor(), action: "COA_SUBMIT_OBO", target: `${product!.title} · ${batchCode} (for ${product!.seller})`, outcome: "OK" });
  redirect(`/admin/catalogue/products/${id}?coa=submitted`);
}

/** Edit a storefront's public copy on the seller's behalf — same length and
 *  claims rules as Seller Central, audited with the storefront name. */
export async function adminSaveStorefront(formData: FormData): Promise<void> {
  const tagline = String(formData.get("tagline") ?? "").trim();
  const story = String(formData.get("story") ?? "").trim();
  const who = await actor();

  let err: string | null = null;
  if (tagline.length < 10 || tagline.length > 90) err = "tagline";
  else if (story.length < 40 || story.length > 500) err = "story";
  else if (CLAIMS_LANGUAGE.test(tagline) || CLAIMS_LANGUAGE.test(story)) err = "claims";
  if (err === "claims") {
    await writeAudit({ actor: who, action: "STOREFRONT_EDIT_OBO", target: "Vedic Botanicals", outcome: "DENIED", note: "claims language" });
  }
  if (err) redirect(`/admin/sellers?store=${err}#storefront-obo`);

  await writeStoreCopy({ tagline, story });
  await writeAudit({ actor: who, action: "STOREFRONT_EDIT_OBO", target: "Vedic Botanicals", outcome: "OK" });
  redirect("/admin/sellers?store=saved#storefront-obo");
}

/* ── Vedic Ads: creative review, platform settings, oversight ── */

import { decideAd, readAdSettings as readAdsSettings, setCampaignStatus as adsSetCampaignStatus, writeAdSettings, PLACEMENTS as AD_PLACEMENT_DEFS } from "@/lib/ads";
import { setClaimsStrike } from "@/lib/catalog";

/**
 * Approve or reject one creative. Approval is what lets a campaign serve —
 * and it is a human act with a note on rejection, audited either way. A
 * MED_CANNABIS creative cannot reach this queue (layer 1 rejects it), and
 * even an approved ad is re-checked at auction time (layer 3).
 */
export async function decideAdReview(formData: FormData): Promise<void> {
  const campaignId = String(formData.get("campaignId") ?? "");
  const adId = String(formData.get("adId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();

  if (decision === "reject" && note.length < 20) {
    await writeAudit({ actor: who, action: "AD_REJECT", target: adId, outcome: "DENIED", note: "reviewer note under 20 chars" });
    redirect("/admin/ads?ad=note#review-queue");
  }
  const ok = await decideAd(campaignId, adId, decision === "approve", note || undefined);
  if (!ok) redirect("/admin/ads?ad=state#review-queue");
  await writeAudit({ actor: who, action: decision === "approve" ? "AD_APPROVE" : "AD_REJECT", target: `${campaignId}/${adId}`, outcome: "OK", ...(note ? { note } : {}) });
  redirect(`/admin/ads?ad=${decision === "approve" ? "approved" : "rejected"}#review-queue`);
}

/** Platform-wide auction levers: minimum bid + per-placement on/off. */
export async function saveAdPlatformSettings(formData: FormData): Promise<void> {
  const minBidRupees = parseInt(String(formData.get("minBid") ?? ""), 10);
  if (!Number.isInteger(minBidRupees) || minBidRupees < 1 || minBidRupees > 500) redirect("/admin/ads?settings=minbid#platform");
  const placementsEnabled: Record<string, boolean> = {};
  for (const p of AD_PLACEMENT_DEFS) placementsEnabled[p.key] = formData.getAll("placements").map(String).includes(p.key);
  await writeAdSettings({ minBidPaise: minBidRupees * 100, placementsEnabled });
  await writeAudit({
    actor: await actor(), action: "AD_SETTINGS", outcome: "OK",
    target: `min bid ₹${minBidRupees} · ${Object.values(placementsEnabled).filter(Boolean).length}/${AD_PLACEMENT_DEFS.length} placements on`,
  });
  redirect("/admin/ads?settings=saved#platform");
}

/** Pause any campaign platform-side, with a reason the advertiser sees. */
export async function adminPauseCampaign(formData: FormData): Promise<void> {
  const campaignId = String(formData.get("campaignId") ?? "");
  const op = String(formData.get("op") ?? "pause");
  const reason = String(formData.get("reason") ?? "").trim();
  const who = await actor();
  if (op === "pause") {
    if (reason.length < 20) {
      await writeAudit({ actor: who, action: "CAMPAIGN_PAUSE", target: campaignId, outcome: "DENIED", note: "reason under 20 chars" });
      redirect("/admin/ads?camp=reason#oversight");
    }
    await adsSetCampaignStatus(campaignId, "PAUSED", reason);
    await writeAudit({ actor: who, action: "CAMPAIGN_PAUSE", target: campaignId, outcome: "OK", note: reason });
    redirect("/admin/ads?camp=paused#oversight");
  }
  await adsSetCampaignStatus(campaignId, "ACTIVE");
  await writeAudit({ actor: who, action: "CAMPAIGN_RESUME", target: campaignId, outcome: "OK" });
  redirect("/admin/ads?camp=resumed#oversight");
}

/** Clear a listing's medical-claims strike after review (reason ≥ 20 chars). */
export async function clearClaimsStrike(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const who = await actor();
  if (reason.length < 20) {
    await writeAudit({ actor: who, action: "CLAIMS_STRIKE_CLEAR", target: id, outcome: "DENIED", note: "reason under 20 chars" });
    redirect(`/admin/catalogue/products/${id}?err=reason`);
  }
  const ok = await setClaimsStrike(id, false);
  if (!ok) redirect("/admin/catalogue/products");
  await writeAudit({ actor: who, action: "CLAIMS_STRIKE_CLEAR", target: id, outcome: "OK", note: reason });
  redirect(`/admin/catalogue/products/${id}?strike=cleared`);
}

/* ── Bulk upload OBO: CSV → draft listings for any seller ── */

declare global {
  // eslint-disable-next-line no-var
  var __vhBulkReports: Record<string, { created: string[]; rejected: { row: number; reason: string }[] }> | undefined;
}

const BULK_CLASSES = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

export async function adminBulkUpload(formData: FormData): Promise<void> {
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/catalogue/products?bulkerr=file");
  if (file.size > 200_000) redirect("/admin/catalogue/products?bulkerr=size");
  const text = await (file as File).text();
  const who = await actor();

  const report = { created: [] as string[], rejected: [] as { row: number; reason: string }[] };
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  let row = 0;
  for (const line of lines) {
    row += 1;
    if (row === 1 && /^seller\s*,/i.test(line)) continue; // header row
    if (report.created.length + report.rejected.length >= 50) break;
    const [seller = "", title = "", cls = "", priceRaw = "", mrpRaw = "", hsn = "", ...rest] = line.split(",").map((x) => x.trim());
    const desc = rest.join(", ");
    const pricePaise = parseInt(priceRaw, 10);
    const mrpPaise = parseInt(mrpRaw, 10);
    let reason: string | null = null;
    if (!SELLERS.some((s) => s.name === seller && s.kycState === "KYC_APPROVED")) reason = "seller must be a KYC-approved storefront";
    else if (title.length < 8 || title.length > 150) reason = "title must be 8–150 chars";
    else if (!BULK_CLASSES.includes(cls)) reason = `class must be one of ${BULK_CLASSES.join("/")}`;
    else if (CLAIMS_LANGUAGE.test(title) || CLAIMS_LANGUAGE.test(desc)) reason = "claims language rejected (no listing may make medical claims)";
    else if (!Number.isInteger(pricePaise) || pricePaise <= 0) reason = "price must be integer paise";
    else if (!Number.isInteger(mrpPaise) || mrpPaise < pricePaise) reason = "MRP must be integer paise ≥ price";
    else if (!/^\d{4,8}$/.test(hsn)) reason = "HSN must be 4–8 digits";
    if (reason) {
      report.rejected.push({ row, reason });
      continue;
    }
    const created = await storeCreateListing({
      title, desc, cls: cls as ComplianceClass, pricePaise, mrpPaise, hsn,
      emoji: "📦", seller, sellerEmail: `obo:${who}`,
    });
    if (created) report.created.push(`${created.title} (${seller})`);
    else report.rejected.push({ row, reason: "class not creatable" });
  }
  globalThis.__vhBulkReports ??= {};
  globalThis.__vhBulkReports["admin"] = report;
  await writeAudit({
    actor: who, action: "BULK_UPLOAD_OBO", outcome: "OK",
    target: `${report.created.length} created, ${report.rejected.length} rejected`,
  });
  redirect("/admin/catalogue/products?bulk=1");
}
