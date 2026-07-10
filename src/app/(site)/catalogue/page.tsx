/**
 * VEDIC HEMP — CATALOGUE (V2)
 *
 * Product list is always built from the permitted-class universe, so
 * MED_CANNABIS is structurally absent for an anonymous/no-Rx visitor — even a
 * crafted `?class=MED_CANNABIS` query string cannot surface it, because the
 * class filter only accepts values already inside the permitted set (A1).
 *
 * Sorting and the grid/list toggle are plain links driven by searchParams —
 * the server renders the result; no client JS decides what is visible.
 * The single sponsored tile renders through AdSlot (labelled, A1-guarded).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Heart, SlidersHorizontal } from "lucide-react";
import { ComplianceBadge, EmptyState, MoneyText, Rating, SectionHead } from "@/components/ui";
import { AdSlot } from "@/components/ui/ads";
import { CLASS_META, permittedClasses } from "@/lib/compliance";
import { classProducts, type SampleProduct } from "@/lib/sample";
import { ComplianceClass } from "@prisma/client";
import { discountPct, PUBLIC_PRODUCTS, RECENTLY_VIEWED } from "../_lib/data";
import { ProductCard, reviewCountFor } from "../_lib/ProductCard";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Hemp food, Ayurveda and CBD wellness products from verified, licensed sellers.",
};

interface CatalogueSearchParams {
  class?: string;
  price?: string;
  lab?: string;
  q?: string;
  sort?: string;
  view?: string;
}

const PRICE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any price" },
  { value: "500", label: "Under ₹500" },
  { value: "1000", label: "Under ₹1,000" },
  { value: "2000", label: "Under ₹2,000" },
];

const SORTS: { value: string; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "new", label: "New" },
];

/** Rebuild the query string with one key overridden (link-driven UI state). */
function withParam(sp: CatalogueSearchParams, key: keyof CatalogueSearchParams, value: string): string {
  const next = new URLSearchParams();
  for (const k of ["class", "price", "lab", "q", "sort", "view"] as const) {
    const v = k === key ? value : sp[k];
    if (v) next.set(k, v);
  }
  const s = next.toString();
  return s ? `/catalogue?${s}` : "/catalogue";
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>;
}) {
  const sp = await searchParams;
  const permitted = permittedClasses({ hasRx: false });

  let products = classProducts(permitted);

  // A1 guard: only classes already inside the permitted set are accepted.
  const activeClass =
    sp.class && (permitted as string[]).includes(sp.class) ? (sp.class as ComplianceClass) : undefined;
  if (activeClass) products = products.filter((p) => p.cls === activeClass);

  const q = sp.q?.trim().toLowerCase();
  if (q) products = products.filter((p) => p.title.toLowerCase().includes(q));

  const maxPriceRupees = sp.price ? Number(sp.price) : undefined;
  if (maxPriceRupees !== undefined && !Number.isNaN(maxPriceRupees) && maxPriceRupees > 0) {
    products = products.filter((p) => p.pricePaise <= maxPriceRupees * 100);
  }

  const labOnly = sp.lab === "1";
  if (labOnly) products = products.filter((p) => p.labVerified);

  const sort = SORTS.some((s) => s.value === sp.sort) ? (sp.sort as string) : "popular";
  products = [...products].sort((a, b) => {
    switch (sort) {
      case "price_asc": return a.pricePaise - b.pricePaise;
      case "price_desc": return b.pricePaise - a.pricePaise;
      case "new": return b.id.localeCompare(a.id, undefined, { numeric: true });
      default: return b.rating - a.rating;
    }
  });

  const view = sp.view === "list" ? "list" : "grid";

  // ONE sponsored tile — always via AdSlot (labelled; throws on MED_CANNABIS).
  const sponsored = PUBLIC_PRODUCTS.find((p) => p.cls === "CBD_WELLNESS");

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
      <div className="vh-page-head">
        <h1 className="vh-display">Catalogue</h1>
        <p className="small muted" style={{ maxWidth: 640, margin: "6px 0 0" }}>
          Products you&apos;re eligible to see are shown here. Prescription-only items require
          sign-in with a verified prescription and never appear in public search or browsing.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "250px minmax(0, 1fr)", gap: "var(--sp-4)", alignItems: "start" }}>
        {/* ── Sticky filter sidebar ───────────────────────── */}
        <aside className="vh-card" aria-label="Filters" style={{ position: "sticky", top: 90 }}>
          <div className="vh-row" style={{ gap: 8, marginBottom: "var(--sp-3)" }}>
            <SlidersHorizontal size={15} strokeWidth={2.2} aria-hidden />
            <strong style={{ color: "var(--vh-ink)", fontSize: ".9rem" }}>Filters</strong>
          </div>
          <form action="/catalogue" method="GET" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            {q && <input type="hidden" name="q" value={q} />}
            {sp.sort && <input type="hidden" name="sort" value={sort} />}
            {sp.view && <input type="hidden" name="view" value={view} />}

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend className="vh-label" style={{ marginBottom: 8, padding: 0 }}>Category</legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="small vh-row" style={{ gap: 6 }}>
                  <input type="radio" name="class" value="" defaultChecked={!activeClass} /> All categories
                </label>
                {permitted.map((cls) => (
                  <label key={cls} className="small vh-row" style={{ gap: 6 }}>
                    <input type="radio" name="class" value={cls} defaultChecked={activeClass === cls} />
                    {CLASS_META[cls].short}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend className="vh-label" style={{ marginBottom: 8, padding: 0 }}>Price</legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PRICE_OPTIONS.map((opt) => (
                  <label key={opt.value || "any"} className="small vh-row" style={{ gap: 6 }}>
                    <input type="radio" name="price" value={opt.value} defaultChecked={(sp.price ?? "") === opt.value} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend className="vh-label" style={{ marginBottom: 8, padding: 0 }}>Compliance</legend>
              <label className="small vh-row" style={{ gap: 6 }}>
                <input type="checkbox" name="lab" value="1" defaultChecked={labOnly} /> Lab-verified (CoA) only
              </label>
            </fieldset>

            <div className="vh-row" style={{ gap: 8 }}>
              <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm">Apply</button>
              <Link href="/catalogue" className="vh-btn vh-btn-ghost vh-btn-sm">Clear</Link>
            </div>
          </form>
        </aside>

        {/* ── Results ─────────────────────────────────────── */}
        <div>
          {/* Toolbar */}
          <div className="vh-row" style={{ flexWrap: "wrap", gap: 12, marginBottom: "var(--sp-3)" }}>
            <p className="small muted" style={{ margin: 0 }}>
              <strong style={{ color: "var(--vh-ink)" }}>{products.length}</strong> product{products.length === 1 ? "" : "s"}
              {activeClass ? ` in ${CLASS_META[activeClass].label}` : ""}
              {q ? ` for “${q}”` : ""}
            </p>
            <span className="vh-spacer" />
            <nav className="vh-seg" aria-label="Sort products">
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={withParam(sp, "sort", s.value === "popular" ? "" : s.value)}
                  className={sort === s.value ? "on" : ""}
                  aria-current={sort === s.value ? "true" : undefined}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
            <nav className="vh-seg" aria-label="Layout">
              <Link href={withParam(sp, "view", "")} className={view === "grid" ? "on" : ""} aria-current={view === "grid" ? "true" : undefined}>
                Grid
              </Link>
              <Link href={withParam(sp, "view", "list")} className={view === "list" ? "on" : ""} aria-current={view === "list" ? "true" : undefined}>
                List
              </Link>
            </nav>
          </div>

          {products.length === 0 ? (
            <EmptyState
              icon="🔍"
              headline="No products match these filters"
              sub="Try clearing a filter, or browse the full catalogue."
              cta={{ label: "Clear filters", href: "/catalogue" }}
            />
          ) : view === "list" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              {products.map((p) => (
                <ListRow key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="vh-grid cols-3">
              {products.slice(0, 2).map((p) => (
                <ProductCard key={p.id} p={p} actions />
              ))}

              {/* ONE sponsored tile — labelled, A1-guarded by AdSlot */}
              {sponsored && (
                <AdSlot cls={sponsored.cls} placement="listing-sponsored" unstyled>
                  <ProductCard p={sponsored} actions />
                </AdSlot>
              )}

              {products.slice(2).map((p) => (
                <ProductCard key={p.id} p={p} actions />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recently viewed ───────────────────────────────── */}
      {RECENTLY_VIEWED.length > 0 && (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <SectionHead eyebrow="Pick up where you left off" title="Recently viewed" />
          <div className="vh-scroller" style={{ gridAutoColumns: "minmax(220px, 250px)" }}>
            {RECENTLY_VIEWED.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** List-view row: media left, details centre, price + actions right. */
function ListRow({ p }: { p: SampleProduct }) {
  const off = discountPct(p);
  return (
    <article className="vh-card vh-row" style={{ gap: "var(--sp-3)", alignItems: "stretch" }}>
      <Link href={`/products/${p.slug}`} aria-hidden tabIndex={-1} style={{ flexShrink: 0 }}>
        <span className="vh-product-media" style={{ width: 104, height: 104, fontSize: "2.2rem", borderRadius: "var(--vh-radius-sm)", display: "flex" }} aria-hidden>
          {p.emoji}
        </span>
      </Link>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <Link href={`/products/${p.slug}`} style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{p.title}</Link>
        <ComplianceBadge cls={p.cls} />
        <Rating value={p.rating} count={reviewCountFor(p)} />
        <span className="small muted">{p.seller}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, justifyContent: "center" }}>
        <div className="vh-row" style={{ gap: 8, alignItems: "baseline" }}>
          <strong style={{ color: "var(--vh-ink)", fontSize: "1.05rem" }}><MoneyText paise={p.pricePaise} /></strong>
          {p.mrpPaise > p.pricePaise && (
            <span className="small muted" style={{ textDecoration: "line-through" }}>
              <MoneyText paise={p.mrpPaise} />
            </span>
          )}
          {off > 0 && <span className="vh-pill vh-pill-ok">{off}% off</span>}
        </div>
        <div className="vh-row" style={{ gap: 8 }}>
          <button type="button" className="vh-iconbtn" aria-label={`Add ${p.title} to wishlist`}>
            <Heart size={15} strokeWidth={2.2} aria-hidden />
          </button>
          <button type="button" className="vh-btn vh-btn-primary vh-btn-sm">Add to cart</button>
          <Link href={`/products/${p.slug}`} className="vh-btn vh-btn-ghost vh-btn-sm">Quick view</Link>
        </div>
      </div>
    </article>
  );
}
