/**
 * VEDIC HEMP — STORE DIRECTORY (public, crawlable)
 *
 * Every storefront the marketplace shows is DERIVED, not hand-listed: a store
 * appears here only when its KYC is APPROVED (src/lib/vendor.ts, the same gate
 * that lets a listing go live) AND it has at least one live product. A store
 * that loses approval, or has nothing live, simply drops out — the directory is
 * a view over real state, not a static roster.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Store as StoreIcon } from "lucide-react";
import { Card, SectionHead, EmptyState } from "@/components/ui";
import { STORE_PROFILES, publicProducts, sellerSlug } from "../_lib/data";
import { allKyc } from "@/lib/vendor";
import { readStoreCopy } from "@/lib/engage";
import { storeAggregate } from "@/lib/store-reviews";
import { breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verified stores — Vedic Hemp",
  description: "Shop from verified sellers on Vedic Hemp — India's licensed marketplace for hemp, CBD wellness and Ayurveda.",
  alternates: { canonical: "/stores" },
  openGraph: { title: "Verified stores — Vedic Hemp", description: "Browse identity-verified sellers on Vedic Hemp.", url: "/stores", type: "website", siteName: "Vedic Hemp" },
};

interface DirEntry {
  slug: string;
  name: string;
  tagline: string | null;
  location: string | null;
  liveCount: number;
  rating: number;
  reviewCount: number;
}

/**
 * The directory is derived from two live records and no roster: the KYC store
 * (APPROVED only) and the products that are actually LIVE for it. A store the
 * platform verified today is here today, whether or not it was ever a launch
 * fixture; a fixture whose KYC lapses drops out on the next request.
 */
async function directory(): Promise<DirEntry[]> {
  const live = await publicProducts();
  const approved = (await allKyc()).filter((r) => r.status === "APPROVED");
  const out: DirEntry[] = [];
  for (const kyc of approved) {
    const slug = sellerSlug(kyc.store);
    const liveHere = live.filter((p) => sellerSlug(p.seller) === slug);
    if (liveHere.length === 0) continue; // nothing to sell, nothing to list
    // Seller-published copy first; the seeded launch blurb only fills a gap.
    const copy = await readStoreCopy(kyc.store);
    const tagline = copy?.tagline?.trim() || STORE_PROFILES[slug]?.tagline || null;
    const agg = await storeAggregate(slug);
    out.push({
      slug,
      name: kyc.store,
      tagline,
      // The registered business city/state off the verification record.
      location: kyc.city && kyc.state ? `${kyc.city}, ${kyc.state}` : null,
      liveCount: liveHere.length,
      // Real rating/count from approved store reviews only — a store with none
      // shows "New store", never an invented rating or review tally.
      rating: agg.count ? agg.avg : 0,
      reviewCount: agg.count,
    });
  }
  return out.sort((a, b) => b.rating - a.rating || b.liveCount - a.liveCount || a.name.localeCompare(b.name));
}

export default async function StoresDirectoryPage() {
  const stores = await directory();
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Stores", href: "/stores" },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }} />
      <div className="vh-container" style={{ paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-6)" }}>
        <SectionHead
          eyebrow="Marketplace"
          title="Verified stores"
          sub="Every store here is a verified seller with products in stock. A store appears only while its verification is active and it has products available."
        />

        {stores.length === 0 ? (
          <Card>
            <EmptyState icon="🏪" headline="No stores to show yet" sub="Verified sellers with products in stock appear here." cta={{ label: "Browse all products", href: "/catalogue" }} />
          </Card>
        ) : (
          <div className="vh-grid cols-3">
            {stores.map((s) => (
              <Link key={s.slug} href={`/store/${s.slug}`} className="vh-card" style={{ padding: 18, textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="vh-row" style={{ gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span aria-hidden style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--vh-accent) 12%, transparent)", color: "var(--vh-accent)" }}>
                    <StoreIcon size={20} strokeWidth={2.2} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div className="vh-row" style={{ gap: 6, alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>{s.name}</span>
                      <span className="vh-row" style={{ gap: 3, color: "var(--vh-accent)", fontSize: ".72rem", fontWeight: 700 }}>
                        <BadgeCheck size={13} strokeWidth={2.4} aria-hidden /> Verified
                      </span>
                    </div>
                    {s.location && (
                      <div className="small muted vh-row" style={{ gap: 4 }}>
                        <MapPin size={12} strokeWidth={2.2} aria-hidden /> {s.location}
                      </div>
                    )}
                  </span>
                </div>
                {s.tagline && <p className="small" style={{ margin: "0 0 10px", color: "var(--vh-ink)" }}>{s.tagline}</p>}
                <div className="vh-row-between small muted">
                  <span>{s.reviewCount > 0 ? `★ ${s.rating.toFixed(1)} · ${s.reviewCount.toLocaleString("en-IN")} reviews` : "New store"}</span>
                  <span>{s.liveCount} product{s.liveCount === 1 ? "" : "s"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
