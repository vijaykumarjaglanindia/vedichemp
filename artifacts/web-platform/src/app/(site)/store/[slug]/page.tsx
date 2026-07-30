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
import { BadgeCheck, MapPin, UserCheck, UserPlus, Globe, ExternalLink } from "lucide-react";
import { Banner, Card, EmptyState, Rating, SectionHead, StatusPill } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { mdToHtml } from "@/lib/richtext";
import { announcementLive, readFollows, readStoreAnnouncement, readStoreAvailability, readStoreCopy, socialUrl } from "@/lib/engage";
import { breadcrumbJsonLd } from "@/lib/seo";
import { getSession } from "@/lib/auth-lite";
import { approvedStoreReviews, storeAggregate } from "@/lib/store-reviews";
import { toggleFollowStore, submitStoreReview, reportStore } from "../../actions";
import { ProductCard } from "../../_lib/ProductCard";
import { ShareButton } from "../../_lib/ShareButton";
import { publicProducts, sellerSlug, STORE_PROFILES } from "../../_lib/data";
import { allKyc, type VendorKyc } from "@/lib/vendor";
import type { ComplianceClass } from "@prisma/client";

export const dynamic = "force-dynamic";

// Storefront-announcement styling by tone.
const ANN_BG: Record<"info" | "sale" | "warn", string> = {
  info: "color-mix(in srgb, var(--vh-accent) 12%, var(--vh-surface))",
  sale: "color-mix(in srgb, var(--vh-ok-bg, var(--vh-green-50)) 70%, var(--vh-surface))",
  warn: "color-mix(in srgb, var(--vh-warn-bg) 60%, var(--vh-surface))",
};
const ANN_LINE: Record<"info" | "sale" | "warn", string> = {
  info: "var(--vh-accent)", sale: "var(--vh-ok)", warn: "var(--vh-warn)",
};
const ANN_ICON: Record<"info" | "sale" | "warn", string> = { info: "📣", sale: "🎉", warn: "⚠️" };

type Params = { slug: string };

/**
 * A storefront exists when the platform holds something real about it — a
 * verification record, live listings, or both. Neither gate is a fixture
 * lookup, so a store that genuinely passes KYC gets a storefront instead of
 * "this store isn't available".
 */
async function resolveStore(slug: string): Promise<{ name: string; kyc?: VendorKyc; products: Awaited<ReturnType<typeof publicProducts>> } | null> {
  const kyc = (await allKyc()).find((r) => sellerSlug(r.store) === slug);
  const products = (await publicProducts()).filter((p) => sellerSlug(p.seller) === slug);
  const name = kyc?.store ?? products[0]?.seller;
  if (!name) return null;
  return { name, ...(kyc ? { kyc } : {}), products };
}

/** The verification facts a buyer may see — read off the store's KYC record,
 *  never a curated list. PAN and bank details are never public (§4). */
function certificationsFor(k: VendorKyc): string[] {
  const out = [`Registered as ${k.legalName}`, `GSTIN ${k.gstin}`];
  for (const cls of k.classes.filter((c) => c !== "MED_CANNABIS")) out.push(`${CLASS_META[cls].short} licensed`);
  if (k.drugLicenceNo) {
    out.push(`Drug licence ${k.drugLicenceNo}${k.drugLicenceExpiry ? ` · valid to ${k.drugLicenceExpiry}` : ""}`);
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await resolveStore(slug);
  if (!store) return { title: "Store not found" };
  const profile = STORE_PROFILES[slug];
  const copy = await readStoreCopy(store.name);
  const title = copy?.metaTitle?.trim() || `${store.name} — official store`;
  const description = copy?.metaDescription?.trim() || copy?.tagline?.trim() || profile?.tagline || `Shop ${store.name} on Vedic Hemp.`;
  const url = `/store/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "Vedic Hemp" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StorePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ rvw?: string; rep?: string }> }) {
  const { slug } = await params;
  const { rvw, rep } = await searchParams;
  const store = await resolveStore(slug);
  const profile = STORE_PROFILES[slug];

  if (!store) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
        <EmptyState
          icon="🏪"
          headline="This store isn't available"
          sub="The store may have closed, changed its name, or not completed verification yet."
          cta={{ label: "Browse Products", href: "/catalogue" }}
        />
      </div>
    );
  }

  const { name: storeName, kyc, products } = store;
  // A1: a public storefront never shows MED_CANNABIS — not as a product,
  // not as a licence badge on a shoppable surface. The classes are the ones the
  // store is verified for, or (with no record yet) the ones it actually lists in.
  const publicClasses = (kyc?.classes ?? [...new Set(products.map((p) => p.cls))])
    .filter((c): c is ComplianceClass => c !== "MED_CANNABIS");
  const location = kyc ? `${kyc.city}, ${kyc.state}` : null;
  const certifications = kyc ? certificationsFor(kyc) : [];
  const following = (await readFollows()).includes(slug);
  // Seller-published copy overrides the seeded profile, per store.
  const storeCopy = await readStoreCopy(store.name);
  const tagline = storeCopy?.tagline ?? profile?.tagline ?? null;
  const story = storeCopy?.story ?? profile?.story ?? null;
  const availability = await readStoreAvailability(store.name);
  const announcement = await readStoreAnnouncement(store.name);
  const today = new Date().toISOString().slice(0, 10);

  const storeAgg = await storeAggregate(slug);
  const storeReviews = await approvedStoreReviews(slug);
  // Real rating/count from approved store reviews only — no invented fallback.
  const headlineRating = storeAgg.count ? storeAgg.avg : 0;
  const headlineCount = storeAgg.count;
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
    { name: storeName, href: `/store/${slug}` },
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

      {/* Time-boxed storefront announcement (seller-posted, copy-checked) */}
      {announcementLive(announcement, today) && (
        <div role="status" style={{ background: ANN_BG[announcement!.tone], borderBottom: `1px solid ${ANN_LINE[announcement!.tone]}` }}>
          <div className="vh-container" style={{ padding: "10px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span aria-hidden>{ANN_ICON[announcement!.tone]}</span>
            <span style={{ color: "var(--vh-ink)", fontWeight: 500 }}>{announcement!.message}</span>
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
              {storeName.charAt(0)}
            </span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 className="vh-display" style={{ color: "var(--vh-ink)", fontSize: "1.9rem", marginBottom: 4 }}>{storeName}</h1>
              {tagline && <p style={{ color: "var(--vh-body)", margin: "0 0 10px", fontSize: ".95rem" }}>{tagline}</p>}
              <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
                <a href="#reviews" style={{ background: "var(--vh-surface)", border: "1px solid var(--vh-line)", borderRadius: 999, padding: "3px 10px", display: "inline-flex", textDecoration: "none" }}>
                  {headlineCount > 0 ? <Rating value={headlineRating} count={headlineCount} /> : <span className="small muted">New store · no reviews yet</span>}
                </a>
                {kyc?.status === "APPROVED" && (
                  <span className="vh-pill vh-pill-ok">
                    <BadgeCheck size={12} strokeWidth={2.2} aria-hidden /> Verified seller
                  </span>
                )}
                {publicClasses.map((cls) => (
                  <span key={cls} className="vh-pill vh-pill-info">
                    <BadgeCheck size={12} strokeWidth={2.2} aria-hidden /> {CLASS_META[cls].short} licensed
                  </span>
                ))}
                {location && (
                  <span className="vh-row small" style={{ gap: 4, color: "var(--vh-body)" }}>
                    <MapPin size={13} strokeWidth={2.2} aria-hidden /> {location}
                  </span>
                )}
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
                      aria-label={`${storeName} on ${label}`}
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
              <ShareButton title={`${storeName} — official store on Vedic Hemp`} />
            </div>
          </div>
        </div>
      </section>

      <div className="vh-container" style={{ paddingBottom: "var(--sp-6)" }}>
        {/* ── Story + certifications ─────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <div className="vh-split">
            {story && (
              <Card title="About this store">
                <div className="small vh-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(story) }} />
              </Card>
            )}
            <Card title="Verification">
              {certifications.length > 0 ? (
                <>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {certifications.map((c) => (
                      <li key={c} className="vh-row small" style={{ gap: 8 }}>
                        <BadgeCheck size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)", flexShrink: 0 }} />
                        {c}
                      </li>
                    ))}
                  </ul>
                  <p className="small muted" style={{ margin: "12px 0 0" }}>
                    From the details this seller filed and we checked before the store could list. For lab-tested
                    categories, each batch&rsquo;s lab report is on the product page too.
                  </p>
                </>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>
                  This store hasn&rsquo;t completed business verification yet.
                </p>
              )}
            </Card>
          </div>
        </section>

        {/* ── Collections chips — the classes this store actually lists in ── */}
        {publicClasses.length > 0 && (
          <section className="vh-section" style={{ paddingBottom: 0 }}>
            <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <span className="small" style={{ fontWeight: 800, color: "var(--vh-ink)" }}>Collections:</span>
              {publicClasses.map((cls) => (
                <Link key={cls} href={`/catalogue?class=${cls}`} className="vh-pill vh-pill-neutral" style={{ textDecoration: "none" }}>
                  {CLASS_META[cls].short}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured products ──────────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <SectionHead
            eyebrow="Featured"
            title={`Products from ${storeName}`}
            sub="Every wellness item below was lab-tested for its exact batch before it could be listed."
          />
          {products.length === 0 ? (
            <EmptyState
              icon="📦"
              headline="No products available right now"
              sub="This seller's products may be between batches — a lab-tested product goes offline if its lab report expires."
              cta={{ label: "Browse Products", href: "/catalogue" }}
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
                      <div className="small" style={{ fontWeight: 600 }}>{storeName} replied</div>
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
                    <span className="vh-help">Write about the product and service, not health claims.</span>
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

        {/* ── Report this store ──────────────────────────────── */}
        <section id="report" className="vh-section" style={{ paddingTop: 0, scrollMarginTop: 80 }}>
          <Card title="Report this store">
            {rep === "ok" && <div style={{ marginBottom: 12 }}><Banner severity="ok" title="Thanks — this is with our team">A moderator will look into it. The store stays open unless we find a problem. You&rsquo;ll never be asked to pay outside Vedic Hemp.</Banner></div>}
            {rep === "duplicate" && <div style={{ marginBottom: 12 }}><Banner severity="info">You&rsquo;ve already reported this store — it&rsquo;s with a moderator.</Banner></div>}
            {rep === "reason" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Please choose a reason for the report.</Banner></div>}
            <p className="small muted" style={{ marginTop: 0 }}>
              Seeing counterfeit goods, misleading claims, or a seller asking you to pay <strong>outside</strong> Vedic Hemp?
              Tell us — every order on the platform is protected, and off-platform payment is never required.
            </p>
            {session?.email ? (
              <details className="vh-report">
                <summary className="vh-btn vh-btn-sm vh-btn-ghost" style={{ display: "inline-flex", cursor: "pointer" }}>Report this store</summary>
                <form action={reportStore} className="vh-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="storeName" value={storeName} />
                  <select name="reason" className="vh-select" defaultValue="OFF_PLATFORM" aria-label="Reason for reporting this store" style={{ maxWidth: 280 }}>
                    <option value="OFF_PLATFORM">Asked me to pay outside Vedic Hemp</option>
                    <option value="COUNTERFEIT">Counterfeit or fake products</option>
                    <option value="MISLEADING">Misleading storefront claims</option>
                    <option value="PROHIBITED_ITEM">Selling a prohibited item</option>
                    <option value="OTHER">Something else</option>
                  </select>
                  <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Submit report</button>
                </form>
              </details>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>
                <Link href={`/signin?next=${encodeURIComponent(`/store/${slug}`)}`}>Sign in</Link> to report this store.
              </p>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
