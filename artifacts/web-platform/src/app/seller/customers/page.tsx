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
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { mdToHtml } from "@/lib/richtext";
import { readSellerReplies } from "@/lib/engage";
import { sellerListings } from "@/lib/catalog";
import { getSession } from "@/lib/auth-lite";
import { questionsForSlugs } from "@/lib/qa";
import { QUESTIONS, REVIEWS, MESSAGES, RESPONSE_STATS } from "../_lib/data";
import { answerProductQuestion, replyToQuestion, respondToReview } from "../actions";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

const REPLY_ERRORS: Record<string, string> = {
  short: "Replies need 10–600 characters.",
  claims: "The copy-check blocked that reply — claims language (cure/treat/prevent/heal) can't be published. It was not sent.",
};

const STORE = "Vedic Botanicals";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ replied?: string; err?: string; answered?: string; qerr?: string }>;
}) {
  const { replied, err, answered, qerr } = await searchParams;
  const myReplies = await readSellerReplies();
  const session = await getSession();
  const slugs = (await sellerListings(session?.email ?? "seller@example.in", STORE)).map((p) => p.slug);
  const liveUnanswered = await questionsForSlugs(slugs, { answered: false });
  const liveAnswered = await questionsForSlugs(slugs, { answered: true });
  return (
    <Shell active="/seller/customers" breadcrumb={["Seller Central", "Customers"]} title="Customers">
      {answered && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Answer posted">Your answer is live on the product page for every shopper to see.</Banner>
        </div>
      )}
      {qerr === "claims" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Answer blocked">Answers can't carry medical claims (cure / treat / prevent). It was not published.</Banner></div>}
      {qerr === "short" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Answer too short">Write between 5 and 500 characters.</Banner></div>}
      {replied && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Reply queued">
            It passed the automated copy-check and publishes after moderation review.
          </Banner>
        </div>
      )}

      {/* ── Live product questions (real Q&A store) ─────────── */}
      <div id="product-questions" style={{ marginBottom: "var(--sp-4)", scrollMarginTop: 90 }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><MessageCircleQuestion size={16} strokeWidth={2.2} aria-hidden /> Product questions</span>}
          action={<StatusPill tone={liveUnanswered.length ? "warn" : "ok"}>{liveUnanswered.length} to answer</StatusPill>}
          pad0
        >
          {liveUnanswered.length === 0 && liveAnswered.length === 0 ? (
            <div style={{ padding: 12 }}><span className="vh-empty">No product questions yet. Shoppers can ask from any of your product pages.</span></div>
          ) : (
            <div>
              {liveUnanswered.map((q) => (
                <div key={q.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "12px 16px" }}>
                  <div className="vh-row-between" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="small muted">{q.asker} · {q.productSlug} · {q.createdAt}</span>
                    <StatusPill tone="warn">Awaiting answer</StatusPill>
                  </div>
                  <div style={{ fontWeight: 600, margin: "4px 0 8px" }}>&ldquo;{q.body}&rdquo;</div>
                  <form action={answerProductQuestion} className="vh-row" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <input type="hidden" name="questionId" value={q.id} />
                    <input className="vh-input" name="answer" placeholder="Answer factually — composition, format, batch. No medical claims." style={{ flex: "1 1 340px" }} aria-label={`Answer ${q.asker}`} />
                    <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Post answer</button>
                  </form>
                </div>
              ))}
              {liveAnswered.map((q) => (
                <div key={q.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "12px 16px" }}>
                  <div className="small muted">{q.asker} · {q.productSlug}</div>
                  <div style={{ fontWeight: 600, margin: "2px 0 4px" }}>&ldquo;{q.body}&rdquo;</div>
                  <div className="small muted"><span style={{ fontWeight: 700, color: "var(--vh-ink)" }}>Answered:</span> {q.answer}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

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
                        <div className="small vh-prose" style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: mdToHtml(myReplies[q.id] ?? "") }} />
                      </div>
                    ) : (
                      <form action={replyToQuestion} className="vh-field" style={{ marginTop: 8 }}>
                        <input type="hidden" name="qid" value={q.id} />
                        <label className="vh-label" htmlFor={`reply-${q.id}`}>Your reply</label>
                        <RichTextEditor
                          compact
                          name="reply"
                          id={`reply-${q.id}`}
                          maxLength={600}
                          minHeight={72}
                          placeholder="Answer factually — composition, batch CoA link, usage format. No medical claims."
                          help="Replies pass the compliance copy-check before publishing."
                        />
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
                    myReplies[r.id] ? (
                      <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: "var(--vh-radius-sm)", background: "var(--vh-bg-subtle)", border: "1px solid var(--vh-line)" }}>
                        <StatusPill tone="warn">Response pending moderation</StatusPill>
                        <div className="small vh-prose" style={{ margin: "6px 0 0" }} dangerouslySetInnerHTML={{ __html: mdToHtml(myReplies[r.id] ?? "") }} />
                      </div>
                    ) : (
                      <form action={respondToReview} className="vh-field" style={{ marginTop: 8 }}>
                        <input type="hidden" name="rid" value={r.id} />
                        <RichTextEditor
                          compact
                          name="reply"
                          id={`respond-${r.id}`}
                          maxLength={600}
                          minHeight={72}
                          placeholder="Respond factually — no medical claims; the copy-check blocks the send otherwise."
                        />
                        <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" style={{ justifySelf: "start", marginTop: 6 }}>Post response</button>
                      </form>
                    )
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
