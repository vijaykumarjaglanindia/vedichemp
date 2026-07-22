/**
 * VEDIC HEMP — HELP CENTRE (buyers)
 *
 * One page that answers "where do I go?" — every common task as a card with
 * a direct link, a three-step first-order guide, and the FAQ. No dead ends:
 * everything here lands on a working page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  FlaskConical, Gift, LifeBuoy, PackageSearch, RotateCcw, ShieldCheck, Wallet,
} from "lucide-react";
import { Card, SectionHead } from "@/components/ui";
import { mdToHtml } from "@/lib/richtext";
import { parseFaqs, readSiteContent } from "@/lib/sitecontent";

export const metadata: Metadata = {
  title: "Help Centre",
  description: "Track orders, returns and refunds, batch verification, payments and wallet, prescriptions — every common task with a direct link, plus the FAQ.",
  alternates: { canonical: "/help" },
};

const TASKS = [
  { icon: PackageSearch, title: "Track an order", body: "Live status for every order — updated by the seller who ships it.", href: "/account/orders", cta: "Go to my orders" },
  { icon: RotateCcw, title: "Return or report a problem", body: "Start a return from the order itself. You're refunded first; we recover from the seller after.", href: "/account/orders", cta: "Start from my orders" },
  { icon: FlaskConical, title: "Verify the batch in your hands", body: "Enter the batch code from the pack and see its exact lab report and listing.", href: "/verify", cta: "Verify a batch" },
  { icon: Wallet, title: "Wallet, points & gift cards", body: "Check your balance, redeem a gift card, see loyalty points and referral credit.", href: "/account/wallet", cta: "Open my wallet" },
  { icon: ShieldCheck, title: "How the marketplace works", body: "Who lists, who ships, who's responsible — the whole model in plain language.", href: "/trust", cta: "Read how it works" },
  { icon: Gift, title: "Find a gift", body: "Pick a budget and a routine — the AI gift finder does the narrowing.", href: "/gifts", cta: "Open the gift finder" },
];

export default async function HelpCentrePage() {
  const content = await readSiteContent();
  const faqs = parseFaqs(content.homeFaqs ?? "");
  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
      <div className="vh-section-head">
        <span className="vh-eyebrow">Help Centre</span>
        <h1 className="vh-display" style={{ fontSize: "clamp(1.7rem, 1.2rem + 1.8vw, 2.4rem)", marginTop: 8 }}>
          What do you need to do?
        </h1>
        <p className="muted" style={{ maxWidth: "56ch" }}>
          Every card below goes straight to the page that does the job. Can&rsquo;t find it?{" "}
          <Link href="/account/support" style={{ fontWeight: 700 }}>Contact support</Link> — most order
          issues get a first response within a few hours.
        </p>
      </div>

      {/* First order in three steps */}
      <Card>
        <div className="vh-grid cols-3">
          {[
            ["1. Add to cart", "Browse the catalogue or search — every regulated listing shows its lab report before you buy."],
            ["2. Pay securely", "UPI, cards or netbanking at a one-page checkout. Your address book prefills everything."],
            ["3. Track to your door", "The seller packs and ships; you follow the same status they update, order to doorstep."],
          ].map(([t, b]) => (
            <div key={t}>
              <div style={{ fontWeight: 800, color: "var(--vh-ink)", marginBottom: 4 }}>{t}</div>
              <p className="small muted" style={{ margin: 0 }}>{b}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="vh-grid cols-3" style={{ marginTop: "var(--sp-3)" }}>
        {TASKS.map(({ icon: Icon, title, body, href, cta }) => (
          <Card key={title}>
            <span aria-hidden style={{ display: "inline-flex", padding: 8, borderRadius: 10, background: "var(--vh-green-100)", color: "var(--vh-accent)", marginBottom: 10 }}>
              <Icon size={17} strokeWidth={2.2} />
            </span>
            <h3 style={{ fontSize: ".98rem", marginBottom: 6 }}>{title}</h3>
            <p className="small muted" style={{ marginBottom: 10 }}>{body}</p>
            <Link href={href} className="small" style={{ fontWeight: 700 }}>{cta} →</Link>
          </Card>
        ))}
      </div>

      <section style={{ marginTop: "var(--sp-5)", maxWidth: 820 }}>
        <SectionHead eyebrow="FAQ" title="Common questions, straight answers" />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          {faqs.map((f) => (
            <details key={f.q} className="vh-card" style={{ padding: "var(--sp-3)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 800, color: "var(--vh-ink)" }}>{f.q}</summary>
              <div className="small muted vh-prose" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: mdToHtml(f.a) }} />
            </details>
          ))}
        </div>
      </section>

      <div className="vh-card" style={{ marginTop: "var(--sp-4)", background: "var(--vh-green-50)" }}>
        <div className="vh-row" style={{ gap: 10, flexWrap: "wrap" }}>
          <LifeBuoy size={18} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <strong style={{ color: "var(--vh-ink)" }}>Still stuck?</strong>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              Raise a ticket and it routes to the right team — prescription topics go to
              Pharmacist/Compliance only, and support agents can never open your Rx without a logged reason.
            </p>
          </div>
          <Link href="/account/support" className="vh-btn vh-btn-primary vh-btn-sm">Contact support</Link>
        </div>
      </div>
    </div>
  );
}
