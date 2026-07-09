/**
 * VEDIC HEMP — COMPLIANCE HUB (§3.9)
 *
 * The single landing page for every regulated workflow: prescription
 * verification (A4), lab report / CoA verification (A2), product recalls
 * (A3), restricted products, content moderation, advertisement review and
 * pharmacovigilance. COMPLIANCE_QUEUE is rendered here as the active
 * worklist that every sub-card ultimately feeds from.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner, ComplianceBadge } from "@/components/ui";
import { COMPLIANCE_QUEUE, AUDIT } from "@/lib/sample";

export const metadata: Metadata = { title: "Compliance · Admin" };

const SUB_CARDS = [
  { id: "rx", icon: "⚕️", title: "Prescription verification", href: "#rx", desc: "Pharmacist-only. Logged reason. Buyer notified on every view (A4)." },
  { id: "coa", icon: "🧪", title: "Lab report verification", href: "/admin/catalogue", desc: "Batch-matched CoA required before a regulated batch is sellable (A2)." },
  { id: "recall", icon: "🚨", title: "Product recall", href: "#recall", desc: "Maker–checker to initiate AND to close. Recall records are immutable (A3)." },
  { id: "restricted", icon: "🔒", title: "Restricted products", href: "#restricted", desc: "MED_CANNABIS eligibility and Rx-gated visibility rules." },
  { id: "moderation", icon: "🧹", title: "Content moderation", href: "#moderation", desc: "Reviews, seller storefront copy, product images." },
  { id: "ads", icon: "📣", title: "Advertisement review", href: "/admin/ads", desc: "Three-layer A1 enforcement — see the Ads console." },
  { id: "pv", icon: "🩺", title: "Pharmacovigilance / adverse events", href: "#pv", desc: "Adverse-event triage is a valid sensitive-access reason code." },
  { id: "logs", icon: "📜", title: "Compliance logs", href: "#logs", desc: "SensitiveAccessLog and AuditLog — append-only, never edited." },
];

export default function AdminCompliancePage() {
  return (
    <Shell active="/admin/compliance" breadcrumb={["Admin", "Compliance"]} title="Compliance hub">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Banner severity="warn" title="Sensitive reads require a logged reason">
          Viewing a prescription, medical note or consultation note is restricted to the Pharmacist and Compliance
          roles, requires a reason code from a controlled list plus ≥20 characters of free-text justification, and
          notifies the buyer. The access log write happens <strong>before</strong> the object key is resolved — if
          the log write fails, the read fails. There is no bare image link anywhere in this console.
        </Banner>

        <div className="vh-grid cols-4">
          {SUB_CARDS.map((c) => (
            <a key={c.id} href={c.href} className="vh-card" style={{ padding: 14, display: "block" }}>
              <div aria-hidden style={{ fontSize: "1.6rem", marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
              <div className="small muted">{c.desc}</div>
            </a>
          ))}
        </div>

        <Card title="Active worklist" action={<StatusPill tone={COMPLIANCE_QUEUE.length ? "warn" : "ok"}>{COMPLIANCE_QUEUE.length} open</StatusPill>}>
          <table className="vh-table">
            <thead>
              <tr><th>Kind</th><th>Subject</th><th>Class</th><th>SLA</th><th>Age</th><th>Action</th></tr>
            </thead>
            <tbody>
              {COMPLIANCE_QUEUE.map((q) => (
                <tr key={q.id}>
                  <td>{q.kind}</td>
                  <td>{q.subject}</td>
                  <td>{q.class ? <ComplianceBadge cls={q.class} /> : <span className="muted small">—</span>}</td>
                  <td>{q.sla}</td>
                  <td>
                    <StatusPill tone={q.ageHours >= 3 ? "warn" : "info"}>{q.ageHours}h</StatusPill>
                  </td>
                  <td>
                    <a className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/compliance#${q.id}`}>Claim</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Prescription (Rx) viewer flow" pad0={false}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Opening a prescription is never a direct link. The flow is: (1) pick a controlled reason code —{" "}
            <code>PRESCRIPTION_VERIFICATION</code>, <code>ADVERSE_EVENT_TRIAGE</code>, <code>REGULATORY_REQUEST</code>,{" "}
            <code>DISPUTE_EVIDENCE</code>; (2) write ≥20 characters explaining why now; (3) the signed URL that comes
            back has a 5-minute TTL and is watermarked; (4) the buyer receives a notification that their prescription
            was viewed, by whom (role, not always name) and why. Curiosity is not on the reason list.
          </p>
          <div className="vh-row" style={{ gap: 8 }}>
            <StatusPill tone="info">Reason code required</StatusPill>
            <StatusPill tone="info">≥20 char justification</StatusPill>
            <StatusPill tone="ok">Buyer notified</StatusPill>
            <StatusPill tone="warn">5-min signed URL TTL</StatusPill>
          </div>
        </Card>

        <Card title="Product recall">
          <p className="small muted" style={{ marginTop: 0 }}>
            Initiating a recall and closing a recall are both maker–checker actions — a single compliance officer
            cannot both declare and clear a safety incident. Recall records, like all safety records, cannot be
            deleted or altered once written (A3); a correction is a new row referencing the original.
          </p>
          <div className="vh-row" style={{ gap: 8 }}>
            <a className="vh-btn vh-btn-sm vh-btn-danger" href="#recall-initiate">Initiate recall (maker)</a>
            <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#recall-close">Close recall (needs checker)</a>
          </div>
        </Card>

        <Card title="Recent compliance activity" action={<span className="small muted">Pseudonymised · denied attempts included</span>}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {AUDIT.map((a) => (
              <li key={a.id} className="vh-row-between">
                <span className="small">
                  <span className="mono muted">{a.actor}</span> · {a.action.replace(/_/g, " ")} · reason {a.reason}
                </span>
                <StatusPill tone={a.outcome === "SUCCESS" ? "ok" : a.outcome === "DENIED" ? "danger" : "warn"}>{a.outcome}</StatusPill>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
