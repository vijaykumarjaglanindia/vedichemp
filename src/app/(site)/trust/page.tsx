/**
 * VEDIC HEMP — HOW IT WORKS (marketplace model)
 *
 * Buyer-facing explanation of the marketplace: who lists, who ships, who is
 * responsible, and what the platform does. Vedic Hemp is an intermediary —
 * sellers submit their licences at account creation, list their own products,
 * and are responsible for the genuineness, quality and compliance of what they
 * list. The platform receives paid orders, forwards them to the seller, and
 * shows the delivery status the seller updates.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CreditCard,
  FileText,
  Lock,
  PackageCheck,
  RotateCcw,
  Send,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { Banner, Card, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Vedic Hemp is a marketplace: independent licensed sellers list their products, ship your order directly, and update its status. Here is exactly who does what.",
  alternates: { canonical: "/trust" },
};

const ORDER_FLOW = [
  { icon: CreditCard, title: "You place an order and pay", body: "Checkout totals are computed by the platform, never by the browser. Payment is captured before anything moves." },
  { icon: Send, title: "We forward your order to the seller", body: "The seller who listed the product receives your order details in their Seller Central panel." },
  { icon: Truck, title: "The seller packs and ships it", body: "The seller packs your order and hands it to their delivery partner (drop-ship model) — an order is marked shipped only after that handover." },
  { icon: PackageCheck, title: "The seller updates the status you track", body: "Accepted, packed, shipped, delivered — the status in your account is the status the seller maintains in their panel." },
];

const WHO_DOES_WHAT: { who: string; items: string[] }[] = [
  {
    who: "The seller",
    items: [
      "Submits their FSSAI / AYUSH / state licences when creating their account",
      "Lists their own products, prices, imagery and claims",
      "Uploads lab reports for regulated listings and keeps batches current",
      "Is responsible for the genuineness, quality and compliance of every listing",
      "Packs your order, hands it to their delivery partner on time, and updates its status",
      "Handles product questions and honours the stated return policy",
    ],
  },
  {
    who: "Vedic Hemp (the marketplace)",
    items: [
      "Runs the storefront, cart and secure checkout — totals are computed server-side",
      "Collects your payment on the seller's behalf and forwards the order to the seller",
      "Shows seller documents (licences, lab reports) on listings and storefronts, as uploaded by the seller",
      "Keeps prescription-only items invisible to buyers without a verified prescription — never advertised, ever",
      "Computes ratings from real orders only — a seller cannot edit or delete a review",
      "Refunds the buyer first when something goes wrong, then settles with the seller",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="vh-hero" style={{ padding: "clamp(36px, 4vw, 56px) 0" }}>
        <div className="vh-container">
          <span className="vh-eyebrow" style={{ color: "var(--vh-green-400)" }}>How it works</span>
          <h1 style={{ marginTop: 10 }}>A marketplace, honestly described.</h1>
          <p style={{ maxWidth: "60ch" }}>
            Products on Vedic Hemp are listed and sold by independent sellers — not by us.
            Sellers submit their licences when they join, ship every order through their
            delivery partner, and are responsible for what they list. Here is exactly who does what.
          </p>
        </div>
      </section>

      {/* ── Order flow ───────────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead eyebrow="Your order, step by step" title="From payment to doorstep" />
          <div className="vh-grid cols-4">
            {ORDER_FLOW.map(({ icon: Icon, title, body }, i) => (
              <Card key={title}>
                <span aria-hidden style={{ display: "inline-flex", width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "var(--vh-green-100)", color: "var(--vh-accent)", marginBottom: 12 }}>
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <div className="small muted" style={{ fontWeight: 800, letterSpacing: ".06em" }}>STEP {i + 1}</div>
                <h3 style={{ margin: "4px 0 6px" }}>{title}</h3>
                <p className="small" style={{ margin: 0 }}>{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who does what ────────────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead
            eyebrow="Responsibilities"
            title="Who does what"
            sub="A marketplace works when the roles are clear. These are ours and the sellers' — in plain language."
          />
          <div className="vh-grid cols-2">
            {WHO_DOES_WHAT.map((col) => (
              <Card key={col.who} title={col.who}>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 10 }}>
                  {col.items.map((it) => (
                    <li key={it} className="vh-row small" style={{ gap: 10, alignItems: "flex-start" }}>
                      <BadgeCheck size={15} aria-hidden style={{ color: "var(--vh-accent)", flexShrink: 0, marginTop: 2 }} />
                      {it}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: "var(--sp-4)" }}>
            <Banner severity="info" title="The short version">
              Sellers list, ship and stand behind their products. We run the marketplace, move your
              order to the right seller after payment, and make sure the rules below are enforced
              the same way for everyone.
            </Banner>
          </div>
        </div>
      </section>

      {/* ── Seller documents ─────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead
            eyebrow="Paperwork on the listing"
            title="Seller documents, where you can see them"
            sub="Sellers upload their licences at onboarding and lab reports per batch. We display what they upload — check the listing before you buy."
          />
          <div className="vh-grid cols-3">
            <Card>
              <FileText size={20} aria-hidden style={{ color: "var(--vh-accent)", marginBottom: 10 }} />
              <h3>Licences on the storefront</h3>
              <p className="small" style={{ margin: 0 }}>
                Every seller submits FSSAI / AYUSH / state licence details when creating their
                account. The licence numbers a seller provides are shown on their storefront.
              </p>
            </Card>
            <Card>
              <Store size={20} aria-hidden style={{ color: "var(--vh-accent)", marginBottom: 10 }} />
              <h3>Lab reports on the listing</h3>
              <p className="small" style={{ margin: 0 }}>
                For regulated products, sellers upload a batch lab report. You can open it from the
                product page — same document, no summary editing by anyone.
              </p>
            </Card>
            <Card>
              <Star size={20} aria-hidden style={{ color: "var(--vh-accent)", marginBottom: 10 }} />
              <h3>Reviews from real orders</h3>
              <p className="small" style={{ margin: 0 }}>
                Only a buyer who ordered a product can review it. Ratings are computed by the
                platform; sellers cannot edit or remove a review.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Buyer protections ────────────────────────────── */}
      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHead eyebrow="If something goes wrong" title="You are never the collateral" />
          <div className="vh-grid cols-3">
            <Card>
              <RotateCcw size={20} aria-hidden style={{ color: "var(--vh-accent)", marginBottom: 10 }} />
              <h3>Refund first, settle later</h3>
              <p className="small" style={{ margin: 0 }}>
                When a return or dispute goes your way, you are refunded first — the marketplace
                recovers from the seller afterwards. Your money never waits on that.
              </p>
            </Card>
            <Card>
              <Bell size={20} aria-hidden style={{ color: "var(--vh-accent)", marginBottom: 10 }} />
              <h3>Health data, disclosed access</h3>
              <p className="small" style={{ margin: 0 }}>
                If you upload a prescription, it is encrypted, viewable only by a pharmacist with a
                recorded reason — and you are notified every time it is opened.
              </p>
            </Card>
            <Card>
              <Lock size={20} aria-hidden style={{ color: "var(--vh-accent)", marginBottom: 10 }} />
              <h3>Data stays in India</h3>
              <p className="small" style={{ margin: 0 }}>
                Personal and payment data are held in Indian data centres. Card details never touch
                our servers — payments run through PCI-DSS processors.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Marketplace rules ────────────────────────────── */}
      <section className="vh-section">
        <div className="vh-container">
          <SectionHead
            eyebrow="Rules we enforce on everyone"
            title="Six rules that cannot be bought"
            sub="These apply to every seller and to the marketplace itself — enforced in the platform, not promised in a policy."
          />
          <Card>
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10 }} className="small">
              <li><b>Prescription medicine is never advertised</b> — no seller can pay to promote medical cannabis, and it never appears in search, deals or recommendations.</li>
              <li><b>Regulated listings need a batch lab report</b> — a seller cannot make a regulated batch sellable without uploading one that matches the batch.</li>
              <li><b>Safety records cannot be deleted</b> — adverse-event reports and order records are append-only, for sellers and for us.</li>
              <li><b>Prescriptions are read on the record</b> — pharmacist-only, reason logged, buyer notified.</li>
              <li><b>No retroactive fee changes for sellers</b> — commission changes take effect only after 30 days' notice.</li>
              <li><b>No single person moves money</b> — every payout and refund above threshold needs two different people to sign off.</li>
            </ol>
          </Card>
          <div className="vh-row" style={{ gap: 12, marginTop: "var(--sp-4)", flexWrap: "wrap" }}>
            <Link href="/catalogue" className="vh-btn vh-btn-primary">
              Browse the catalogue <ArrowRight size={15} aria-hidden />
            </Link>
            <Link href="/sell" className="vh-btn vh-btn-ghost">
              <ShieldCheck size={15} aria-hidden /> Become a seller
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
