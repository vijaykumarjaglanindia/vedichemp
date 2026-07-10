/**
 * VEDIC HEMP — TRUST & LAB REPORTS (V2 reskin)
 *
 * Buyer-facing explanation of the compliance machinery: the CoA gate (A2), how
 * to read a lab report, licensing, the six prohibitions in plain language, age
 * gating, and how prescription access works (A4) without ever showing a
 * prescription image or a bare "view" link. Content unchanged from V1 — this
 * pass applies the V2 marketing rhythm (SectionHead, lucide icons, section
 * spacing).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  FileSearch,
  FlaskConical,
  Landmark,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Banner, Card, SectionHead, StatusPill } from "@/components/ui";

export const metadata: Metadata = {
  title: "Trust & Lab Reports",
  description: "How Vedic Hemp verifies products, sellers and prescriptions before anything ships.",
};

const PROHIBITIONS: { code: string; icon: typeof Lock; title: string; plain: string }[] = [
  {
    code: "A1",
    icon: ShieldCheck,
    title: "Medical Cannabis is never advertised",
    plain: "No ad, banner, search boost or recommendation will ever feature a prescription-only product — for anyone, under any circumstance.",
  },
  {
    code: "A2",
    icon: FlaskConical,
    title: "No lab report, no listing",
    plain: "A regulated product cannot go live for sale until an independent lab's Certificate of Analysis for that exact batch has been approved. There is no manual override.",
  },
  {
    code: "A3",
    icon: FileSearch,
    title: "Safety records can't be quietly edited",
    plain: "Adverse-event reports, recall records and audit logs cannot be deleted or altered after the fact. A correction is a new, linked record — the original stays visible.",
  },
  {
    code: "A4",
    icon: Lock,
    title: "Your health data has a locked door",
    plain: "Only a pharmacist or compliance reviewer can open a prescription, they must log why, and you are notified whenever it happens.",
  },
  {
    code: "A5",
    icon: CalendarCheck,
    title: "No surprise fee increases",
    plain: "Sellers get at least 30 days' written notice before any commission change takes effect — so pricing you see reflects fees a seller could plan around.",
  },
  {
    code: "A6",
    icon: Users,
    title: "No single person moves money alone",
    plain: "Every settlement or refund needs two different people: one who prepares it, one who approves it. It's a rule, not a policy on paper.",
  },
];

export default function TrustPage() {
  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
      <div className="vh-section-head">
        <div className="vh-eyebrow" style={{ marginBottom: 8 }}>Trust centre</div>
        <h1 className="vh-display" style={{ fontSize: "clamp(1.8rem, 1.3rem + 2vw, 2.6rem)" }}>Trust &amp; Lab Reports</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          Vedic Hemp is a regulated marketplace, not a general storefront. This page explains the
          checks that happen before a product, a seller or a prescription can touch a buyer.
        </p>
      </div>

      {/* ── CoA gate ──────────────────────────────────────── */}
      <section id="coa" className="vh-section" style={{ paddingBottom: 0, scrollMarginTop: 90 }}>
        <SectionHead eyebrow="A2 in practice" title="The Certificate of Analysis (CoA) gate" />
        <Card>
          <div className="vh-row" style={{ gap: 10, marginBottom: 12 }}>
            <FlaskConical size={18} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
            <strong style={{ color: "var(--vh-ink)" }}>Tested before it can be sold — every batch, no exceptions</strong>
          </div>
          <p>
            Every batch of a regulated product — Hemp Wellness/CBD or Medical Cannabis — is
            tested by an independent, accredited lab before it can be listed for sale. The
            listing only switches to <StatusPill tone="ok">LIVE</StatusPill> once that specific
            batch&apos;s report is marked <StatusPill tone="ok">APPROVED</StatusPill> and matched to
            the product by batch number. There is no bulk-approve, no &quot;force sellable&quot; flag and
            no senior-approval override for this gate — an override would simply be a licence to
            sell an untested cannabinoid product, so we didn&apos;t build one.
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            If a batch fails testing, or the report expires, the listing is pulled automatically —
            it does not wait for a human to notice.
          </p>
        </Card>
      </section>

      {/* ── How to read a lab report ─────────────────────── */}
      <section className="vh-section" style={{ paddingBottom: 0 }}>
        <SectionHead eyebrow="Read it yourself" title="How to read a lab report" />
        <Card>
          <div className="vh-grid cols-2">
            <div>
              <h3 className="small" style={{ textTransform: "uppercase", color: "var(--vh-muted)", letterSpacing: ".05em" }}>What&apos;s on it</h3>
              <ul className="small" style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <li><strong>Batch number</strong> — must match the number printed on your product.</li>
                <li><strong>Cannabinoid profile</strong> — the measured THC and CBD content.</li>
                <li><strong>THC ceiling</strong> — hemp-derived products must test at or below 0.3% THC.</li>
                <li><strong>Contaminant panel</strong> — heavy metals, pesticides, residual solvents, microbials.</li>
                <li><strong>Issuing lab &amp; accreditation</strong> — who tested it, and under what accreditation.</li>
                <li><strong>Test date</strong> — reports have a shelf life; stale reports don&apos;t keep a listing live.</li>
              </ul>
            </div>
            <div>
              <h3 className="small" style={{ textTransform: "uppercase", color: "var(--vh-muted)", letterSpacing: ".05em" }}>Where to find it</h3>
              <p className="small">
                Open any regulated product&apos;s page and look for the &quot;Lab Report / Certificate of
                Analysis&quot; card — it shows the batch status and a &quot;View CoA&quot; link. Non-regulated
                categories (Hemp Food, Ayurveda) ship under standard FSSAI/AYUSH manufacturing
                requirements instead of a batch CoA.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Licensing ─────────────────────────────────────── */}
      <section className="vh-section" style={{ paddingBottom: 0 }}>
        <SectionHead eyebrow="Licensing" title="AYUSH &amp; FSSAI, verified at the door" />
        <div className="vh-grid cols-2">
          <Card>
            <div className="vh-row" style={{ gap: 10, marginBottom: 8 }}>
              <BadgeCheck size={18} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
              <h3 style={{ margin: 0 }}>AYUSH licensing</h3>
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Ayurveda and Hemp Wellness/CBD sellers hold a licence under the Ministry of AYUSH
              before they can list in those categories. We verify the licence at seller
              onboarding and re-check it on renewal.
            </p>
          </Card>
          <Card>
            <div className="vh-row" style={{ gap: 10, marginBottom: 8 }}>
              <Landmark size={18} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
              <h3 style={{ margin: 0 }}>FSSAI licensing</h3>
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Hemp Food sellers (seed oil, protein, hearts) hold a valid FSSAI food business
              licence. Food-grade hemp products are held to the same standard as any packaged
              food sold in India.
            </p>
          </Card>
        </div>
      </section>

      {/* ── Six prohibitions ──────────────────────────────── */}
      <section id="prohibitions" className="vh-section" style={{ paddingBottom: 0, scrollMarginTop: 90 }}>
        <SectionHead
          eyebrow="The registry"
          title="Our six prohibitions"
          sub="Things the platform is built to be structurally incapable of — not settings someone could switch off. Each one is enforced by a database rule or a server check, not a promise."
        />
        <div className="vh-grid cols-2">
          {PROHIBITIONS.map(({ code, icon: Icon, title, plain }) => (
            <div key={code} className="vh-card">
              <div className="vh-row" style={{ gap: 10, marginBottom: 8 }}>
                <Icon size={17} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
                <span className="vh-pill vh-pill-neutral mono">{code}</span>
              </div>
              <h3 style={{ marginBottom: 6 }}>{title}</h3>
              <p className="small muted" style={{ marginBottom: 0 }}>{plain}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Age gating ────────────────────────────────────── */}
      <section className="vh-section" style={{ paddingBottom: 0 }}>
        <SectionHead eyebrow="18+" title="Age gating" />
        <Card>
          <p className="small" style={{ marginBottom: 0 }}>
            Hemp Wellness/CBD and Medical Cannabis are age-gated at 18+. You&apos;ll be asked to
            confirm your age at checkout for these categories, and delivery for age-gated orders
            requires an ID check on handover. This applies even if the buyer account itself is
            already verified — age gating is checked per order, at checkout, on the server.
          </p>
        </Card>
      </section>

      {/* ── Prescriptions ─────────────────────────────────── */}
      <section id="prescriptions" className="vh-section" style={{ paddingBottom: 0, scrollMarginTop: 90 }}>
        <SectionHead eyebrow="A4 in practice" title="How prescriptions work" />
        <Card>
          <p className="small">
            Medical Cannabis is prescription-only and is never shown in search, recommendations or
            advertising to anyone. To view or buy from this category, you:
          </p>
          <ol className="small" style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Sign in and upload a valid prescription to your account.</li>
            <li>A licensed pharmacist reviews and verifies it — every review is logged with a reason code.</li>
            <li>You&apos;re notified the moment your prescription is accessed or verified — access to your health data is never silent.</li>
            <li>Once verified, Medical Cannabis products become visible to you and only you, with a 5-minute signed link per view.</li>
          </ol>
          <Banner severity="info" title="We fail closed on this, not open">
            If the prescription-verification service is down, you simply can&apos;t unlock the category
            yet — we never fall back to &quot;show it anyway.&quot;
          </Banner>
          <div className="vh-row" style={{ marginTop: 14, gap: 10, flexWrap: "wrap" }}>
            <Link href="/account" className="vh-btn vh-btn-primary vh-btn-sm">Sign in to upload a prescription</Link>
            <span className="vh-row small muted" style={{ gap: 6 }}>
              <Bell size={14} strokeWidth={2.2} aria-hidden />
              You are notified on every access to your health data.
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
