/**
 * VEDIC HEMP — PUBLIC HOME (V2)
 *
 * The premium conversion surface. Compliance posture is unchanged from V1:
 * MED_CANNABIS is never a shoppable tile, deal, ad, recommendation or seller
 * collection here — it appears exactly once, as an informational card telling
 * a visitor how the prescription flow works (A1). Every product collection on
 * this page is drawn from the permitted-class universe. The one sponsored
 * placement renders through AdSlot, which throws on a MED_CANNABIS creative.
 *
 * All wellness copy is composition / traditional use only — no disease claims
 * (Drugs & Magic Remedies Act).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Dumbbell,
  FlaskConical,
  Lock,
  Megaphone,
  Moon,
  ShieldCheck,
  Soup,
  Sparkles,
  Store,
  Timer,
  Wheat,
} from "lucide-react";
import { MoneyText, Rating, SectionHead } from "@/components/ui";
import { AdBanner, AdSlot, AdVideo, CampaignLabel } from "@/components/ui/ads";
import { CLASS_META } from "@/lib/compliance";
import { publishedPosts } from "@/lib/cms";
import { mdToHtml } from "@/lib/richtext";
import { faqJsonLd } from "@/lib/seo";
import { readFeatures } from "@/lib/features";
import { parseFaqs, parseGoals, parseHeadedBlocks, parseTestimonials, parseTiles, readSiteContent } from "@/lib/sitecontent";
import { SELLERS } from "@/lib/sample";
import { ComplianceClass } from "@prisma/client";
import {
  deals,
  flashSale,
  publicProducts,
  sellerSlug,
} from "./_lib/data";
import { ProductCard } from "./_lib/ProductCard";

// Homepage metadata is admin-edited (Site content → SEO & metadata).
export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  return {
    title: content.seoHomeTitle,
    description: content.seoHomeDesc,
    alternates: { canonical: "/" },
    openGraph: { title: content.seoHomeTitle, description: content.seoHomeDesc, url: "/", type: "website" },
  };
}

const SHOPPABLE_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

const GOAL_ICONS = [Moon, Wheat, Dumbbell, Sparkles, Soup, Brain];
const PILLAR_ICONS = [FlaskConical, BadgeCheck, ShieldCheck, Lock];

const PILLARS: { icon: typeof FlaskConical; title: string; body: string }[] = [
  { icon: FlaskConical, title: "Sellers publish their paperwork", body: "Sellers submit their licences when they create an account, and upload batch lab reports for regulated listings. Documents are shown on the listing, so you can check before you buy." },
  { icon: BadgeCheck, title: "Sellers own their listings", body: "Products are listed and sold by independent sellers. Each seller is responsible for the genuineness, quality and compliance of what they list — their licence details are on their storefront." },
  { icon: ShieldCheck, title: "A simple, honest order flow", body: "You pay, we pass your order to the seller, the seller ships it directly to you and updates the status you track. Prescription-gated items stay gated — they are never advertised or recommended." },
  { icon: Lock, title: "Your data stays in India", body: "PII and payment data live in Indian data centres. Health data is encrypted separately, and every access is logged and disclosed to you." },
];

export default async function HomePage() {
  const content = await readSiteContent();
  const flags = await readFeatures();
  const faqs = parseFaqs(content.homeFaqs ?? "");
  const testimonials = parseTestimonials(content.testimonials ?? "");
  const uspTilesCopy = parseTiles(content.heroUsps ?? "");
  const goals = parseGoals(content.healthGoals ?? "");
  const pillarsCopy = parseHeadedBlocks(content.pillars ?? "");
  // "Learn" cards come from the CMS journal — publish a post and it lands here.
  const educationPosts = (await publishedPosts()).slice(0, 3);
  const eduEmoji = ["🌾", "🧪", "🥗"];

  const universe = await publicProducts();
  const dealsList = await deals();
  const flashSaleList = await flashSale();
  const bestsellers = [...universe].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const heroTiles = universe.slice(0, 4);
  const featuredSellers = SELLERS.filter((s) => s.kycState === "KYC_APPROVED").slice(0, 3);
  const adProduct = universe.find((p) => p.cls === "CBD_WELLNESS" && p.seller === "Vedic Botanicals");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }} />

      {/* ── Hero (admin-edited: Site content → Homepage hero) ── */}
      <section className="vh-hero">
        <div className="vh-container vh-hero-grid">
          <div>
            <h1>{content.heroTitle}</h1>
            <p style={{ marginTop: 12 }}>{content.heroSub}</p>
            <div className="vh-row" style={{ gap: 12, marginTop: "var(--sp-4)", flexWrap: "wrap" }}>
              <Link href="/catalogue" className="vh-btn vh-btn-primary vh-btn-lg">
                {content.heroCtaPrimary}
                <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
              </Link>
              <Link
                href="/trust"
                className="vh-btn vh-btn-ghost"
                style={{ background: "var(--vh-surface)", borderColor: "var(--vh-line-strong)", color: "var(--vh-ink)" }}
              >
                {content.heroCtaSecondary}
              </Link>
            </div>
            <div className="vh-row" style={{ gap: 18, marginTop: "var(--sp-4)", flexWrap: "wrap", color: "var(--vh-body)", fontSize: ".84rem", fontWeight: 700 }}>
              {(content.heroStats ?? "").split("·").map((seg, i) => (
                <span key={i} className="vh-row" style={{ gap: 18 }}>
                  {i > 0 && <span aria-hidden>·</span>}
                  <span>{seg.trim()}</span>
                </span>
              ))}
            </div>

            {/* USP strip — answers the four pre-purchase objections before
                the first scroll, and balances the hero columns */}
            <div className="vh-usp-grid" style={{ marginTop: "var(--sp-4)", maxWidth: 460 }}>
              {uspTilesCopy.map(({ title: t, sub: s }) => (
                <div key={t} style={{ background: "var(--vh-surface)", border: "1px solid var(--vh-line)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 800, fontSize: ".82rem", color: "var(--vh-ink)" }}>{t}</div>
                  <div style={{ fontSize: ".74rem", color: "var(--vh-body)" }}>{s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating product collage */}
          <div className="vhx-hide-sm" aria-hidden style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
            {heroTiles.map((p, i) => (
              <div
                key={p.id}
                className="vh-card vh-rise"
                style={{
                  padding: 12,
                  transform: `translateY(${i === 1 || i === 2 ? 14 : 0}px)`,
                  boxShadow: "var(--vh-shadow)",
                }}
              >
                <div className="vh-product-media" style={{ fontSize: "2rem", borderRadius: "var(--vh-radius-sm)", minHeight: 84 }}>{p.emoji}</div>
                <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)", marginTop: 8, lineHeight: 1.3 }}>{p.title}</div>
                <div className="small" style={{ marginTop: 4 }}>
                  <strong style={{ color: "var(--vh-ink)" }}><MoneyText paise={p.pricePaise} /></strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category tiles ───────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead
            eyebrow="Shop by category"
            title={content.headCategories ?? ""}
            action={<Link href="/catalogue" className="small vh-row" style={{ gap: 4, fontWeight: 700 }}>View all <ArrowRight size={14} strokeWidth={2.2} aria-hidden /></Link>}
          />
          <div className="vh-grid cols-4">
            {SHOPPABLE_CLASSES.map((cls) => {
              const meta = CLASS_META[cls];
              return (
                <Link key={cls} href={`/catalogue?class=${cls}`} className="vh-card" style={{ display: "block", color: "inherit" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }} aria-hidden>{meta.emoji}</div>
                  <h3 style={{ marginBottom: 4 }}>{meta.label}</h3>
                  <p className="small muted" style={{ marginBottom: 0 }}>{meta.blurb}</p>
                </Link>
              );
            })}

            {/* MED_CANNABIS: informational only, never a shopping tile */}
            <div className="vh-card" style={{ background: "var(--vh-bg)", borderStyle: "dashed" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }} aria-hidden>{CLASS_META.MED_CANNABIS.emoji}</div>
              <h3 style={{ marginBottom: 4 }}>{CLASS_META.MED_CANNABIS.label}</h3>
              <p className="small muted" style={{ marginBottom: 10 }}>
                Available only with a verified prescription — sign in to access.
              </p>
              <Link href="/trust#prescriptions" className="small" style={{ fontWeight: 700 }}>
                How prescriptions work →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Today's deals ────────────────────────────────── */}
      <section className="vh-section" style={{ paddingTop: 0 }}>
        <div className="vh-container">
          {/* Leaderboard banner — configured in Admin → Ads (home-leaderboard) */}
          {flags.sponsoredSections && <div style={{ marginBottom: "var(--sp-5)" }}>
            <AdBanner
              cls="HEMP_FOOD" placement="home-leaderboard" brand="Himalayan Hemp Co."
              headline="Cold-pressed hemp seed oil — this week's storewide 25% off"
              body="FSSAI-licensed hemp foods, shipped by the seller." cta="Shop the range" href="/store/himalayan-hemp-co"
            />
          </div>}

          <SectionHead
            eyebrow="Today's deals"
            title={content.headDeals ?? ""}
            sub="Genuine discounts from our sellers — the crossed-out price is the seller's own MRP."
            action={<Link href="/catalogue" className="small vh-row" style={{ gap: 4, fontWeight: 700 }}>All deals <ArrowRight size={14} strokeWidth={2.2} aria-hidden /></Link>}
          />
          <div className="vh-scroller" style={{ gridAutoColumns: "minmax(230px, 260px)" }}>
            {dealsList.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── From our sponsors (switchable in Features; A1-guarded regardless) ── */}
      {flags.sponsoredSections && <section className="vh-section" style={{ paddingTop: 0 }}>
        <div className="vh-container">
          <SectionHead eyebrow="From our sponsors" title={content.headSponsored ?? ""} sub="Clearly labelled, never mixed into rankings — and never a prescription product." />
          <div className="vh-split-wide">
            <AdVideo
              cls="CBD_WELLNESS" placement="home-video" brand="Vedic Botanicals"
              title="Inside a batch test: how our CBD balm gets its lab report" duration="0:48"
              href="/store/vedic-botanicals"
            />
            <div style={{ display: "grid", gap: 12 }}>
              <AdSlot cls="CBD_WELLNESS" placement="home-sponsored-products" unstyled>
                <div style={{ display: "grid", gap: 12 }}>
                  {universe.filter((sp) => sp.seller === "Vedic Botanicals").slice(0, 3).map((sp) => (
                    <Link key={sp.id} href={`/products/${sp.slug}`} className="vh-product-row" style={{ textDecoration: "none" }}>
                      <span className="vh-product-media" style={{ fontSize: "1.6rem" }} aria-hidden>{sp.emoji}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="vh-product-title" style={{ display: "block" }}>{sp.title}</span>
                        <span className="small muted">{sp.seller}</span>
                      </span>
                      <MoneyText paise={sp.pricePaise} className="vh-product-title" />
                    </Link>
                  ))}
                </div>
              </AdSlot>
            </div>
          </div>
        </div>
      </section>}

      {/* ── Flash sale strip (switchable in Features) ────── */}
      {flags.flashSale && <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <div className="vh-row" style={{ gap: 12, flexWrap: "wrap", marginBottom: "var(--sp-4)" }}>
            <CampaignLabel>{content.flashSaleName}</CampaignLabel>
            <h2 className="vh-display" style={{ margin: 0, fontSize: "1.4rem" }}>Flash sale</h2>
            <span className="vh-spacer" />
            <span className="vh-pill vh-pill-warn">
              <Timer size={13} strokeWidth={2.2} aria-hidden />
              While stocks last
            </span>
          </div>
          <div className="vh-grid cols-4">
            {flashSaleList.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          <p className="small muted" style={{ marginTop: "var(--sp-3)", marginBottom: 0 }}>
            Sale prices apply automatically at checkout while the sale is on.
          </p>
        </div>
      </section>}

      {/* ── Bestsellers ──────────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead
            eyebrow="Bestsellers"
            title={content.headBestsellers ?? ""}
            action={<Link href="/catalogue" className="small vh-row" style={{ gap: 4, fontWeight: 700 }}>Browse catalogue <ArrowRight size={14} strokeWidth={2.2} aria-hidden /></Link>}
          />
          <div className="vh-grid cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Sponsored placement (switchable; A1-safe, always labelled) ── */}
      {flags.sponsoredSections && <section className="vh-section" style={{ paddingTop: 0 }}>
        <div className="vh-container">
          <AdSlot cls="CBD_WELLNESS" placement="home-mid-banner">
            <div className="vh-row" style={{ gap: "var(--sp-4)", flexWrap: "wrap" }}>
              <span
                aria-hidden
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 64, height: 64, borderRadius: 16, fontSize: "1.8rem",
                  background: "var(--vh-green-100)", flexShrink: 0,
                }}
              >
                🌿
              </span>
              <div style={{ flex: 1, minWidth: 260 }}>
                <h3 style={{ marginBottom: 4 }}>Vedic Botanicals — the monsoon recovery ritual</h3>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  AYUSH-licensed CBD balms and roll-ons, batch-tested at a NABL-accredited lab.
                  Formulated with hemp extract, shea butter and camphor.
                </p>
              </div>
              {adProduct && (
                <div className="vh-row" style={{ gap: 12 }}>
                  <div className="small" style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{adProduct.title}</div>
                    <strong style={{ color: "var(--vh-ink)" }}><MoneyText paise={adProduct.pricePaise} /></strong>
                  </div>
                  <Link href={`/store/${sellerSlug("Vedic Botanicals")}`} className="vh-btn vh-btn-primary vh-btn-sm">
                    Visit store
                  </Link>
                </div>
              )}
            </div>
          </AdSlot>
          <p className="small muted" style={{ marginTop: 8, marginBottom: 0, fontSize: ".72rem" }}>
            Sponsored placements are always labelled and never influence your search results.
          </p>
        </div>
      </section>}

      {/* ── Shop by health goal ──────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead
            eyebrow="Shop by goal"
            title={content.headGoals ?? ""}
            sub="Copy on Vedic Hemp describes composition and traditional use — never a medical claim."
          />
          <div className="vh-grid cols-3">
            {goals.map(({ title, blurb, href }, gi) => {
              const Icon = GOAL_ICONS[gi % GOAL_ICONS.length]!;
              return (
              <Link key={title} href={href} className="vh-card vh-row" style={{ gap: 14, color: "inherit", alignItems: "flex-start" }}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: "var(--vh-green-100)", color: "var(--vh-accent)",
                  }}
                >
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 800, color: "var(--vh-ink)" }}>{title}</span>
                  <span className="small muted">{blurb}</span>
                </span>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Hemp education (switchable in Features) ──────── */}
      {flags.educationSection && <section className="vh-section">
        <div className="vh-container">
          <SectionHead eyebrow="Learn" title={content.headLearn ?? ""} />
          <div className="vh-split">
            {/* Cards are the latest published journal posts — publish in
                Admin → CMS and the homepage picks it up on the next request. */}
            <div className="vh-grid cols-3">
              {educationPosts.map((post, i) => {
                const teaser = post.body.replace(/[#*]/g, "").split(/\n+/)[0]?.slice(0, 140) ?? "";
                const minutes = Math.max(1, Math.round(post.body.split(/\s+/).length / 180));
                return (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="vh-card" style={{ display: "block", color: "inherit" }}>
                    <div style={{ fontSize: "1.7rem", marginBottom: 8 }} aria-hidden>{eduEmoji[i % eduEmoji.length]}</div>
                    <h3 style={{ fontSize: ".98rem", marginBottom: 6 }}>{post.title}</h3>
                    <p className="small muted" style={{ marginBottom: 8 }}>{teaser}</p>
                    <span className="small" style={{ fontWeight: 700 }}>{minutes} min read →</span>
                  </Link>
                );
              })}
            </div>
            <div className="vh-card" style={{ background: "var(--vh-green-50)" }}>
              <div className="vh-eyebrow" style={{ marginBottom: 8 }}>Explainer</div>
              <h3 style={{ marginBottom: 8 }}>{content.explainerTitle}</h3>
              <div
                className="small muted vh-prose"
                style={{ marginBottom: 12 }}
                dangerouslySetInnerHTML={{ __html: mdToHtml(content.explainerBody ?? "") }}
              />
              <Link href="/catalogue?class=HEMP_FOOD" className="vh-btn vh-btn-outline vh-btn-sm">
                Shop hemp foods
              </Link>
            </div>
          </div>
        </div>
      </section>}

      {/* ── Why Vedic Hemp ───────────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead
            eyebrow="Why Vedic Hemp"
            title={content.headWhy ?? ""}
            sub="Sellers list and ship; we run the marketplace and move your order to the right seller. The roles, in plain language."
          />
          <div className="vh-grid cols-4">
            {pillarsCopy.map(({ head, body }, pi) => {
              const Icon = PILLAR_ICONS[pi % PILLAR_ICONS.length]!;
              return (
              <div key={head} className="vh-card">
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 40, height: 40, borderRadius: 12, marginBottom: 12,
                    background: "var(--vh-green-100)", color: "var(--vh-accent)",
                  }}
                >
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <h3 style={{ fontSize: ".98rem", marginBottom: 6 }}>{head}</h3>
                <p className="small muted" style={{ marginBottom: 0 }}>{body}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials (switchable in Features) ────────── */}
      {flags.testimonials && testimonials.length > 0 && <section className="vh-section">
        <div className="vh-container">
          <SectionHead eyebrow="Buyers" title={content.headTestimonials ?? ""} />
          <div className="vh-grid cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="vh-card" style={{ margin: 0 }}>
                <Rating value={t.rating} />
                <blockquote className="small vh-prose" style={{ margin: "10px 0 14px", color: "var(--vh-body)" }}>
                  <div dangerouslySetInnerHTML={{ __html: mdToHtml(t.text) }} />
                </blockquote>
                <figcaption className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <strong className="small" style={{ color: "var(--vh-ink)" }}>{t.name}</strong>
                  <span className="small muted">{t.city}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>}

      {/* ── Featured sellers ─────────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead
            eyebrow="Sellers"
            title={content.headSellers ?? ""}
            sub="Health scores reflect fulfilment, returns and compliance history — computed by the platform, not self-reported."
          />
          <div className="vh-grid cols-3">
            {featuredSellers.map((s) => (
              <div key={s.id} className="vh-card">
                <div className="vh-row" style={{ gap: 12, marginBottom: 10 }}>
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 44, height: 44, borderRadius: 12, fontWeight: 800, fontSize: "1.1rem",
                      background: "var(--vh-accent)", color: "var(--vh-on-accent)",
                    }}
                  >
                    {s.name.charAt(0)}
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--vh-ink)" }}>{s.name}</div>
                    <span className="vh-pill vh-pill-ok">Health score {s.healthScore}</span>
                  </div>
                </div>
                <div className="vh-row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {s.classes.map((cls) => (
                    <span key={cls} className="vh-cbadge vh-cbadge-ayush">{CLASS_META[cls].short}</span>
                  ))}
                </div>
                <Link href={`/store/${sellerSlug(s.name)}`} className="vh-btn vh-btn-outline vh-btn-sm" style={{ gap: 6 }}>
                  <Store size={14} strokeWidth={2.2} aria-hidden />
                  Visit store
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ (switchable in Features) ─────────────────── */}
      {flags.homeFaq && <section className="vh-section">
        <div className="vh-container" style={{ maxWidth: 820 }}>
          <SectionHead eyebrow="FAQ" title={content.headFaq ?? ""} />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            {faqs.map((f) => (
              <details key={f.q} className="vh-card" style={{ padding: "var(--sp-3)" }}>
                <summary style={{ cursor: "pointer", fontWeight: 800, color: "var(--vh-ink)" }}>{f.q}</summary>
                <div className="small muted vh-prose" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: mdToHtml(f.a) }} />
              </details>
            ))}
          </div>
        </div>
      </section>}

      {/* ── Final CTA band ───────────────────────────────── */}
      <section className="vh-section" style={{ paddingTop: 0 }}>
        <div className="vh-container">
          <div className="vh-grid cols-2">
            <div className="vh-card" style={{ background: "var(--vh-green-50)" }}>
              <span aria-hidden style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "var(--vh-accent)", color: "var(--vh-on-accent)", marginBottom: 12 }}>
                <Store size={19} strokeWidth={2.2} />
              </span>
              <h3>{content.ctaSellerTitle}</h3>
              <p className="small muted">{content.ctaSellerBody}</p>
              <Link href="/sell" className="vh-btn vh-btn-primary">Start selling</Link>
            </div>
            <div className="vh-card">
              <span aria-hidden style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "var(--vh-ad-bg)", color: "var(--vh-ad)", marginBottom: 12 }}>
                <Megaphone size={19} strokeWidth={2.2} />
              </span>
              <h3>{content.ctaAdvertiserTitle}</h3>
              <p className="small muted">{content.ctaAdvertiserBody}</p>
              <Link href="/sell#advertise" className="vh-btn vh-btn-outline">Explore placements</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
