/**
 * VEDIC HEMP — PUBLIC SELLER STOREFRONT (V2)
 *
 * Premium storefront for a licensed seller. A public storefront is a shoppable,
 * promotional surface, so A1 applies in full: MED_CANNABIS never appears here —
 * the product grid is drawn from the permitted-class universe, and even the
 * licence-badge row omits the class (mentioning it on a shoppable page would be
 * promotion). Unknown slugs resolve to a plain empty state.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Share2, ShieldCheck, UserPlus } from "lucide-react";
import { Card, EmptyState, Rating, SectionHead } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { breadcrumbJsonLd } from "@/lib/seo";
import { ProductCard } from "../../_lib/ProductCard";
import { sellerBySlug, sellerProducts, STORE_PROFILES } from "../../_lib/data";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const seller = sellerBySlug(slug);
  if (!seller) return { title: "Store not found" };
  return { title: `${seller.name} — official store` };
}

export default async function StorePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const seller = sellerBySlug(slug);
  const profile = STORE_PROFILES[slug];

  if (!seller || !profile) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
        <EmptyState
          icon="🏪"
          headline="This store isn't available"
          sub="The store may have closed, changed its name, or not completed verification yet."
          cta={{ label: "Browse the catalogue", href: "/catalogue" }}
        />
      </div>
    );
  }

  // A1: a public storefront never shows MED_CANNABIS — not as a product,
  // not as a licence badge on a shoppable surface.
  const publicClasses = seller.classes.filter((c) => c !== "MED_CANNABIS");
  const products = sellerProducts(seller.name);

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Stores", href: "/" },
    { name: seller.name, href: `/store/${slug}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }} />

      {/* ── Store banner ─────────────────────────────────── */}
      <section
        style={{
          background:
            "radial-gradient(700px 400px at 85% -30%, color-mix(in srgb, var(--vh-green-400) 40%, transparent), transparent 60%), linear-gradient(140deg, var(--vh-green-900), var(--vh-green-700))",
          padding: "var(--sp-6) 0",
          color: "#fff",
        }}
      >
        <div className="vh-container">
          <div className="vh-row" style={{ gap: "var(--sp-4)", flexWrap: "wrap", alignItems: "flex-start" }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 76, height: 76, borderRadius: 20, fontWeight: 800, fontSize: "2rem",
                background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.3)",
                fontFamily: "var(--vh-display)", flexShrink: 0,
              }}
            >
              {seller.name.charAt(0)}
            </span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 className="vh-display" style={{ color: "#fff", fontSize: "1.9rem", marginBottom: 4 }}>{seller.name}</h1>
              <p style={{ color: "rgba(255,255,255,0.85)", margin: "0 0 10px", fontSize: ".95rem" }}>{profile.tagline}</p>
              <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                <span style={{ background: "rgba(255,255,255,0.92)", borderRadius: 999, padding: "3px 10px", display: "inline-flex" }}>
                  <Rating value={profile.rating} count={profile.reviewCount} />
                </span>
                <span className="vh-pill vh-pill-ok">
                  <ShieldCheck size={12} strokeWidth={2.2} aria-hidden /> Health score {seller.healthScore}
                </span>
                {publicClasses.map((cls) => (
                  <span key={cls} className="vh-pill vh-pill-info">
                    <BadgeCheck size={12} strokeWidth={2.2} aria-hidden /> {CLASS_META[cls].short} licensed
                  </span>
                ))}
                <span className="vh-row small" style={{ gap: 4, color: "rgba(255,255,255,0.8)" }}>
                  <MapPin size={13} strokeWidth={2.2} aria-hidden /> {profile.location} · since {profile.founded}
                </span>
              </div>
            </div>
            <div className="vh-row" style={{ gap: 10 }}>
              <button type="button" className="vh-btn vh-btn-primary" style={{ gap: 8 }}>
                <UserPlus size={15} strokeWidth={2.2} aria-hidden />
                Follow store
              </button>
              <button
                type="button"
                className="vh-btn vh-btn-ghost"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.4)", color: "#fff", gap: 8 }}
              >
                <Share2 size={15} strokeWidth={2.2} aria-hidden />
                Share
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="vh-container" style={{ paddingBottom: "var(--sp-6)" }}>
        {/* ── Story + certifications ─────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: "var(--sp-4)", alignItems: "start" }}>
            <Card title="About this store">
              <p className="small" style={{ marginBottom: 0 }}>{profile.story}</p>
            </Card>
            <Card title="Certifications">
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {profile.certifications.map((c) => (
                  <li key={c} className="vh-row small" style={{ gap: 8 }}>
                    <BadgeCheck size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)", flexShrink: 0 }} />
                    {c}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* ── Collections chips ──────────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="small" style={{ fontWeight: 800, color: "var(--vh-ink)" }}>Collections:</span>
            {profile.collections.map((c) => (
              <Link key={c} href="/catalogue" className="vh-pill vh-pill-neutral" style={{ textDecoration: "none" }}>
                {c}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Featured products ──────────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <SectionHead
            eyebrow="Featured"
            title={`Products from ${seller.name}`}
            sub="Every regulated item below carries an approved, batch-matched lab report — it could not be listed otherwise."
          />
          {products.length === 0 ? (
            <EmptyState
              icon="📦"
              headline="No public listings right now"
              sub="This seller's products may be between batches — a regulated listing goes offline whenever its lab report lapses."
              cta={{ label: "Browse the catalogue", href: "/catalogue" }}
            />
          ) : (
            <div className="vh-grid cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} actions />
              ))}
            </div>
          )}
        </section>

        {/* ── Reviews summary ────────────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <Card title="Buyer feedback">
            <div className="vh-row" style={{ gap: "var(--sp-5)", flexWrap: "wrap" }}>
              <div>
                <div className="tabular" style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--vh-ink)", lineHeight: 1 }}>
                  {profile.rating.toFixed(1)}
                </div>
                <Rating value={profile.rating} count={profile.reviewCount} />
                <div className="small muted" style={{ marginTop: 4 }}>Verified purchases only</div>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li>{profile.followerCount.toLocaleString("en-IN")} buyers follow this store.</li>
                  <li>Ratings are computed by the platform from verified purchases — a seller cannot edit or remove a review.</li>
                  <li>Disputes are adjudicated buyer-first: refunds are issued to the buyer before recovery from the seller.</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
