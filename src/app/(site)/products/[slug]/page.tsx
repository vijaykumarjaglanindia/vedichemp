/**
 * VEDIC HEMP — PRODUCT DETAIL
 *
 * A1: MED_CANNABIS is never rendered here for the public site — even a direct,
 * guessed URL for a medical-cannabis slug resolves to the same "not available"
 * empty state as a slug that doesn't exist at all. There is no partial reveal
 * (no title, no price, no seller name) for a product a public visitor may not see.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MoneyText, ComplianceBadge, EmptyState, Card, Banner } from "@/components/ui";
import { CLASS_META, isRegulated } from "@/lib/compliance";
import { PRODUCTS, SELLERS } from "@/lib/sample";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product || product.cls === "MED_CANNABIS") {
    return { title: "Product not available" };
  }
  return { title: product.title };
}

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.slug === slug);

  // A1: absent, not blurred — a public visitor gets the identical empty state
  // whether the slug is unknown or belongs to the medical-cannabis catalogue.
  if (!product || product.cls === "MED_CANNABIS") {
    return (
      <div className="vh-container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <EmptyState
          icon="🚫"
          headline="This product isn't available"
          sub="It may have been removed, sold out permanently, or requires a verified prescription and sign-in to view."
          cta={{ label: "Back to catalogue", href: "/catalogue" }}
        />
      </div>
    );
  }

  const meta = CLASS_META[product.cls];
  const regulated = isRegulated(product.cls);
  const seller = SELLERS.find((s) => s.name === product.seller);
  const reviewCount = 40 + Math.round(product.rating * 37);
  const discountPct = Math.round(((product.mrpPaise - product.pricePaise) / product.mrpPaise) * 100);

  return (
    <div className="vh-container" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <p className="small muted" style={{ marginBottom: 16 }}>
        <Link href="/catalogue">Catalogue</Link> &nbsp;/&nbsp;{" "}
        <Link href={`/catalogue?class=${product.cls}`}>{meta.short}</Link> &nbsp;/&nbsp; {product.title}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
        {/* ── Gallery ─────────────────────────────────────── */}
        <div>
          <div
            className="vh-product-media"
            style={{ aspectRatio: "1", fontSize: "5rem", borderRadius: "var(--vh-radius)" }}
            aria-hidden
          >
            {product.emoji}
          </div>
          <div className="vh-row" style={{ gap: 8, marginTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="vh-product-media"
                style={{ width: 64, height: 64, fontSize: "1.6rem", borderRadius: "var(--vh-radius-sm)" }}
                aria-hidden
              >
                {product.emoji}
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>Illustrative product imagery.</p>
        </div>

        {/* ── Buy box ─────────────────────────────────────── */}
        <div>
          <ComplianceBadge cls={product.cls} />
          <h1 style={{ marginTop: 10 }}>{product.title}</h1>
          <p className="small muted" style={{ marginTop: -6, marginBottom: 14 }}>
            Sold by <Link href="/sell">{product.seller}</Link> · ★ {product.rating.toFixed(1)} ({reviewCount} reviews)
          </p>

          <div className="vh-row" style={{ gap: 12, alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: "1.7rem", fontWeight: 700, color: "var(--vh-ink)" }}>
              <MoneyText paise={product.pricePaise} />
            </span>
            {product.mrpPaise > product.pricePaise && (
              <>
                <span className="muted" style={{ textDecoration: "line-through" }}>
                  <MoneyText paise={product.mrpPaise} />
                </span>
                <span className="vh-pill vh-pill-ok">{discountPct}% off</span>
              </>
            )}
          </div>
          <p className="small muted" style={{ marginBottom: 18 }}>Inclusive of all taxes. Delivered in eco-friendly packaging.</p>

          <div className="vh-row" style={{ gap: 10, marginBottom: 14 }}>
            <button type="button" className="vh-btn vh-btn-primary">Add to cart</button>
            <button type="button" className="vh-btn vh-btn-ghost">Buy now</button>
          </div>

          {meta.ageGated && (
            <Banner severity="warn" title="Age verification required">
              This is a {meta.label.toLowerCase()} product. You must confirm you are 18 years or
              older, and complete age verification at checkout, before this item can ship.
            </Banner>
          )}

          <div style={{ marginTop: 18 }}>
            <Card title="Lab Report / Certificate of Analysis">
              {regulated ? (
                <div>
                  <p className="small" style={{ marginBottom: 10 }}>
                    Batch CoA · Lab Verified · THC ≤ 0.3%
                  </p>
                  <p className="small muted" style={{ marginBottom: 12 }}>
                    Every batch of {meta.label.toLowerCase()} is tested by an independent lab
                    before the listing can go live — this product cannot be sold without an
                    approved, batch-matched Certificate of Analysis (A2).
                  </p>
                  <Link href="/trust#coa" className="vh-btn vh-btn-ghost vh-btn-sm">
                    View CoA
                  </Link>
                </div>
              ) : (
                <p className="small muted" style={{ marginBottom: 0 }}>
                  {meta.label} is not a lab-gated compliance class. It ships under standard{" "}
                  {product.cls === "HEMP_FOOD" ? "FSSAI food-safety" : "AYUSH"} manufacturing
                  requirements rather than a batch CoA.
                </p>
              )}
            </Card>
          </div>

          <div style={{ marginTop: 18 }}>
            <Card title="Seller">
              <div className="vh-row-between">
                <div>
                  <div style={{ fontWeight: 600, color: "var(--vh-ink)" }}>{product.seller}</div>
                  <div className="small muted">
                    {seller ? `${seller.classes.length} licensed categor${seller.classes.length === 1 ? "y" : "ies"} · Health score ${seller.healthScore}` : "Verified marketplace seller"}
                  </div>
                </div>
                <Link href="/trust" className="small">Seller trust info →</Link>
              </div>
            </Card>
          </div>

          <div style={{ marginTop: 18 }}>
            <Card title={`Reviews · ★ ${product.rating.toFixed(1)} (${reviewCount})`}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                <li>
                  <div className="small" style={{ fontWeight: 600, color: "var(--vh-ink)" }}>★★★★★ Priya M., verified buyer</div>
                  <p className="small muted" style={{ marginBottom: 0 }}>
                    Good packaging, arrived on time, and the batch CoA link on the invoice made me
                    comfortable buying again.
                  </p>
                </li>
                <li>
                  <div className="small" style={{ fontWeight: 600, color: "var(--vh-ink)" }}>★★★★☆ Rohit K., verified buyer</div>
                  <p className="small muted" style={{ marginBottom: 0 }}>
                    Solid everyday product. Would like more batches in stock at once.
                  </p>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
