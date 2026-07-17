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
import { STORE_PROFILES, sellerSlug, sellerProducts } from "../_lib/data";
import { SELLERS } from "@/lib/sample";
import { kycApproved } from "@/lib/vendor";
import { storeAggregate } from "@/lib/store-reviews";
import { breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verified stores — Vedic Hemp",
  description: "Browse KYC-verified sellers on Vedic Hemp — India's regulated hemp, CBD wellness and Ayurveda marketplace.",
  alternates: { canonical: "/stores" },
  openGraph: { title: "Verified stores — Vedic Hemp", description: "Browse KYC-verified sellers on Vedic Hemp.", url: "/stores", type: "website", siteName: "Vedic Hemp" },
};

interface DirEntry {
  slug: string;
  name: string;
  tagline: string;
  location: string;
  liveCount: number;
  rating: number;
  reviewCount: number;
}

async function directory(): Promise<DirEntry[]> {
  const out: DirEntry[] = [];
  for (const seller of SELLERS) {
    const slug = sellerSlug(seller.name);
    const profile = STORE_PROFILES[slug];
    // The gate: KYC-approved AND has a public profile AND something live to sell.
    if (!profile || !kycApproved(seller.name)) continue;
    const live = await sellerProducts(seller.name);
    if (live.length === 0) continue;
    const agg = await storeAggregate(slug);
    out.push({
      slug,
      name: seller.name,
      tagline: profile.tagline,
      location: profile.location,
      liveCount: live.length,
      // Real rating from approved store reviews; fall back to the profile figure
      // only when there are no reviews yet.
      rating: agg.count ? agg.avg : profile.rating,
      reviewCount: agg.count || profile.reviewCount,
    });
  }
  return out.sort((a, b) => b.rating - a.rating);
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
          sub="Every store here is KYC-verified and currently selling. A seller appears only while their verification holds and they have live products."
        />

        {stores.length === 0 ? (
          <Card>
            <EmptyState icon="🏪" headline="No stores to show yet" sub="Verified sellers with live products appear here." cta={{ label: "Browse all products", href: "/catalogue" }} />
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
                    <div className="small muted vh-row" style={{ gap: 4 }}>
                      <MapPin size={12} strokeWidth={2.2} aria-hidden /> {s.location}
                    </div>
                  </span>
                </div>
                <p className="small" style={{ margin: "0 0 10px", color: "var(--vh-ink)" }}>{s.tagline}</p>
                <div className="vh-row-between small muted">
                  <span>★ {s.rating.toFixed(1)} · {s.reviewCount.toLocaleString("en-IN")} reviews</span>
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
