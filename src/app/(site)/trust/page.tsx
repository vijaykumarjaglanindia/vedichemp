/**
 * VEDIC HEMP — TRUST & LAB REPORTS
 *
 * Buyer-facing explanation of the compliance machinery: the CoA gate (A2), how
 * to read a lab report, licensing, the six prohibitions in plain language, age
 * gating, and how prescription access works (A4) without ever showing a
 * prescription image or a bare "view" link.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Card, Banner, StatusPill } from "@/components/ui";

export const metadata: Metadata = {
  title: "Trust & Lab Reports",
  description: "How Vedic Hemp verifies products, sellers and prescriptions before anything ships.",
};

const PROHIBITIONS: { code: string; title: string; plain: string }[] = [
  {
    code: "A1",
    title: "Medical Cannabis is never advertised",
    plain: "No ad, banner, search boost or recommendation will ever feature a prescription-only product — for anyone, under any circumstance.",
  },
  {
    code: "A2",
    title: "No lab report, no listing",
    plain: "A regulated product cannot go live for sale until an independent lab's Certificate of Analysis for that exact batch has been approved. There is no manual override.",
  },
  {
    code: "A3",
    title: "Safety records can't be quietly edited",
    plain: "Adverse-event reports, recall records and audit logs cannot be deleted or altered after the fact. A correction is a new, linked record — the original stays visible.",
  },
  {
    code: "A4",
    title: "Your health data has a locked door",
    plain: "Only a pharmacist or compliance reviewer can open a prescription, they must log why, and you are notified whenever it happens.",
  },
  {
    code: "A5",
    title: "No surprise fee increases",
    plain: "Sellers get at least 30 days' written notice before any commission change takes effect — so pricing you see reflects fees a seller could plan around.",
  },
  {
    code: "A6",
    title: "No single person moves money alone",
    plain: "Every settlement or refund needs two different people: one who prepares it, one who approves it. It's a rule, not a policy on paper.",
  },
];

export default function TrustPage() {
  return (
    <div className="vh-container" style={{ paddingTop: 28, paddingBottom: 56 }}>
      <div className="vh-page-head">
        <h1>Trust &amp; Lab Reports</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          Vedic Hemp is a regulated marketplace, not a general storefront. This page explains the
          checks that happen before a product, a seller or a prescription can touch a buyer.
        </p>
      </div>

      {/* ── CoA gate ──────────────────────────────────────── */}
      <section id="coa" style={{ marginBottom: 32 }}>
        <Card title="The Certificate of Analysis (CoA) gate">
          <p>
            Every batch of a regulated product — Hemp Wellness/CBD or Medical Cannabis — is
            tested by an independent, accredited lab before it can be listed for sale. The
            listing only switches to <StatusPill tone="ok">LIVE</StatusPill> once that specific
            batch's report is marked <StatusPill tone="ok">APPROVED</StatusPill> and matched to
            the product by batch number. There is no bulk-approve, no "force sellable" flag and
            no senior-approval override for this gate — an override would simply be a licence to
            sell an untested cannabinoid product, so we didn't build one.
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            If a batch fails testing, or the report expires, the listing is pulled automatically —
            it does not wait for a human to notice.
          </p>
        </Card>
      </section>

      {/* ── How to read a lab report ─────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <Card title="How to read a lab report">
          <div className="vh-grid cols-2">
            <div>
              <h3 className="small" style={{ textTransform: "uppercase", color: "var(--vh-muted)" }}>What's on it</h3>
              <ul className="small" style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <li><strong>Batch number</strong> — must match the number printed on your product.</li>
                <li><strong>Cannabinoid profile</strong> — the measured THC and CBD content.</li>
                <li><strong>THC ceiling</strong> — hemp-derived products must test at or below 0.3% THC.</li>
                <li><strong>Contaminant panel</strong> — heavy metals, pesticides, residual solvents, microbials.</li>
                <li><strong>Issuing lab &amp; accreditation</strong> — who tested it, and under what accreditation.</li>
                <li><strong>Test date</strong> — reports have a shelf life; stale reports don't keep a listing live.</li>
              </ul>
            </div>
            <div>
              <h3 className="small" style={{ textTransform: "uppercase", color: "var(--vh-muted)" }}>Where to find it</h3>
              <p className="small">
                Open any regulated product's page and look for the "Lab Report / Certificate of
                Analysis" card — it shows the batch status and a "View CoA" link. Non-regulated
                categories (Hemp Food, Ayurveda) ship under standard FSSAI/AYUSH manufacturing
                requirements instead of a batch CoA.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Licensing ─────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <Card title="Licensing: AYUSH &amp; FSSAI">
          <div className="vh-grid cols-2">
            <div>
              <h3 style={{ marginBottom: 6 }}>🪔 AYUSH licensing</h3>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Ayurveda and Hemp Wellness/CBD sellers hold a licence under the Ministry of AYUSH
                before they can list in those categories. We verify the licence at seller
                onboarding and re-check it on renewal.
              </p>
            </div>
            <div>
              <h3 style={{ marginBottom: 6 }}>🥗 FSSAI licensing</h3>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Hemp Food sellers (seed oil, protein, hearts) hold a valid FSSAI food business
                licence. Food-grade hemp products are held to the same standard as any packaged
                food sold in India.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Six prohibitions ──────────────────────────────── */}
      <section id="prohibitions" style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 4 }}>Our six prohibitions</h2>
        <p className="small muted" style={{ marginBottom: 16 }}>
          These are things the platform is built to be structurally incapable of — not settings
          someone could switch off. Each one is enforced by a database rule or a server check, not
          a promise.
        </p>
        <div className="vh-grid cols-2">
          {PROHIBITIONS.map((item) => (
            <div key={item.code} className="vh-card">
              <span className="vh-pill vh-pill-neutral mono" style={{ marginBottom: 8 }}>{item.code}</span>
              <h3 style={{ marginBottom: 6 }}>{item.title}</h3>
              <p className="small muted" style={{ marginBottom: 0 }}>{item.plain}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Age gating ────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <Card title="Age gating">
          <p className="small" style={{ marginBottom: 0 }}>
            Hemp Wellness/CBD and Medical Cannabis are age-gated at 18+. You'll be asked to
            confirm your age at checkout for these categories, and delivery for age-gated orders
            requires an ID check on handover. This applies even if the buyer account itself is
            already verified — age gating is checked per order, at checkout, on the server.
          </p>
        </Card>
      </section>

      {/* ── Prescriptions ─────────────────────────────────── */}
      <section id="prescriptions" style={{ marginBottom: 8 }}>
        <Card title="How prescriptions work">
          <p className="small">
            Medical Cannabis is prescription-only and is never shown in search, recommendations or
            advertising to anyone. To view or buy from this category, you:
          </p>
          <ol className="small" style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Sign in and upload a valid prescription to your account.</li>
            <li>A licensed pharmacist reviews and verifies it — every review is logged with a reason code.</li>
            <li>You're notified the moment your prescription is accessed or verified — access to your health data is never silent.</li>
            <li>Once verified, Medical Cannabis products become visible to you and only you, with a 5-minute signed link per view.</li>
          </ol>
          <Banner severity="info" title="We fail closed on this, not open">
            If the prescription-verification service is down, you simply can't unlock the category
            yet — we never fall back to "show it anyway."
          </Banner>
          <div style={{ marginTop: 14 }}>
            <Link href="/account" className="vh-btn vh-btn-primary vh-btn-sm">Sign in to upload a prescription</Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
