/**
 * VEDIC HEMP — SELL ON VEDIC HEMP
 *
 * Marketing page for prospective sellers. Every CTA points at the seller
 * console (`/seller`), which is a separate authenticated surface — this page
 * itself does no onboarding and holds no seller data.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Card, Timeline, Banner } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { ComplianceClass } from "@prisma/client";

export const metadata: Metadata = {
  title: "Sell on Vedic Hemp",
  description: "Reach verified buyers across hemp food, Ayurveda, CBD wellness and medical cannabis — with compliance built in, not bolted on.",
};

const BENEFITS: { icon: string; title: string; body: string }[] = [
  { icon: "🧾", title: "Built-in compliance", body: "The CoA gate, licence checks and ad filters are platform rules — you don't need your own compliance team to stay listed correctly." },
  { icon: "🔍", title: "Buyers who already trust the badge", body: "Lab-verified and AYUSH badges are shown automatically wherever your product qualifies — no separate marketing spend." },
  { icon: "💳", title: "Predictable settlements", body: "Two-person sign-off on every payout run, and 30 days' notice before any commission change — so your cash flow isn't a surprise." },
  { icon: "📦", title: "One dashboard, every order", body: "Inventory, orders, returns and settlement statements in a single seller console across all your compliance classes." },
];

const ONBOARDING_STEPS: { label: string; at?: string; state: "done" | "current" | "pending" | "failed" }[] = [
  { label: "Create your seller account and complete GSTIN + bank verification", state: "done" },
  { label: "Upload licences for each class you'll sell in (FSSAI / AYUSH / NDPS as applicable)", state: "current" },
  { label: "List your first product and attach a batch Certificate of Analysis (regulated classes only)", state: "pending" },
  { label: "Compliance review — CoA and licence checks, batch-matched to your listing", state: "pending" },
  { label: "Go live and start receiving orders", state: "pending" },
];

const LICENCE_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"];

const LICENCE_REQUIREMENTS: Record<ComplianceClass, string> = {
  HEMP_FOOD: "Valid FSSAI food business licence. Standard packaged-food labelling and shelf-life documentation.",
  AYURVEDA: "AYUSH manufacturing/marketing licence for the specific formulation(s) you list.",
  CBD_WELLNESS: "AYUSH licence plus a batch Certificate of Analysis from an accredited lab for every batch, confirming THC ≤ 0.3%.",
  MED_CANNABIS: "Licensing under the applicable NDPS/state cannabis framework. Listings are never advertised and are visible only to buyers with a pharmacist-verified prescription.",
};

export default function SellPage() {
  return (
    <>
      <section className="vh-hero">
        <div className="vh-container">
          <h1>Sell on Vedic Hemp</h1>
          <p className="small" style={{ color: "#dcefe1", maxWidth: 560, fontSize: "1.02rem", marginTop: 10 }}>
            Reach verified buyers across hemp food, Ayurveda and CBD wellness — with the
            compliance machinery already built, so you can focus on product and fulfilment.
          </p>
          <div className="vh-row" style={{ gap: 12, marginTop: 22 }}>
            <Link href="/seller" className="vh-btn vh-btn-primary">
              Start selling
            </Link>
            <Link href="/trust" className="vh-btn vh-btn-ghost" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
              See how we verify products
            </Link>
          </div>
        </div>
      </section>

      <div className="vh-container" style={{ paddingTop: 40, paddingBottom: 56 }}>
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 16 }}>Why sell here</h2>
          <div className="vh-grid cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="vh-card">
                <div style={{ fontSize: "1.6rem", marginBottom: 8 }} aria-hidden>{b.icon}</div>
                <h3 style={{ marginBottom: 4 }}>{b.title}</h3>
                <p className="small muted" style={{ marginBottom: 0 }}>{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 16 }}>Onboarding steps</h2>
          <Card>
            <Timeline nodes={ONBOARDING_STEPS} />
          </Card>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 16 }}>Licence requirements by category</h2>
          <div className="vh-grid cols-2">
            {LICENCE_CLASSES.map((cls) => {
              const meta = CLASS_META[cls];
              return (
                <div key={cls} className="vh-card">
                  <div className="vh-row" style={{ gap: 8, marginBottom: 6 }}>
                    <span aria-hidden>{meta.emoji}</span>
                    <h3 style={{ margin: 0 }}>{meta.label}</h3>
                  </div>
                  <p className="small muted" style={{ marginBottom: 0 }}>{LICENCE_REQUIREMENTS[cls]}</p>
                </div>
              );
            })}
          </div>
          <Banner severity="warn" title="Medical Cannabis has no ads and no override">
            If you sell Medical Cannabis, understand upfront: there is no advertising path for
            this category, no bulk CoA approval, and no override for an unapproved batch. This is
            deliberate — see <Link href="/trust#prohibitions">our six prohibitions</Link>.
          </Banner>
        </section>

        <section>
          <Card title="Ready to list your first product?">
            <p className="small" style={{ marginBottom: 14 }}>
              Create your seller account in the seller console — GSTIN and bank verification take
              a few minutes, licence review typically completes within a few business days.
            </p>
            <Link href="/seller" className="vh-btn vh-btn-primary">
              Go to seller console
            </Link>
          </Card>
        </section>
      </div>
    </>
  );
}
