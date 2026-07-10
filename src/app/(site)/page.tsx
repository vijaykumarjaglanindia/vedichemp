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
  FlaskConical,
  Lock,
  Megaphone,
  ShieldCheck,
  Store,
  Timer,
} from "lucide-react";
import { MoneyText, Rating, SectionHead } from "@/components/ui";
import { AdSlot, CampaignLabel } from "@/components/ui/ads";
import { CLASS_META } from "@/lib/compliance";
import { faqJsonLd } from "@/lib/seo";
import { SELLERS } from "@/lib/sample";
import { ComplianceClass } from "@prisma/client";
import {
  DEALS,
  EDUCATION_ARTICLES,
  FLASH_SALE,
  HEALTH_GOALS,
  HOME_FAQS,
  INDUSTRY_STATS,
  PUBLIC_PRODUCTS,
  TESTIMONIALS,
  sellerSlug,
} from "./_lib/data";
import { ProductCard } from "./_lib/ProductCard";

export const metadata: Metadata = {
  title: "Hemp, CBD wellness, Ayurveda — verified & lab-tested",
  description:
    "Shop hemp food, Ayurveda and CBD wellness from AYUSH-licensed, batch-tested sellers across India. Every regulated batch ships with a Certificate of Analysis.",
};

const SHOPPABLE_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

const PILLARS: { icon: typeof FlaskConical; title: string; body: string }[] = [
  { icon: FlaskConical, title: "Lab-verified, batch by batch", body: "A regulated product cannot go live without an approved Certificate of Analysis matched to its exact batch. No override exists." },
  { icon: BadgeCheck, title: "Licensed sellers only", body: "FSSAI and AYUSH licences are verified at onboarding and re-checked on renewal — the badge on a storefront is earned, not claimed." },
  { icon: ShieldCheck, title: "Prescription-gated where the law says so", body: "Medical cannabis is visible only to buyers with a pharmacist-verified prescription. It is never advertised or recommended — to anyone." },
  { icon: Lock, title: "Your data stays in India", body: "PII and payment data live in Indian data centres. Health data is encrypted separately, and every access is logged and disclosed to you." },
];

export default function HomePage() {
  const bestsellers = [...PUBLIC_PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const heroTiles = PUBLIC_PRODUCTS.slice(0, 4);
  const featuredSellers = SELLERS.filter((s) => s.kycState === "KYC_APPROVED").slice(0, 3);
  const adProduct = PUBLIC_PRODUCTS.find((p) => p.cls === "CBD_WELLNESS" && p.seller === "Vedic Botanicals");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(HOME_FAQS)) }} />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="vh-hero">
        <div className="vh-container" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: "var(--sp-6)", alignItems: "center" }}>
          <div>
            <h1>Wellness you can verify — not just trust.</h1>
            <p style={{ marginTop: 12 }}>
              India&apos;s regulated marketplace for hemp nutrition, Ayurveda and CBD wellness.
              Every regulated batch ships with an independent lab report. Every seller is
              licensed. Every claim is checked before it reaches you.
            </p>
            <div className="vh-row" style={{ gap: 12, marginTop: "var(--sp-4)", flexWrap: "wrap" }}>
              <Link href="/catalogue" className="vh-btn vh-btn-primary vh-btn-lg">
                Shop the catalogue
                <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
              </Link>
              <Link
                href="/trust"
                className="vh-btn vh-btn-ghost"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}
              >
                How we verify products
              </Link>
            </div>
            <div className="vh-row" style={{ gap: 18, marginTop: "var(--sp-4)", flexWrap: "wrap", color: "rgba(255,255,255,0.85)", fontSize: ".84rem", fontWeight: 700 }}>
              <span>★ 4.6 average rating</span>
              <span aria-hidden>·</span>
              <span>12,400+ lab reports</span>
              <span aria-hidden>·</span>
              <span>300+ licensed sellers</span>
            </div>

            {/* USP strip — answers the four pre-purchase objections before
                the first scroll, and balances the hero columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: "var(--sp-4)", maxWidth: 460 }}>
              {[
                ["Free shipping over ₹999", "Across 19,000+ PIN codes"],
                ["Cash on Delivery", "Pay when it arrives"],
                ["Easy returns", "Buyer refunded first"],
                ["Batch-matched CoA", "On every regulated product"],
              ].map(([t, s]) => (
                <div key={t} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 800, fontSize: ".82rem", color: "#fff" }}>{t}</div>
                  <div style={{ fontSize: ".74rem", color: "rgba(255,255,255,0.72)" }}>{s}</div>
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
                  transform: `rotate(${i % 2 === 0 ? -1.4 : 1.6}deg) translateY(${i === 1 || i === 2 ? 10 : 0}px)`,
                  boxShadow: "var(--vh-shadow-lg)",
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
            title="Three ways in — all of them verified"
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

            {/* MED_CANNABIS: informational only, never a shopping tile (A1) */}
            <div className="vh-card" style={{ background: "var(--vh-bg)", borderStyle: "dashed" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }} aria-hidden>{CLASS_META.MED_CANNABIS.emoji}</div>
              <h3 style={{ marginBottom: 4 }}>{CLASS_META.MED_CANNABIS.label}</h3>
              <p className="small muted" style={{ marginBottom: 10 }}>
                Prescription-only — sign in with a verified prescription to view this category. It
                is never advertised, searchable or recommended.
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
          <SectionHead
            eyebrow="Today's deals"
            title="Verified products, honest discounts"
            sub="Strike-through prices are seller MRPs — the platform computes every total server-side."
            action={<Link href="/catalogue" className="small vh-row" style={{ gap: 4, fontWeight: 700 }}>All deals <ArrowRight size={14} strokeWidth={2.2} aria-hidden /></Link>}
          />
          <div className="vh-scroller" style={{ gridAutoColumns: "minmax(230px, 260px)" }}>
            {DEALS.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Flash sale strip ─────────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <div className="vh-row" style={{ gap: 12, flexWrap: "wrap", marginBottom: "var(--sp-4)" }}>
            <CampaignLabel>Monsoon Wellness Days</CampaignLabel>
            <h2 className="vh-display" style={{ margin: 0, fontSize: "1.4rem" }}>Flash sale</h2>
            <span className="vh-spacer" />
            <span className="vh-pill vh-pill-warn">
              <Timer size={13} strokeWidth={2.2} aria-hidden />
              Ends in 06:12:44 · server time
            </span>
          </div>
          <div className="vh-grid cols-4">
            {FLASH_SALE.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          <p className="small muted" style={{ marginTop: "var(--sp-3)", marginBottom: 0 }}>
            Campaign pricing is applied and timed by the server — the countdown you see is the
            server&apos;s clock, not your device&apos;s.
          </p>
        </div>
      </section>

      {/* ── Bestsellers ──────────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead
            eyebrow="Bestsellers"
            title="What verified buyers reorder"
            action={<Link href="/catalogue" className="small vh-row" style={{ gap: 4, fontWeight: 700 }}>Browse catalogue <ArrowRight size={14} strokeWidth={2.2} aria-hidden /></Link>}
          />
          <div className="vh-grid cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Sponsored placement (A1-safe, always labelled) ── */}
      <section className="vh-section" style={{ paddingTop: 0 }}>
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
            Placements configured in Admin → Ads. Prescription-only products are never eligible for
            any placement (A1).
          </p>
        </div>
      </section>

      {/* ── Shop by health goal ──────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead
            eyebrow="Shop by goal"
            title="Built around your routine"
            sub="Copy on Vedic Hemp describes composition and traditional use — never a medical claim."
          />
          <div className="vh-grid cols-3">
            {HEALTH_GOALS.map(({ icon: Icon, title, blurb, href }) => (
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
            ))}
          </div>
        </div>
      </section>

      {/* ── Hemp education ───────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead eyebrow="Learn" title="New to hemp? Start here" />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: "var(--sp-4)", alignItems: "start" }}>
            <div className="vh-grid cols-3">
              {EDUCATION_ARTICLES.map((a) => (
                <Link key={a.title} href={a.href} className="vh-card" style={{ display: "block", color: "inherit" }}>
                  <div style={{ fontSize: "1.7rem", marginBottom: 8 }} aria-hidden>{a.emoji}</div>
                  <h3 style={{ fontSize: ".98rem", marginBottom: 6 }}>{a.title}</h3>
                  <p className="small muted" style={{ marginBottom: 8 }}>{a.teaser}</p>
                  <span className="small" style={{ fontWeight: 700 }}>{a.minutes} min read →</span>
                </Link>
              ))}
            </div>
            <div className="vh-card" style={{ background: "var(--vh-green-50)" }}>
              <div className="vh-eyebrow" style={{ marginBottom: 8 }}>Explainer</div>
              <h3 style={{ marginBottom: 8 }}>Why hemp seed is FSSAI-approved food</h3>
              <p className="small muted">
                In 2021, FSSAI notified hemp seed, hemp seed oil and hemp seed flour as food under
                the Food Safety and Standards regulations. Hemp seed contains no meaningful THC —
                it&apos;s valued for complete plant protein and an omega 3:6 ratio close to what
                nutritionists recommend.
              </p>
              <p className="small muted" style={{ marginBottom: 12 }}>
                That&apos;s why hemp hearts and seed oil sit on Vedic Hemp under a standard food
                licence, while CBD products carry AYUSH licensing and a batch lab report.
              </p>
              <Link href="/catalogue?class=HEMP_FOOD" className="vh-btn vh-btn-outline vh-btn-sm">
                Shop hemp foods
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Vedic Hemp ───────────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead
            eyebrow="Why Vedic Hemp"
            title="Compliance is the product"
            sub="These aren't policies someone has to remember — they're rules the platform physically enforces."
          />
          <div className="vh-grid cols-4">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="vh-card">
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
                <h3 style={{ fontSize: ".98rem", marginBottom: 6 }}>{title}</h3>
                <p className="small muted" style={{ marginBottom: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industry stats band ──────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(140deg, var(--vh-green-900), var(--vh-green-700))",
          padding: "var(--sp-7) 0",
        }}
      >
        <div className="vh-container">
          <div className="vh-grid cols-4">
            {INDUSTRY_STATS.map((s) => (
              <div key={s.label}>
                <div className="tabular" style={{ fontSize: "2.1rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{s.value}</div>
                <div style={{ color: "#cfe6d8", fontWeight: 700, fontSize: ".86rem", marginTop: 4 }}>{s.label}</div>
                <div className="small" style={{ color: "#9dc4ab", marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead eyebrow="Buyers" title="What verified purchases say" />
          <div className="vh-grid cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="vh-card" style={{ margin: 0 }}>
                <Rating value={t.rating} />
                <blockquote className="small" style={{ margin: "10px 0 14px", color: "var(--vh-body)" }}>
                  “{t.text}”
                </blockquote>
                <figcaption className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <strong className="small" style={{ color: "var(--vh-ink)" }}>{t.name}</strong>
                  <span className="small muted">{t.city}</span>
                  <span className="vh-pill vh-pill-ok">Verified purchase</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured sellers ─────────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead
            eyebrow="Sellers"
            title="Storefronts with their licences showing"
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

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container" style={{ maxWidth: 820 }}>
          <SectionHead eyebrow="FAQ" title="Common questions, straight answers" />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            {HOME_FAQS.map((f) => (
              <details key={f.q} className="vh-card" style={{ padding: "var(--sp-3)" }}>
                <summary style={{ cursor: "pointer", fontWeight: 800, color: "var(--vh-ink)" }}>{f.q}</summary>
                <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA band ───────────────────────────────── */}
      <section className="vh-section" style={{ paddingTop: 0 }}>
        <div className="vh-container">
          <div className="vh-grid cols-2">
            <div className="vh-card" style={{ background: "var(--vh-green-50)" }}>
              <span aria-hidden style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "var(--vh-accent)", color: "var(--vh-on-accent)", marginBottom: 12 }}>
                <Store size={19} strokeWidth={2.2} />
              </span>
              <h3>Become a seller</h3>
              <p className="small muted">
                Licence checks, the CoA gate and settlement controls are built into the platform —
                you bring the product, we bring the compliance machinery.
              </p>
              <Link href="/sell" className="vh-btn vh-btn-primary">Start selling</Link>
            </div>
            <div className="vh-card">
              <span aria-hidden style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "var(--vh-ad-bg)", color: "var(--vh-ad)", marginBottom: 12 }}>
                <Megaphone size={19} strokeWidth={2.2} />
              </span>
              <h3>Advertise with Vedic Hemp</h3>
              <p className="small muted">
                Labelled, reviewed placements across home, listings and product pages.
                Prescription-only (medical cannabis) products are never eligible — for anyone (A1).
              </p>
              <Link href="/sell#advertise" className="vh-btn vh-btn-outline">Explore placements</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
