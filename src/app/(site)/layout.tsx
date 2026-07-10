/**
 * VEDIC HEMP — PUBLIC WEBSITE CHROME (V2)
 *
 * Announcement bar + sticky glass header + mega-panel nav + marketing footer
 * for every public surface. This is the anonymous / not-yet-signed-in shell —
 * it never renders regulated (MED_CANNABIS) items as shoppable and never blurs
 * them either (A1): the "Shop" mega panel lists the three shoppable classes and
 * mentions Medical Cannabis only as an informational, non-shopping line.
 *
 * The mega panel is CSS-only (hover / focus-within) — no client JS in the shell
 */

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  FlaskConical,
  Heart,
  Landmark,
  Leaf,
  Lock,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { MoneyText } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { organizationJsonLd } from "@/lib/seo";
import { ComplianceClass } from "@prisma/client";

const SHOP_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/catalogue", label: "All products" },
  { href: "/trust", label: "How it works" },
  { href: "/about", label: "About" },
];

const FOOTER_COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { href: "/catalogue", label: "All products" },
      { href: "/catalogue?class=HEMP_FOOD", label: "Hemp Nutrition & Food" },
      { href: "/catalogue?class=AYURVEDA", label: "Ayurveda" },
      { href: "/catalogue?class=CBD_WELLNESS", label: "Hemp Wellness / CBD" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/trust", label: "How it works" },
      { href: "/trust#coa", label: "Certificate of Analysis" },
      { href: "/trust#prescriptions", label: "How prescriptions work" },
      { href: "/trust#prohibitions", label: "Our six prohibitions" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About Vedic Hemp" },
      { href: "/account", label: "My account" },
      { href: "/store/vedic-botanicals", label: "Featured stores" },
    ],
  },
  {
    heading: "Partners",
    links: [
      { href: "/sell", label: "Sell on Vedic Hemp" },
      { href: "/sell#commission", label: "Commission & fees" },
      { href: "/sell#advertise", label: "Advertise with us" },
    ],
  },
];

/* Scoped chrome styles (mega panel + badges). Prefixed vhx- to avoid
   colliding with the shared design system in globals.css. */
const chromeCss = `
.vhx-mega { position: relative; }
.vhx-mega-panel {
  position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  width: min(720px, 92vw); background: var(--vh-bg-raised); border: 1px solid var(--vh-line);
  border-radius: var(--vh-radius); box-shadow: var(--vh-shadow-lg); padding: var(--sp-3);
  display: none; z-index: 60;
}
.vhx-mega:hover .vhx-mega-panel,
.vhx-mega:focus-within .vhx-mega-panel { display: block; }
.vhx-mega-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-2); }
.vhx-mega-tile {
  display: flex; flex-direction: column; gap: 4px; padding: var(--sp-2) var(--sp-3);
  border-radius: var(--vh-radius-sm); border: 1px solid transparent;
}
.vhx-mega-tile:hover { background: var(--vh-bg-subtle); border-color: var(--vh-line); }
.vhx-cart-badge {
  position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 999px; background: var(--vh-accent); color: var(--vh-on-accent);
  font-size: .62rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--vh-surface);
}
@media (max-width: 900px) { .vhx-hide-sm { display: none !important; } }
`;

import { GenerativeSearch, type SearchDoc } from "./_lib/GenerativeSearch";
import { PRODUCTS } from "@/lib/sample";

/**
 * The generative-search corpus. Built server-side WITHOUT MED_CANNABIS (A1):
 * the client island can never surface what it was never given.
 */
const SEARCH_DOCS: SearchDoc[] = PRODUCTS.filter((p) => p.cls !== "MED_CANNABIS").map((p) => ({
  title: p.title, slug: p.slug, pricePaise: p.pricePaise, cls: p.cls,
  clsLabel: CLASS_META[p.cls].short, rating: p.rating, emoji: p.emoji,
  seller: p.seller, labVerified: p.labVerified,
}));

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: chromeCss }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      <a href="#vh-main" className="small" style={{ position: "absolute", left: -9999, top: "auto" }}>
        Skip to content
      </a>

      {/* ── Announcement bar ─────────────────────────────── */}
      <div className="vh-announce">
        <span className="vh-row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <Truck size={14} strokeWidth={2.2} aria-hidden />
          <span>
            Free shipping on orders above <MoneyText paise={500000} />
          </span>
          <span aria-hidden>·</span>
          <FlaskConical size={14} strokeWidth={2.2} aria-hidden />
          <span>Products listed & shipped by licensed sellers</span>
          <span aria-hidden>·</span>
          <Banknote size={14} strokeWidth={2.2} aria-hidden />
          <span>Cash on Delivery available</span>
        </span>
      </div>

      {/* ── Sticky glass header ──────────────────────────── */}
      <header className="vh-site-header">
        <div className="vh-container vh-site-nav">
          <Link href="/" className="vh-row" style={{ fontWeight: 800, fontSize: "1.12rem", color: "var(--vh-ink)", gap: 8 }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, borderRadius: 9,
                background: "var(--vh-accent)", color: "var(--vh-on-accent)",
              }}
            >
              <Leaf size={17} strokeWidth={2.2} />
            </span>
            Vedic Hemp
          </Link>

          <nav aria-label="Primary" className="vh-row vhx-hide-sm" style={{ gap: 18 }}>
            {/* Shop: CSS-only hover mega panel */}
            <div className="vhx-mega">
              <Link href="/catalogue" className="small" style={{ fontWeight: 700 }} aria-haspopup="true">
                Shop
              </Link>
              <div className="vhx-mega-panel" role="group" aria-label="Shop by category">
                <div className="vhx-mega-grid">
                  {SHOP_CLASSES.map((cls) => {
                    const meta = CLASS_META[cls];
                    return (
                      <Link key={cls} href={`/catalogue?class=${cls}`} className="vhx-mega-tile">
                        <span aria-hidden style={{ fontSize: "1.3rem" }}>{meta.emoji}</span>
                        <span style={{ fontWeight: 700, color: "var(--vh-ink)", fontSize: ".9rem" }}>{meta.label}</span>
                        <span className="small muted" style={{ fontSize: ".76rem" }}>{meta.blurb}</span>
                      </Link>
                    );
                  })}
                </div>
                {/* MED_CANNABIS: informational line only — never a shop link (A1) */}
                <div style={{ borderTop: "1px solid var(--vh-line)", marginTop: "var(--sp-2)", paddingTop: "var(--sp-2)" }}>
                  <p className="small muted" style={{ margin: 0, fontSize: ".76rem" }}>
                    Medical Cannabis is prescription-only and never advertised or browsable here.{" "}
                    <Link href="/trust#prescriptions">How prescriptions work</Link>
                  </p>
                </div>
              </div>
            </div>

            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="small" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {link.label}
              </Link>
            ))}
          </nav>

          <span className="vh-spacer" />

          <div className="vhx-hide-sm" style={{ flex: 1, maxWidth: 430, display: "flex" }}>
            <GenerativeSearch docs={SEARCH_DOCS} />
          </div>

          <div className="vh-row" style={{ gap: 6 }}>
            <Link href="/account" className="vh-iconbtn" aria-label="Wishlist">
              <Heart size={17} strokeWidth={2.2} aria-hidden />
            </Link>
            <Link href="/account" className="vh-iconbtn" aria-label="Cart, 2 items" style={{ position: "relative" }}>
              <ShoppingCart size={17} strokeWidth={2.2} aria-hidden />
              <span className="vhx-cart-badge" aria-hidden>2</span>
            </Link>
            <Link href="/account" className="vh-btn vh-btn-ghost vh-btn-sm vhx-hide-sm">
              Sign in
            </Link>
            <Link href="/sell" className="vh-btn vh-btn-primary vh-btn-sm">
              Sell on Vedic Hemp
            </Link>
          </div>
        </div>
      </header>

      <main id="vh-main">{children}</main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="vh-site-footer">
        <div className="vh-container">
          <div className="vh-footer-grid" style={{ marginBottom: "var(--sp-5)" }}>
            <div>
              <div className="vh-row" style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff", gap: 8, marginBottom: 8 }}>
                <Leaf size={18} strokeWidth={2.2} aria-hidden />
                Vedic Hemp
              </div>
              <p className="small" style={{ maxWidth: 250 }}>
                A regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda and medical
                cannabis in India.
              </p>
            </div>

            {FOOTER_COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <div className="small" style={{ fontWeight: 800, color: "#fff", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: ".7rem" }}>
                  {col.heading}
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href} className="small">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Newsletter */}
          <div
            className="vh-row"
            style={{
              flexWrap: "wrap", gap: 12, padding: "var(--sp-3) 0",
              borderTop: "1px solid rgba(255,255,255,0.14)", borderBottom: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <div style={{ minWidth: 220 }}>
              <div className="small" style={{ fontWeight: 800, color: "#fff" }}>Wellness notes, monthly</div>
              <div className="small">Lab-report explainers and new-arrival digests. No health claims, ever.</div>
            </div>
            <span className="vh-spacer" />
            <form action="/" method="GET" className="vh-row" style={{ gap: 8, flexWrap: "wrap" }} aria-label="Newsletter signup">
              <label htmlFor="vh-newsletter" style={{ position: "absolute", left: -9999 }}>Email address</label>
              <input
                id="vh-newsletter"
                name="newsletter"
                type="email"
                required
                placeholder="you@example.in"
                className="vh-input"
                style={{ width: 240, background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.25)", color: "#fff" }}
              />
              <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm">Subscribe</button>
            </form>
          </div>

          {/* Payment & trust row */}
          <div className="vh-row" style={{ flexWrap: "wrap", gap: "var(--sp-4)", padding: "var(--sp-3) 0" }}>
            {[
              { icon: CreditCard, label: "UPI · Cards · Netbanking" },
              { icon: Banknote, label: "Cash on Delivery" },
              { icon: ShieldCheck, label: "PCI-DSS checkout" },
              { icon: RotateCcw, label: "Buyer-first refunds" },
              { icon: Landmark, label: "FSSAI · AYUSH licensed sellers" },
              { icon: Lock, label: "Data held in India" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="vh-row small" style={{ gap: 6 }}>
                <Icon size={15} strokeWidth={2.2} aria-hidden />
                {label}
              </span>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: "var(--sp-3)" }}>
            <p className="small" style={{ marginBottom: 6 }}>
              Vedic Hemp is a marketplace intermediary: products are listed and sold by
              independent sellers, who submit their licences when they create an account and who
              are responsible for the genuineness, quality and compliance of their listings.
              After you pay, your order is forwarded to the seller, who ships it and updates its
              status. Medical Cannabis is prescription-only and is never advertised or promoted —
              anywhere, to anyone. No product on this site claims to cure, treat or prevent any
              disease.
            </p>
            <p className="small" style={{ opacity: 0.75, margin: 0 }}>
              All personal data and payment data are held in Indian data centres (ap-south-1 /
              ap-south-2). Vedic Hemp is operated by WEBMM Consultants Private Limited, Pune, Maharashtra. Support: support@vedichemp.com · © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
