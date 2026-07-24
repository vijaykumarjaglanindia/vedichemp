/**
 * VEDIC HEMP — AI GIFT FINDER
 *
 * Pick a budget and what the recipient is into; the finder narrows the
 * permitted-class catalogue and explains its picks in plain, claims-free
 * language. Server-rendered GET filters — the client never decides.
 */

import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { aiProviderName } from "@/lib/ai";
import { readFeatures } from "@/lib/features";
import { publicProducts } from "../_lib/data";
import { ProductCard } from "../_lib/ProductCard";

export const metadata: Metadata = {
  title: "AI Gift Finder",
  description: "Find a hemp or Ayurveda wellness gift by budget and routine — lab-tested products from licensed sellers, picked by the AI gift finder.",
  alternates: { canonical: "/gifts" },
};

const GOALS: Record<string, { label: string; classes: string[]; note: string }> = {
  kitchen: { label: "Loves cooking", classes: ["HEMP_FOOD"], note: "pantry-friendly hemp foods they can fold into everyday meals" },
  fitness: { label: "Trains hard", classes: ["CBD_WELLNESS", "HEMP_FOOD"], note: "post-workout topicals and plant protein for recovery routines" },
  calm: { label: "Winding down", classes: ["AYURVEDA"], note: "classical Ayurvedic evening-routine staples" },
  any: { label: "Surprise them", classes: ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"], note: "crowd-pleasers across the catalogue" },
};

export default async function GiftFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ budget?: string; goal?: string }>;
}) {
  const { budget = "1500", goal = "any" } = await searchParams;
  const flags = await readFeatures();
  if (!flags.giftFinder) {
    return (
      <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
        <EmptyState icon="🎁" headline="The gift finder is taking a break" sub="This feature is currently switched off." cta={{ label: "Browse Products", href: "/catalogue" }} />
      </div>
    );
  }
  const budgetPaise = Math.max(1, parseInt(budget, 10) || 1500) * 100;
  const g = GOALS[goal] ?? GOALS.any!;
  const universe = await publicProducts();
  let picks = universe
    .filter((p) => g.classes.includes(p.cls) && p.pricePaise <= budgetPaise)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);
  // Nothing in range? Gift-shopping should never dead-end — offer the
  // closest options above budget, clearly labelled as such.
  let overBudget = false;
  if (picks.length === 0) {
    overBudget = true;
    picks = universe
      .filter((p) => g.classes.includes(p.cls))
      .sort((a, b) => a.pricePaise - b.pricePaise)
      .slice(0, 3);
  }

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
      <div className="vh-section-head">
        <span className="vh-eyebrow">Gifting</span>
        <h1 className="vh-display" style={{ fontSize: "clamp(1.6rem, 1.2rem + 1.6vw, 2.2rem)", marginTop: 8 }}>AI Gift Finder</h1>
        <p className="muted" style={{ maxWidth: "56ch" }}>
          Tell it a budget and a routine — it picks lab-tested gifts from licensed sellers. CBD wellness
          gifts are 21+ with ID checked on delivery.
        </p>
      </div>

      <Card>
        <form method="get" className="vh-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="vh-field" style={{ width: 160 }}>
            <label className="vh-label" htmlFor="gf-budget">Budget (₹)</label>
            <input className="vh-input" id="gf-budget" name="budget" type="number" min={100} step={100} defaultValue={budget} />
          </div>
          <div className="vh-field" style={{ minWidth: 200 }}>
            <label className="vh-label" htmlFor="gf-goal">They&rsquo;re into…</label>
            <select className="vh-select" id="gf-goal" name="goal" defaultValue={goal}>
              {Object.entries(GOALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <button className="vh-btn vh-btn-primary" type="submit"><Gift size={15} strokeWidth={2.2} aria-hidden /> Find gifts</button>
        </form>
      </Card>

      <div style={{ margin: "var(--sp-3) 0", background: "var(--vh-green-50)", border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "12px 14px" }}>
        <span className="vh-pill vh-pill-info" style={{ marginRight: 8 }}>AI picks</span>
        <span className="small">
          {overBudget
            ? `Nothing fits ₹${Number(budget).toLocaleString("en-IN")} in that range yet — here are the closest options just above budget.`
            : `Under ₹${Number(budget).toLocaleString("en-IN")} for someone who ${g.label.toLowerCase()}: ${g.note}. Ranked by verified-purchase rating.`}
          <span className="muted"> · engine: {aiProviderName()}</span>
        </span>
      </div>

      {picks.length === 0 ? (
        <EmptyState icon="🎁" headline="No gifts in range" sub="Raise the budget or pick a different interest." />
      ) : (
        <div className="vh-grid cols-3">
          {picks.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
