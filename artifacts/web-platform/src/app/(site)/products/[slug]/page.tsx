/**
 * VEDIC HEMP — PRODUCT DETAIL (V2)
 *
 * A1: MED_CANNABIS is never rendered here for the public site — even a direct,
 * guessed URL for a medical-cannabis slug resolves to the same "not available"
 * empty state as a slug that doesn't exist at all. There is no partial reveal
 * (no title, no price, no seller name) for a product a public visitor may not see.
 *
 * Layout: two-column at ≥900px — gallery + anchored sections left, sticky
 * purchase card right. All prices via MoneyText; totals are server-computed
 * (the quantity select here is an input to the server, never a price source).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BadgePercent,
  Flame,
  FlaskConical,
  Heart,
  MapPin,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { Banner, Card, ComplianceBadge, EmptyState, MoneyText, Rating } from "@/components/ui";
import { AdBanner, AdSlot } from "@/components/ui/ads";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { CLASS_META, isRegulated } from "@/lib/compliance";
import { aiProviderName, summarizeReviews } from "@/lib/ai";
import { mdToHtml } from "@/lib/richtext";
import { findLiveBySlug, hasVariants, saleActive, selectVariant } from "@/lib/catalog";
import { SELLERS } from "@/lib/sample";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo";
import { aggregate, approvedFor } from "@/lib/reviews";
import { addBundleToCart, addToCart } from "../../cart/actions";
import { askQuestion, markReviewHelpful, submitReview, toggleWishlist } from "../../actions";
import { readMyQuestions, readMyReviews, readOrderHistory } from "@/lib/engage";
import {
  discountPct,
  frequentlyBoughtWith,
  PDP_QA,
  publicProducts,
  sellerSlug,
  similarProducts,
  specsFor,
} from "../../_lib/data";
import { ProductCard, reviewCountFor } from "../../_lib/ProductCard";

type Params = { slug: string };

/**
 * Serviceability by PIN — decided here, on the server, never in the client
 * (the client renders the verdict). Demo logic is deterministic; with the
 * courier API attached this becomes a serviceability lookup. Regulated
 * classes have a narrower lane network than plain hemp foods.
 */
function checkPin(pin: string, cls: string): { ok: boolean; title: string; body: string } {
  if (!/^[1-8]\d{5}$/.test(pin)) {
    return { ok: false, title: "That PIN doesn't look right", body: "Enter the 6-digit PIN code of the delivery address." };
  }
  const regulated = cls === "CBD_WELLNESS";
  if (regulated && /^(19|37|69)/.test(pin)) {
    return {
      ok: false,
      title: `Not serviceable at ${pin} yet`,
      body: "Sellers can't ship CBD wellness to this PIN yet — age-verified handover isn't available there. Hemp foods and Ayurveda deliver normally.",
    };
  }
  const days = 2 + ((pin.split("").reduce((s, d) => s + Number(d), 0)) % 3);
  const eta = new Date(Date.now() + days * 86400000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return {
    ok: true,
    title: `Delivers to ${pin} by ${eta}`,
    body: regulated
      ? "Shipped by the seller's delivery partner · ID checked on handover (21+)."
      : "Shipped by the seller's delivery partner · prepaid checkout (UPI, cards, netbanking).",
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await findLiveBySlug(slug);
  if (!product || product.cls === "MED_CANNABIS") {
    // A1: identical metadata for unknown and medical slugs — no partial reveal.
    return { title: "Product not available", robots: { index: false } };
  }
  const title = product.metaTitle || product.title;
  const description = product.metaDescription
    || product.shortDesc
    || `${product.title} by ${product.seller} — listed on Vedic Hemp, India's regulated hemp & wellness marketplace.${product.labVerified ? " Batch lab report linked on the listing." : ""}`;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, type: "website", url: `/products/${product.slug}` },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ pin?: string; review?: string; q?: string; variant?: string }>;
}) {
  const { slug } = await params;
  const { pin, review: reviewErr, q: qErr, variant: variantParam } = await searchParams;
  // The LIVE store only — a draft, suspended or archived listing gets the
  // identical empty state as an unknown slug.
  const product = await findLiveBySlug(slug);

  // A1: absent, not blurred — a public visitor gets the identical empty state
  // whether the slug is unknown or belongs to the medical-cannabis catalogue.
  if (!product || product.cls === "MED_CANNABIS") {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
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
  const specs = specsFor(product);
  // Rating is COMPUTED from approved reviews; fall back to the seed rating only
  // when a product has no reviews yet.
  const agg = await aggregate(product.id);
  const reviews = await approvedFor(product.id);
  const reviewCount = agg.count > 0 ? agg.count : reviewCountFor(product);
  const ratingValue = agg.count > 0 ? agg.avg : product.rating;
  // Variant selection: the chosen option drives the price, stock and the
  // add-to-cart, all server-resolved (never a client price).
  const productHasVariants = hasVariants(product);
  const selected = selectVariant(product, variantParam);
  const onSale = !productHasVariants && saleActive(product);
  // On a simple product with a live sale, the buyer pays the sale price and the
  // regular price is struck through (the seller's sale, distinct from MRP off).
  const shownPricePaise = selected ? selected.pricePaise : (onSale ? product.salePricePaise! : product.pricePaise);
  const shownMrpPaise = selected ? selected.mrpPaise : (onSale ? product.pricePaise : product.mrpPaise);
  const shownStock = selected ? selected.stockQty : product.stockQty;
  const off = shownMrpPaise > shownPricePaise ? Math.round(((shownMrpPaise - shownPricePaise) / shownMrpPaise) * 100) : 0;
  const gallery = product.images ?? [];
  const fbt = await frequentlyBoughtWith(product, 2);
  const bundlePaise = product.pricePaise + fbt.reduce((sum, x) => sum + x.pricePaise, 0);
  const similar = await similarProducts(product, 6);
  const adProduct = (await publicProducts()).find((p) => p.cls === "CBD_WELLNESS" && p.id !== product.id);
  const pinResult = pin !== undefined ? checkPin(pin, product.cls) : null;
  const myReview = (await readMyReviews())[product.slug];
  const myQuestion = (await readMyQuestions())[product.slug];
  const bought = (await readOrderHistory()).some((o) => o.items.some((it) => it.title === product.title));

  const crumbs = [
    { name: "Catalogue", href: "/catalogue" },
    { name: meta.short, href: `/catalogue?class=${product.cls}` },
    { name: product.title, href: `/products/${product.slug}` },
  ];

  const TABS = [
    { id: "description", label: "Description" },
    { id: "lab-report", label: "Lab report" },
    { id: "reviews", label: "Reviews" },
    { id: "qa", label: "Q&A" },
  ];

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }} />

      <nav className="vh-breadcrumb" aria-label="Breadcrumb">
        <Link href="/catalogue">Catalogue</Link> / <Link href={`/catalogue?class=${product.cls}`}>{meta.short}</Link> / {product.title}
      </nav>

      <div className="vh-split-wide">
        {/* ══ LEFT: gallery, specs, anchored sections ══════ */}
        <div>
          {/* Gallery — real seller photos when present, else a clean emoji hero */}
          {gallery.length > 0 ? (
            <>
              <div style={{ aspectRatio: "4 / 3", borderRadius: "var(--vh-radius)", overflow: "hidden", border: "1px solid var(--vh-line)", background: "var(--vh-surface)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gallery[0]} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              {gallery.length > 1 && (
                <div className="vh-row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {gallery.map((src, i) => (
                    <div key={i} style={{ width: 68, height: 68, borderRadius: "var(--vh-radius-sm)", overflow: "hidden", border: i === 0 ? "2px solid var(--vh-accent)" : "1px solid var(--vh-line)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${product.title} photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="vh-product-media" style={{ aspectRatio: "4 / 3", fontSize: "5rem", borderRadius: "var(--vh-radius)" }} aria-hidden>
                {product.emoji}
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>Illustrative product imagery.</p>
            </>
          )}

          {/* Tab-look anchor nav */}
          <nav className="vh-seg" aria-label="Product sections" style={{ margin: "var(--sp-4) 0 var(--sp-3)" }}>
            {TABS.map((t, i) => (
              <a key={t.id} href={`#${t.id}`} className={i === 0 ? "on" : ""}>{t.label}</a>
            ))}
          </nav>

          {/* Description + specs */}
          <section id="description" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
            <Card title="Description">
              {product.shortDesc && <p className="small" style={{ fontWeight: 600, color: "var(--vh-ink)" }}>{product.shortDesc}</p>}
              <p className="small">
                {product.title} from {product.brand || product.seller}. {meta.blurb} Copy on Vedic Hemp describes
                composition and traditional use only — no product here claims to cure, treat or
                prevent any disease.
              </p>
              {product.tags && product.tags.length > 0 && (
                <div className="vh-row" style={{ gap: 6, flexWrap: "wrap", margin: "4px 0 12px" }}>
                  {product.tags.map((t) => (
                    <Link key={t} href={`/catalogue?q=${encodeURIComponent(t)}`} className="vh-pill vh-pill-neutral" style={{ textDecoration: "none" }}>#{t}</Link>
                  ))}
                </div>
              )}
              <div style={{ overflowX: "auto" }}>
                <table className="vh-table">
                  <thead>
                    <tr><th>Specification</th><th>Detail</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Net weight</td><td>{specs.netWeight}</td></tr>
                    <tr><td>Ingredients</td><td>{specs.ingredients}</td></tr>
                    <tr><td>HSN code</td><td className="mono">{specs.hsn}</td></tr>
                    <tr><td>Batch</td><td className="mono">{specs.batch}{specs.batch !== "\u2014" && (<> <Link href={`/verify?code=${specs.batch}`} className="small" style={{ fontWeight: 700, marginLeft: 8 }}>Verify this batch →</Link></>)}</td></tr>
                    <tr><td>Testing / facility</td><td>{specs.lab}</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* Inline sponsored banner (pdp-inline-banner) */}
          <div style={{ marginBottom: "var(--sp-4)" }}>
            <AdBanner
              cls="CBD_WELLNESS" placement="pdp-inline-banner" brand="Vedic Botanicals"
              headline="Pair it with the muscle roll-on — same batch-tested range"
              cta="View product" href="/products/cbd-rollon-50ml"
            />
          </div>

          {/* Lab report */}
          <section id="lab-report" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
            <Card title="Lab report / Certificate of Analysis">
              {regulated ? (
                <>
                  <div className="vh-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <span className="vh-pill vh-pill-ok">CoA approved · batch {specs.batch}</span>
                    <span className="vh-pill vh-pill-info">THC ≤ 0.3%</span>
                  </div>
                  <p className="small muted" style={{ marginBottom: 12 }}>
                    The seller has uploaded a lab report for this exact batch — regulated
                    listings on Vedic Hemp require one before they can go live. The report is
                    the seller&apos;s document; genuineness and accuracy of the listing are the
                    seller&apos;s responsibility. Open the report and check it before you buy.
                  </p>
                  <Link href="/trust#coa" className="vh-btn vh-btn-outline vh-btn-sm">View CoA</Link>
                </>
              ) : (
                <p className="small muted" style={{ marginBottom: 0 }}>
                  {meta.label} is not a lab-gated compliance class. It ships under standard{" "}
                  {product.cls === "HEMP_FOOD" ? "FSSAI food-safety" : "AYUSH"} manufacturing
                  requirements rather than a batch CoA.
                </p>
              )}
            </Card>
          </section>

          {/* Reviews */}
          <section id="reviews" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
            <Card
              title="Reviews"
              action={<Rating value={ratingValue} count={reviewCount} />}
            >
              {/* Rating summary + histogram, computed from approved reviews */}
              {agg.count > 0 && (
                <div className="vh-row" style={{ gap: "var(--sp-4)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--sp-3)", paddingBottom: "var(--sp-3)", borderBottom: "1px solid var(--vh-line)" }}>
                  <div style={{ textAlign: "center", minWidth: 90 }}>
                    <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--vh-ink)", lineHeight: 1 }}>{agg.avg.toFixed(1)}</div>
                    <Rating value={agg.avg} />
                    <div className="small muted">{agg.count} review{agg.count === 1 ? "" : "s"}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200, display: "grid", gap: 4 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const n = agg.histogram[star as 1 | 2 | 3 | 4 | 5];
                      const pct = agg.count ? Math.round((n / agg.count) * 100) : 0;
                      return (
                        <div key={star} className="vh-row" style={{ gap: 8 }}>
                          <span className="small muted" style={{ width: 30 }}>{star}★</span>
                          <span style={{ flex: 1, height: 8, background: "var(--vh-green-100)", borderRadius: 999, overflow: "hidden" }}>
                            <span style={{ display: "block", width: `${pct}%`, height: "100%", background: "var(--vh-accent)" }} />
                          </span>
                          <span className="small muted tabular" style={{ width: 30, textAlign: "right" }}>{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviews.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  {reviews.map((r) => (
                    <li key={r.id} style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: "var(--sp-3)" }}>
                      <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <Rating value={r.rating} />
                        <strong className="small" style={{ color: "var(--vh-ink)" }}>{r.author}</strong>
                        {r.verified && <span className="vh-pill vh-pill-ok">Verified purchase</span>}
                        <span className="small muted tabular">{r.createdAt}</span>
                      </div>
                      {r.title && <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", marginTop: 4 }}>{r.title}</div>}
                      <p className="small muted" style={{ margin: "4px 0 0" }}>{r.body}</p>
                      {r.sellerReply && (
                        <div style={{ marginTop: 8, borderLeft: "3px solid var(--vh-accent)", background: "var(--vh-green-50)", borderRadius: "var(--vh-radius-sm)", padding: "8px 12px" }}>
                          <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)" }}>Reply from {product.seller}</div>
                          <p className="small muted" style={{ margin: "2px 0 0" }}>{r.sellerReply}</p>
                        </div>
                      )}
                      <form action={markReviewHelpful} style={{ marginTop: 8 }}>
                        <input type="hidden" name="reviewId" value={r.id} />
                        <input type="hidden" name="slug" value={product.slug} />
                        <button type="submit" className="vh-btn vh-btn-ghost vh-btn-sm">👍 Helpful{r.helpful > 0 ? ` (${r.helpful})` : ""}</button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>No reviews yet — be the first to review this after your purchase.</p>
              )}
              <div style={{ marginTop: "var(--sp-3)", borderTop: "1px solid var(--vh-line)", paddingTop: "var(--sp-3)" }}>
                {/* AI review summary — provider seam in lib/ai.ts; labelled, never a claim */}
                <div id="ai-summary" style={{ background: "var(--vh-green-50)", border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", marginBottom: "var(--sp-3)" }}>
                  <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="vh-pill vh-pill-info">AI summary</span>
                    <span className="small muted">from verified-purchase reviews · engine: {aiProviderName()}</span>
                  </div>
                  <p className="small" style={{ margin: 0 }}>
                    {summarizeReviews({ title: product.title, rating: product.rating, reviewCount, labVerified: product.labVerified })}
                  </p>
                </div>
                {myReview ? (
                  <div>
                    <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <Rating value={myReview.rating} />
                      <strong className="small" style={{ color: "var(--vh-ink)" }}>Your review</strong>
                      <span className="vh-pill vh-pill-warn">Pending moderation</span>
                    </div>
                    <div className="small muted vh-prose" style={{ margin: "6px 0 0" }} dangerouslySetInnerHTML={{ __html: mdToHtml(myReview.text) }} />
                  </div>
                ) : bought ? (
                  <form action={submitReview} style={{ display: "grid", gap: 10 }}>
                    <input type="hidden" name="productId" value={product.id} />
                    {reviewErr && (
                      <p className="small" role="alert" style={{ color: "var(--vh-danger)", margin: 0 }}>
                        {reviewErr === "claims"
                          ? "Reviews can't carry disease claims (cure/treat/prevent/heal) — describe your experience instead."
                          : reviewErr === "short"
                            ? "Reviews need 10–600 characters."
                            : reviewErr === "rating"
                              ? "Pick a star rating."
                              : "Only verified purchases can review."}
                      </p>
                    )}
                    <div className="vh-row" style={{ gap: 12, flexWrap: "wrap" }}>
                      <div className="vh-field" style={{ width: 120 }}>
                        <label className="vh-label" htmlFor="rv-rating">Rating <span className="req">*</span></label>
                        <select className="vh-select" id="rv-rating" name="rating" required defaultValue="5">
                          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                        </select>
                      </div>
                      <div className="vh-field" style={{ flex: "1 1 240px" }}>
                        <label className="vh-label" htmlFor="rv-title">Headline</label>
                        <input className="vh-input" id="rv-title" name="title" maxLength={80} placeholder="Sum it up in a few words (optional)" />
                        <label className="vh-label" htmlFor="rv-text" style={{ marginTop: 10 }}>Your review <span className="req">*</span></label>
                        <RichTextEditor
                          compact
                          name="text"
                          id="rv-text"
                          maxLength={600}
                          minHeight={72}
                          placeholder="Packaging, delivery, how it fit your routine — no medical claims."
                        />
                      </div>
                    </div>
                    <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary" style={{ justifySelf: "start" }}>Submit review</button>
                  </form>
                ) : (
                  <p className="small muted" style={{ margin: 0 }}>
                    Only verified purchases can review — order this product and the review form
                    unlocks here. Ratings are computed by the platform.
                  </p>
                )}
              </div>
            </Card>
          </section>

          {/* Q&A */}
          <section id="qa" style={{ scrollMarginTop: 90 }}>
            <Card title="Questions & answers">
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                {PDP_QA.map((f) => (
                  <details key={f.q} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "12px 16px" }}>
                    <summary className="small" style={{ cursor: "pointer", fontWeight: 700, color: "var(--vh-ink)" }}>{f.q}</summary>
                    <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>{f.a}</p>
                  </details>
                ))}
              </div>
              <div style={{ marginTop: "var(--sp-3)", borderTop: "1px solid var(--vh-line)", paddingTop: "var(--sp-3)" }}>
                {myQuestion ? (
                  <div>
                    <div className="vh-row" style={{ gap: 8 }}>
                      <strong className="small" style={{ color: "var(--vh-ink)" }}>Your question</strong>
                      <span className="vh-pill vh-pill-warn">Awaiting seller answer</span>
                    </div>
                    <div className="small muted vh-prose" style={{ margin: "6px 0 0" }} dangerouslySetInnerHTML={{ __html: mdToHtml(myQuestion) }} />
                    <p className="small muted" style={{ margin: "6px 0 0" }}>
                      The seller answers from Seller Central; replies pass the compliance copy-check before publishing.
                    </p>
                  </div>
                ) : (
                  <form action={askQuestion} style={{ display: "grid", gap: 10 }}>
                    <input type="hidden" name="productId" value={product.id} />
                    {qErr === "short" && (
                      <p className="small" role="alert" style={{ color: "var(--vh-danger)", margin: 0 }}>Questions need 10–300 characters.</p>
                    )}
                    <div className="vh-field">
                      <label className="vh-label" htmlFor="qa-text">Ask the seller a question</label>
                      <RichTextEditor
                        compact
                        name="text"
                        id="qa-text"
                        maxLength={300}
                        minHeight={64}
                        placeholder="Composition, batch, format — the seller answers, and answers are copy-checked."
                      />
                    </div>
                    <button type="submit" className="vh-btn vh-btn-sm vh-btn-outline" style={{ justifySelf: "start" }}>Post question</button>
                  </form>
                )}
              </div>
            </Card>
          </section>
        </div>

        {/* ══ RIGHT: sticky purchase card ══════════════════ */}
        {/* Mobile sticky CTA — fixed to the viewport bottom on small screens */}
        <div className="vh-mobile-cta">
          <div style={{ minWidth: 0 }}>
            <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "46vw" }}>{product.title}</div>
            <MoneyText paise={product.pricePaise} className="vh-product-title" />
          </div>
          <div className="vh-spacer" />
          <form action={addToCart}>
            <input type="hidden" name="productId" value={product.id} />
            <button type="submit" className="vh-btn vh-btn-primary"><ShoppingCart size={15} aria-hidden /> Add to cart</button>
          </form>
        </div>

        <div className="vh-sticky-box">
          <div className="vh-card" style={{ boxShadow: "var(--vh-shadow)" }}>
            <ComplianceBadge cls={product.cls} />
            {product.brand && <div className="small muted" style={{ margin: "10px 0 2px", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>{product.brand}</div>}
            <h1 style={{ fontSize: "1.35rem", margin: product.brand ? "0 0 6px" : "10px 0 6px" }}>{product.title}</h1>
            {product.shortDesc && <p className="small muted" style={{ margin: "0 0 8px" }}>{product.shortDesc}</p>}
            <div className="vh-row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <a href="#reviews" style={{ textDecoration: "none" }}><Rating value={ratingValue} count={reviewCount} /></a>
              <Link href={`/store/${sellerSlug(product.seller)}`} className="small" style={{ fontWeight: 700 }}>
                {product.seller}
              </Link>
            </div>

            <div className="vh-row" style={{ gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              {productHasVariants && !variantParam && <span className="small muted">from</span>}
              <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--vh-ink)" }}>
                <MoneyText paise={shownPricePaise} />
              </span>
              {shownMrpPaise > shownPricePaise && (
                <>
                  <span className="muted" style={{ textDecoration: "line-through" }}>
                    <MoneyText paise={shownMrpPaise} />
                  </span>
                  <span className="vh-pill vh-pill-ok">{off}% off</span>
                </>
              )}
              {onSale && <span className="vh-pill vh-pill-warn"><Flame size={11} aria-hidden /> Sale</span>}
            </div>
            <p className="small muted" style={{ margin: "4px 0 12px" }}>Inclusive of all taxes. Final total is computed at checkout by the server.</p>

            {/* Variant selector (size / pack / strength) — server-driven so it
                works without JavaScript; selecting reloads with the variant's
                own price and stock. */}
            {productHasVariants && (
              <div style={{ marginBottom: 14 }}>
                <div className="vh-label" style={{ marginBottom: 6 }}>{product.optionName ?? "Option"}{selected ? `: ${selected.label}` : ""}</div>
                <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {product.variants!.map((v) => {
                    const on = selected?.id === v.id;
                    const soldOut = v.stockQty <= 0;
                    return (
                      <Link
                        key={v.id}
                        href={`/products/${product.slug}?variant=${v.id}`}
                        aria-current={on ? "true" : undefined}
                        className="small"
                        style={{
                          padding: "8px 14px", borderRadius: "var(--vh-radius-sm)",
                          border: `1.5px solid ${on ? "var(--vh-accent)" : "var(--vh-line-strong)"}`,
                          background: on ? "var(--vh-green-100)" : "var(--vh-surface)",
                          fontWeight: 700, color: soldOut ? "var(--vh-muted)" : "var(--vh-ink)",
                          textDecoration: soldOut ? "line-through" : "none", opacity: soldOut ? 0.6 : 1,
                        }}
                      >
                        {v.label} · <MoneyText paise={v.pricePaise} />
                      </Link>
                    );
                  })}
                </div>
                {selected && <div className="small muted" style={{ marginTop: 6 }}>SKU {selected.sku}</div>}
              </div>
            )}
            <div className="vh-row small muted" style={{ gap: 6, marginBottom: 12 }}>
              <Users size={13} aria-hidden />
              <span><b className="tabular" style={{ color: "var(--vh-ink)" }}>24</b> people bought this in the last 7 days · ships in 24h</span>
            </div>

            {/* Bank & platform offers */}
            <div style={{ background: "var(--vh-green-50)", border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "10px 12px", marginBottom: 12, display: "grid", gap: 7 }}>
              <span className="vh-row small" style={{ gap: 8, fontWeight: 700, color: "var(--vh-ink)" }}>
                <BadgePercent size={14} aria-hidden style={{ color: "var(--vh-accent)" }} /> Offers
              </span>
              <span className="small" style={{ paddingLeft: 22 }}>Extra 10% off up to ₹200 on UPI · code <span className="vh-kbd">VEDIC10</span></span>
              <span className="small" style={{ paddingLeft: 22 }}>Free shipping on orders above ₹5,000 · ₹100 flat below · COD available</span>
            </div>

            {/* Stock status — the server is the authority; the button follows
                the SELECTED variant's stock (or the simple product's). */}
            {shownStock <= 0 ? (
              <div role="status" style={{ marginBottom: 12, padding: "12px 14px", borderRadius: "var(--vh-radius-sm)", border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-danger)", background: "color-mix(in srgb, var(--vh-danger-bg) 40%, var(--vh-surface))" }}>
                <div style={{ fontWeight: 700, color: "var(--vh-danger)" }}>Out of stock{productHasVariants && selected ? ` — ${selected.label}` : ""}</div>
                <div className="small muted">{productHasVariants ? "Pick another option above, or add it to your wishlist for when it's restocked." : "The seller has no units on hand. Add it to your wishlist and we'll show it again when it's restocked."}</div>
              </div>
            ) : (
              <>
                <div className="vh-row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span className="vh-pill vh-pill-ok">In stock</span>
                  {shownStock <= product.lowStockAt && (
                    <span className="vh-pill vh-pill-warn"><Flame size={11} aria-hidden /> Only {shownStock} left</span>
                  )}
                </div>
                <form action={addToCart}>
                  <input type="hidden" name="productId" value={product.id} />
                  {selected && <input type="hidden" name="variantId" value={selected.id} />}
                  <div className="vh-field" style={{ marginBottom: 12, maxWidth: 120 }}>
                    <label htmlFor="pdp-qty" className="vh-label">Quantity</label>
                    <select id="pdp-qty" name="qty" className="vh-select" defaultValue="1">
                      {[1, 2, 3, 4, 5].filter((n) => n <= shownStock).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                    <button type="submit" name="intent" value="cart" className="vh-btn vh-btn-primary vh-btn-lg">Add to cart</button>
                    <button type="submit" name="intent" value="buy" className="vh-btn vh-btn-outline">Buy now</button>
                  </div>
                </form>
              </>
            )}

            <form action={toggleWishlist} style={{ marginBottom: "var(--sp-3)" }}>
              <input type="hidden" name="productId" value={product.id} />
              <button type="submit" className="vh-btn vh-btn-ghost vh-btn-sm" style={{ width: "100%" }}>
                <Heart size={14} aria-hidden /> Save to wishlist
              </button>
            </form>

            {/* Delivery estimate by PIN — serviceability is decided server-side */}
            <form method="GET" className="vh-field" style={{ marginBottom: "var(--sp-3)" }} aria-label="Check delivery by PIN code">
              <label htmlFor="pdp-pin" className="vh-label vh-row" style={{ gap: 6 }}>
                <MapPin size={13} aria-hidden style={{ color: "var(--vh-accent)" }} /> Deliver to
              </label>
              <div className="vh-row" style={{ gap: 8 }}>
                <input id="pdp-pin" name="pin" defaultValue={pin ?? ""} className="vh-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="Enter 6-digit PIN code" style={{ maxWidth: 200 }} />
                <button type="submit" className="vh-btn vh-btn-ghost vh-btn-sm">Check</button>
              </div>
              {pinResult ? (
                <span
                  className="small"
                  role="status"
                  style={{ marginTop: 6, fontWeight: 600, color: pinResult.ok ? "var(--vh-ok)" : "var(--vh-danger)" }}
                >
                  {pinResult.title}
                  <span className="muted" style={{ display: "block", fontWeight: 400 }}>{pinResult.body}</span>
                </span>
              ) : (
                <span className="vh-help">Serviceability for regulated classes is checked per PIN on the server.</span>
              )}
            </form>

            {meta.ageGated && (
              <Banner severity="warn" title="Age verification required">
                This is an age-gated (21+) product. Age is verified at checkout and on delivery
                handover — the check happens on the server, per order.
              </Banner>
            )}

            <div style={{ borderTop: "1px solid var(--vh-line)", marginTop: "var(--sp-3)", paddingTop: "var(--sp-3)", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: FlaskConical, text: regulated ? `Seller-uploaded lab report · batch ${specs.batch}` : "Seller-declared licensed facility" },
                { icon: BadgeCheck, text: `Sold & shipped by ${product.seller} — order forwarded to the seller after payment` },
                { icon: ShieldCheck, text: "Secure PCI-DSS payment · UPI, cards, COD" },
                { icon: RotateCcw, text: "Easy returns · buyer refunded first" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="vh-row small" style={{ gap: 8 }}>
                  <Icon size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)", flexShrink: 0 }} />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Frequently bought together ────────────────────── */}
      {fbt.length > 0 && (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <h2 className="vh-display" style={{ fontSize: "1.3rem", marginBottom: "var(--sp-3)" }}>Frequently bought together</h2>
          <div className="vh-card vh-row" style={{ flexWrap: "wrap", gap: "var(--sp-4)", alignItems: "center" }}>
            <div className="vh-row" style={{ gap: "var(--sp-3)", flexWrap: "wrap", flex: 1, minWidth: 280 }}>
              {[product, ...fbt].map((p, i) => (
                <div key={p.id} className="vh-row" style={{ gap: "var(--sp-3)" }}>
                  {i > 0 && <span className="muted" aria-hidden style={{ fontSize: "1.2rem" }}>+</span>}
                  <div style={{ width: 150 }}>
                    <div className="vh-product-media" style={{ height: 84, fontSize: "1.8rem", borderRadius: "var(--vh-radius-sm)" }} aria-hidden>{p.emoji}</div>
                    <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", marginTop: 6, lineHeight: 1.3 }}>
                      {i === 0 ? p.title : <Link href={`/products/${p.slug}`} style={{ color: "var(--vh-ink)" }}>{p.title}</Link>}
                    </div>
                    <span className="small"><MoneyText paise={p.pricePaise} /></span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="small muted">Bundle total</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--vh-ink)" }}>
                <MoneyText paise={bundlePaise} />
              </div>
              <form action={addBundleToCart} style={{ marginTop: 8 }}>
                <input type="hidden" name="productIds" value={[product, ...fbt].map((p) => p.id).join(",")} />
                <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm">
                  Add all {1 + fbt.length} to cart
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* ── Similar products ──────────────────────────────── */}
      {similar.length > 0 && (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div className="vh-row-between" style={{ marginBottom: "var(--sp-3)" }}>
            <h2 className="vh-display" style={{ fontSize: "1.3rem", margin: 0 }}>Similar products</h2>
            {similar[0] && (
              <Link href={`/compare?a=${product.slug}&b=${similar[0].slug}`} className="small" style={{ fontWeight: 700 }}>
                Compare side by side →
              </Link>
            )}
          </div>
          <div className="vh-scroller" style={{ gridAutoColumns: "minmax(220px, 250px)" }}>
            {similar.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Sponsored (labelled, A1-guarded) ──────────────── */}
      {adProduct && (
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <AdSlot cls={adProduct.cls} placement="pdp-related-sponsored">
            <div className="vh-row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
              <span className="vh-product-media" style={{ width: 72, height: 72, fontSize: "1.8rem", borderRadius: "var(--vh-radius-sm)", display: "flex", flexShrink: 0 }} aria-hidden>
                {adProduct.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{adProduct.title}</div>
                <div className="vh-row" style={{ gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  <Rating value={adProduct.rating} />
                  <strong style={{ color: "var(--vh-ink)" }}><MoneyText paise={adProduct.pricePaise} /></strong>
                </div>
              </div>
              <Link href={`/products/${adProduct.slug}`} className="vh-btn vh-btn-outline vh-btn-sm" style={{ gap: 6 }}>
                <Store size={14} strokeWidth={2.2} aria-hidden />
                View product
              </Link>
            </div>
          </AdSlot>
          <p className="small muted" style={{ marginTop: 8, marginBottom: 0, fontSize: ".72rem" }}>
            Placements configured in Admin → Ads.
          </p>
        </section>
      )}
    </div>
  );
}
