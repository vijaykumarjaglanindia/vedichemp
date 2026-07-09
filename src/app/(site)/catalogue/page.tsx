/**
 * VEDIC HEMP — CATALOGUE
 *
 * Product list is always built from `classProducts(permittedClasses({hasRx:false}))`
 * so MED_CANNABIS is structurally absent for an anonymous/no-Rx visitor — even a
 * crafted `?class=MED_CANNABIS` query string cannot surface it, because the class
 * filter only accepts values already inside the permitted set (A1).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MoneyText, ComplianceBadge, EmptyState, Banner } from "@/components/ui";
import { permittedClasses, CLASS_META } from "@/lib/compliance";
import { classProducts } from "@/lib/sample";
import { ComplianceClass } from "@prisma/client";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Hemp food, Ayurveda and CBD wellness products from verified, licensed sellers.",
};

interface CatalogueSearchParams {
  class?: string;
  price?: string;
  lab?: string;
  q?: string;
}

const PRICE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any price" },
  { value: "500", label: "Under ₹500" },
  { value: "1000", label: "Under ₹1,000" },
  { value: "2000", label: "Under ₹2,000" },
];

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>;
}) {
  const sp = await searchParams;
  const permitted = permittedClasses({ hasRx: false });

  let products = classProducts(permitted);

  const activeClass =
    sp.class && (permitted as string[]).includes(sp.class) ? (sp.class as ComplianceClass) : undefined;
  if (activeClass) {
    products = products.filter((p) => p.cls === activeClass);
  }

  const q = sp.q?.trim().toLowerCase();
  if (q) {
    products = products.filter((p) => p.title.toLowerCase().includes(q));
  }

  const maxPriceRupees = sp.price ? Number(sp.price) : undefined;
  if (maxPriceRupees !== undefined && !Number.isNaN(maxPriceRupees) && maxPriceRupees > 0) {
    products = products.filter((p) => p.pricePaise <= maxPriceRupees * 100);
  }

  const labOnly = sp.lab === "1";
  if (labOnly) {
    products = products.filter((p) => p.labVerified);
  }

  return (
    <div className="vh-container" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="vh-page-head">
        <h1>Catalogue</h1>
        <Banner severity="info">
          Products you&apos;re eligible to see are shown here; prescription-only items require
          sign-in with a verified prescription and never appear in public search or browsing.
        </Banner>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "start" }}>
        {/* ── Filter sidebar ─────────────────────────────── */}
        <aside className="vh-card" aria-label="Filters">
          <form action="/catalogue" method="GET" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {q && <input type="hidden" name="q" value={q} />}

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", marginBottom: 8, padding: 0 }}>
                Category
              </legend>
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
              <legend className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", marginBottom: 8, padding: 0 }}>
                Price
              </legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PRICE_OPTIONS.map((opt) => (
                  <label key={opt.value || "any"} className="small vh-row" style={{ gap: 6 }}>
                    <input
                      type="radio"
                      name="price"
                      value={opt.value}
                      defaultChecked={(sp.price ?? "") === opt.value}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", marginBottom: 8, padding: 0 }}>
                Compliance
              </legend>
              <label className="small vh-row" style={{ gap: 6 }}>
                <input type="checkbox" name="lab" value="1" defaultChecked={labOnly} /> Lab-verified (CoA) only
              </label>
            </fieldset>

            <div className="vh-row" style={{ gap: 8 }}>
              <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm">Apply filters</button>
              <Link href="/catalogue" className="vh-btn vh-btn-ghost vh-btn-sm">Clear</Link>
            </div>
          </form>
        </aside>

        {/* ── Product grid ───────────────────────────────── */}
        <div>
          <p className="small muted" style={{ marginBottom: 12 }}>
            {products.length} product{products.length === 1 ? "" : "s"}
            {activeClass ? ` in ${CLASS_META[activeClass].label}` : ""}
          </p>

          {products.length === 0 ? (
            <EmptyState
              icon="🔍"
              headline="No products match these filters"
              sub="Try clearing a filter, or browse the full catalogue."
              cta={{ label: "Clear filters", href: "/catalogue" }}
            />
          ) : (
            <div className="vh-grid cols-3">
              {products.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="vh-product" style={{ color: "inherit" }}>
                  <div className="vh-product-media" aria-hidden>{p.emoji}</div>
                  <div className="vh-product-body">
                    <span className="vh-product-title">{p.title}</span>
                    <ComplianceBadge cls={p.cls} />
                    <div className="vh-row" style={{ gap: 8 }}>
                      <MoneyText paise={p.pricePaise} />
                      {p.mrpPaise > p.pricePaise && (
                        <span className="small muted" style={{ textDecoration: "line-through" }}>
                          <MoneyText paise={p.mrpPaise} />
                        </span>
                      )}
                    </div>
                    <span className="small muted">★ {p.rating.toFixed(1)} · {p.seller}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
