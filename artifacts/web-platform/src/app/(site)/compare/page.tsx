/**
 * VEDIC HEMP — AI PRODUCT COMPARISON
 *
 * Side-by-side comparison of two permitted products with an AI verdict.
 * The verdict describes facts (price, rating, lab status, format) — never a
 * health outcome. MED_CANNABIS slugs resolve to not-found (A1).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import { Card, EmptyState, MoneyText, Rating } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { aiProviderName } from "@/lib/ai";
import { PUBLIC_PRODUCTS, specsFor } from "../_lib/data";

export const metadata: Metadata = {
  title: "Compare products",
  description: "Side-by-side comparison of hemp and wellness products — price, ratings, lab reports and specs, with an AI summary of the differences.",
  alternates: { canonical: "/compare" },
};

function verdict(a: (typeof PUBLIC_PRODUCTS)[number], b: (typeof PUBLIC_PRODUCTS)[number]): string {
  const cheaper = a.pricePaise <= b.pricePaise ? a : b;
  const rated = a.rating >= b.rating ? a : b;
  const parts = [
    `${cheaper.title} is the lower-priced option`,
    rated === cheaper ? "and also carries the higher buyer rating" : `while ${rated.title} carries the higher buyer rating (${rated.rating.toFixed(1)}★)`,
  ];
  const lab = [a, b].filter((p) => p.labVerified);
  if (lab.length === 1 && lab[0]) parts.push(`only ${lab[0].title} ships with a batch-matched lab report`);
  if (lab.length === 2) parts.push("both ship with batch-matched lab reports");
  return parts.join(", ") + ". Pick by format and routine — neither is a medical product.";
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a: aSlug = "cbd-balm-30g", b: bSlug = "cbd-rollon-50ml" } = await searchParams;
  const a = PUBLIC_PRODUCTS.find((p) => p.slug === aSlug);
  const b = PUBLIC_PRODUCTS.find((p) => p.slug === bSlug);

  if (!a || !b) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
        <EmptyState icon="⚖️" headline="Nothing to compare" sub="One of those products isn't available for comparison." cta={{ label: "Back to catalogue", href: "/catalogue" }} />
      </div>
    );
  }
  const sa = specsFor(a);
  const sb = specsFor(b);
  const rows: { label: string; va: React.ReactNode; vb: React.ReactNode }[] = [
    { label: "Price", va: <MoneyText paise={a.pricePaise} />, vb: <MoneyText paise={b.pricePaise} /> },
    { label: "Rating", va: <Rating value={a.rating} />, vb: <Rating value={b.rating} /> },
    { label: "Category", va: CLASS_META[a.cls].label, vb: CLASS_META[b.cls].label },
    { label: "Seller", va: a.seller, vb: b.seller },
    { label: "Lab report", va: a.labVerified ? `Batch ${sa.batch} · approved` : "Food class — no CoA gate", vb: b.labVerified ? `Batch ${sb.batch} · approved` : "Food class — no CoA gate" },
    { label: "Net quantity", va: sa.netWeight, vb: sb.netWeight },
    { label: "Ingredients", va: sa.ingredients, vb: sb.ingredients },
  ];

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)", maxWidth: 900 }}>
      <div className="vh-section-head">
        <span className="vh-eyebrow">Compare</span>
        <h1 className="vh-display" style={{ fontSize: "clamp(1.6rem, 1.2rem + 1.6vw, 2.2rem)", marginTop: 8 }}>Side by side</h1>
      </div>

      <Card pad0>
        <div style={{ overflowX: "auto" }}>
          <table className="vh-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}></th>
                {[a, b].map((p) => (
                  <th key={p.id}>
                    <Link href={`/products/${p.slug}`} className="vh-row" style={{ gap: 10, color: "var(--vh-ink)" }}>
                      <span className="vh-product-media" style={{ width: 40, height: 40, fontSize: "1.2rem" }} aria-hidden>{p.emoji}</span>
                      {p.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="small muted" style={{ fontWeight: 700 }}>{r.label}</td>
                  <td className="small">{r.va}</td>
                  <td className="small">{r.vb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ marginTop: "var(--sp-3)", background: "var(--vh-green-50)", border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "14px 16px" }}>
        <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}>
          <Scale size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
          <span className="vh-pill vh-pill-info">AI verdict</span>
          <span className="small muted">engine: {aiProviderName()} · facts only, never a health claim</span>
        </div>
        <p className="small" style={{ margin: 0 }}>{verdict(a, b)}</p>
      </div>
    </div>
  );
}
