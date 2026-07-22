/**
 * VEDIC HEMP — SELLER REVIEWS
 *
 * Every review on this store's products: approved ones the seller can reply to
 * publicly (copy-checked), and pending ones shown read-only (they go live only
 * after admin moderation). Ratings are computed from approved reviews — the
 * seller can respond to feedback but can never change the score.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Star } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { sellerListings } from "@/lib/catalog";
import { getSession } from "@/lib/auth-lite";
import { reviewsForSlugs } from "@/lib/reviews";
import { storeReviewsBySlug } from "@/lib/store-reviews";
import { replySellerReview, replyStoreReviewAction } from "../actions";
import { actingStore } from "../_lib/store";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";


function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5`} style={{ color: "var(--vh-accent)", whiteSpace: "nowrap" }}>
      {"★".repeat(n)}<span style={{ color: "var(--vh-line-strong)" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

const STORE_SLUG = "vedic-botanicals";

export default async function SellerReviewsPage({ searchParams }: { searchParams: Promise<{ replied?: string; err?: string; sreplied?: string; serr?: string }> }) {
  const STORE = await actingStore();
  const { replied, err, sreplied, serr } = await searchParams;
  const session = await getSession();
  const listings = await sellerListings(session?.email ?? "seller@example.in", STORE);
  const slugs = listings.map((p) => p.slug);
  const approved = await reviewsForSlugs(slugs, { status: "APPROVED" });
  const pending = await reviewsForSlugs(slugs, { status: "PENDING" });
  const storeApproved = await storeReviewsBySlug(STORE_SLUG, { status: "APPROVED" });
  const storePending = await storeReviewsBySlug(STORE_SLUG, { status: "PENDING" });

  return (
    <Shell active="/seller/reviews" breadcrumb={["Seller Central", "Reviews"]} title="Reviews"
      actions={<StatusPill tone="info">{approved.length} live · {pending.length} pending</StatusPill>}
    >
      {replied && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Reply posted">Your reply is public on the product page. Thanks for closing the loop with the buyer.</Banner></div>}
      {err === "claims" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Reply blocked">Replies can't carry medical claims (cure / treat / prevent). Describe the product or the fix instead.</Banner></div>}
      {err === "short" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Reply too short">Write between 5 and 500 characters.</Banner></div>}

      <Card title={<span className="vh-row" style={{ gap: 8 }}><MessagesSquare size={16} strokeWidth={2.2} aria-hidden /> Published reviews</span>} pad0>
        {approved.length === 0 ? (
          <div style={{ padding: 12 }}><EmptyState icon="⭐" headline="No published reviews yet" sub="Approved buyer reviews for your products show here — reply to them publicly." /></div>
        ) : (
          <div>
            {approved.map((r) => (
              <div key={r.id} id={`r-${r.id}`} style={{ borderTop: "1px solid var(--vh-line)", padding: "14px 16px" }}>
                <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <Stars n={r.rating} />
                    <strong style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                    {r.verified && <StatusPill tone="ok">Verified purchase</StatusPill>}
                    <Link className="small" href={`/products/${r.productSlug}`} style={{ fontWeight: 700 }}>{r.productSlug}</Link>
                  </span>
                  <span className="small muted tabular">{r.createdAt}{r.helpful > 0 ? ` · ${r.helpful} found helpful` : ""}</span>
                </div>
                {r.title && <div style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{r.title}</div>}
                <p className="small" style={{ margin: "4px 0 8px" }}>{r.body}</p>
                {r.sellerReply ? (
                  <div style={{ borderLeft: "3px solid var(--vh-accent)", paddingLeft: 12, background: "var(--vh-green-50)", borderRadius: "var(--vh-radius-sm)", padding: "8px 12px" }}>
                    <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)" }}>Your reply</div>
                    <p className="small muted" style={{ margin: "2px 0 0" }}>{r.sellerReply}</p>
                  </div>
                ) : (
                  <form action={replySellerReview} className="vh-row" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input className="vh-input" name="reply" placeholder="Reply publicly — thank them or offer a fix" style={{ flex: "1 1 320px" }} aria-label={`Reply to ${r.author}`} />
                    <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Post reply</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Store reviews (about the store, not a product) ── */}
      <div id="store-reviews" style={{ marginTop: "var(--sp-4)", scrollMarginTop: 80 }}>
        {sreplied && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Reply posted">Your reply is public on your storefront.</Banner></div>}
        {serr === "claims" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Reply blocked">Replies can't carry medical claims. Describe your service or the fix instead.</Banner></div>}
        {serr === "short" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Reply too short">Write between 5 and 500 characters.</Banner></div>}
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Star size={16} strokeWidth={2.2} aria-hidden /> Store reviews</span>}
          action={<span className="small muted">{storeApproved.length} live · {storePending.length} pending</span>} pad0
        >
          {storeApproved.length === 0 && storePending.length === 0 ? (
            <div style={{ padding: 12 }}><EmptyState icon="🏪" headline="No store reviews yet" sub="Buyers can review your store's packaging, dispatch and service from your storefront." /></div>
          ) : (
            <div>
              {storeApproved.map((r) => (
                <div key={r.id} id={`sr-${r.id}`} style={{ borderTop: "1px solid var(--vh-line)", padding: "14px 16px" }}>
                  <div className="vh-row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                    <Stars n={r.rating} />
                    <strong style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                    {r.verified && <StatusPill tone="ok">Verified buyer</StatusPill>}
                    <span className="small muted tabular">{r.createdAt}</span>
                  </div>
                  <p className="small" style={{ margin: "4px 0 8px" }}>{r.body}</p>
                  {r.sellerReply ? (
                    <div style={{ borderLeft: "3px solid var(--vh-accent)", background: "var(--vh-green-50)", borderRadius: "var(--vh-radius-sm)", padding: "8px 12px" }}>
                      <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)" }}>Your reply</div>
                      <p className="small muted" style={{ margin: "2px 0 0" }}>{r.sellerReply}</p>
                    </div>
                  ) : (
                    <form action={replyStoreReviewAction} className="vh-row" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input className="vh-input" name="reply" placeholder="Reply publicly — thank them or offer a fix" style={{ flex: "1 1 320px" }} aria-label={`Reply to ${r.author}`} />
                      <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Post reply</button>
                    </form>
                  )}
                </div>
              ))}
              {storePending.map((r) => (
                <div key={r.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "12px 16px" }}>
                  <div className="vh-row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                    <Stars n={r.rating} />
                    <strong className="small" style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                    <StatusPill tone="warn">Pending</StatusPill>
                  </div>
                  <p className="small muted" style={{ margin: 0 }}>{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {pending.length > 0 && (
        <div style={{ marginTop: "var(--sp-4)" }}>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Star size={16} strokeWidth={2.2} aria-hidden /> Awaiting moderation</span>} action={<span className="small muted">Live once our team checks them</span>} pad0>
            <div>
              {pending.map((r) => (
                <div key={r.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "12px 16px" }}>
                  <div className="vh-row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                    <Stars n={r.rating} />
                    <strong className="small" style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                    <StatusPill tone="warn">Pending</StatusPill>
                    <span className="small muted">{r.productSlug}</span>
                  </div>
                  <p className="small muted" style={{ margin: 0 }}>{r.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Shell>
  );
}
