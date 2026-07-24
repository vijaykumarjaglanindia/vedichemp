/**
 * VEDIC HEMP — CUSTOMERS (§2.5 adjacent)
 *
 * Buyer questions, reviews and messages. Health data never appears here —
 * a review or message referencing symptoms/medical use would be redacted
 * before reaching this view (A4 boundary, enforced server-side).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion, Star, Timer } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, Stat, Rating } from "@/components/ui";
import { sellerListings } from "@/lib/catalog";
import { getSession } from "@/lib/auth-lite";
import { questionsForSlugs } from "@/lib/qa";
import { approvedStoreReviews, storeAggregate } from "@/lib/store-reviews";
import { answerProductQuestion } from "../actions";
import { actingStore } from "../_lib/store";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

const STORE_SLUG = "vedic-botanicals";

/** Whole days between two YYYY-MM-DD dates (never negative). */
function daysBetween(from: string, to: string): number {
  return Math.max(0, (Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ answered?: string; qerr?: string }>;
}) {
  const { answered, qerr } = await searchParams;
  const STORE = await actingStore();
  const session = await getSession();
  const slugs = (await sellerListings(session?.email ?? "seller@example.in", STORE)).map((p) => p.slug);
  const liveUnanswered = await questionsForSlugs(slugs, { answered: false });
  const liveAnswered = await questionsForSlugs(slugs, { answered: true });

  // Real response metrics from the Q&A store (no fabricated averages).
  const totalQ = liveUnanswered.length + liveAnswered.length;
  const answerRate = totalQ > 0 ? Math.round((liveAnswered.length / totalQ) * 100) : null;
  const timed = liveAnswered.filter((q) => q.answeredAt);
  const avgDays = timed.length > 0
    ? timed.reduce((n, q) => n + daysBetween(q.createdAt, q.answeredAt as string), 0) / timed.length
    : null;
  const avgLabel = avgDays === null ? "—" : avgDays < 1 ? "Same day" : `${avgDays.toFixed(1)} days`;

  // Real store reviews (moderated buyer reviews of this store).
  const agg = await storeAggregate(STORE_SLUG);
  const recentReviews = (await approvedStoreReviews(STORE_SLUG)).slice(0, 4);
  return (
    <Shell active="/seller/customers" breadcrumb={["Seller Central", "Customers"]} title="Customers">
      {answered && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Answer posted">Your answer is live on the product page for every shopper to see.</Banner>
        </div>
      )}
      {qerr === "claims" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Answer blocked">Answers can't carry medical claims (cure / treat / prevent). It was not published.</Banner></div>}
      {qerr === "short" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Answer too short">Write between 5 and 500 characters.</Banner></div>}

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

      {/* Response metrics — derived from the real Q&A store */}
      <div className="vh-grid cols-3" style={{ marginBottom: "var(--sp-4)" }}>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}>
            <Timer size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} />
            <span className="vh-stat-label">Avg first response</span>
          </div>
          <div className="vh-stat-value tabular">{avgLabel}</div>
          <div className="small muted" style={{ marginTop: 4 }}>
            {timed.length > 0 ? `Across ${timed.length} answered question${timed.length === 1 ? "" : "s"}. Fast replies protect account health.` : "No answered questions yet."}
          </div>
        </Card>
        <Card><Stat label="Answer rate" value={answerRate === null ? "—" : `${answerRate}%`} /></Card>
        <Card><Stat label="Questions to answer" value={liveUnanswered.length} /></Card>
      </div>

      {/* Store reviews — real, moderated; managed on the Reviews console */}
      <Card
        title={<span className="vh-row" style={{ gap: 8 }}><Star size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /> Store reviews</span>}
        action={
          <span className="vh-row small" style={{ gap: 10 }}>
            {agg.count > 0 && <Rating value={agg.avg} count={agg.count} />}
            <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/reviews">Manage reviews</Link>
          </span>
        }
      >
        {recentReviews.length === 0 ? (
          <div className="vh-empty">No store reviews yet. Buyers can review your store after a delivered order.</div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
            {recentReviews.map((r) => (
              <li key={r.id} style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 16 }}>
                <div className="vh-row-between" style={{ marginBottom: 4 }}>
                  <Rating value={r.rating} />
                  {r.verified && <StatusPill tone="ok">Verified buyer</StatusPill>}
                </div>
                <div style={{ fontSize: "0.9rem", marginTop: 4 }}>&ldquo;{r.body}&rdquo;</div>
                <div className="small muted" style={{ marginTop: 2 }}>{r.author} · {r.createdAt}</div>
                {r.sellerReply && (
                  <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: "var(--vh-radius-sm)", background: "var(--vh-bg-subtle)", border: "1px solid var(--vh-line)" }}>
                    <span className="small" style={{ fontWeight: 700 }}>Your reply: </span>
                    <span className="small muted">{r.sellerReply}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          Ratings are computed by the platform — you can reply on the Reviews console but cannot edit or remove a
          review. Reviews mentioning health conditions are removed before they reach you.
        </p>
      </Card>
    </Shell>
  );
}
