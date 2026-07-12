/**
 * VEDIC HEMP — CUSTOMERS (§2.5 adjacent)
 *
 * Buyer questions, reviews and messages. Health data never appears here —
 * a review or message referencing symptoms/medical use would be redacted
 * before reaching this view (A4 boundary, enforced server-side).
 */

import type { Metadata } from "next";
import { MessageCircleQuestion, Star, Inbox, Timer } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, toneForStatus, Stat, Rating } from "@/components/ui";
import { readSellerReplies } from "@/lib/engage";
import { QUESTIONS, REVIEWS, MESSAGES, RESPONSE_STATS } from "../_lib/data";
import { replyToQuestion } from "../actions";

export const metadata: Metadata = { title: "Customers" };

const REPLY_ERRORS: Record<string, string> = {
  short: "Replies need 10–600 characters.",
  claims: "The copy-check blocked that reply — claims language (cure/treat/prevent/heal) can't be published. It was not sent.",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ replied?: string; err?: string }>;
}) {
  const { replied, err } = await searchParams;
  const myReplies = await readSellerReplies();
  return (
    <Shell active="/seller/customers" breadcrumb={["Seller Central", "Customers"]} title="Customers">
      {replied && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Reply queued">
            It passed the automated copy-check and publishes after moderation review.
          </Banner>
        </div>
      )}
      {err && REPLY_ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Reply not sent">{REPLY_ERRORS[err]}</Banner>
        </div>
      )}
      {/* Response-time stats */}
      <div className="vh-grid cols-3" style={{ marginBottom: "var(--sp-4)" }}>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}>
            <Timer size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} />
            <span className="vh-stat-label">Avg first response</span>
          </div>
          <div className="vh-stat-value tabular">{RESPONSE_STATS.avgFirstResponse}</div>
          <div className="small muted" style={{ marginTop: 4 }}>Target {RESPONSE_STATS.targetFirstResponse} — fast replies protect account health.</div>
        </Card>
        <Card><Stat label="Answered within 24h" value={`${RESPONSE_STATS.answeredWithin24hPercent}%`} delta={{ dir: "up", text: "2pt vs last month" }} /></Card>
        <Card><Stat label="Open threads" value={QUESTIONS.filter((q) => q.status === "UNANSWERED").length + MESSAGES.filter((m) => m.unread).length} /></Card>
      </div>

      <div className="vh-grid cols-3" style={{ alignItems: "start" }}>
        {/* Q&A with reply box */}
        <Card title={<span className="vh-row" style={{ gap: 8 }}><MessageCircleQuestion size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /> Questions</span>}>
          {QUESTIONS.length === 0 ? (
            <div className="vh-empty">No open questions.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
              {QUESTIONS.map((q) => (
                <li key={q.id} style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 16 }}>
                  <div className="vh-row-between" style={{ marginBottom: 4 }}>
                    <span className="small muted">{q.product}</span>
                    <StatusPill tone={toneForStatus(q.status)}>{q.status}</StatusPill>
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>&ldquo;{q.text}&rdquo;</div>
                  <div className="small muted" style={{ marginTop: 2 }}>{q.buyer} · {q.askedAt}</div>
                  {q.status === "UNANSWERED" && (
                    myReplies[q.id] ? (
                      <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: "var(--vh-radius-sm)", background: "var(--vh-bg-subtle)", border: "1px solid var(--vh-line)" }}>
                        <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}>
                          <StatusPill tone="warn">Pending moderation</StatusPill>
                          <span className="small muted">Your reply passed the copy-check</span>
                        </div>
                        <p className="small" style={{ margin: 0 }}>&ldquo;{myReplies[q.id]}&rdquo;</p>
                      </div>
                    ) : (
                      <form action={replyToQuestion} className="vh-field" style={{ marginTop: 8 }}>
                        <input type="hidden" name="qid" value={q.id} />
                        <label className="vh-label" htmlFor={`reply-${q.id}`}>Your reply</label>
                        <textarea className="vh-textarea" id={`reply-${q.id}`} name="reply" rows={2} minLength={10} maxLength={600} required placeholder="Answer factually — composition, batch CoA link, usage format. No medical claims." />
                        <span className="vh-help">Replies pass the compliance copy-check before publishing.</span>
                        <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit" style={{ justifySelf: "start" }}>Post reply</button>
                      </form>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Reviews with Rating */}
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Star size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /> Reviews</span>}>
          {REVIEWS.length === 0 ? (
            <div className="vh-empty">No reviews yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
              {REVIEWS.map((r) => (
                <li key={r.id} style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 16 }}>
                  <div className="vh-row-between" style={{ marginBottom: 4 }}>
                    <span className="small muted">{r.product}</span>
                    <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill>
                  </div>
                  <Rating value={r.rating} />
                  <div style={{ fontSize: "0.9rem", marginTop: 4 }}>&ldquo;{r.text}&rdquo;</div>
                  <div className="small muted" style={{ marginTop: 2 }}>{r.buyer}</div>
                  {r.status === "FLAGGED" && (
                    <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#respond" style={{ marginTop: 8, display: "inline-block" }}>Respond</a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            Reviews mentioning health conditions are redacted server-side before they reach this console (A4 boundary).
          </p>
        </Card>

        {/* Messages */}
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Inbox size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /> Messages</span>}>
          {MESSAGES.length === 0 ? (
            <div className="vh-empty">No messages.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {MESSAGES.map((m) => (
                <li key={m.id} className="vh-row-between">
                  <span>
                    <div style={{ fontWeight: m.unread ? 700 : 400, fontSize: ".9rem" }}>{m.subject}</div>
                    <div className="small muted">{m.buyer} · {m.at}</div>
                  </span>
                  {m.unread && <StatusPill tone="info">New</StatusPill>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
