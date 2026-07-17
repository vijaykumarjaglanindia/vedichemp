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
import { pendingQueue, reportedReviews } from "@/lib/reviews";
import { pendingStoreQueue } from "@/lib/store-reviews";
import { reportedStores } from "@/lib/store-reports";
import { recentQuestions } from "@/lib/qa";
import { moderateReviewAction, hideQuestionAction, moderateStoreReviewAction, resolveReviewReportsAction, resolveStoreReportsAction } from "../actions";

const REPORT_LABEL: Record<string, string> = {
  SPAM: "Spam", OFFENSIVE: "Offensive", FAKE: "Fake / not a real purchase", MEDICAL_CLAIM: "Medical claim", OTHER: "Other",
};

const STORE_REPORT_LABEL: Record<string, string> = {
  OFF_PLATFORM: "Off-platform payment", COUNTERFEIT: "Counterfeit", MISLEADING: "Misleading", PROHIBITED_ITEM: "Prohibited item", OTHER: "Other",
};

export const metadata: Metadata = { title: "Reviews & Q&A · Admin" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  approve: { sev: "ok", text: "Review approved — it's live on the product page and the rating has been recomputed." },
  reject: { sev: "ok", text: "Review rejected — it stays hidden and the reason is recorded." },
  note: { sev: "danger", text: "A rejection needs a short reason (at least 12 characters)." },
  state: { sev: "warn", text: "That review was already moderated." },
  missing: { sev: "warn", text: "That item no longer exists." },
  qhidden: { sev: "ok", text: "Question hidden — it no longer shows on the product page. The action is logged." },
  removed: { sev: "ok", text: "Review removed after report — it's hidden and dropped from the rating. The reports are stamped resolved (append-only)." },
  dismissed: { sev: "ok", text: "Reports dismissed — the review stays live. The reports are stamped resolved (append-only)." },
  escalated: { sev: "ok", text: "Store escalated to compliance for a KYC/licence review. The reports are stamped resolved (append-only)." },
  sdismissed: { sev: "ok", text: "Store reports dismissed — the store stays open. The reports are stamped resolved (append-only)." },
};

const STORE_MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  approve: { sev: "ok", text: "Store review approved — it's live on the storefront and the store rating has been recomputed." },
  reject: { sev: "ok", text: "Store review rejected — it stays hidden and the action is recorded." },
  note: { sev: "danger", text: "A rejection needs a short reason (at least 12 characters)." },
  state: { sev: "warn", text: "That store review was already moderated." },
};

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5`} style={{ color: "var(--vh-accent)", whiteSpace: "nowrap" }}>
      {"★".repeat(n)}<span style={{ color: "var(--vh-line-strong)" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string; qhidden?: string; sdone?: string; serr?: string }> }) {
  const { done, err, qhidden, sdone, serr } = await searchParams;
  const queue = await pendingQueue();
  const reported = await reportedReviews();
  const flaggedStores = await reportedStores();
  const storeQueue = await pendingStoreQueue();
  const questions = await recentQuestions(20);
  const msg = (done && MESSAGES[done]) || (qhidden && MESSAGES.qhidden) || (err && MESSAGES[err]) || undefined;
  const storeMsg = (sdone && STORE_MESSAGES[sdone]) || (serr && STORE_MESSAGES[serr]) || undefined;

  return (
    <Shell active="/admin/reviews" breadcrumb={["Admin", "Trust", "Reviews & Q&A"]} title="Reviews & Q&A"
      actions={<StatusPill tone={queue.length + storeQueue.length ? "warn" : "ok"}>{queue.length + storeQueue.length} reviews waiting</StatusPill>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      {reported.length > 0 && (
        <div id="reported" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-3)" }}>
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><EyeOff size={16} strokeWidth={2.2} aria-hidden /> Reported reviews</span>}
            action={<StatusPill tone="warn">{reported.length} flagged</StatusPill>}
            pad0
          >
            {reported.map(({ review: r, reports }) => (
              <div key={r.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "14px 16px" }}>
                <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <Stars n={r.rating} />
                    <strong style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                    <Link className="small" href={`/products/${r.productSlug}#reviews`} style={{ fontWeight: 700 }}>{r.productSlug}</Link>
                  </span>
                  <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {[...new Set(reports.map((x) => x.reason))].map((reason) => (
                      <StatusPill key={reason} tone="warn">{REPORT_LABEL[reason] ?? reason}</StatusPill>
                    ))}
                    <span className="small muted">· {reports.length} report{reports.length === 1 ? "" : "s"}</span>
                  </span>
                </div>
                {r.title && <div style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{r.title}</div>}
                <p className="small" style={{ margin: "4px 0 10px" }}>{r.body}</p>
                <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <form action={resolveReviewReportsAction} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="action" value="remove" />
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Remove review</button>
                  </form>
                  <form action={resolveReviewReportsAction} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="action" value="dismiss" />
                    <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Dismiss reports (keep)</button>
                  </form>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {flaggedStores.length > 0 && (
        <div id="stores" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-3)" }}>
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><EyeOff size={16} strokeWidth={2.2} aria-hidden /> Reported stores</span>}
            action={<StatusPill tone="danger">{flaggedStores.length} flagged</StatusPill>}
            pad0
          >
            {flaggedStores.map((f) => (
              <div key={f.storeSlug} style={{ borderTop: "1px solid var(--vh-line)", padding: "14px 16px" }}>
                <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--vh-ink)" }}>{f.storeName}</strong>
                    <Link className="small" href={`/store/${f.storeSlug}`} style={{ fontWeight: 700 }}>{f.storeSlug}</Link>
                  </span>
                  <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {[...new Set(f.reports.map((x) => x.reason))].map((reason) => (
                      <StatusPill key={reason} tone={reason === "OFF_PLATFORM" ? "danger" : "warn"}>{STORE_REPORT_LABEL[reason] ?? reason}</StatusPill>
                    ))}
                    <span className="small muted">· {f.reports.length} report{f.reports.length === 1 ? "" : "s"}</span>
                  </span>
                </div>
                <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <form action={resolveStoreReportsAction} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="slug" value={f.storeSlug} />
                    <input type="hidden" name="action" value="action" />
                    <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Escalate to compliance</button>
                  </form>
                  <form action={resolveStoreReportsAction} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="slug" value={f.storeSlug} />
                    <input type="hidden" name="action" value="dismiss" />
                    <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Dismiss (keep store)</button>
                  </form>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

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

      {/* ── Store reviews moderation ─────────────────────────── */}
      <div id="store-reviews" style={{ marginTop: "var(--sp-4)", scrollMarginTop: 90 }}>
        {storeMsg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={storeMsg.sev}>{storeMsg.text}</Banner></div>}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Star size={16} strokeWidth={2.2} aria-hidden /> Store reviews waiting</span>}
          action={<span className="small muted">Approving publishes it &amp; recomputes the store rating</span>}
          pad0
        >
          {storeQueue.length === 0 ? (
            <div style={{ padding: 12 }}><EmptyState icon="🏪" headline="No store reviews to moderate" sub="Buyer reviews of a store's service appear here before they go live." /></div>
          ) : (
            <div>
              {storeQueue.map((r) => (
                <div key={r.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "14px 16px" }}>
                  <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                    <span className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <Stars n={r.rating} />
                      <strong style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                      {r.verified && <StatusPill tone="ok">Verified buyer</StatusPill>}
                      <Link className="small" href={`/store/${r.slug}`} style={{ fontWeight: 700 }}>{r.store}</Link>
                    </span>
                    <span className="small muted tabular">{r.createdAt}</span>
                  </div>
                  <p className="small" style={{ margin: "4px 0 10px" }}>{r.body}</p>
                  <div className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <form action={moderateStoreReviewAction} style={{ display: "inline-flex" }}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit"><Star size={13} aria-hidden /> Approve &amp; publish</button>
                    </form>
                    <form action={moderateStoreReviewAction} className="vh-row" style={{ gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input className="vh-input vh-input-sm" name="note" placeholder="Reason (≥12 chars)" style={{ width: 220 }} aria-label="Store review rejection reason" />
                      <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Reject</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

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
