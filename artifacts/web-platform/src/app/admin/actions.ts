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
import { addCommission, minEffectiveFrom, readCommissions } from "@/lib/adminstate";
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
  const batches = String(formData.get("batches") ?? "").split(",").map((b) => b.trim()).filter(Boolean);
  if (reason.length < 20) redirect("/admin/compliance?recall=reason#recall");

  const who = await actor();
  const ref = `RC${Date.now().toString(36).toUpperCase().slice(-5)}`;
  // Append to the immutable recall register (A3) — a DIFFERENT admin must be
  // able to see and close it (A6), so it lives server-side, never in a cookie.
  const { initiateRecall: openRecall } = await import("@/lib/recalls");
  const result = await openRecall({ ref, actor: who, reason, batches });
  if (!result.ok) redirect(`/admin/compliance?recall=${result.reason}#recall`);
  await writeAudit({ actor: who, action: "RECALL_INITIATE", target: ref, outcome: "OK", note: reason.slice(0, 80) });
  redirect(`/admin/compliance?recall=initiated&ref=${ref}#recall`);
}

export async function closeRecall(formData: FormData): Promise<void> {
  const ref = String(formData.get("ref") ?? "").trim();
  const who = await actor();
  const { closeRecall: closeIt } = await import("@/lib/recalls");
  const result = await closeIt(ref, who);
  if (!result.ok) {
    // A6: the initiator cannot close their own recall. Log the denied attempt.
    if (result.reason === "maker") {
      await writeAudit({ actor: who, action: "RECALL_CLOSE", target: ref, outcome: "DENIED", note: "A6: maker cannot be checker" });
      redirect("/admin/compliance?recall=denied#recall");
    }
    redirect(`/admin/compliance?recall=${result.reason}#recall`);
  }
  // Closing APPENDS a CLOSE event — the INITIATE row is never removed (A3).
  await writeAudit({ actor: who, action: "RECALL_CLOSE", target: ref, outcome: "OK", note: "closed after review" });
  redirect(`/admin/compliance?recall=closed&ref=${ref}#recall`);
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

const USER_OPS = new Set(["restrict", "unrestrict", "suspend", "reinstate", "impersonate"]);

export async function applyUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "").slice(0, 8);
  const op = String(formData.get("op") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const who = await actor();

  if (!USER_OPS.has(op) || !/^u\d+$/.test(userId)) redirect("/admin/users");
  // Every mutating admin action — impersonation included — carries a reason of
  // at least 20 characters; without it the action is rejected AND the rejection
  // is logged (CLAUDE.md §2). Denied actions are logged too.
  if (reason.length < 20) {
    await writeAudit({ actor: who, action: `USER_${op.toUpperCase()}`, target: userId, outcome: "DENIED", note: "reason under 20 chars" });
    redirect(`/admin/users?act=${op}&u=${userId}&err=reason#act-form`);
  }

  const { restrictAccount, unrestrictAccount, requestStatusChange, logImpersonation } = await import("@/lib/users");
  const { notify } = await import("@/lib/notify");

  // Restrict / lift are single-admin and take effect immediately.
  if (op === "restrict" || op === "unrestrict") {
    const res = op === "restrict"
      ? await restrictAccount(userId, who, reason)
      : await unrestrictAccount(userId, who, reason);
    if (!res.ok) {
      await writeAudit({ actor: who, action: `USER_${op.toUpperCase()}`, target: userId, outcome: "DENIED", note: res.reason });
      redirect(`/admin/users?err=state&u=${userId}`);
    }
    await writeAudit({ actor: who, action: `USER_${op.toUpperCase()}`, target: userId, outcome: "OK", note: reason });
    redirect(`/admin/users?done=${op}&u=${userId}`);
  }

  // Suspend / reinstate are MAKER–CHECKER: this raises a request only. A second
  // admin must approve it (A6). Nothing changes on the account here.
  if (op === "suspend" || op === "reinstate") {
    const res = await requestStatusChange(userId, op === "suspend" ? "SUSPEND" : "REINSTATE", who, reason);
    if (!res.ok) {
      await writeAudit({ actor: who, action: `USER_${op.toUpperCase()}_REQUEST`, target: userId, outcome: "DENIED", note: res.reason });
      redirect(`/admin/users?err=${res.reason}&u=${userId}`);
    }
    await writeAudit({ actor: who, action: `USER_${op.toUpperCase()}_REQUEST`, target: userId, outcome: "OK", note: reason });
    redirect(`/admin/users?done=${op}-requested&u=${userId}`);
  }

  // Impersonate: read-only session, logged, and the buyer is notified (A4).
  const imp = await logImpersonation(userId, who, reason);
  if (!imp.ok || !imp.account) {
    await writeAudit({ actor: who, action: "USER_IMPERSONATE", target: userId, outcome: "DENIED", note: "missing" });
    redirect(`/admin/users?err=state&u=${userId}`);
  }
  await writeAudit({ actor: who, action: "USER_IMPERSONATE", target: userId, outcome: "OK", note: reason });
  // The buyer is told — never the reason text (it is staff justification, but we
  // keep the notice generic and health-data-free either way).
  await notify("buyer", imp.account!.email, {
    kind: "IMPERSONATION_STARTED",
    title: "A support agent opened a read-only session",
    body: "A Vedic Hemp support agent started a read-only session on your account. They cannot place orders or change your data. Every action is logged.",
    href: "/account",
  });
  redirect(`/admin/users?done=impersonate&u=${userId}`);
}

/** CHECKER step for a maker–checker user request (A6). Approve or reject. */
export async function decidePendingUserAction(formData: FormData): Promise<void> {
  const pendingId = String(formData.get("pendingId") ?? "").slice(0, 12);
  const decision = String(formData.get("decision") ?? ""); // approve | reject
  const who = await actor();
  if (!/^pa-\d+$/.test(pendingId) || !["approve", "reject"].includes(decision)) redirect("/admin/users");

  const { decidePending } = await import("@/lib/users");
  const res = await decidePending(pendingId, who, decision === "approve");
  if (!res.ok) {
    // A6: a maker approving their own request is refused AND logged.
    const note = res.reason === "maker" ? "A6: maker cannot be checker" : res.reason;
    await writeAudit({ actor: who, action: "USER_REQUEST_DECIDE", target: pendingId, outcome: "DENIED", note });
    redirect(`/admin/users?err=${res.reason}#inbox`);
  }

  const verb = res.pending.kind === "SUSPEND" ? "suspend" : "reinstate";
  await writeAudit({ actor: who, action: `USER_${verb.toUpperCase()}_${res.approved ? "APPROVE" : "REJECT"}`, target: res.pending.userId, outcome: "OK", note: `${res.pending.kind} raised by ${res.pending.maker}` });
  redirect(`/admin/users?done=${res.approved ? verb + "d" : "rejected"}#inbox`);
}

/** A3 dispensing-register correction: append a NEW superseding row (never an
 *  edit). Requires a reason; the original entry is preserved. */
export async function correctDispenseAction(formData: FormData): Promise<void> {
  const seq = parseInt(String(formData.get("seq") ?? ""), 10);
  const reason = String(formData.get("reason") ?? "").trim();
  const batchCode = String(formData.get("batchCode") ?? "").trim().toUpperCase().slice(0, 24);
  const coaState = String(formData.get("coaState") ?? "").trim();
  const who = await actor();
  if (!Number.isInteger(seq)) redirect("/admin/compliance#dispensing");
  if (reason.length < 8) {
    await writeAudit({ actor: who, action: "DISPENSE_CORRECT", target: String(seq), outcome: "DENIED", note: "reason under 8 chars" });
    redirect("/admin/compliance?disp=reason#dispensing");
  }
  const { correctDispense } = await import("@/lib/dispensing");
  const patch: { batchCode?: string; coaState?: string } = {};
  if (batchCode) patch.batchCode = batchCode;
  if (coaState) patch.coaState = coaState;
  const result = await correctDispense({ seq, actor: who, reason, patch });
  if (!result.ok) {
    await writeAudit({ actor: who, action: "DISPENSE_CORRECT", target: String(seq), outcome: "DENIED", note: result.reason });
    redirect(`/admin/compliance?disp=${result.reason}#dispensing`);
  }
  await writeAudit({ actor: who, action: "DISPENSE_CORRECT", target: String(seq), outcome: "OK", note: `superseding row appended: ${reason}` });
  redirect("/admin/compliance?disp=ok#dispensing");
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

  // Optional rich fields (excerpt, category, author, tags, SEO).
  const excerpt = String(formData.get("excerpt") ?? "").trim().slice(0, 220);
  const category = String(formData.get("category") ?? "").trim().slice(0, 40);
  const author = String(formData.get("author") ?? "").trim().slice(0, 60);
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const metaTitle = String(formData.get("metaTitle") ?? "").trim().slice(0, 70);
  const metaDescription = String(formData.get("metaDescription") ?? "").trim().slice(0, 160);

  // Save/publish/unpublish all validate content the same way.
  let err: string | null = null;
  if (postTitle.length < 6 || postTitle.length > 90) err = "title";
  else if (body.length < 40 || body.length > MAX_BODY) err = "body";
  else if ([postTitle, body, excerpt, author, metaTitle, metaDescription].some((t) => t && CMS_CLAIMS.test(t))) err = "claims";
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
    ...(excerpt ? { excerpt } : {}),
    ...(category ? { category } : {}),
    ...(author ? { author } : {}),
    ...(tagsRaw ? { tags: [...new Set(tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10) } : {}),
    ...(metaTitle ? { metaTitle } : {}),
    ...(metaDescription ? { metaDescription } : {}),
    // Preserve a featured image already attached to this post.
    ...(prior?.coverImage ? { coverImage: prior.coverImage } : {}),
  });
  if (result === "limit") redirect(editorUrl(slug, "cms=limit"));
  await writeAudit({ actor: await actor(), action: `CMS_${intent.toUpperCase()}`, target: slug, outcome: "OK" });
  redirect(editorUrl(slug, `cms=${publishAt ? "scheduled" : intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : "saved"}`));
}

/* ── Reviews: moderation (approve / reject) ───────────────── */

export async function moderateReviewAction(formData: FormData): Promise<void> {
  const id = String(formData.get("reviewId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const { moderateReview, findReview } = await import("@/lib/reviews");

  // Rejection is a moderator judgement the buyer may query — require a reason.
  if (decision === "reject" && note.length < 12) {
    await writeAudit({ actor: who, action: "REVIEW_REJECT", target: id, outcome: "DENIED", note: "reason under 12 chars" });
    redirect("/admin/reviews?err=note");
  }
  const review = findReview(id);
  const result = await moderateReview(id, decision === "approve", note || undefined);
  if (!result.ok) redirect(`/admin/reviews?err=${result.reason}`);
  await writeAudit({ actor: who, action: decision === "approve" ? "REVIEW_APPROVE" : "REVIEW_REJECT", target: id, outcome: "OK", ...(note ? { note } : {}) });

  // Tell the seller their product has a newly published review to reply to.
  if (decision === "approve" && review) {
    const { notify } = await import("@/lib/notify");
    const { findProduct } = await import("@/lib/catalog");
    const product = await findProduct(review.productId);
    if (product) await notify("seller", product.seller, { kind: "REVIEW_LIVE", title: "A review is now live", body: `${review.rating}★ on "${product.title}". You can reply publicly.`, href: "/seller/reviews" });
  }
  redirect(`/admin/reviews?done=${decision}`);
}

/** Resolve every open abuse report on a review: remove it (reject + drop from
 *  the rating) or dismiss the reports (keep it). Append-only either way. */
export async function resolveReviewReportsAction(formData: FormData): Promise<void> {
  const id = String(formData.get("reviewId") ?? "");
  const action = String(formData.get("action") ?? ""); // remove | dismiss
  const who = await actor();
  if (!["remove", "dismiss"].includes(action)) redirect("/admin/reviews");
  const { resolveReports } = await import("@/lib/reviews");
  const result = await resolveReports(id, action as "remove" | "dismiss", who);
  if (!result.ok) {
    await writeAudit({ actor: who, action: "REVIEW_REPORT_RESOLVE", target: id, outcome: "DENIED", note: result.reason });
    redirect(`/admin/reviews?err=${result.reason}#reported`);
  }
  await writeAudit({ actor: who, action: action === "remove" ? "REVIEW_REPORT_REMOVE" : "REVIEW_REPORT_DISMISS", target: id, outcome: "OK", note: action === "remove" ? "review removed after report" : "reports dismissed, review kept" });
  redirect(`/admin/reviews?done=${action === "remove" ? "removed" : "dismissed"}#reported`);
}

/** Resolve every open report on a store: dismiss (keep) or action (acknowledge
 *  & escalate to compliance). Append-only; both paths are audited. */
export async function resolveStoreReportsAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").slice(0, 80);
  const action = String(formData.get("action") ?? ""); // dismiss | action
  const who = await actor();
  if (!["dismiss", "action"].includes(action) || !slug) redirect("/admin/reviews#stores");
  const { resolveStoreReports } = await import("@/lib/store-reports");
  const result = await resolveStoreReports(slug, action as "dismiss" | "action", who);
  if (!result.ok) {
    await writeAudit({ actor: who, action: "STORE_REPORT_RESOLVE", target: slug, outcome: "DENIED", note: result.reason });
    redirect(`/admin/reviews?err=${result.reason}#stores`);
  }
  await writeAudit({ actor: who, action: action === "action" ? "STORE_REPORT_ACTION" : "STORE_REPORT_DISMISS", target: slug, outcome: "OK", note: action === "action" ? "escalated to compliance" : "reports dismissed, store kept" });
  if (action === "action") {
    const { notify } = await import("@/lib/notify");
    await notify("admin", "admin", { kind: "STORE_REPORT_ESCALATED", title: "Store flagged for compliance review", body: `A reported store (${slug}) was escalated for a compliance/KYC check.`, href: "/admin/sellers" });
  }
  redirect(`/admin/reviews?done=${action === "action" ? "escalated" : "sdismissed"}#stores`);
}

/* ── Business (B2B) accounts ──────────────────────────────── */

export async function decideBusinessAccount(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const { decideBusiness } = await import("@/lib/b2b");

  if (decision === "reject" && note.length < 10) {
    await writeAudit({ actor: who, action: "B2B_REJECT", target: email, outcome: "DENIED", note: "reason under 10 chars" });
    redirect("/admin/business?err=note");
  }
  const result = await decideBusiness(email, decision === "approve", note || undefined);
  if (!result.ok) redirect(`/admin/business?err=${result.reason}`);
  await writeAudit({ actor: who, action: decision === "approve" ? "B2B_APPROVE" : "B2B_REJECT", target: email, outcome: "OK", ...(note ? { note } : {}) });
  const { notify } = await import("@/lib/notify");
  await notify("buyer", email, decision === "approve"
    ? { kind: "B2B_APPROVED", title: "Business account approved", body: "Wholesale pricing now applies to your bulk orders.", href: "/account/business" }
    : { kind: "B2B_REJECT", title: "Business account not approved", body: note.slice(0, 120), href: "/account/business" });
  redirect(`/admin/business?done=${decision}`);
}

/* ── Store reviews: moderation ────────────────────────────── */

export async function moderateStoreReviewAction(formData: FormData): Promise<void> {
  const id = String(formData.get("reviewId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const { moderateStoreReview, findStoreReview } = await import("@/lib/store-reviews");

  if (decision === "reject" && note.length < 12) {
    await writeAudit({ actor: who, action: "STORE_REVIEW_REJECT", target: id, outcome: "DENIED", note: "reason under 12 chars" });
    redirect("/admin/reviews?serr=note#store-reviews");
  }
  const review = findStoreReview(id);
  const result = await moderateStoreReview(id, decision === "approve");
  if (!result) redirect("/admin/reviews?serr=state#store-reviews");
  await writeAudit({ actor: who, action: decision === "approve" ? "STORE_REVIEW_APPROVE" : "STORE_REVIEW_REJECT", target: id, outcome: "OK", ...(note ? { note } : {}) });

  if (decision === "approve" && review) {
    const { notify } = await import("@/lib/notify");
    await notify("seller", review.store, { kind: "STORE_REVIEW_LIVE", title: "A store review is now live", body: `${review.rating}★ for your store. You can reply publicly.`, href: "/seller/reviews#store-reviews" });
  }
  redirect(`/admin/reviews?sdone=${decision}#store-reviews`);
}

/* ── Prescriptions & sensitive access (A4) ────────────────── */

/** A pharmacist verifies (approves) or rejects a pending prescription. The
 *  buyer is notified with metadata only — never any health detail. */
export async function decidePrescriptionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("rxId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const { decidePrescription, findRx } = await import("@/lib/prescriptions");

  if (decision === "reject" && note.length < 10) {
    await writeAudit({ actor: who, action: "RX_REJECT", target: id, outcome: "DENIED", note: "reason under 10 chars" });
    redirect("/admin/compliance?rxerr=note#rx");
  }
  const result = await decidePrescription(id, decision === "approve", note || undefined);
  if (!result.ok) redirect(`/admin/compliance?rxerr=${result.reason}#rx`);
  await writeAudit({ actor: who, action: decision === "approve" ? "RX_VERIFY" : "RX_REJECT", target: id, outcome: "OK" });
  const rx = findRx(id);
  if (rx) {
    const { notify } = await import("@/lib/notify");
    await notify("buyer", rx.buyerEmail, decision === "approve"
      ? { kind: "RX_VERIFIED", title: "Prescription verified", body: "Your prescription has been verified. You can now order eligible items.", href: "/account/medical" }
      : { kind: "RX_REJECTED", title: "Prescription needs attention", body: "Your prescription couldn't be verified. Please review and re-upload.", href: "/account/medical" });
  }
  redirect(`/admin/compliance?rx=${decision}#rx`);
}

/**
 * A4 reveal. The reason code + text are mandatory and enforced in the store;
 * the access is logged (GRANTED or DENIED) before any URL is issued, and on
 * success the buyer is notified. The viewer's role is derived server-side from
 * the roles they actually HOLD in the roles service — never hardcoded, never
 * taken from the client. An operator holding neither Pharmacist nor Compliance
 * is denied (scope) and the denial logged — the §7 owner included. No health
 * data is placed in the audit note (only the controlled reason code).
 */
export async function revealPrescriptionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("rxId") ?? "").trim();
  const reasonCode = String(formData.get("reasonCode") ?? "").trim();
  const reasonText = String(formData.get("reasonText") ?? "").trim();
  const who = await actor();
  const { revealPrescription, findRx } = await import("@/lib/prescriptions");
  const { sensitiveViewerRole } = await import("@/lib/roles");

  const viewerRole = sensitiveViewerRole(who) ?? "NONE";
  const result = await revealPrescription({ prescriptionId: id, viewer: who, viewerRole, reasonCode, reasonText });
  await writeAudit({
    actor: who,
    action: result.ok ? "SENSITIVE_READ" : "SENSITIVE_READ_DENIED",
    target: id,
    outcome: result.ok ? "OK" : "DENIED",
    note: reasonCode || "no-reason",
  });
  if (!result.ok) redirect(`/admin/compliance?rxerr=${result.reason}#rx`);
  const rx = findRx(id);
  if (rx) {
    const { notify } = await import("@/lib/notify");
    await notify("buyer", rx.buyerEmail, {
      kind: "RX_ACCESSED",
      title: "Your prescription was viewed",
      body: `A compliance reviewer opened your prescription (${reasonCode.replace(/_/g, " ").toLowerCase()}). If this seems wrong, contact support.`,
      href: "/account/medical",
    });
  }
  redirect("/admin/compliance?rx=revealed#rx");
}

/* ── Adverse events / pharmacovigilance (A3 append-only) ──── */

export async function triageAdverseEvent(formData: FormData): Promise<void> {
  const id = String(formData.get("eventId") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim() as "ACKNOWLEDGED" | "TRIAGED" | "CLOSED";
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const who = await actor();
  const { triageEvent } = await import("@/lib/adverse");
  const result = await triageEvent(id, to, who, note);
  if (!result.ok) redirect(`/admin/compliance?ae=${result.reason}#adverse`);
  // The narrative is health data — the audit note carries only the status.
  await writeAudit({ actor: who, action: "ADVERSE_EVENT_TRIAGE", target: id, outcome: "OK", note: to });
  redirect(`/admin/compliance?ae=${to.toLowerCase()}#adverse`);
}

/* ── Settlements (A6 maker–checker, A3 immutable) ─────────── */

/** MAKER: create a settlement run for a seller's un-settled delivered orders.
 *  Amounts are derived from the earnings lines — never typed in. */
export async function createSettlementRun(formData: FormData): Promise<void> {
  const seller = String(formData.get("seller") ?? "").trim();
  const who = await actor();
  const { createRun } = await import("@/lib/settlements");
  const result = await createRun(seller, who);
  if (!result.ok) redirect(`/admin/finance?st=${result.reason}#settlements`);
  await writeAudit({ actor: who, action: "SETTLEMENT_CREATE", target: result.run.id, outcome: "OK", note: `maker · ${seller} · net ₹${Math.round(result.run.netPaise / 100)}` });
  redirect("/admin/finance?st=created#settlements");
}

/** CHECKER: post an awaiting run. The checker can never be the maker (A6);
 *  once posted, the statement is immutable (A3). */
export async function postSettlementRun(formData: FormData): Promise<void> {
  const id = String(formData.get("runId") ?? "").trim();
  const who = await actor();
  const { postRun, findRun } = await import("@/lib/settlements");
  const result = await postRun(id, who);
  if (!result.ok) {
    if (result.reason === "maker") {
      await writeAudit({ actor: who, action: "SETTLEMENT_POST", target: id, outcome: "DENIED", note: "A6: settlement checker cannot be its maker" });
      redirect("/admin/finance?st=makerdenied#settlements");
    }
    redirect(`/admin/finance?st=${result.reason}#settlements`);
  }
  await writeAudit({ actor: who, action: "SETTLEMENT_POST", target: id, outcome: "OK", note: `checker · ${result.run.seller} · net ₹${Math.round(result.run.netPaise / 100)}` });
  const run = findRun(id);
  if (run) {
    const { notify } = await import("@/lib/notify");
    await notify("seller", run.seller, { kind: "SETTLEMENT_POSTED", title: "Settlement posted", body: `₹${Math.round(run.netPaise / 100).toLocaleString("en-IN")} net for ${run.period} is on its way. The statement is final.`, href: "/seller/finance" });
  }
  redirect("/admin/finance?st=posted#settlements");
}

/* ── Listing reports (buyer trust & safety) ───────────────── */

/**
 * Adjudicate a reported listing. Dismiss (needs a reason) closes the report;
 * Uphold takes the listing down through the same server guard the catalogue
 * moderation uses (suspendListing) and resolves every open report on it. Both
 * paths are audited; upholding notifies the seller with the reason.
 */
export async function decideListingReport(formData: FormData): Promise<void> {
  const id = String(formData.get("reportId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const { findReport, decideReport, resolveOthersForProduct } = await import("@/lib/reports");

  if (decision === "dismiss" && note.length < 10) {
    await writeAudit({ actor: who, action: "LISTING_REPORT_DISMISS", target: id, outcome: "DENIED", note: "reason under 10 chars" });
    redirect("/admin/reports?err=note");
  }
  const report = findReport(id);
  if (!report) redirect("/admin/reports?err=missing");

  if (decision === "uphold") {
    const reason = note || `Upheld report: ${report!.reason.replace(/_/g, " ").toLowerCase()}`;
    // Take the listing down if it's live (the A2/catalogue guard decides whether it can).
    const { suspendListing } = await import("@/lib/catalog");
    await suspendListing(report!.productId, reason);
    await decideReport(id, true, reason);
    await resolveOthersForProduct(report!.productId, id, "Resolved with the upheld report on this listing.");
    await writeAudit({ actor: who, action: "LISTING_REPORT_UPHOLD", target: report!.productId, outcome: "OK", note: report!.reason });
    const { notify } = await import("@/lib/notify");
    await notify("seller", report!.seller, { kind: "LISTING_ACTIONED", title: "A listing was taken down", body: `“${report!.productTitle}” was suspended after a buyer report (${report!.reason.replace(/_/g, " ").toLowerCase()}). Fix the issue and resubmit.`, href: "/seller/products" });
    redirect("/admin/reports?done=uphold");
  }

  const result = await decideReport(id, false, note);
  if (!result.ok) redirect(`/admin/reports?err=${result.reason}`);
  await writeAudit({ actor: who, action: "LISTING_REPORT_DISMISS", target: report!.productId, outcome: "OK", note });
  redirect("/admin/reports?done=dismiss");
}

/* ── Vendor verification (KYC) ────────────────────────────── */

/** Admin reviews a submitted store verification: approve / ask for more / reject.
 *  Every path is audited and the seller is notified. A rejection or a request
 *  for more information needs a reason (≥10 chars). */
export async function decideVendorKyc(formData: FormData): Promise<void> {
  const store = String(formData.get("store") ?? "").trim();
  const decision = String(formData.get("decision") ?? "") as "approve" | "more_info" | "reject";
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const { decideKyc } = await import("@/lib/vendor");

  if ((decision === "reject" || decision === "more_info") && note.length < 10) {
    await writeAudit({ actor: who, action: "VENDOR_KYC_DECIDE", target: store, outcome: "DENIED", note: "reason under 10 chars" });
    redirect("/admin/verification?err=note");
  }
  const result = await decideKyc(store, decision, who, note || undefined);
  if (!result.ok) redirect(`/admin/verification?err=${result.reason}`);
  const action = decision === "approve" ? "VENDOR_KYC_APPROVE" : decision === "more_info" ? "VENDOR_KYC_MORE_INFO" : "VENDOR_KYC_REJECT";
  await writeAudit({ actor: who, action, target: store, outcome: "OK", ...(note ? { note } : {}) });
  const { notify } = await import("@/lib/notify");
  await notify("seller", store, decision === "approve"
    ? { kind: "KYC_APPROVED", title: "Store verified", body: "Your store is verified — you can take listings live now.", href: "/seller/verification" }
    : decision === "more_info"
    ? { kind: "KYC_MORE_INFO", title: "Verification needs more information", body: note.slice(0, 120), href: "/seller/verification" }
    : { kind: "KYC_REJECTED", title: "Verification not approved", body: note.slice(0, 120), href: "/seller/verification" });
  redirect(`/admin/verification?done=${decision}`);
}

/** Admin revokes a live verification (licence lapse, compliance breach). The
 *  store can no longer take listings live until it re-verifies. Reason required. */
export async function revokeVendorKyc(formData: FormData): Promise<void> {
  const store = String(formData.get("store") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const { revokeKyc } = await import("@/lib/vendor");

  if (note.length < 10) {
    await writeAudit({ actor: who, action: "VENDOR_KYC_REVOKE", target: store, outcome: "DENIED", note: "reason under 10 chars" });
    redirect("/admin/verification?err=note");
  }
  const result = await revokeKyc(store, who, note);
  if (!result.ok) redirect(`/admin/verification?err=${result.reason}`);
  await writeAudit({ actor: who, action: "VENDOR_KYC_REVOKE", target: store, outcome: "OK", note });
  const { notify } = await import("@/lib/notify");
  await notify("seller", store, { kind: "KYC_REVOKED", title: "Store verification paused", body: note.slice(0, 120), href: "/seller/verification" });
  redirect("/admin/verification?done=revoke");
}

/* ── Support tickets (platform) ───────────────────────────── */

export async function adminReplyTicket(formData: FormData): Promise<void> {
  const id = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const who = await actor();
  const { findTicket, addMessage } = await import("@/lib/support");
  const t = findTicket(id);
  if (!t) redirect("/admin/support");
  if (body.length < 2 || body.length > 1000) redirect(`/admin/support?err=reply#${id}`);
  if (CLAIMS_LANGUAGE.test(body)) redirect(`/admin/support?err=claims#${id}`);
  const result = await addMessage(id, "admin", who, body);
  if (!result.ok) redirect(`/admin/support?err=${result.reason}#${id}`);
  await writeAudit({ actor: who, action: "SUPPORT_REPLY", target: id, outcome: "OK" });
  const { notify } = await import("@/lib/notify");
  await notify("buyer", t.buyerEmail, { kind: "SUPPORT_REPLY", title: "Vedic Hemp replied to your ticket", body: t.subject, href: "/account/support" });
  redirect(`/admin/support?replied=1#${id}`);
}

export async function adminSetTicketStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  const who = await actor();
  if (!["OPEN", "PENDING", "RESOLVED", "CLOSED"].includes(status)) redirect("/admin/support");
  const { setStatus } = await import("@/lib/support");
  const result = await setStatus(id, status as import("@/lib/support").TicketStatus);
  if (!result.ok) redirect(`/admin/support?err=${result.reason}`);
  await writeAudit({ actor: who, action: "SUPPORT_STATUS", target: `${id} → ${status}`, outcome: "OK" });
  redirect(`/admin/support?done=status#${id}`);
}

/* ── Shipping & delivery (zone rates) ─────────────────────── */

export async function saveShipping(formData: FormData): Promise<void> {
  const who = await actor();
  const { readShipping, writeShipping } = await import("@/lib/shipping");
  const cfg = await readShipping();
  const rates: Record<string, { basePaise: number; perKgPaise: number }> = {};
  for (const z of cfg.zones) {
    const base = parseInt(String(formData.get(`base_${z.id}`) ?? ""), 10);
    const perKg = parseInt(String(formData.get(`perkg_${z.id}`) ?? ""), 10);
    if (Number.isInteger(base) && base >= 0 && Number.isInteger(perKg) && perKg >= 0) {
      rates[z.id] = { basePaise: base * 100, perKgPaise: perKg * 100 };
    }
  }
  const freeAt = parseInt(String(formData.get("freeAt") ?? ""), 10);
  const defWeight = parseInt(String(formData.get("defaultWeight") ?? ""), 10);
  await writeShipping({
    rates,
    ...(Number.isInteger(freeAt) && freeAt >= 0 ? { freeAtPaise: freeAt * 100 } : {}),
    ...(Number.isInteger(defWeight) && defWeight > 0 ? { defaultWeightGrams: defWeight } : {}),
  });
  await writeAudit({ actor: who, action: "SHIPPING_RATES_SAVE", target: `${Object.keys(rates).length} zones`, outcome: "OK" });
  redirect("/admin/shipping?saved=1");
}

/* ── Coupons & promotions (platform-wide) ─────────────────── */

const COUPON_CLASSES = ["", "HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

export async function adminCreateCoupon(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const kind = String(formData.get("kind") ?? "PERCENT");
  const value = parseInt(String(formData.get("value") ?? ""), 10);
  const minRupees = parseInt(String(formData.get("minRupees") ?? "0"), 10);
  const capRupees = parseInt(String(formData.get("capRupees") ?? "0"), 10);
  const usageLimit = parseInt(String(formData.get("usageLimit") ?? ""), 10);
  const validTo = String(formData.get("validTo") ?? "").trim();
  const cls = String(formData.get("cls") ?? "");
  const who = await actor();
  const { writeCoupon, readCoupons } = await import("@/lib/commerce");

  let err: string | null = null;
  if (!/^[A-Z0-9]{4,16}$/.test(code)) err = "code";
  else if (kind === "PERCENT" && (!Number.isInteger(value) || value < 1 || value > 60)) err = "pct";
  else if (kind === "FIXED" && (!Number.isInteger(value) || value < 1 || value > 500000)) err = "amount";
  else if (!COUPON_CLASSES.includes(cls)) err = "cls";
  else if (validTo && (!/^\d{4}-\d{2}-\d{2}$/.test(validTo) || new Date(validTo) < new Date(new Date().toISOString().slice(0, 10)))) err = "date";
  else if (code in (await readCoupons())) err = "dupe";
  if (err) redirect(`/admin/coupons?err=${err}#new`);

  const isPct = kind === "PERCENT";
  await writeCoupon(code, {
    pct: isPct ? value : 0,
    ...(isPct ? {} : { fixedPaise: value * 100 }),
    capPaise: capRupees > 0 ? capRupees * 100 : 0,
    minPaise: Number.isInteger(minRupees) && minRupees > 0 ? minRupees * 100 : 0,
    ...(cls ? { cls } : {}),
    label: isPct ? `${value}% off${capRupees > 0 ? ` up to ₹${capRupees}` : ""}` : `₹${value} off`,
    enabled: true,
    ...(validTo ? { validTo } : {}),
    ...(Number.isInteger(usageLimit) && usageLimit > 0 ? { usageLimit } : {}),
    usedCount: 0,
    owner: "platform",
  });
  await writeAudit({ actor: who, action: "COUPON_CREATE", target: code, outcome: "OK", note: "platform-wide" });
  redirect("/admin/coupons?done=created");
}

export async function toggleCoupon(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const who = await actor();
  const { readCoupons, writeCoupon } = await import("@/lib/commerce");
  const def = (await readCoupons())[code];
  if (!def) redirect("/admin/coupons");
  await writeCoupon(code, { ...def, enabled: !def.enabled });
  await writeAudit({ actor: who, action: "COUPON_TOGGLE", target: code, outcome: "OK", note: def.enabled ? "disabled" : "enabled" });
  redirect("/admin/coupons?done=toggled");
}

/* ── Q&A: hide an abusive question (moderation) ───────────── */

export async function hideQuestionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("questionId") ?? "");
  const who = await actor();
  const { hideQuestion } = await import("@/lib/qa");
  const result = await hideQuestion(id);
  if (!result.ok) redirect(`/admin/reviews?err=${result.reason}`);
  await writeAudit({ actor: who, action: "QA_HIDE", target: id, outcome: "OK" });
  redirect("/admin/reviews?qhidden=1#questions");
}

/* ── CMS: featured (cover) image ──────────────────────────── */

const CMS_IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function uploadPostCover(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const file = formData.get("cover");
  const editorUrl = (q: string) => `/admin/cms/editor?slug=${encodeURIComponent(slug)}&${q}`;
  const { findPost, setPostCover } = await import("@/lib/cms");
  if (!(await findPost(slug))) redirect("/admin/cms");
  if (!(file instanceof File) || file.size === 0) redirect(editorUrl("cms=coverfile"));
  if (file.size > 1_500_000) redirect(editorUrl("cms=coversize"));
  if (!CMS_IMG_TYPES.includes(file.type)) redirect(editorUrl("cms=covertype"));
  const buf = Buffer.from(await (file as File).arrayBuffer());
  await setPostCover(slug, `data:${file.type};base64,${buf.toString("base64")}`);
  await writeAudit({ actor: await actor(), action: "CMS_COVER_SET", target: slug, outcome: "OK" });
  redirect(editorUrl("cms=cover"));
}

export async function removePostCover(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const { removePostCover: clear } = await import("@/lib/cms");
  await clear(slug);
  redirect(`/admin/cms/editor?slug=${encodeURIComponent(slug)}&cms=coverremoved`);
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

  const { notify } = await import("@/lib/notify");
  const listing = await storeFindProduct(id);

  if (decision === "approve") {
    const result = await storeApproveListing(id);
    if (!result.ok && result.reason === "coa") {
      await writeAudit({ actor: who, action: "LISTING_APPROVE", target: id, outcome: "DENIED", note: "A2: no approved batch-matched CoA" });
      redirect(`/admin/catalogue?mod=coa&id=${id}#approvals`);
    }
    if (!result.ok) redirect(`/admin/catalogue?mod=state#approvals`);
    await writeAudit({ actor: who, action: "LISTING_APPROVE", target: id, outcome: "OK" });
    if (listing) {
      await notify("seller", listing.seller, {
        kind: "LISTING_APPROVED",
        title: "Listing approved — now live",
        body: `"${listing.title}" passed review and is live on the marketplace.`,
        href: `/seller/products/${id}`,
      });
    }
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
    if (listing) {
      await notify("seller", listing.seller, {
        kind: "LISTING_REJECTED",
        title: "Listing needs changes",
        body: `"${listing.title}" was not approved: ${note.slice(0, 120)}`,
        href: `/seller/products/${id}`,
      });
    }
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
    const listing = await storeFindProduct(id);
    const result = await storeSuspendListing(id, note);
    if (!result.ok) redirect(`/admin/catalogue?mod=state#live`);
    await writeAudit({ actor: who, action: "LISTING_SUSPEND", target: id, outcome: "OK", note });
    if (listing) {
      const { notify } = await import("@/lib/notify");
      await notify("seller", listing.seller, {
        kind: "LISTING_SUSPEND",
        title: "Listing suspended",
        body: `"${listing.title}" was taken down: ${note.slice(0, 120)}`,
        href: `/seller/products/${id}`,
      });
    }
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
  const listing = await storeFindProduct(id);
  const result = await decideCoa(id, decision === "approve", note);
  if (!result.ok) redirect(`/admin/catalogue?coa=state#coa-queue`);
  await writeAudit({ actor: who, action, target: id, outcome: "OK", note });
  if (listing) {
    const { notify } = await import("@/lib/notify");
    await notify("seller", listing.seller, decision === "approve"
      ? { kind: "COA_APPROVED", title: "CoA approved", body: `Batch CoA for "${listing.title}" is approved — the batch is clear to sell.`, href: `/seller/products/${id}` }
      : { kind: "COA_REJECT", title: "CoA rejected", body: `Batch CoA for "${listing.title}" was rejected: ${note.slice(0, 120)}`, href: `/seller/products/${id}` });
  }
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
  const parentId = String(formData.get("parentId") ?? "").trim();
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
    : await createCategory({ name, blurb, emoji, ...(cls ? { cls } : {}), ...(q ? { q } : {}), ...(parentId ? { parentId } : {}) });
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

/* ── Orders: oversight + returns adjudication (buyer-first) ── */

import {
  approveReturn as ordApproveReturn,
  findOrder as ordFind,
  markSellerRecovered as ordMarkRecovered,
  refundBuyer as ordRefundBuyer,
  rejectReturn as ordRejectReturn,
} from "@/lib/orders";

/**
 * Issue the refund to the buyer. The constitution's load-bearing move: the
 * buyer's money moves NOW and a separate seller-recovery ledger opens as
 * PENDING — the platform pursues the seller afterwards, never blocking the
 * buyer. Works on a requested OR seller-approved return.
 */
export async function adminRefundBuyer(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const who = await actor();
  const result = await ordRefundBuyer(reference, who);
  if (!result.ok) {
    // Denied actions are logged too — a self-approved refund attempt (A6)
    // is exactly the kind of thing the audit trail must show.
    if (result.reason === "maker_checker") {
      await writeAudit({ actor: who, action: "REFUND_BUYER", target: reference, outcome: "DENIED", note: "A6: refund checker cannot be the return's maker" });
    }
    redirect(`/admin/orders?err=${result.reason}#returns`);
  }
  await writeAudit({ actor: who, action: "REFUND_BUYER", target: reference, outcome: "OK", note: "buyer refunded first; seller recovery opened" });
  const { notify } = await import("@/lib/notify");
  await notify("buyer", result.order.buyerEmail, {
    kind: "REFUND",
    title: `Refund issued — ${reference}`,
    body: `₹${(result.order.refundedPaise / 100).toLocaleString("en-IN")} is on its way back to your original payment method.`,
    href: `/account/orders/live-${reference}`,
  });
  redirect("/admin/orders?refunded=1#returns");
}

/** Approve a return without refunding yet (hands it to the settlement step). */
export async function adminApproveReturn(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const who = await actor();
  const result = await ordApproveReturn(reference, who);
  if (!result.ok) redirect(`/admin/orders?err=${result.reason}#returns`);
  await writeAudit({ actor: who, action: "RETURN_APPROVE", target: reference, outcome: "OK" });
  redirect("/admin/orders?approved=1#returns");
}

/** Reject a return with a written reason the buyer sees (≥ 20 chars). */
export async function adminRejectReturn(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const order = await ordFind(reference);
  if (!order) redirect("/admin/orders");
  const result = await ordRejectReturn(reference, who, note);
  if (!result.ok) {
    await writeAudit({ actor: who, action: "RETURN_REJECT", target: reference, outcome: "DENIED", note: result.reason === "note" ? "note under 20 chars" : result.reason });
    redirect(`/admin/orders?err=${result.reason}#returns`);
  }
  await writeAudit({ actor: who, action: "RETURN_REJECT", target: reference, outcome: "OK", note });
  const { notify } = await import("@/lib/notify");
  await notify("buyer", order.buyerEmail, {
    kind: "RETURN_REJECT",
    title: `Return not approved — ${reference}`,
    body: `Your return request was declined: ${note.slice(0, 120)}`,
    href: `/account/orders/live-${reference}`,
  });
  redirect("/admin/orders?rejected=1#returns");
}

/** Settle the seller-recovery ledger after the fact (recovery ≠ buyer refund). */
export async function adminMarkRecovered(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "").slice(0, 30);
  const who = await actor();
  const result = await ordMarkRecovered(reference, who);
  if (!result.ok) redirect(`/admin/orders?err=${result.reason}#recovery`);
  await writeAudit({ actor: who, action: "SELLER_RECOVERY", target: reference, outcome: "OK", note: "recovery settled" });
  redirect("/admin/orders?recovered=1#recovery");
}

/* ── Finance: vendor withdrawals (Dokan-style, A6 maker-checker) ── */

import {
  approveWithdraw as ernApprove,
  cancelWithdraw as ernCancel,
  confirmWithdraw as ernConfirm,
  findWithdrawal as ernFind,
} from "@/lib/earnings";

/** Maker step: approve a pending withdrawal. Records this admin as the maker. */
export async function approveWithdrawal(formData: FormData): Promise<void> {
  const id = String(formData.get("withdrawId") ?? "");
  const who = await actor();
  const result = await ernApprove(id, who);
  if (!result.ok) redirect(`/admin/finance/withdrawals?err=${result.reason}`);
  await writeAudit({ actor: who, action: "WITHDRAW_APPROVE", target: id, outcome: "OK", note: "maker" });
  redirect("/admin/finance/withdrawals?done=approved");
}

/**
 * Checker step: confirm the payout. A6 — for a payout of ₹10,000 or more the
 * checker must be a DIFFERENT admin from the maker; the store rejects a
 * self-check and the denied attempt is logged.
 */
export async function confirmWithdrawal(formData: FormData): Promise<void> {
  const id = String(formData.get("withdrawId") ?? "");
  const who = await actor();
  const w = await ernFind(id);
  const result = await ernConfirm(id, who);
  if (!result.ok) {
    if (result.reason === "maker") {
      await writeAudit({ actor: who, action: "WITHDRAW_PAY", target: id, outcome: "DENIED", note: "A6: maker cannot be checker on a payout ≥ ₹10,000" });
      redirect("/admin/finance/withdrawals?err=maker");
    }
    if (result.reason === "split") {
      await writeAudit({ actor: who, action: "WITHDRAW_PAY", target: id, outcome: "DENIED", note: "A6: cumulative payouts reached the threshold — a different checker is required (anti-splitting)" });
      redirect("/admin/finance/withdrawals?err=split");
    }
    redirect(`/admin/finance/withdrawals?err=${result.reason}`);
  }
  await writeAudit({ actor: who, action: "WITHDRAW_PAY", target: id, outcome: "OK", note: `paid ₹${Math.round((w?.amountPaise ?? 0) / 100)} · checker ${who}` });
  if (w) {
    const { notify } = await import("@/lib/notify");
    await notify("seller", w.seller, {
      kind: "WITHDRAW_PAID",
      title: `Payout sent — ₹${Math.round(w.amountPaise / 100).toLocaleString("en-IN")}`,
      body: `Your withdrawal to ${w.destination} has been paid. It should reach you shortly.`,
      href: "/seller/earnings#withdraw",
    });
  }
  redirect("/admin/finance/withdrawals?done=paid");
}

export async function cancelWithdrawal(formData: FormData): Promise<void> {
  const id = String(formData.get("withdrawId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const who = await actor();
  const w = await ernFind(id);
  const result = await ernCancel(id, who, note);
  if (!result.ok) {
    await writeAudit({ actor: who, action: "WITHDRAW_CANCEL", target: id, outcome: "DENIED", note: result.reason === "note" ? "reason under 10 chars" : result.reason });
    redirect(`/admin/finance/withdrawals?err=${result.reason}`);
  }
  await writeAudit({ actor: who, action: "WITHDRAW_CANCEL", target: id, outcome: "OK", note });
  if (w) {
    const { notify } = await import("@/lib/notify");
    await notify("seller", w.seller, {
      kind: "WITHDRAW_CANCEL",
      title: "Withdrawal cancelled",
      body: `Your payout request of ₹${Math.round(w.amountPaise / 100).toLocaleString("en-IN")} was cancelled: ${note.slice(0, 100)}. The balance is back in your available earnings.`,
      href: "/seller/earnings#withdraw",
    });
  }
  redirect("/admin/finance/withdrawals?done=cancelled");
}
