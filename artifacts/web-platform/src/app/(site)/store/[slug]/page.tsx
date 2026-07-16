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
import { Banner, Card, EmptyState, Rating, SectionHead, StatusPill } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { mdToHtml } from "@/lib/richtext";
import { readFollows, readStoreAvailability, readStoreCopy, socialUrl } from "@/lib/engage";
import { breadcrumbJsonLd } from "@/lib/seo";
import { getSession } from "@/lib/auth-lite";
import { approvedStoreReviews, storeAggregate } from "@/lib/store-reviews";
import { toggleFollowStore, submitStoreReview } from "../../actions";
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

export default async function StorePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ rvw?: string }> }) {
  const { slug } = await params;
  const { rvw } = await searchParams;
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

  // Real store rating — computed from approved store reviews. Falls back to the
  // sample profile only when a store has no reviews yet.
  const storeAgg = await storeAggregate(slug);
  const storeReviews = await approvedStoreReviews(slug);
  const headlineRating = storeAgg.count ? storeAgg.avg : profile.rating;
  const headlineCount = storeAgg.count ? storeAgg.count : profile.reviewCount;
  const session = await getSession();

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
                <a href="#reviews" style={{ background: "var(--vh-surface)", border: "1px solid var(--vh-line)", borderRadius: 999, padding: "3px 10px", display: "inline-flex", textDecoration: "none" }}>
                  <Rating value={headlineRating} count={headlineCount} />
                </a>
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

        {/* ── Store reviews ──────────────────────────────── */}
        <section id="reviews" className="vh-section" style={{ paddingBottom: 0, scrollMarginTop: 80 }}>
          <Card title="Store reviews">
            {rvw === "ok" && <div style={{ marginBottom: 12 }}><Banner severity="ok" title="Thanks for your review">It&rsquo;s with our team for a quick check and will appear here once approved.</Banner></div>}
            {rvw === "claims" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Reviews can&rsquo;t include medical claims (cure/treat/prevent/heal). Nothing was posted — please reword and try again.</Banner></div>}
            {rvw === "length" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Your review should be between 12 and 600 characters.</Banner></div>}
            {rvw === "rating" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Please choose a star rating.</Banner></div>}

            <div className="vh-row" style={{ gap: "var(--sp-5)", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ minWidth: 150 }}>
                <div className="tabular" style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--vh-ink)", lineHeight: 1 }}>
                  {headlineRating.toFixed(1)}
                </div>
                <Rating value={headlineRating} count={headlineCount} />
                <div className="small muted" style={{ marginTop: 4 }}>{storeAgg.count > 0 ? "From buyers of this store" : "No store reviews yet"}</div>
              </div>
              {storeAgg.count > 0 && (
                <div style={{ flex: 1, minWidth: 220 }}>
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const n = storeAgg.histogram[star];
                    const pct = storeAgg.count ? Math.round((n / storeAgg.count) * 100) : 0;
                    return (
                      <div key={star} className="vh-row" style={{ gap: 8, marginBottom: 4 }}>
                        <span className="small muted tabular" style={{ width: 34 }}>{star}★</span>
                        <span style={{ flex: 1, height: 8, background: "var(--vh-line)", borderRadius: 999, overflow: "hidden" }}>
                          <span style={{ display: "block", width: `${pct}%`, height: "100%", background: "var(--vh-accent)" }} />
                        </span>
                        <span className="small muted tabular" style={{ width: 34, textAlign: "right" }}>{n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="small muted" style={{ margin: "12px 0 0" }}>
              Ratings are computed by the platform — a seller can reply but cannot edit or remove a review.
            </p>

            {/* Approved reviews */}
            <div className="vh-grid" style={{ gap: 0, marginTop: 12 }}>
              {storeReviews.length === 0 ? (
                <p className="small muted" style={{ margin: 0 }}>Be the first to review this store.</p>
              ) : storeReviews.map((r) => (
                <div key={r.id} style={{ padding: "12px 0", borderTop: "1px solid var(--vh-line)" }}>
                  <div className="vh-row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Rating value={r.rating} />
                    <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{r.author}</span>
                    {r.verified && <StatusPill tone="ok">Verified buyer</StatusPill>}
                    <span className="small muted tabular">{r.createdAt}</span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: ".92rem", color: "var(--vh-body)" }}>{r.body}</p>
                  {r.sellerReply && (
                    <div style={{ marginTop: 8, marginLeft: 12, paddingLeft: 12, borderLeft: "2px solid var(--vh-line)" }}>
                      <div className="small" style={{ fontWeight: 600 }}>{seller.name} replied</div>
                      <p className="small muted" style={{ margin: "2px 0 0" }}>{r.sellerReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Write a review */}
            <div id="write-review" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--vh-line)", scrollMarginTop: 80 }}>
              <div style={{ fontWeight: 600, fontSize: ".92rem", marginBottom: 8 }}>Write a store review</div>
              {session?.email ? (
                <form action={submitStoreReview} className="vh-grid" style={{ gap: 12, maxWidth: 560 }}>
                  <input type="hidden" name="slug" value={slug} />
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="rvw-rating">Your rating</label>
                    <select className="vh-input" id="rvw-rating" name="rating" defaultValue="5" style={{ maxWidth: 200 }}>
                      <option value="5">★★★★★ — Excellent</option>
                      <option value="4">★★★★ — Good</option>
                      <option value="3">★★★ — Okay</option>
                      <option value="2">★★ — Poor</option>
                      <option value="1">★ — Bad</option>
                    </select>
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="rvw-body">Your review</label>
                    <textarea className="vh-input" id="rvw-body" name="body" rows={3} minLength={12} maxLength={600} required placeholder="How was the packaging, dispatch and service?" />
                    <span className="vh-help">Composition and service, not health claims — the copy-check runs on submit.</span>
                  </div>
                  <button type="submit" className="vh-btn vh-btn-primary" style={{ justifySelf: "start" }}>Submit review</button>
                </form>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>
                  <Link href={`/signin?next=${encodeURIComponent(`/store/${slug}`)}`}>Sign in</Link> to review this store.
                </p>
              )}
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
