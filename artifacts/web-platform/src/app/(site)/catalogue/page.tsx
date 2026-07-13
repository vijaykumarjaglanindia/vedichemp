/**
 * VEDIC HEMP — CATALOGUE V3 (CRO)
 *
 * Fully functional, server-rendered faceted listing. Every filter is a GET
 * parameter, so results are shareable, crawlable and work with JS disabled:
 *   ?q=&class=&max=&min=&lab=1&rating=4&sort=&view=list
 * (the generative search box emits exactly this contract).
 *
 * A1: the class facet is validated against the viewer's permitted classes —
 * a crafted ?class=MED_CANNABIS URL cannot leak the medical catalogue, and
 * the facet list itself is built from permitted classes only.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceClass } from "@prisma/client";
import {
  ArrowDownWideNarrow, ArrowUpNarrowWide, BadgePercent, Check, FlaskConical,
  Heart, LayoutGrid, Rows3, SearchX, ShoppingCart, Sparkles, Star,
} from "lucide-react";
import { ComplianceBadge, MoneyText, Rating } from "@/components/ui";
import { AdBanner, AdSlot } from "@/components/ui/ads";
import { CLASS_META, permittedClasses } from "@/lib/compliance";
import { classProducts, PRODUCTS, type SampleProduct } from "@/lib/sample";
import { addToCart } from "../cart/actions";

export const metadata: Metadata = {
  title: "Shop the catalogue",
  description: "Hemp nutrition, CBD wellness and Ayurveda listed by independent licensed sellers. Filter by category, price, rating and lab-report availability.",
  alternates: { canonical: "/catalogue" },
};

interface Params {
  q?: string; class?: string; max?: string; min?: string; lab?: string;
  rating?: string; sort?: string; view?: string;
}

const SORTS = [
  { key: "popular", label: "Popular" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "discount", label: "% Off" },
] as const;

const PRICE_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ₹500", max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹2,000", min: 1000, max: 2000 },
  { label: "Over ₹2,000", min: 2000 },
];

function discountPct(p: SampleProduct): number {
  return Math.round(((p.mrpPaise - p.pricePaise) / p.mrpPaise) * 100);
}

/** Rebuild the query string with some keys changed/removed. */
function href(params: Params, patch: Record<string, string | null>): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) next.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  return `/catalogue${qs ? `?${qs}` : ""}`;
}

function ProductTile({ p, sponsored }: { p: SampleProduct; sponsored?: boolean }) {
  const pct = discountPct(p);
  return (
    <article className="vh-product" style={sponsored ? { borderColor: "color-mix(in srgb, var(--vh-ad) 35%, transparent)" } : undefined}>
      {pct >= 25 && !sponsored && (
        <span className="flag vh-pill vh-pill-danger" style={{ fontSize: ".66rem" }}><span aria-hidden>■</span>{pct}% off</span>
      )}
      <Link href={`/products/${p.slug}`} className="vh-product-media" aria-hidden tabIndex={-1}>{p.emoji}</Link>
      <div className="vh-product-body">
        <Link href={`/products/${p.slug}`} className="vh-product-title">{p.title}</Link>
        <div className="small muted">{p.seller}</div>
        <Rating value={p.rating} count={Math.round(p.rating * 47)} />
        <div className="vh-row" style={{ gap: 6 }}>
          <MoneyText paise={p.pricePaise} className="vh-product-title" />
          <span className="small muted" style={{ textDecoration: "line-through" }}><MoneyText paise={p.mrpPaise} /></span>
        </div>
        <ComplianceBadge cls={p.cls} />
        <div className="vh-row" style={{ gap: 8, marginTop: "auto", paddingTop: 8 }}>
          <form action={addToCart} style={{ flex: 1, display: "flex" }}>
            <input type="hidden" name="productId" value={p.id} />
            <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm" style={{ flex: 1 }}><ShoppingCart size={14} aria-hidden /> Add to cart</button>
          </form>
          <button className="vh-iconbtn" aria-label={`Add ${p.title} to wishlist`}><Heart size={15} aria-hidden /></button>
        </div>
      </div>
    </article>
  );
}

export default async function CataloguePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const permitted = permittedClasses({ hasRx: false });
  const all = classProducts(permitted);

  // ── Parse + validate filters (server is the authority) ──
  const q = (params.q ?? "").trim().toLowerCase();
  const cls = permitted.includes(params.class as ComplianceClass) ? (params.class as ComplianceClass) : null;
  const max = params.max ? parseInt(params.max, 10) : null;
  const min = params.min ? parseInt(params.min, 10) : null;
  const labOnly = params.lab === "1";
  const minRating = params.rating ? parseFloat(params.rating) : null;
  const sort = SORTS.some((s) => s.key === params.sort) ? params.sort! : "popular";
  const view = params.view === "list" ? "list" : "grid";

  // ── Apply ──
  let results = all.filter((p) => {
    if (cls && p.cls !== cls) return false;
    if (max !== null && !Number.isNaN(max) && p.pricePaise > max * 100) return false;
    if (min !== null && !Number.isNaN(min) && p.pricePaise < min * 100) return false;
    if (labOnly && !p.labVerified) return false;
    if (minRating !== null && p.rating < minRating) return false;
    if (q) {
      const hay = `${p.title} ${p.seller} ${CLASS_META[p.cls].label}`.toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);
      if (!terms.some((t) => hay.includes(t))) return false;
    }
    return true;
  });
  results = [...results].sort((a, b) => {
    if (sort === "price-asc") return a.pricePaise - b.pricePaise;
    if (sort === "price-desc") return b.pricePaise - a.pricePaise;
    if (sort === "discount") return discountPct(b) - discountPct(a);
    return b.rating - a.rating;
  });

  const countFor = (pred: (p: SampleProduct) => boolean) => all.filter(pred).length;

  // ── Applied chips ──
  const chips: { label: string; remove: string }[] = [];
  if (q) chips.push({ label: `“${params.q}”`, remove: href(params, { q: null }) });
  if (cls) chips.push({ label: CLASS_META[cls].short, remove: href(params, { class: null }) });
  if (max !== null || min !== null) {
    chips.push({
      label: `${min !== null ? `₹${min.toLocaleString("en-IN")}` : "₹0"} – ${max !== null ? `₹${max.toLocaleString("en-IN")}` : "any"}`,
      remove: href(params, { max: null, min: null }),
    });
  }
  if (labOnly) chips.push({ label: "Lab report", remove: href(params, { lab: null }) });
  if (minRating !== null) chips.push({ label: `★ ${minRating}+`, remove: href(params, { rating: null }) });

  const sponsored = PRODUCTS.find((p) => p.cls === "CBD_WELLNESS" && p.labVerified);
  const showSponsored = chips.length === 0 && view === "grid" && !!sponsored;
  const recentlyViewed = all.slice(0, 6);

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
      {/* Toolbar */}
      <div className="vh-row-between" style={{ flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>All products</h1>
          <p className="small muted" style={{ margin: "2px 0 0" }}>
            <span className="tabular">{results.length}</span> of <span className="tabular">{all.length}</span> products ·
            prescription-only items require sign-in and never appear here
          </p>
        </div>
        <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
          <nav className="vh-seg" aria-label="Sort by">
            {SORTS.map((s) => (
              <Link key={s.key} href={href(params, { sort: s.key === "popular" ? null : s.key })} className={sort === s.key ? "on" : ""} aria-current={sort === s.key ? "true" : undefined}>
                {s.key === "price-asc" && <ArrowUpNarrowWide size={12} style={{ verticalAlign: -2, marginRight: 3 }} aria-hidden />}
                {s.key === "price-desc" && <ArrowDownWideNarrow size={12} style={{ verticalAlign: -2, marginRight: 3 }} aria-hidden />}
                {s.key === "discount" && <BadgePercent size={12} style={{ verticalAlign: -2, marginRight: 3 }} aria-hidden />}
                {s.label}
              </Link>
            ))}
          </nav>
          <nav className="vh-seg" aria-label="View">
            <Link href={href(params, { view: null })} className={view === "grid" ? "on" : ""} aria-label="Grid view" aria-current={view === "grid" ? "true" : undefined}><LayoutGrid size={14} aria-hidden /></Link>
            <Link href={href(params, { view: "list" })} className={view === "list" ? "on" : ""} aria-label="List view" aria-current={view === "list" ? "true" : undefined}><Rows3 size={14} aria-hidden /></Link>
          </nav>
        </div>
      </div>

      {/* Applied filters */}
      {chips.length > 0 && (
        <div className="vh-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {chips.map((c) => (
            <Link key={c.label} href={c.remove} className="vh-chip-x" aria-label={`Remove filter ${c.label}`}>
              {c.label}<span className="x" aria-hidden>×</span>
            </Link>
          ))}
          <Link href="/catalogue" className="small" style={{ fontWeight: 700 }}>Clear all</Link>
        </div>
      )}

      {/* Sponsored-brand banner (listing-brand-banner) — only on the unfiltered view */}
      {chips.length === 0 && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <AdBanner
            cls="AYURVEDA" placement="listing-brand-banner" brand="Ananda Foods"
            headline="Classical Ayurveda, batch-dated and sealed"
            cta="Visit storefront" href="/store/ananda-foods"
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "230px minmax(0,1fr)", gap: "var(--sp-4)", alignItems: "start" }} className="vhx-catalogue-grid">
        {/* Facets */}
        <aside className="vh-card" style={{ position: "sticky", top: 90, padding: "6px 18px" }} aria-label="Filters">
          <div className="vh-facet">
            <div className="vh-facet-title">Category</div>
            {permitted.map((c) => (
              <Link key={c} href={href(params, { class: cls === c ? null : c })} className={cls === c ? "on" : ""}>
                <span className="box" aria-hidden>{cls === c ? <Check size={11} strokeWidth={3} /> : null}</span>
                {CLASS_META[c].short}
                <span className="cnt tabular">{countFor((p) => p.cls === c)}</span>
              </Link>
            ))}
            {/* MED_CANNABIS deliberately absent — A1: absent, not hidden */}
          </div>

          <div className="vh-facet">
            <div className="vh-facet-title">Price</div>
            {PRICE_BUCKETS.map((b) => {
              const on = min === (b.min ?? null) && max === (b.max ?? null);
              return (
                <Link
                  key={b.label}
                  href={on ? href(params, { min: null, max: null }) : href(params, { min: b.min !== undefined ? String(b.min) : null, max: b.max !== undefined ? String(b.max) : null })}
                  className={on ? "on" : ""}
                >
                  <span className="box" aria-hidden>{on ? <Check size={11} strokeWidth={3} /> : null}</span>
                  {b.label}
                  <span className="cnt tabular">
                    {countFor((p) => (b.max === undefined || p.pricePaise <= b.max * 100) && (b.min === undefined || p.pricePaise >= b.min * 100))}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="vh-facet">
            <div className="vh-facet-title">Rating</div>
            {[4.5, 4].map((r) => {
              const on = minRating === r;
              return (
                <Link key={r} href={href(params, { rating: on ? null : String(r) })} className={on ? "on" : ""}>
                  <span className="box" aria-hidden>{on ? <Check size={11} strokeWidth={3} /> : null}</span>
                  <Star size={12} aria-hidden style={{ color: "var(--vh-saffron)" }} /> {r} &amp; up
                  <span className="cnt tabular">{countFor((p) => p.rating >= r)}</span>
                </Link>
              );
            })}
          </div>

          <div className="vh-facet">
            <div className="vh-facet-title">Assurance</div>
            <Link href={href(params, { lab: labOnly ? null : "1" })} className={labOnly ? "on" : ""}>
              <span className="box" aria-hidden>{labOnly ? <Check size={11} strokeWidth={3} /> : null}</span>
              <FlaskConical size={12} aria-hidden style={{ color: "var(--vh-info)" }} /> Lab report available
              <span className="cnt tabular">{countFor((p) => p.labVerified)}</span>
            </Link>
          </div>
          <div style={{ padding: "14px 0 8px" }}>
            <AdBanner
              cls="HEMP_FOOD" placement="listing-sidebar" brand="Himalayan Hemp Co."
              headline="Protein that fits your routine" cta="Shop" href="/store/himalayan-hemp-co" tall
            />
          </div>
        </aside>

        {/* Results */}
        <div>
          {results.length === 0 ? (
            <div className="vh-card vh-empty">
              <SearchX size={36} aria-hidden style={{ color: "var(--vh-faint)", marginBottom: 10 }} />
              <h3 style={{ marginBottom: 4 }}>No products match these filters</h3>
              <p className="small" style={{ maxWidth: 380, margin: "0 auto 14px" }}>
                Try removing a filter, widening the price range, or searching with different words.
              </p>
              <Link href="/catalogue" className="vh-btn vh-btn-primary vh-btn-sm">Reset all filters</Link>
            </div>
          ) : view === "list" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {results.map((p) => (
                <article key={p.id} className="vh-product-row">
                  <Link href={`/products/${p.slug}`} className="vh-product-media" aria-hidden tabIndex={-1}>{p.emoji}</Link>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/products/${p.slug}`} className="vh-product-title" style={{ display: "block" }}>{p.title}</Link>
                    <div className="small muted" style={{ margin: "2px 0 6px" }}>{p.seller}</div>
                    <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <Rating value={p.rating} count={Math.round(p.rating * 47)} />
                      <ComplianceBadge cls={p.cls} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "grid", gap: 8, justifyItems: "end" }}>
                    <div>
                      <MoneyText paise={p.pricePaise} className="vh-product-title" />{" "}
                      <span className="small muted" style={{ textDecoration: "line-through" }}><MoneyText paise={p.mrpPaise} /></span>{" "}
                      <span className="vh-pill vh-pill-ok" style={{ fontSize: ".68rem" }}><span aria-hidden>●</span>{discountPct(p)}% off</span>
                    </div>
                    <div className="vh-row" style={{ gap: 8 }}>
                      <button className="vh-iconbtn" aria-label={`Add ${p.title} to wishlist`}><Heart size={15} aria-hidden /></button>
                      <form action={addToCart}>
                        <input type="hidden" name="productId" value={p.id} />
                        <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm"><ShoppingCart size={14} aria-hidden /> Add to cart</button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="vh-grid cols-3">
              {results.flatMap((p, i) => {
                const tiles = [];
                if (showSponsored && i === 2 && sponsored) {
                  tiles.push(
                    <AdSlot key="sponsored" cls={sponsored.cls} placement="listing-sponsored" unstyled>
                      <ProductTile p={sponsored} sponsored />
                    </AdSlot>
                  );
                }
                tiles.push(<ProductTile key={p.id} p={p} />);
                return tiles;
              })}
            </div>
          )}

          {/* Recently viewed */}
          {results.length > 0 && (
            <section style={{ marginTop: "var(--sp-6)" }}>
              <div className="vh-row" style={{ gap: 8, marginBottom: 12 }}>
                <Sparkles size={15} aria-hidden style={{ color: "var(--vh-accent)" }} />
                <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Recently viewed</h2>
              </div>
              <div className="vh-scroller" style={{ gridAutoColumns: "170px" }}>
                {recentlyViewed.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="vh-product" style={{ textDecoration: "none" }}>
                    <span className="vh-product-media" style={{ fontSize: "2rem" }} aria-hidden>{p.emoji}</span>
                    <span className="vh-product-body">
                      <span className="vh-product-title" style={{ fontSize: ".8rem" }}>{p.title}</span>
                      <MoneyText paise={p.pricePaise} className="small" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Responsive: facets collapse above results on small screens */}
      <style>{`@media (max-width: 900px){ .vhx-catalogue-grid{ grid-template-columns: 1fr !important; } .vhx-catalogue-grid aside{ position: static !important; } }`}</style>
    </div>
  );
}
