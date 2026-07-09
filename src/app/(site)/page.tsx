/**
 * VEDIC HEMP — PUBLIC HOME
 *
 * MED_CANNABIS is never a shoppable tile here: it appears exactly once, as an
 * informational card that tells a visitor how to unlock it (sign in with a
 * verified prescription) rather than as a product they can add to cart (A1).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MoneyText, Banner, ComplianceBadge } from "@/components/ui";
import { CLASS_META, permittedClasses } from "@/lib/compliance";
import { classProducts } from "@/lib/sample";
import { ComplianceClass } from "@prisma/client";

export const metadata: Metadata = {
  title: "Hemp, CBD wellness, Ayurveda — verified & lab-tested",
  description: "Shop hemp food, Ayurveda and CBD wellness from AYUSH-licensed, batch-tested sellers across India.",
};

const SHOPPABLE_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

const TRUST_BAND = [
  { icon: "🧪", label: "Lab-verified", sub: "Batch CoA on every regulated product" },
  { icon: "🪔", label: "AYUSH-licensed", sub: "Formulations under AYUSH oversight" },
  { icon: "🥗", label: "FSSAI", sub: "Food-grade hemp, properly licensed" },
  { icon: "🔒", label: "Secure payments", sub: "PCI-DSS checkout, no card data stored" },
];

export default function HomePage() {
  const bestsellers = classProducts(permittedClasses({ hasRx: false })).slice(0, 8);

  return (
    <>
      <section className="vh-hero">
        <div className="vh-container">
          <h1>Hemp, wellness and Ayurveda you can verify — not just trust.</h1>
          <p className="small" style={{ color: "#dcefe1", maxWidth: 560, fontSize: "1.02rem", marginTop: 10 }}>
            Every regulated product on Vedic Hemp ships with a batch-matched Certificate of
            Analysis. Every seller is licensed. Every claim is checked before it reaches you.
          </p>
          <div className="vh-row" style={{ gap: 12, marginTop: 22 }}>
            <Link href="/catalogue" className="vh-btn vh-btn-primary">
              Shop the catalogue
            </Link>
            <Link href="/trust" className="vh-btn vh-btn-ghost" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
              How we verify products
            </Link>
          </div>
        </div>
      </section>

      <div className="vh-container" style={{ paddingTop: 40 }}>
        {/* ── Shop by category ─────────────────────────────── */}
        <section aria-labelledby="shop-by-category" style={{ marginBottom: 40 }}>
          <div className="vh-row-between" style={{ marginBottom: 16 }}>
            <h2 id="shop-by-category" style={{ margin: 0 }}>Shop by category</h2>
            <Link href="/catalogue" className="small">View all →</Link>
          </div>
          <div className="vh-grid cols-4">
            {SHOPPABLE_CLASSES.map((cls) => {
              const meta = CLASS_META[cls];
              return (
                <Link
                  key={cls}
                  href={`/catalogue?class=${cls}`}
                  className="vh-card"
                  style={{ display: "block", color: "inherit" }}
                >
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
                Prescription only — sign in with a verified prescription to view this category.
                It is never advertised, searchable, or recommended.
              </p>
              <Link href="/trust#prescriptions" className="small" style={{ fontWeight: 600 }}>
                How prescriptions work →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Bestsellers ───────────────────────────────────── */}
        <section aria-labelledby="bestsellers" style={{ marginBottom: 40 }}>
          <div className="vh-row-between" style={{ marginBottom: 16 }}>
            <h2 id="bestsellers" style={{ margin: 0 }}>Bestsellers</h2>
            <Link href="/catalogue" className="small">Browse catalogue →</Link>
          </div>
          <div className="vh-grid cols-4">
            {bestsellers.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="vh-product" style={{ color: "inherit" }}>
                <div className="vh-product-media" aria-hidden>{p.emoji}</div>
                <div className="vh-product-body">
                  <span className="vh-product-title">{p.title}</span>
                  <ComplianceBadge cls={p.cls} />
                  <div className="vh-row" style={{ gap: 8 }}>
                    <MoneyText paise={p.pricePaise} />
                    {p.mrpPaise > p.pricePaise && (
                      <span className="small muted" style={{ textDecoration: "line-through" }}>
                        <MoneyText paise={p.mrpPaise} />
                      </span>
                    )}
                  </div>
                  <span className="small muted">★ {p.rating.toFixed(1)} · {p.seller}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Trust band ────────────────────────────────────── */}
        <section aria-labelledby="trust-band" style={{ marginBottom: 40 }}>
          <h2 id="trust-band" className="small" style={{ textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--vh-muted)", marginBottom: 16 }}>
            Why buyers trust Vedic Hemp
          </h2>
          <div className="vh-grid cols-4">
            {TRUST_BAND.map((item) => (
              <div key={item.label} className="vh-card vh-row" style={{ gap: 12 }}>
                <span style={{ fontSize: "1.6rem" }} aria-hidden>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{item.label}</div>
                  <div className="small muted">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Compliance banner ─────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Banner severity="info" title="Why product pages don't make health claims">
            Under the Drugs &amp; Magic Remedies (Objectionable Advertisements) Act, no product
            on Vedic Hemp may claim to cure, treat or prevent a disease — regardless of
            compliance class. Wellness copy on this site describes composition and traditional
            use only. Anything that reads like a medical claim is a bug — please{" "}
            <Link href="/trust">report it on the Trust page</Link>.
          </Banner>
        </section>
      </div>
    </>
  );
}
