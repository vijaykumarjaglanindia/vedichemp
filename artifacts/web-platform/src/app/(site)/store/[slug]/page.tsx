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
import { AdBanner } from "@/components/ui/ads";
import { BadgeCheck, MapPin, ShieldCheck, UserCheck, UserPlus, Globe, ExternalLink } from "lucide-react";
import { Card, EmptyState, Rating, SectionHead } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { mdToHtml } from "@/lib/richtext";
import { readFollows, readStoreAvailability, readStoreCopy, socialUrl } from "@/lib/engage";
import { breadcrumbJsonLd } from "@/lib/seo";
import { toggleFollowStore } from "../../actions";
import { ProductCard } from "../../_lib/ProductCard";
import { ShareButton } from "../../_lib/ShareButton";
import { sellerBySlug, sellerProducts, STORE_PROFILES } from "../../_lib/data";
import { kycApproved } from "@/lib/vendor";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const seller = sellerBySlug(slug);
  if (!seller) return { title: "Store not found" };
  const profile = STORE_PROFILES[slug];
  const copy = slug === "vedic-botanicals" ? await readStoreCopy() : null;
  const title = copy?.metaTitle?.trim() || `${seller.name} — official store`;
  const description = copy?.metaDescription?.trim() || copy?.tagline?.trim() || profile?.tagline || `Shop ${seller.name} on Vedic Hemp.`;
  const url = `/store/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "Vedic Hemp" },
    twitter: { card: "summary_large_image", title, description },
  };
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
  const products = await sellerProducts(seller.name);
  const following = (await readFollows()).includes(slug);
  // Seller-published copy overrides the sample profile (their own store only).
  const storeCopy = slug === "vedic-botanicals" ? await readStoreCopy() : null;
  const tagline = storeCopy?.tagline ?? profile.tagline;
  const story = storeCopy?.story ?? profile.story;
  const availability = slug === "vedic-botanicals" ? await readStoreAvailability() : null;

  // Seller-published social links — each built on a known domain from a
  // validated handle (socialUrl returns null for anything malformed).
  const socialKinds: { key: "website" | "instagram" | "facebook" | "youtube"; label: string }[] = [
    { key: "website", label: "Website" },
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "youtube", label: "YouTube" },
  ];
  const socials = socialKinds
    .map(({ key, label }) => {
      const raw = storeCopy?.[key];
      const href = raw ? socialUrl(key, raw) : null;
      return href ? { href, label } : null;
    })
    .filter((s): s is { href: string; label: string } => s !== null);

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Stores", href: "/" },
    { name: seller.name, href: `/store/${slug}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }} />

      {/* Vacation notice (Dokan-style store open/close) */}
      {availability?.onVacation && (
        <div role="status" style={{ background: "color-mix(in srgb, var(--vh-warn-bg) 60%, var(--vh-surface))", borderBottom: "1px solid var(--vh-warn)" }}>
          <div className="vh-container" style={{ padding: "10px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span aria-hidden>🏖️</span>
            <strong style={{ color: "var(--vh-ink)" }}>This store is on vacation.</strong>
            <span className="small" style={{ color: "var(--vh-body)" }}>{availability.message}</span>
          </div>
        </div>
      )}

      {/* ── Store banner ─────────────────────────────────── */}
      <section
        style={{
          background:
            "radial-gradient(700px 400px at 85% -30%, color-mix(in srgb, var(--vh-green-400) 40%, transparent), transparent 60%), linear-gradient(160deg, #ffffff, var(--vh-green-100))",
          padding: "var(--sp-6) 0",
          color: "var(--vh-ink)",
        }}
      >
        <div className="vh-container">
          <div className="vh-row" style={{ gap: "var(--sp-4)", flexWrap: "wrap", alignItems: "flex-start" }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 76, height: 76, borderRadius: 20, fontWeight: 800, fontSize: "2rem",
                background: "var(--vh-surface)", border: "1px solid var(--vh-line)",
                fontFamily: "var(--vh-display)", flexShrink: 0,
              }}
            >
              {seller.name.charAt(0)}
            </span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 className="vh-display" style={{ color: "var(--vh-ink)", fontSize: "1.9rem", marginBottom: 4 }}>{seller.name}</h1>
              <p style={{ color: "var(--vh-body)", margin: "0 0 10px", fontSize: ".95rem" }}>{tagline}</p>
              <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                <span style={{ background: "var(--vh-surface)", border: "1px solid var(--vh-line)", borderRadius: 999, padding: "3px 10px", display: "inline-flex" }}>
                  <Rating value={profile.rating} count={profile.reviewCount} />
                </span>
                {kycApproved(seller.name) && (
                  <span className="vh-pill vh-pill-ok">
                    <BadgeCheck size={12} strokeWidth={2.2} aria-hidden /> Verified seller
                  </span>
                )}
                <span className="vh-pill vh-pill-ok">
                  <ShieldCheck size={12} strokeWidth={2.2} aria-hidden /> Health score {seller.healthScore}
                </span>
                {publicClasses.map((cls) => (
                  <span key={cls} className="vh-pill vh-pill-info">
                    <BadgeCheck size={12} strokeWidth={2.2} aria-hidden /> {CLASS_META[cls].short} licensed
                  </span>
                ))}
                <span className="vh-row small" style={{ gap: 4, color: "var(--vh-body)" }}>
                  <MapPin size={13} strokeWidth={2.2} aria-hidden /> {profile.location} · since {profile.founded}
                </span>
              </div>
              {socials.length > 0 && (
                <div className="vh-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {socials.map(({ href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="vh-pill vh-pill-neutral"
                      aria-label={`${seller.name} on ${label}`}
                      style={{ textDecoration: "none", gap: 5 }}
                    >
                      {label === "Website"
                        ? <Globe size={12} strokeWidth={2.2} aria-hidden />
                        : <ExternalLink size={12} strokeWidth={2.2} aria-hidden />}
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="vh-row" style={{ gap: 10 }}>
              <form action={toggleFollowStore}>
                <input type="hidden" name="slug" value={slug} />
                {following ? (
                  <button type="submit" className="vh-btn vh-btn-outline" style={{ gap: 8 }}>
                    <UserCheck size={15} strokeWidth={2.2} aria-hidden />
                    Following
                  </button>
                ) : (
                  <button type="submit" className="vh-btn vh-btn-primary" style={{ gap: 8 }}>
                    <UserPlus size={15} strokeWidth={2.2} aria-hidden />
                    Follow store
                  </button>
                )}
              </form>
              <ShareButton title={`${seller.name} — official store on Vedic Hemp`} />
            </div>
          </div>
        </div>
      </section>

      <div className="vh-container" style={{ paddingBottom: "var(--sp-6)" }}>
        {/* ── Story + certifications ─────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          {/* Store campaign banner (store-campaign) */}
          <div style={{ margin: "var(--sp-3) 0" }}>
            <AdBanner
              cls="CBD_WELLNESS" placement="store-campaign" brand={seller.name}
              headline="Monsoon wellness: seller-funded 20% off on the recovery range"
              cta="See campaign items" href="/catalogue?class=CBD_WELLNESS"
            />
          </div>

          <div className="vh-split">
            <Card title="About this store">
              <div className="small vh-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(story) }} />
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
