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
  Landmark,
  Leaf,
  Lock,
  Menu,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { CLASS_META } from "@/lib/compliance";
import { mdToHtml } from "@/lib/richtext";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { readFeatures } from "@/lib/features";
import { codEnabled } from "@/lib/payments";
import { parseMenu, readSiteContent } from "@/lib/sitecontent";
import { ComplianceClass } from "@prisma/client";

// Every public page renders per-request so admin edits to site content and
// CMS publishes are visible to all visitors immediately.
export const dynamic = "force-dynamic";

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
      { href: "/gifts", label: "AI Gift Finder" },
      { href: "/verify", label: "Verify a batch" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/trust", label: "How it works" },
      { href: "/trust#coa", label: "Lab-tested products" },
      { href: "/trust#prescriptions", label: "How prescriptions work" },
      { href: "/trust#prohibitions", label: "Our safety promise" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About Vedic Hemp" },
      { href: "/blog", label: "Wellness journal" },
      { href: "/account", label: "My account" },
      { href: "/stores", label: "Verified stores" },
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
/* Sign-in dropdown — same pattern as the mobile menu, always visible */
.vhx-signin { position: relative; }
.vhx-signin > summary { list-style: none; cursor: pointer; }
.vhx-signin > summary::-webkit-details-marker { display: none; }
.vhx-signin-panel {
  position: absolute; right: 0; top: calc(100% + 8px); width: min(240px, 88vw);
  background: var(--vh-bg-raised); border: 1px solid var(--vh-line);
  border-radius: var(--vh-radius); box-shadow: var(--vh-shadow-lg);
  padding: 10px; display: grid; gap: 2px; z-index: 70;
}
.vhx-signin-panel a {
  display: block; padding: 9px 12px; border-radius: 8px;
  font-weight: 600; font-size: .9rem; color: var(--vh-ink);
}
.vhx-signin-panel a:hover { background: var(--vh-bg-subtle); }
/* Mobile menu — <details>-based, works without JS */
.vhx-mnav { display: none; position: relative; }
@media (max-width: 900px) { .vhx-mnav { display: block; } }
.vhx-mnav > summary {
  list-style: none; cursor: pointer; width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--vh-line); border-radius: 9px; background: var(--vh-surface);
  color: var(--vh-ink);
}
.vhx-mnav > summary::-webkit-details-marker { display: none; }
.vhx-mnav-panel {
  position: absolute; right: 0; top: calc(100% + 8px); width: min(280px, 88vw);
  background: var(--vh-bg-raised); border: 1px solid var(--vh-line);
  border-radius: var(--vh-radius); box-shadow: var(--vh-shadow-lg);
  padding: 10px; display: grid; gap: 2px; z-index: 70;
}
.vhx-mnav-panel a {
  display: block; padding: 9px 12px; border-radius: 8px;
  font-weight: 600; font-size: .9rem; color: var(--vh-ink);
}
.vhx-mnav-panel a:hover { background: var(--vh-bg-subtle); }
.vhx-mnav-panel .vhx-mnav-head {
  font-size: .68rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
  color: var(--vh-muted); padding: 8px 12px 2px;
}
`;

import { GenerativeSearch, type SearchDoc } from "./_lib/GenerativeSearch";
import { HeaderBits } from "./_lib/HeaderBits";
import { NewsletterForm } from "./_lib/NewsletterForm";
import { readLiveProducts } from "@/lib/catalog";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const content = await readSiteContent();
  const flags = await readFeatures();
  /**
   * The generative-search corpus — the LIVE store, per request, WITHOUT
   * MED_CANNABIS (A1): the client island can never surface what it was never
   * given, and a new or archived listing is searchable (or not) immediately.
   */
  const searchDocs: SearchDoc[] = (await readLiveProducts())
    .filter((p) => p.cls !== "MED_CANNABIS")
    .map((p) => ({
      title: p.title, slug: p.slug, pricePaise: p.pricePaise, cls: p.cls,
      clsLabel: CLASS_META[p.cls].short, rating: p.rating, emoji: p.emoji,
      seller: p.seller, labVerified: p.labVerified,
    }));
  const cod = await codEnabled();
  // Menus are admin-edited (Site content → Menus); defaults mirror launch nav.
  const navLinks = parseMenu(content.navHeader ?? "");
  const footerCols = [
    { heading: "Shop", links: parseMenu(content.footerShop ?? "") },
    { heading: "Trust", links: parseMenu(content.footerTrust ?? "") },
    { heading: "Company", links: parseMenu(content.footerCompany ?? "") },
    { heading: "Partners", links: parseMenu(content.footerPartners ?? "") },
    { heading: "Policies", links: parseMenu(content.footerPolicies ?? "") },
  ].map((c, i) => (c.links.length ? c : FOOTER_COLUMNS[i] ?? c));
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: chromeCss }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd({ description: content.seoSiteDesc, email: content.supportEmail })),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />

      <a href="#vh-main" className="small" style={{ position: "absolute", left: -9999, top: "auto" }}>
        Skip to content
      </a>

      {/* ── Announcement bar (admin-edited; switchable in Features) ── */}
      {flags.announcementBar && <div className="vh-announce">
        <span className="vh-row vh-announce-track" style={{ justifyContent: "center", gap: 8 }}>
          <Truck size={14} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0 }} />
          {(content.announcement ?? "").split("·").map((seg, i) => (
            <span key={i} className="vh-row" style={{ gap: 8, flexShrink: 0 }}>
              {i > 0 && <span aria-hidden>·</span>}
              <span style={{ whiteSpace: "nowrap" }}>{seg.trim()}</span>
            </span>
          ))}
        </span>
      </div>}

      {/* ── Sticky glass header ──────────────────────────── */}
      <header className="vh-site-header">
        <div className="vh-container vh-site-nav">
          <Link href="/" className="vh-row" style={{ fontWeight: 800, fontSize: "1.12rem", color: "var(--vh-ink)", gap: 8, whiteSpace: "nowrap", flexShrink: 0 }}>
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
            {content.siteName}
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
                {/* MED_CANNABIS: informational line only — never a shop link */}
                <div style={{ borderTop: "1px solid var(--vh-line)", marginTop: "var(--sp-2)", paddingTop: "var(--sp-2)" }}>
                  <p className="small muted" style={{ margin: 0, fontSize: ".76rem" }}>
                    Medical Cannabis is prescription-only and can&rsquo;t be browsed here.{" "}
                    <Link href="/trust#prescriptions">How prescriptions work</Link>
                  </p>
                </div>
              </div>
            </div>

            {(navLinks.length ? navLinks : NAV_LINKS).map((link) => (
              <Link key={link.href} href={link.href} className="small" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {link.label}
              </Link>
            ))}
          </nav>

          <span className="vh-spacer" />

          <div className="vhx-hide-sm" style={{ flex: 1, maxWidth: 430, display: "flex" }}>
            <GenerativeSearch docs={searchDocs} />
          </div>

          <div className="vh-row" style={{ gap: 6 }}>
            <HeaderBits />
            <Link href="/sell" className="vh-btn vh-btn-primary vh-btn-sm vhx-hide-sm">
              Sell on Vedic Hemp
            </Link>

            {/* Mobile menu — shown under 900px, CSS-only */}
            <details className="vhx-mnav">
              <summary aria-label="Open menu">
                <Menu size={18} strokeWidth={2.2} aria-hidden />
              </summary>
              <nav className="vhx-mnav-panel" aria-label="Mobile">
                <div className="vhx-mnav-head">Shop</div>
                <Link href="/catalogue">All products</Link>
                {SHOP_CLASSES.map((cls) => (
                  <Link key={cls} href={`/catalogue?class=${cls}`}>
                    <span aria-hidden>{CLASS_META[cls].emoji}</span> {CLASS_META[cls].label}
                  </Link>
                ))}
                <div className="vhx-mnav-head">Vedic Hemp</div>
                <Link href="/trust">How it works</Link>
                <Link href="/about">About</Link>
                <Link href="/account">My account</Link>
                <Link href="/signin">Sign in</Link>
                <Link href="/sell" style={{ color: "var(--vh-accent)" }}>Sell on Vedic Hemp</Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="vh-main">{children}</main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="vh-site-footer">
        <div className="vh-container">
          <div className="vh-footer-grid" style={{ marginBottom: "var(--sp-5)" }}>
            <div>
              <div className="vh-row" style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--vh-ink)", gap: 8, marginBottom: 8 }}>
                <Leaf size={18} strokeWidth={2.2} aria-hidden />
                {content.siteName}
              </div>
              <p className="small" style={{ maxWidth: 250 }}>{content.footerAbout}</p>
            </div>

            {footerCols.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <div className="small" style={{ fontWeight: 800, color: "var(--vh-ink)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: ".7rem" }}>
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

          {/* Newsletter (switchable in Features) */}
          {flags.newsletterBlock && <div
            className="vh-row"
            style={{
              flexWrap: "wrap", gap: 12, padding: "var(--sp-3) 0",
              borderTop: "1px solid var(--vh-line)", borderBottom: "1px solid var(--vh-line)",
            }}
          >
            <div style={{ minWidth: 220 }}>
              <div className="small" style={{ fontWeight: 800, color: "var(--vh-ink)" }}>Wellness notes, monthly</div>
              <div className="small">Lab-report explainers and new-arrival digests. No health claims, ever.</div>
            </div>
            <span className="vh-spacer" />
            <NewsletterForm />
          </div>}

          {/* Payment & trust row */}
          <div className="vh-row" style={{ flexWrap: "wrap", gap: "var(--sp-4)", padding: "var(--sp-3) 0" }}>
            {[
              { icon: CreditCard, label: "UPI · Cards · Netbanking" },
              { icon: Banknote, label: cod ? "Cash on Delivery available" : "Simple, secure payment" },
              { icon: ShieldCheck, label: "Secure checkout" },
              { icon: RotateCcw, label: "Easy refunds — you're paid back first" },
              { icon: Landmark, label: "Licensed sellers only" },
              { icon: Lock, label: "Your data stays in India" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="vh-row small" style={{ gap: 6 }}>
                <Icon size={15} strokeWidth={2.2} aria-hidden />
                {label}
              </span>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--vh-line)", paddingTop: "var(--sp-3)" }}>
            <div
              className="small vh-prose"
              style={{ marginBottom: 6 }}
              // Safe: mdToHtml escapes all HTML before formatting.
              dangerouslySetInnerHTML={{ __html: mdToHtml(content.footerLegal ?? "") }}
            />
            <p className="small" style={{ opacity: 0.75, margin: 0 }}>
              Your data is stored securely in India. Vedic Hemp is operated by WEBMM Consultants
              Private Limited, Pune. Support: {content.supportEmail} · © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
