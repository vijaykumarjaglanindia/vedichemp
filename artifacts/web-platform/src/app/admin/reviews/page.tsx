/**
 * VEDIC HEMP — REVIEW MODERATION (admin)
 *
 * Buyer reviews land here as PENDING and are invisible to the public until an
 * admin approves them. Approvals publish the review and recompute the
 * product's star rating; rejections need a written reason and are audited.
 * Nothing here can invent a rating — the score is always computed from the
 * approved reviews, never set by hand.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Star, ShieldCheck, MessageCircleQuestion, EyeOff } from "lucide-react";
import Link2 from "next/link";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { pendingQueue } from "@/lib/reviews";
import { recentQuestions } from "@/lib/qa";
import { moderateReviewAction, hideQuestionAction } from "../actions";

export const metadata: Metadata = { title: "Reviews & Q&A · Admin" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  approve: { sev: "ok", text: "Review approved — it's live on the product page and the rating has been recomputed." },
  reject: { sev: "ok", text: "Review rejected — it stays hidden and the reason is recorded." },
  note: { sev: "danger", text: "A rejection needs a short reason (at least 12 characters)." },
  state: { sev: "warn", text: "That review was already moderated." },
  missing: { sev: "warn", text: "That item no longer exists." },
  qhidden: { sev: "ok", text: "Question hidden — it no longer shows on the product page. The action is logged." },
};

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5`} style={{ color: "var(--vh-accent)", whiteSpace: "nowrap" }}>
      {"★".repeat(n)}<span style={{ color: "var(--vh-line-strong)" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string; qhidden?: string }> }) {
  const { done, err, qhidden } = await searchParams;
  const queue = await pendingQueue();
  const questions = await recentQuestions(20);
  const msg = (done && MESSAGES[done]) || (qhidden && MESSAGES.qhidden) || (err && MESSAGES[err]) || undefined;

  return (
    <Shell active="/admin/reviews" breadcrumb={["Admin", "Trust", "Reviews & Q&A"]} title="Reviews & Q&A"
      actions={<StatusPill tone={queue.length ? "warn" : "ok"}>{queue.length} reviews waiting</StatusPill>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      <Card
        title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck size={16} strokeWidth={2.2} aria-hidden /> Waiting for moderation</span>}
        action={<span className="small muted">Approving publishes the review &amp; recomputes the rating</span>}
        pad0
      >
        {queue.length === 0 ? (
          <div style={{ padding: 12 }}>
            <EmptyState icon="✅" headline="Nothing to moderate" sub="New buyer reviews appear here for a quick check before they go live." />
          </div>
        ) : (
          <div>
            {queue.map((r) => (
              <div key={r.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "14px 16px" }}>
                <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <Stars n={r.rating} />
                    <strong style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                    {r.verified && <StatusPill tone="ok">Verified purchase</StatusPill>}
                    <Link className="small" href={`/products/${r.productSlug}`} style={{ fontWeight: 700 }}>{r.productSlug}</Link>
                  </span>
                  <span className="small muted tabular">{r.createdAt}</span>
                </div>
                {r.title && <div style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{r.title}</div>}
                <p className="small" style={{ margin: "4px 0 10px" }}>{r.body}</p>
                <div className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <form action={moderateReviewAction} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit"><Star size={13} aria-hidden /> Approve &amp; publish</button>
                  </form>
                  <form action={moderateReviewAction} className="vh-row" style={{ gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input className="vh-input vh-input-sm" name="note" placeholder="Reason (≥12 chars)" style={{ width: 220 }} aria-label="Rejection reason" />
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Product questions moderation ─────────────────────── */}
      <div id="questions" style={{ marginTop: "var(--sp-4)", scrollMarginTop: 90 }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><MessageCircleQuestion size={16} strokeWidth={2.2} aria-hidden /> Product questions</span>}
          action={<span className="small muted">Questions are public on ask (copy-checked); hide abuse here</span>}
          pad0
        >
          {questions.length === 0 ? (
            <div style={{ padding: 12 }}><EmptyState icon="💬" headline="No questions yet" sub="Shopper questions across the marketplace appear here for moderation." /></div>
          ) : (
            <div>
              {questions.map((q) => (
                <div key={q.id} className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", borderTop: "1px solid var(--vh-line)", padding: "12px 16px" }}>
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>&ldquo;{q.body}&rdquo;</div>
                    <div className="small muted">{q.asker} · <Link2 href={`/products/${q.productSlug}`} style={{ fontWeight: 700 }}>{q.productSlug}</Link2> · {q.createdAt} · {q.answer ? "answered" : "unanswered"}</div>
                  </span>
                  <form action={hideQuestionAction}>
                    <input type="hidden" name="questionId" value={q.id} />
                    <button className="vh-btn vh-btn-sm vh-btn-danger vh-row" style={{ gap: 6 }} type="submit"><EyeOff size={13} aria-hidden /> Hide</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
