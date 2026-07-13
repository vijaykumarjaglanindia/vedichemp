/**
 * VEDIC HEMP — SELLER GUIDE (getting started + how-tos)
 *
 * The setup path in order, then a how-to card for every console area.
 * Each step links to the exact page that does the job, with the compliance
 * gates explained in one line so nothing feels like a surprise later.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { Shell } from "../Shell";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Help & guide" };

const SETUP_STEPS = [
  { step: "Add your licences", body: "FSSAI for foods, AYUSH for wellness — your licence set decides which categories unlock.", href: "/seller/store", cta: "Store & KYC" },
  { step: "List your first product", body: "Pick a class you're licensed for, write factual copy (the copy-check blocks disease claims), submit for review.", href: "/seller/products/new", cta: "Add product" },
  { step: "Attach the batch CoA", body: "Regulated listings go live only after an approved, batch-matched lab report — there is no override, so upload it early.", href: "/seller/products", cta: "Products" },
  { step: "Publish your storefront story", body: "Your tagline and story appear on your public store page the moment you publish them.", href: "/seller/store", cta: "Storefront copy" },
  { step: "Ship your first order", body: "Accept → pack → hand to your delivery partner. Mark shipped only after handover; the buyer tracks the status you set.", href: "/seller/orders", cta: "Orders" },
];

const HOW_TOS = [
  { title: "Answer questions & reviews", body: "Reply factually from Customers — replies pass the copy-check, then moderation. Fast replies protect account health.", href: "/seller/customers" },
  { title: "Run a promotion", body: "Create coupons and campaigns in Marketing. Prescription products are never promotable — the form won't let you.", href: "/seller/marketing" },
  { title: "Advertise on the marketplace", body: "Sponsored placements are labelled and reviewed. Budgets and creatives live in Vedic Ads.", href: "/seller/ads" },
  { title: "Track money", body: "Settlements post on schedule with two-person sign-off. Statements are immutable once posted — download CSVs in Finance.", href: "/seller/finance" },
  { title: "Watch stock", body: "Inventory shows sell-through and reorder points; a new batch needs its own CoA before it sells.", href: "/seller/inventory" },
  { title: "Let the AI draft it", body: "Descriptions, keywords, pricing and forecasts — suggestions only, always claims-checked, never auto-applied.", href: "/seller/assistant" },
];

export default async function SellerHelpPage() {
  return (
    <Shell active="/seller/help" breadcrumb={["Seller Central", "Help & guide"]} title="Help & guide">
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><GraduationCap size={16} strokeWidth={2.2} aria-hidden /> Getting started — five steps to your first sale</span>}>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {SETUP_STEPS.map((s, i) => (
              <li key={s.step} className="vh-row" style={{ gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: "var(--vh-green-100)", color: "var(--vh-accent)", fontWeight: 800, fontSize: ".8rem", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: "var(--vh-ink)", display: "block" }}>{s.step}</span>
                  <span className="small muted">{s.body}</span>
                </span>
                <Link href={s.href} className="vh-btn vh-btn-sm vh-btn-outline" style={{ flexShrink: 0 }}>{s.cta}</Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="How do I…">
          <div className="vh-grid cols-3">
            {HOW_TOS.map((h) => (
              <Link key={h.title} href={h.href} className="vh-card" style={{ display: "block", color: "inherit" }}>
                <div className="vh-row" style={{ gap: 8, marginBottom: 6 }}>
                  <CheckCircle2 size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
                  <strong style={{ color: "var(--vh-ink)", fontSize: ".95rem" }}>{h.title}</strong>
                </div>
                <p className="small muted" style={{ margin: 0 }}>{h.body}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="The three rules that never bend">
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            <li><strong style={{ color: "var(--vh-ink)" }}>No disease claims, anywhere.</strong> Copy that says cure/treat/prevent is blocked at save — describe composition and traditional use instead.</li>
            <li><strong style={{ color: "var(--vh-ink)" }}>No CoA, no sale.</strong> A regulated batch cannot go live without an approved, batch-matched lab report. Nobody can override this — including us.</li>
            <li><strong style={{ color: "var(--vh-ink)" }}>Buyers are refunded first.</strong> Disputes never hold the buyer hostage; recovery happens between the platform and you afterwards.</li>
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
