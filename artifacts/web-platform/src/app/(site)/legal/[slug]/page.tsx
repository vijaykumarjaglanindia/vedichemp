/**
 * VEDIC HEMP — LEGAL & POLICY PAGES (public render)
 *
 * Terms, Privacy, Returns and Shipping are content, not code: each document
 * lives in Site content → "Legal & policies" and the admin edits it like any
 * other copy surface. Body HTML is escaped before markdown-lite formatting,
 * so stored content can never inject markup.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { mdToHtml } from "@/lib/richtext";
import { readSiteContent } from "@/lib/sitecontent";

export const dynamic = "force-dynamic";

const LEGAL_PAGES: Record<string, { key: string; title: string; desc: string }> = {
  terms: {
    key: "legalTerms",
    title: "Terms of Service",
    desc: "The terms that govern buying on Vedic Hemp — who sells, how orders work, and the content rules every listing follows.",
  },
  privacy: {
    key: "legalPrivacy",
    title: "Privacy Policy",
    desc: "What Vedic Hemp collects, where it is stored (Indian data centres), and the strict rules around health data access.",
  },
  returns: {
    key: "legalReturns",
    title: "Returns & Refunds Policy",
    desc: "Buyer-first refunds: you are refunded first, we recover from the seller afterwards. What can be returned and how.",
  },
  shipping: {
    key: "legalShipping",
    title: "Shipping Policy",
    desc: "Sellers pack and ship every order. Costs, timelines, PIN-code coverage and the age check on delivery for 21+ categories.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL_PAGES[slug];
  if (!doc) return { title: "Policy not found", robots: { index: false } };
  return {
    title: doc.title,
    description: doc.desc,
    alternates: { canonical: `/legal/${slug}` },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = LEGAL_PAGES[slug];
  if (!doc) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
        <EmptyState
          icon="📄"
          headline="This policy page doesn't exist"
          sub="Check the link, or find every policy in the footer."
          cta={{ label: "Back to the homepage", href: "/" }}
        />
      </div>
    );
  }

  const content = await readSiteContent();
  const others = Object.entries(LEGAL_PAGES).filter(([s]) => s !== slug);
  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 760 }}>
      <Link href="/help" className="small vh-row" style={{ gap: 4, fontWeight: 700, marginBottom: "var(--sp-3)" }}>
        <ArrowLeft size={13} aria-hidden /> Help Centre
      </Link>
      <span className="vh-eyebrow">Policies</span>
      <h1 style={{ margin: "8px 0 var(--sp-4)" }}>{doc.title}</h1>
      <div
        className="vh-prose"
        // Safe: mdToHtml escapes all HTML before formatting.
        dangerouslySetInnerHTML={{ __html: mdToHtml(content[doc.key] ?? "") }}
      />
      <nav
        aria-label="Other policies"
        className="small"
        style={{ marginTop: "var(--sp-5)", borderTop: "1px solid var(--vh-line)", paddingTop: "var(--sp-3)", display: "flex", flexWrap: "wrap", gap: "var(--sp-3)" }}
      >
        {others.map(([s, d]) => (
          <Link key={s} href={`/legal/${s}`} style={{ fontWeight: 700 }}>
            {d.title} →
          </Link>
        ))}
      </nav>
      <p className="small muted" style={{ marginTop: "var(--sp-3)" }}>
        Questions about a policy? Write to {content.supportEmail} or contact support from{" "}
        <Link href="/account/support">My account → Support</Link>.
      </p>
    </div>
  );
}
