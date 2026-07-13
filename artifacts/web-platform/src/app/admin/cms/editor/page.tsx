/**
 * VEDIC HEMP — POST EDITOR (WordPress-style)
 *
 * One editor for drafts and published posts: Save draft / Publish /
 * Unpublish / Delete, with a live preview link. Publishing is a server
 * action; the claims copy-check runs on every save. Deleting a
 * high-traffic (sample) post is maker–checker gated and the single-editor
 * attempt is denied — visibly.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye, Globe, Send, Trash2 } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { MAX_BODY, findPost, listRevisions } from "@/lib/cms";
import { restorePostRevision, savePost } from "../../actions";

export const metadata: Metadata = { title: "Post editor · Admin" };

const NOTES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  saved: { sev: "ok", text: "Saved. Published posts stay live with the updated copy; drafts stay private." },
  scheduled: { sev: "ok", text: "Scheduled — the post goes live automatically at the chosen time. Until then it stays a private draft." },
  restored: { sev: "ok", text: "Revision restored. The state you replaced was kept as a new revision — nothing is lost." },
  norev: { sev: "danger", text: "That revision no longer exists." },
  published: { sev: "ok", text: "Published — the post is live on the public journal right now." },
  unpublished: { sev: "warn", text: "Unpublished — the post is a private draft again; the public URL now returns not-found." },
  title: { sev: "danger", text: "Title should be 6–90 characters." },
  body: { sev: "danger", text: `Body should be 40–${900} characters in this demo.` },
  claims: { sev: "danger", text: "The copy-check rejected claims language (cure/treat/prevent/heal) — nothing on this platform may carry a disease claim, the journal included." },
  limit: { sev: "danger", text: "Demo limit: up to 3 new posts (plus edits to the samples). Delete one first." },
  "delete-denied": { sev: "danger", text: "Delete denied: this page exceeds the traffic threshold, so deletion is maker–checker — a second, different admin must confirm. The attempt is logged." },
};

export default async function PostEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; cms?: string }>;
}) {
  const { slug, cms } = await searchParams;
  const post = slug && slug !== "new" ? await findPost(slug) : undefined;
  const revisions = post ? await listRevisions(post.slug) : [];

  return (
    <Shell
      active="/admin/cms"
      breadcrumb={["Admin", "Content & CMS", post ? `Edit: ${post.title.slice(0, 30)}…` : "New post"]}
      title={post ? "Edit post" : "New post"}
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/cms">
            <ArrowLeft size={14} aria-hidden /> All content
          </Link>
          {post && (
            <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/blog/${post.slug}${post.status === "DRAFT" ? "?preview=1" : ""}`}>
              <Eye size={14} aria-hidden /> {post.status === "PUBLISHED" ? "View live" : "Preview draft"}
            </Link>
          )}
        </span>
      }
    >
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {cms && NOTES[cms] && <Banner severity={NOTES[cms].sev}>{NOTES[cms].text}</Banner>}

        <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
          <form action={savePost} className="vh-grid" style={{ gap: 16 }}>
            {post && <input type="hidden" name="slug" value={post.slug} />}
            <Card title="Content">
              <div className="vh-grid" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="post-title">Title <span className="req">*</span></label>
                  <input className="vh-input" id="post-title" name="title" required minLength={6} maxLength={90} defaultValue={post?.title ?? ""} placeholder="e.g. Choosing a hemp protein that fits your routine" />
                  {!post && <span className="vh-help">The URL slug is generated from the title on first save.</span>}
                  {post && <span className="vh-help">Slug: <span className="mono">/blog/{post.slug}</span> (fixed after creation)</span>}
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="post-body">Body <span className="req">*</span></label>
                  <RichTextEditor
                    name="body"
                    id="post-body"
                    defaultValue={post?.body ?? ""}
                    maxLength={MAX_BODY}
                    minHeight={280}
                    placeholder="Write the post — headings, bold, italics and lists from the toolbar."
                    help="What you see is what publishes. Stored as safe text (never HTML) · no disease claims (copy-checked on save)."
                  />
                </div>
              </div>
            </Card>

            <div className="vh-field" style={{ maxWidth: 320 }}>
              <label className="vh-label" htmlFor="post-publishat">Schedule (optional)</label>
              <input className="vh-input" id="post-publishat" name="publishAt" type="datetime-local" defaultValue={post?.publishAt?.slice(0, 16) ?? ""} />
              <span className="vh-help">Set a future time and press Publish — it goes live on its own (WordPress-style scheduling).</span>
            </div>

            <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="submit" name="intent" value="draft" className="vh-btn vh-btn-ghost">
                {post?.status === "PUBLISHED" ? "Update (stays live)" : "Save draft"}
              </button>
              {post?.status === "PUBLISHED" ? (
                <button type="submit" name="intent" value="unpublish" className="vh-btn vh-btn-outline">
                  Unpublish
                </button>
              ) : (
                <button type="submit" name="intent" value="publish" className="vh-btn vh-btn-primary">
                  <Send size={14} aria-hidden /> Publish
                </button>
              )}
              {post && (
                <button type="submit" name="intent" value="delete" className="vh-btn vh-btn-danger" style={{ marginLeft: "auto" }}>
                  <Trash2 size={14} aria-hidden /> Delete
                </button>
              )}
            </div>
          </form>

          <Card title="Status">
            <div className="vh-row-between" style={{ marginBottom: 10 }}>
              <span className="small muted">Visibility</span>
              <StatusPill tone={post?.status === "PUBLISHED" ? "ok" : "neutral"}>
                {post ? post.status : "NOT SAVED"}
              </StatusPill>
            </div>
            {post && (
              <div className="vh-row-between" style={{ marginBottom: 10 }}>
                <span className="small muted">Last updated</span>
                <span className="small tabular">{post.updatedAt}</span>
              </div>
            )}
            <div className="vh-row" style={{ gap: 8, marginBottom: 10 }}>
              <Globe size={14} aria-hidden style={{ color: "var(--vh-accent)", flexShrink: 0, marginTop: 2 }} />
              <p className="small muted" style={{ margin: 0 }}>
                Published posts appear on the public <Link href="/blog">Wellness journal</Link> immediately.
                Drafts are visible only through the admin preview — a visitor opening a draft URL gets not-found,
                never a blurred or partial page.
              </p>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Deleting a page above the traffic threshold requires a second admin (maker–checker) — the
              samples on this demo are all above it.
            </p>
            {revisions.length > 0 && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--vh-line)", paddingTop: 12 }}>
                <div className="small" style={{ fontWeight: 800, color: "var(--vh-ink)", marginBottom: 8 }}>Revisions ({revisions.length})</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                  {revisions.map((rev, i) => (
                    <li key={rev.at} className="vh-row-between" style={{ gap: 8 }}>
                      <span className="small muted">
                        <span className="tabular">{rev.at.slice(0, 16).replace("T", " ")}</span> · {rev.by} · &ldquo;{rev.title.slice(0, 28)}&hellip;&rdquo;
                      </span>
                      <form action={restorePostRevision}>
                        <input type="hidden" name="slug" value={post?.slug ?? ""} />
                        <input type="hidden" name="rev" value={i} />
                        <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Restore</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
