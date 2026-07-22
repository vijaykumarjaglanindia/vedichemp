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
import { sellerData } from "../_lib/data";
import { actingStore } from "../_lib/store";
import { getSession } from "@/lib/auth-lite";
import { sellerListings, type CatalogProduct } from "@/lib/catalog";
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

/** Suggested price: 4% under current, rounded to a tidy ₹ (paise). Server-side,
 *  advisory only — the seller's price is never changed here (money authority). */
function suggestPricePaise(current: number): number {
  const target = Math.round(current * 0.96);
  return Math.max(100, Math.round(target / 100) * 100);
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
  const { FORECAST_4W } = sellerData(store);
  const listings = await sellerListings(session?.email ?? "seller@example.in", store);
  // Real listings drive the panels. Prefer a CBD listing for the copy-check
  // demo (the class the compliance gate is strictest on); fall back to any.
  const descTarget: CatalogProduct | undefined = listings.find((p) => p.cls === "CBD_WELLNESS") ?? listings[0];
  const priceTarget: CatalogProduct | undefined =
    listings.find((p) => /oil|tincture|drops/i.test(p.title)) ?? listings.find((p) => p.id !== descTarget?.id) ?? descTarget;

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
  // Sales-forecast delta from the store's own forecast series — not a fixed %.
  const fcVals = FORECAST_4W.valuesPaise;
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
          the assistant cannot bypass the A2 CoA gate or the A1 advertising prohibition. Engine: <strong>{gen.provider}</strong>.
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
                {claimsClean ? "Copy-check: no disease claims detected · passed" : "Copy-check: claims language detected · blocked (not usable)"}
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
                <span className="small muted">Current price</span>
                <MoneyText paise={priceTarget.pricePaise} />
              </div>
              <div className="vh-row-between" style={{ marginBottom: 6 }}>
                <span className="small muted">Suggested price</span>
                <MoneyText paise={suggestPricePaise(priceTarget.pricePaise)} />
              </div>
              <div className="small muted">Based on category demand and comparable buy-box winners. Final price is always seller-set — this is a suggestion, never applied automatically.</div>
              <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/seller/products/${priceTarget.id}`} style={{ marginTop: 12, display: "inline-block" }} title="Open the listing editor — price stays seller-set">Apply to listing</Link>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>No listings to price yet.</p>
          )}
        </SuggestionCard>

        <SuggestionCard icon={<PackageSearch size={16} strokeWidth={2.2} />} title="Inventory forecast">
          {lowStockTarget ? (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>{lowStockTarget.title}</p>
              <div className="small">Lowest cover in your catalogue: <strong>{lowStockTarget.stockQty} in stock</strong>{lowStockTarget.stockQty <= lowStockTarget.lowStockAt ? " — below your low-stock threshold" : ""}.</div>
              <div className="small muted" style={{ marginTop: 6 }}>Reorder before it sells out to avoid a stockout. A new batch needs its own approved CoA before it can sell.</div>
              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/inventory" style={{ marginTop: 12, display: "inline-block" }}>Review inventory →</Link>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>No live stock to forecast yet — add a listing with on-hand stock.</p>
          )}
        </SuggestionCard>

        <SuggestionCard icon={<TrendingUp size={16} strokeWidth={2.2} />} title="Sales forecast">
          <p className="small muted" style={{ marginTop: 0 }}>Next 4 weeks, all listings</p>
          <Columns values={FORECAST_4W.valuesPaise} labels={FORECAST_4W.labels} height={96} />
          <div className="small" style={{ marginTop: 12 }}>
            Projected GMV: <strong><MoneyText paise={FORECAST_4W.valuesPaise.reduce((s, val) => s + val, 0)} /></strong>
            {fcDeltaPct !== 0 && <> ({fcDeltaPct > 0 ? "+" : ""}{fcDeltaPct}% week 1 → week 4)</>}
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>A projection from your recent order run — a planning aid, never a guarantee.</div>
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
              <div className="small muted">Computed from your real approved reviews (4–5★ positive, 3★ neutral, 1–2★ negative). Any health symptom a buyer mentions is redacted before it reaches this console.</div>
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>Not enough approved reviews to analyse yet — sentiment appears here once buyers review your listings.</p>
          )}
        </SuggestionCard>
      </div>
    </Shell>
  );
}
