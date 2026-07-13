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
