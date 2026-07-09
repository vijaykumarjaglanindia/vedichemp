/**
 * VEDIC HEMP — PUBLIC WEBSITE CHROME
 *
 * Shared header + footer for every public marketing/shopping surface. This is
 * the anonymous / not-yet-signed-in shell — it never renders regulated
 * (MED_CANNABIS) items as shoppable and never blurs them either (A1): the
 * nav simply doesn't offer a "Medical Cannabis" shopping link.
 */

import type { ReactNode } from "react";
import Link from "next/link";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/catalogue", label: "Shop" },
  { href: "/catalogue?class=HEMP_FOOD", label: "Hemp Food" },
  { href: "/catalogue?class=CBD_WELLNESS", label: "Wellness" },
  { href: "/catalogue?class=AYURVEDA", label: "Ayurveda" },
  { href: "/about", label: "About" },
  { href: "/trust", label: "Trust & Lab Reports" },
];

const FOOTER_COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { href: "/catalogue", label: "All products" },
      { href: "/catalogue?class=HEMP_FOOD", label: "Hemp Food" },
      { href: "/catalogue?class=CBD_WELLNESS", label: "Hemp Wellness / CBD" },
      { href: "/catalogue?class=AYURVEDA", label: "Ayurveda" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/trust", label: "Trust & Lab Reports" },
      { href: "/trust#coa", label: "Certificate of Analysis" },
      { href: "/trust#prescriptions", label: "How prescriptions work" },
      { href: "/trust#prohibitions", label: "Our six prohibitions" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About Vedic Hemp" },
      { href: "/sell", label: "Sell on Vedic Hemp" },
      { href: "/account", label: "My account" },
    ],
  },
];

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#vh-main" className="small" style={{ position: "absolute", left: -9999, top: "auto" }}>
        Skip to content
      </a>

      <header className="vh-site-header">
        <div className="vh-container vh-site-nav">
          <Link href="/" className="vh-row" style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--vh-ink)", gap: 8 }}>
            <span aria-hidden>🌿</span>
            Vedic Hemp
          </Link>

          <nav aria-label="Primary" className="vh-row" style={{ gap: 18 }}>
            {NAV_LINKS.map((link) => (
              <Link key={link.href + link.label} href={link.href} className="small" style={{ color: "var(--vh-body)", fontWeight: 600, whiteSpace: "nowrap" }}>
                {link.label}
              </Link>
            ))}
          </nav>

          <span className="vh-spacer" />

          <form action="/catalogue" method="GET" role="search" aria-label="Search products" className="vh-row" style={{ gap: 0 }}>
            <label htmlFor="vh-site-search" className="small" style={{ position: "absolute", left: -9999 }}>
              Search products
            </label>
            <input
              id="vh-site-search"
              name="q"
              type="search"
              placeholder="Search hemp, CBD, Ayurveda…"
              className="small"
              style={{
                border: "1px solid var(--vh-line)",
                borderRadius: 999,
                padding: "8px 16px",
                width: 220,
                background: "var(--vh-bg)",
                color: "var(--vh-body)",
              }}
            />
          </form>

          <div className="vh-row" style={{ gap: 10 }}>
            <Link href="/account" className="vh-btn vh-btn-ghost vh-btn-sm">
              Sign in
            </Link>
            <Link href="/sell" className="vh-btn vh-btn-primary vh-btn-sm">
              Sell on Vedic Hemp
            </Link>
          </div>
        </div>
      </header>

      <main id="vh-main">{children}</main>

      <footer className="vh-site-footer">
        <div className="vh-container">
          <div className="vh-grid cols-4" style={{ marginBottom: 28 }}>
            <div>
              <div className="vh-row" style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff", gap: 8, marginBottom: 8 }}>
                <span aria-hidden>🌿</span>
                Vedic Hemp
              </div>
              <p className="small" style={{ color: "#a9c4b3", maxWidth: 240 }}>
                A regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda and
                medical cannabis in India.
              </p>
            </div>

            {FOOTER_COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <div className="small" style={{ fontWeight: 700, color: "#fff", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {col.heading}
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href} className="small" style={{ color: "#cfe2d6" }}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 16 }}>
            <p className="small" style={{ color: "#a9c4b3", marginBottom: 6 }}>
              Medical Cannabis is prescription-only and is never advertised or promoted on Vedic
              Hemp — it is sold under the Drugs &amp; Magic Remedies Act and Narcotic Drugs and
              Psychotropic Substances Act framework, only to buyers with a verified prescription.
              Regulated products are gated by a batch-matched Certificate of Analysis before they
              can go live.
            </p>
            <p className="small" style={{ color: "#7fa98c" }}>
              All personal data and payment data are held in Indian data centres (ap-south-1 /
              ap-south-2). © {new Date().getFullYear()} Vedic Hemp Technologies Pvt. Ltd.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
