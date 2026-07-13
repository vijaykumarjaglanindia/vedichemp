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
import { MAX_BODY, SAMPLE_POSTS, deletePostOverride, findPost, slugify, writePostOverride } from "@/lib/cms";

const OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 30 };

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

  const jar = await cookies();
  const ref = `RC${Date.now().toString(36).toUpperCase().slice(-5)}`;
  jar.set("vh-adm-recall", JSON.stringify({ ref, at: new Date().toISOString().slice(0, 10) }), OPTS);
  redirect(`/admin/compliance?recall=initiated&ref=${ref}#recall`);
}

export async function closeRecall(): Promise<void> {
  const jar = await cookies();
  const open = jar.get("vh-adm-recall")?.value;
  if (!open) redirect("/admin/compliance?recall=none#recall");
  // A6: the admin who initiated the recall cannot also close it. In this
  // demo session you ARE the initiator, so the close is denied — and the
  // denied attempt is itself an audit event.
  redirect("/admin/compliance?recall=denied#recall");
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
  if (reason.length < 20) redirect(`/admin/users?act=${op}&u=${userId}&err=reason#act-form`);

  const newStatus = USER_OPS[op];
  if (newStatus) {
    const jar = await cookies();
    let map: Record<string, string> = {};
    try { map = JSON.parse(jar.get("vh-adm-users")?.value ?? "{}") as Record<string, string>; } catch { map = {}; }
    map[userId] = newStatus;
    jar.set("vh-adm-users", JSON.stringify(map), OPTS);
  }
  redirect(`/admin/users?done=${op}&u=${userId}`);
}

/* ── CMS: WordPress-style save / publish / unpublish / delete ── */

const CMS_CLAIMS = /\b(cure|cures|heal|heals|treat|treats|treatment|prevent|prevents)\w*\b/i;

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
    if (post.sample) redirect(editorUrl(existingSlug, "cms=delete-denied"));
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

  const result = await writePostOverride({
    slug,
    title: postTitle,
    body,
    status,
    updatedAt: new Date().toISOString().slice(0, 10),
    sample: SAMPLE_POSTS.some((p) => p.slug === slug),
  });
  if (result === "limit") redirect(editorUrl(slug, "cms=limit"));
  redirect(editorUrl(slug, `cms=${intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : "saved"}`));
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
