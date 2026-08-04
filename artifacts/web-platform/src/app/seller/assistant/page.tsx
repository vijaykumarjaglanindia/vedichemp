/**
 * VEDIC HEMP — AI SELLER ASSISTANT (§2.4/2.6 adjacent)
 *
 * Every output here is a suggestion, not an action — nothing it writes is
 * treated as authoritative. The description writer is LIVE: it generates copy
 * through src/lib/ai.ts (aiComplete), which runs every generated string through
 * the SAME claims copy-check a human draft must pass before it can publish. The
 * "copy-check passed" badge is computed by actually scanning the output, not
 * hardcoded — so if a model ever emitted a disease claim, the seam falls back
 * to a compliant draft and the badge would still reflect the truth.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles, PenLine, BadgeIndianRupee, PackageSearch, TrendingUp, ShieldCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, MoneyText } from "@/components/ui";
import { Columns } from "@/components/ui/charts";
import { actingStore } from "../_lib/store";
import { getSession } from "@/lib/auth-lite";
import { readLiveProducts, sellerListings, type CatalogProduct } from "@/lib/catalog";
import { sellerReport } from "@/lib/analytics";
import { aiComplete, draftListingDescription } from "@/lib/ai";
import { CLAIMS_LANGUAGE } from "@/lib/claims";

export const metadata: Metadata = { title: "AI Assistant" };
export const dynamic = "force-dynamic";

function SuggestionCard({
  icon, title, children,
}: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card>
      <div className="vh-row" style={{ gap: 10, marginBottom: 10 }}>
        <span aria-hidden style={{ display: "inline-flex", padding: 8, borderRadius: 10, background: "var(--vh-green-100)", color: "var(--vh-green-700)" }}>
          {icon}
        </span>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div className="small muted vh-row" style={{ gap: 4 }}>
            <Sparkles size={12} strokeWidth={2.2} aria-hidden /> AI suggestion — review before applying
          </div>
        </div>
      </div>
      {children}
    </Card>
  );
}

/** Median of a list of paise figures (integer in, integer out). */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

/**
 * Projected sales for the next four weeks, from this store's own last four
 * weeks of orders. A plain trend: the average of the observed weeks, nudged by
 * the week-on-week change, floored at zero. It is a planning aid — never a
 * promise — and it is empty when there is no order history to project from.
 */
function projectWeeks(dailyPaise: number[]): { valuesPaise: number[]; labels: string[]; observedPaise: number } {
  const weeks: number[] = [];
  for (let i = 0; i < dailyPaise.length; i += 7) {
    weeks.push(dailyPaise.slice(i, i + 7).reduce((n, v) => n + v, 0));
  }
  const observedPaise = weeks.reduce((n, v) => n + v, 0);
  if (observedPaise === 0) return { valuesPaise: [], labels: [], observedPaise: 0 };
  const avg = observedPaise / weeks.length;
  const first = weeks[0] ?? 0;
  const last = weeks[weeks.length - 1] ?? 0;
  // Week-on-week drift, damped and capped so a single quiet week can't project
  // the store to zero (or a single spike to the moon).
  const drift = first > 0 ? Math.max(-0.15, Math.min(0.15, (last - first) / first / weeks.length)) : 0;
  const valuesPaise = [1, 2, 3, 4].map((n) => Math.max(0, Math.round(avg * (1 + drift * n))));
  return { valuesPaise, labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"], observedPaise };
}

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const draftIndex = v === "2" ? 1 : 0;

  const session = await getSession();
  const store = await actingStore();
  const listings = await sellerListings(session?.email ?? "", store);
  // Real listings drive the panels. Prefer a CBD listing for the copy-check
  // demo (the class the compliance gate is strictest on); fall back to any.
  const descTarget: CatalogProduct | undefined = listings.find((p) => p.cls === "CBD_WELLNESS") ?? listings[0];
  const priceTarget: CatalogProduct | undefined =
    listings.find((p) => /oil|tincture|drops/i.test(p.title)) ?? listings.find((p) => p.id !== descTarget?.id) ?? descTarget;

  // Pricing comparable: what other sellers actually charge for a live listing in
  // the same compliance class. Real marketplace data, not a formula dressed up
  // as market research — and when there is nothing to compare against, the panel
  // says so instead of inventing a number.
  const marketplace = priceTarget ? await readLiveProducts() : [];
  const comparables = priceTarget
    ? marketplace.filter((p) => p.cls === priceTarget.cls && p.seller !== store).map((p) => p.pricePaise)
    : [];
  const comparableMedian = median(comparables);

  // Generate the description through the AI seam. With no API key this returns
  // the deterministic, claims-free fallback; with a key it's the model's output
  // AFTER the seam's claims gate. Either way the text below is claims-safe.
  const gen = descTarget
    ? await aiComplete(
        `Write a compliant, composition-and-traditional-use-only marketplace description (2–3 sentences) for "${descTarget.title}"${descTarget.cls === "CBD_WELLNESS" ? " (a CBD wellness product)" : ""}. Do not make any disease, cure, treatment or medical-benefit claim.`,
        () => draftListingDescription(descTarget, draftIndex),
      )
    : { text: "", provider: "rules-engine" };
  // Live copy-check: scan the ACTUAL output, don't assert a hardcoded "passed".
  const claimsClean = !!gen.text && !CLAIMS_LANGUAGE.test(gen.text);

  // Inventory forecast — the store's own LIVE listing closest to stockout.
  const lowStockTarget = listings
    .filter((p) => p.status === "LIVE" && p.stockQty > 0)
    .sort((a, b) => a.stockQty - b.stockQty)[0];
  // Sales forecast projected from this store's own last four weeks of orders.
  const forecast = projectWeeks((await sellerReport(store, 28)).series.map((d) => d.paise));
  const fcVals = forecast.valuesPaise;
  const fcFirst = fcVals[0] ?? 0;
  const fcLast = fcVals[fcVals.length - 1] ?? 0;
  const fcDeltaPct = fcFirst > 0 ? Math.round(((fcLast - fcFirst) / fcFirst) * 100) : 0;
  // SEO keywords derived from the seller's own product title (claims-free by
  // construction — plain product words only).
  const seoKeywords = descTarget
    ? [...new Set(descTarget.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2))].slice(0, 6)
    : [];
  // Review analyzer — real sentiment from THIS store's APPROVED reviews.
  const { reviewsForSlugs } = await import("@/lib/reviews");
  const storeReviews = await reviewsForSlugs(listings.map((p) => p.slug), { status: "APPROVED" });
  const rvTotal = storeReviews.length;
  const rvPct = (n: number) => (rvTotal ? Math.round((n / rvTotal) * 100) : 0);
  const rvPos = rvPct(storeReviews.filter((r) => r.rating >= 4).length);
  const rvNeu = rvPct(storeReviews.filter((r) => r.rating === 3).length);
  const rvNeg = rvPct(storeReviews.filter((r) => r.rating <= 2).length);

  return (
    <Shell active="/seller/assistant" breadcrumb={["Seller Central", "AI Assistant"]} title="AI Seller Assistant">
      {/* Disclaimer — outputs pass compliance copy-check */}
      <div className="vh-row" role="status" style={{ alignItems: "flex-start", gap: 10, border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-info)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: "color-mix(in srgb, var(--vh-info-bg) 45%, var(--vh-surface))", marginBottom: "var(--sp-4)" }}>
        <ShieldCheck size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-info)", marginTop: 2, flexShrink: 0 }} />
        <div className="small">
          <strong>Suggestions, not decisions.</strong> Every panel below produces a suggestion for you to review and
          edit. Generated copy for regulated classes still passes the compliance copy-check before it can publish —
          the assistant can't get around the lab-report requirement or the advertising ban on Medical Cannabis. Engine: <strong>{gen.provider}</strong>.
        </div>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <SuggestionCard icon={<PenLine size={16} strokeWidth={2.2} />} title="Description writer">
          {descTarget ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>Draft for: {descTarget.title}</p>
              <div style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: 12, fontSize: "0.88rem", background: "var(--vh-bg)" }}>
                &ldquo;{gen.text}&rdquo;
              </div>
              <div className="small" style={{ marginTop: 8, color: claimsClean ? "var(--vh-ok)" : "var(--vh-danger)", fontWeight: 600 }}>
                {claimsClean ? "Claims check: no disease claims found · passed" : "Claims check: claims wording found · blocked (can't be used)"}
              </div>
              <div className="vh-row" style={{ gap: 8, marginTop: 12 }}>
                <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/seller/products/${descTarget.id}`} title="Open the listing editor to paste and save this draft">Use this draft</Link>
                <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={draftIndex === 0 ? "/seller/assistant?v=2" : "/seller/assistant"}>Regenerate</Link>
              </div>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>Add a listing to draft a description for it.</p>
          )}
        </SuggestionCard>

        <SuggestionCard icon={<BadgeIndianRupee size={16} strokeWidth={2.2} />} title="Pricing suggestion">
          {priceTarget ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>{priceTarget.title}</p>
              <div className="vh-row-between" style={{ marginBottom: 6 }}>
                <span className="small muted">Your price</span>
                <MoneyText paise={priceTarget.pricePaise} />
              </div>
              {comparables.length > 0 ? (
                <>
                  <div className="vh-row-between" style={{ marginBottom: 6 }}>
                    <span className="small muted">Median across {comparables.length} other live {priceTarget.cls.replace(/_/g, " ").toLowerCase()} listing{comparables.length === 1 ? "" : "s"}</span>
                    <MoneyText paise={comparableMedian} />
                  </div>
                  <div className="small">
                    {priceTarget.pricePaise > comparableMedian
                      ? <>You are <strong>{Math.round(((priceTarget.pricePaise - comparableMedian) / comparableMedian) * 100)}% above</strong> the middle of the market.</>
                      : priceTarget.pricePaise < comparableMedian
                        ? <>You are <strong>{Math.round(((comparableMedian - priceTarget.pricePaise) / comparableMedian) * 100)}% below</strong> the middle of the market.</>
                        : <>You are priced at the middle of the market.</>}
                  </div>
                  <div className="small muted" style={{ marginTop: 6 }}>
                    Measured from live listings in the same compliance class, excluding your own. It says where you
                    sit, not what to charge — the price is always yours to set.
                  </div>
                </>
              ) : (
                <div className="small muted">
                  No other live {priceTarget.cls.replace(/_/g, " ").toLowerCase()} listings to compare against yet, so
                  there is no market position to report.
                </div>
              )}
              <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/seller/products/${priceTarget.id}`} style={{ marginTop: 12, display: "inline-block" }} title="Open the listing editor — price stays seller-set">Edit this listing</Link>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>No listings to price yet.</p>
          )}
        </SuggestionCard>

        <SuggestionCard icon={<PackageSearch size={16} strokeWidth={2.2} />} title="Inventory forecast">
          {lowStockTarget ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>{lowStockTarget.title}</p>
              <div className="small">Lowest stock in your catalogue: <strong>{lowStockTarget.stockQty} in stock</strong>{lowStockTarget.stockQty <= lowStockTarget.lowStockAt ? " — below your low-stock threshold" : ""}.</div>
              <div className="small muted" style={{ marginTop: 6 }}>Reorder before it sells out to avoid a stockout. A new batch needs its own approved CoA before it can sell.</div>
              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/inventory" style={{ marginTop: 12, display: "inline-block" }}>Review inventory →</Link>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>No live stock to forecast yet — add a listing with on-hand stock.</p>
          )}
        </SuggestionCard>

        <SuggestionCard icon={<TrendingUp size={16} strokeWidth={2.2} />} title="Sales forecast">
          {fcVals.length > 0 ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>Next 4 weeks, all listings</p>
              <Columns values={fcVals} labels={forecast.labels} height={96} />
              <div className="small" style={{ marginTop: 12 }}>
                Projected: <strong><MoneyText paise={fcVals.reduce((s, val) => s + val, 0)} /></strong>
                {fcDeltaPct !== 0 && <> ({fcDeltaPct > 0 ? "+" : ""}{fcDeltaPct}% week 1 → week 4)</>}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                Projected from the <MoneyText paise={forecast.observedPaise} /> of orders you actually took in the
                last 28 days — a planning aid, never a guarantee.
              </div>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              No orders in the last 28 days, so there is nothing to project from. A forecast appears here once your
              listings start selling.
            </p>
          )}
        </SuggestionCard>
        <SuggestionCard icon={<PenLine size={16} strokeWidth={2.2} />} title="SEO & keywords">
          {descTarget ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>{descTarget.title}</p>
              <div className="vh-row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {seoKeywords.map((k) => (
                  <span key={k} className="vh-pill vh-pill-neutral">{k}</span>
                ))}
              </div>
              <div className="small muted">Suggested meta title: &ldquo;{descTarget.title} — batch lab report linked · {store}&rdquo;</div>
              <div className="small" style={{ marginTop: 8, color: "var(--vh-ok)", fontWeight: 600 }}>Keywords are plain product words — no claims language.</div>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>Add a listing to get keyword suggestions.</p>
          )}
        </SuggestionCard>

        <SuggestionCard icon={<TrendingUp size={16} strokeWidth={2.2} />} title="Review analyzer">
          {rvTotal > 0 ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>Across {rvTotal} approved review{rvTotal === 1 ? "" : "s"} on your listings</p>
              <div className="vh-row-between" style={{ marginBottom: 6 }}>
                <span className="small muted">Sentiment (by rating)</span>
                <span className="small"><strong>{rvPos}% positive</strong> · {rvNeu}% neutral · {rvNeg}% negative</span>
              </div>
              <div className="small muted">Computed from your real approved reviews (4–5★ positive, 3★ neutral, 1–2★ negative). Any health symptom a buyer mentions is removed before it reaches you.</div>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>Not enough approved reviews to analyse yet — sentiment appears here once buyers review your listings.</p>
          )}
        </SuggestionCard>
      </div>
    </Shell>
  );
}
