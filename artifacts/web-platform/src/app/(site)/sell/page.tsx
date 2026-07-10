/**
 * VEDIC HEMP — SELL ON VEDIC HEMP (V2 reskin)
 *
 * Marketing page for prospective sellers. Every CTA points at the seller
 * console (`/seller`), which is a separate authenticated surface — this page
 * itself does no onboarding and holds no seller data. V2 adds the three-step
 * onboarding Timeline, a commission-transparency card (A5: 30-day notice) and
 * the Advertise cross-link. All compliance copy preserved.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  FileText,
  Megaphone,
  PackageCheck,
  Percent,
  Search,
  Wallet,
} from "lucide-react";
import { Banner, Card, SectionHead, Timeline } from "@/components/ui";
import { CLASS_META } from "@/lib/compliance";
import { ComplianceClass } from "@prisma/client";

export const metadata: Metadata = {
  title: "Sell on Vedic Hemp",
  description: "Reach verified buyers across hemp food, Ayurveda, CBD wellness and medical cannabis — with compliance built in, not bolted on.",
};

const BENEFITS: { icon: typeof FileText; title: string; body: string }[] = [
  { icon: FileText, title: "Built-in compliance", body: "The CoA gate, licence checks and ad filters are platform rules — you don't need your own compliance team to stay listed correctly." },
  { icon: Search, title: "Buyers who already trust the badge", body: "Lab-verified and AYUSH badges are shown automatically wherever your product qualifies — no separate marketing spend." },
  { icon: Wallet, title: "Predictable settlements", body: "Two-person sign-off on every payout run, and 30 days' notice before any commission change — so your cash flow isn't a surprise." },
  { icon: PackageCheck, title: "One dashboard, every order", body: "Inventory, orders, returns and settlement statements in a single seller console across all your compliance classes." },
];

const ONBOARDING_STEPS: { label: string; at?: string; state: "done" | "current" | "pending" | "failed" }[] = [
  { label: "Verify your business — GSTIN, bank account, and the FSSAI / AYUSH / NDPS licences for each class you'll sell in", at: "Typically same day", state: "done" },
  { label: "List your first product — attach a batch Certificate of Analysis for regulated classes; compliance reviews it batch-matched", at: "Review within a few business days", state: "current" },
  { label: "Go live — the listing switches on the moment its checks pass, and orders start flowing to your console", at: "Automatic on approval", state: "pending" },
];

const LICENCE_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"];

const LICENCE_REQUIREMENTS: Record<ComplianceClass, string> = {
  HEMP_FOOD: "Valid FSSAI food business licence. Standard packaged-food labelling and shelf-life documentation.",
  AYURVEDA: "AYUSH manufacturing/marketing licence for the specific formulation(s) you list.",
  CBD_WELLNESS: "AYUSH licence plus a batch Certificate of Analysis from an accredited lab for every batch, confirming THC ≤ 0.3%.",
  MED_CANNABIS: "Licensing under the applicable NDPS/state cannabis framework. Listings are never advertised and are visible only to buyers with a pharmacist-verified prescription.",
};

const COMMISSION_ROWS: { cls: string; rate: string; note: string }[] = [
  { cls: "One commission per sale", rate: "Simple", note: "A single rate on each order — nothing hidden" },
  { cls: "Payment collection", rate: "Included", note: "We collect from the buyer and settle to you" },
  { cls: "Shipping", rate: "Flat & fair", note: "One flat charge on smaller orders, free above the threshold" },
  { cls: "No surprise fees", rate: "Ever", note: "No supply-chain, listing or hidden platform charges" },
];

export default function SellPage() {
  return (
    <>
      <section className="vh-hero">
        <div className="vh-container">
          <div className="vh-eyebrow" style={{ color: "#9fd4b4", marginBottom: 12 }}>For sellers</div>
          <h1>Sell on Vedic Hemp</h1>
          <p style={{ marginTop: 10 }}>
            Reach verified buyers across hemp food, Ayurveda and CBD wellness — with the
            compliance machinery already built, so you can focus on product and fulfilment.
          </p>
          <div className="vh-row" style={{ gap: 12, marginTop: "var(--sp-4)", flexWrap: "wrap" }}>
            <Link href="/seller" className="vh-btn vh-btn-primary vh-btn-lg">
              Start selling
            </Link>
            <Link href="/trust" className="vh-btn vh-btn-ghost" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
              See how we verify products
            </Link>
          </div>
        </div>
      </section>

      <div className="vh-container" style={{ paddingBottom: "var(--sp-7)" }}>
        {/* ── Benefits ───────────────────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <SectionHead eyebrow="Why sell here" title="Compliance as a service, not a burden" />
          <div className="vh-grid cols-4">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
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
                <h3 style={{ fontSize: ".98rem", marginBottom: 4 }}>{title}</h3>
                <p className="small muted" style={{ marginBottom: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Three-step onboarding ──────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <SectionHead eyebrow="Onboarding" title="Three steps to your first order" />
          <Card>
            <Timeline nodes={ONBOARDING_STEPS} />
          </Card>
        </section>

        {/* ── Commission transparency (A5) ───────────────── */}
        <section id="commission" className="vh-section" style={{ paddingBottom: 0, scrollMarginTop: 90 }}>
          <SectionHead
            eyebrow="Fees"
            title="Commission, in the open"
            sub="Your exact rates are part of your Marketplace Agreement and are always visible in Seller Central once you register — and they can never change without 30 days' notice."
          />
          <div className="vh-split-wide" style={{ gap: "var(--sp-4)" }}>
            <Card pad0>
              <div style={{ overflowX: "auto" }}>
                <table className="vh-table">
                  <thead>
                    <tr><th>Category</th><th>Headline rate</th><th>Includes</th></tr>
                  </thead>
                  <tbody>
                    {COMMISSION_ROWS.map((r) => (
                      <tr key={r.cls}>
                        <td style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{r.cls}</td>
                        <td className="tabular">{r.rate}</td>
                        <td className="small muted">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="vh-card" style={{ background: "var(--vh-green-50)" }}>
              <div className="vh-row" style={{ gap: 10, marginBottom: 8 }}>
                <Percent size={17} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
                <h3 style={{ margin: 0, fontSize: ".98rem" }}>The 30-day rule (A5)</h3>
              </div>
              <p className="small muted" style={{ marginBottom: 8 }}>
                No commission change can take effect until at least 30 days after written notice
                is sent to you. This isn&apos;t a policy — it&apos;s a database constraint: the platform
                physically cannot post a fee schedule that starts earlier.
              </p>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Settlements are posted only after two different people sign off (maker–checker,
                A6), and posted statements are immutable.
              </p>
            </div>
          </div>
        </section>

        {/* ── Licence requirements ───────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <SectionHead eyebrow="Requirements" title="Licences by category" />
          <div className="vh-grid cols-2">
            {LICENCE_CLASSES.map((cls) => {
              const meta = CLASS_META[cls];
              return (
                <div key={cls} className="vh-card">
                  <div className="vh-row" style={{ gap: 8, marginBottom: 6 }}>
                    <BadgeCheck size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
                    <h3 style={{ margin: 0 }}>{meta.label}</h3>
                  </div>
                  <p className="small muted" style={{ marginBottom: 0 }}>{LICENCE_REQUIREMENTS[cls]}</p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "var(--sp-3)" }}>
            <Banner severity="warn" title="Medical Cannabis has no ads and no override">
              If you sell Medical Cannabis, understand upfront: there is no advertising path for
              this category, no bulk CoA approval, and no override for an unapproved batch. This is
              deliberate — see <Link href="/trust#prohibitions">our six prohibitions</Link>.
            </Banner>
          </div>
        </section>

        {/* ── Advertise cross-link ───────────────────────── */}
        <section id="advertise" className="vh-section" style={{ paddingBottom: 0, scrollMarginTop: 90 }}>
          <div className="vh-card vh-row" style={{ gap: "var(--sp-4)", flexWrap: "wrap" }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "var(--vh-ad-bg)", color: "var(--vh-ad)",
              }}
            >
              <Megaphone size={22} strokeWidth={2.2} />
            </span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3 style={{ marginBottom: 4 }}>Advertise with Vedic Hemp</h3>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Once you&apos;re live, book labelled placements on home, listings and product pages
                from the seller console. Every creative is reviewed before it runs, every
                placement is visibly marked &quot;Sponsored&quot;, and prescription-only (medical cannabis)
                products are never eligible for any placement (A1).
              </p>
            </div>
            <Link href="/seller" className="vh-btn vh-btn-outline">Open ad manager</Link>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────── */}
        <section className="vh-section" style={{ paddingBottom: 0 }}>
          <Card title="Selling here is a simple loop">
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              <li><b>Join.</b> Register with your licence details — your products are yours to list, price and present.</li>
              <li><b>Sell.</b> A buyer pays; the order lands in your Seller Central panel instantly.</li>
              <li><b>Ship.</b> Pack it, hand it to your delivery partner, and update the status the buyer tracks.</li>
              <li><b>Get paid.</b> Settlements arrive on schedule, with a clear statement for every order.</li>
            </ul>
            <p className="small muted" style={{ margin: "12px 0 0" }}>
              The full commercial terms — rates, fulfilment standards and return handling — are in
              your Marketplace Agreement, shared when you register and always available in Seller Central.
            </p>
          </Card>

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
