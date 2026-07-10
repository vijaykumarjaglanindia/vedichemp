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
import type { ReactNode } from "react";
import {
  Stethoscope, FlaskConical, Siren, Lock, Brush, Megaphone, HeartPulse, ScrollText,
  Timer, CheckCircle2, XCircle, Eye,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner, ComplianceBadge } from "@/components/ui";
import { COMPLIANCE_QUEUE, AUDIT } from "@/lib/sample";
import { SENSITIVE_ACCESS_24H, slaCountdown } from "../_lib/data";

export const metadata: Metadata = { title: "Compliance · Admin" };

const I = { size: 18, strokeWidth: 2.2 } as const;

const SUB_CARDS: { id: string; icon: ReactNode; title: string; href: string; desc: string }[] = [
  { id: "rx", icon: <Stethoscope {...I} aria-hidden />, title: "Prescription verification", href: "#rx", desc: "Pharmacist-only. Logged reason. Buyer notified on every view (A4)." },
  { id: "coa", icon: <FlaskConical {...I} aria-hidden />, title: "Lab report verification", href: "/admin/catalogue", desc: "Batch-matched CoA required before a regulated batch is sellable (A2)." },
  { id: "recall", icon: <Siren {...I} aria-hidden />, title: "Product recall", href: "#recall", desc: "Maker–checker to initiate AND to close. Recall records are immutable (A3)." },
  { id: "restricted", icon: <Lock {...I} aria-hidden />, title: "Restricted products", href: "#restricted", desc: "MED_CANNABIS eligibility and Rx-gated visibility rules." },
  { id: "moderation", icon: <Brush {...I} aria-hidden />, title: "Content moderation", href: "#moderation", desc: "Reviews, seller storefront copy, product images." },
  { id: "ads", icon: <Megaphone {...I} aria-hidden />, title: "Advertisement review", href: "/admin/ads", desc: "Three-layer A1 enforcement — see the Ads console." },
  { id: "pv", icon: <HeartPulse {...I} aria-hidden />, title: "Pharmacovigilance / adverse events", href: "#pv", desc: "Adverse-event triage is a valid sensitive-access reason code." },
  { id: "logs", icon: <ScrollText {...I} aria-hidden />, title: "Compliance logs", href: "#logs", desc: "SensitiveAccessLog and AuditLog — append-only, never edited." },
];

export default function AdminCompliancePage() {
  return (
    <Shell active="/admin/compliance" breadcrumb={["Admin", "Compliance"]} title="Compliance hub">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Banner severity="warn" title="Sensitive reads require a logged reason">
          Viewing a prescription, medical note or consultation note is restricted to the Pharmacist and Compliance
          roles, requires a reason code from a controlled list plus ≥20 characters of free-text justification, and
          notifies the buyer. The access log write happens <strong>before</strong> the object key is resolved — if
          the log write fails, the read fails. There is no bare image link anywhere in this console.
        </Banner>

        <div className="vh-grid cols-4">
          {SUB_CARDS.map((c) => (
            <a key={c.id} href={c.href} className="vh-card" style={{ padding: "var(--sp-3)", display: "block" }}>
              <div style={{ marginBottom: 8, color: "var(--vh-accent)" }}>{c.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
              <div className="small muted">{c.desc}</div>
            </a>
          ))}
        </div>

        <Card title="Active worklist" action={<StatusPill tone={COMPLIANCE_QUEUE.length ? "warn" : "ok"}>{COMPLIANCE_QUEUE.length} open</StatusPill>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr><th>Kind</th><th>Subject</th><th>Class</th><th>SLA</th><th>Countdown</th><th>Action</th></tr>
              </thead>
              <tbody>
                {COMPLIANCE_QUEUE.map((q) => {
                  const cd = slaCountdown(q.sla, q.ageHours);
                  return (
                    <tr key={q.id}>
                      <td>{q.kind}</td>
                      <td>{q.subject}</td>
                      <td>{q.class ? <ComplianceBadge cls={q.class} /> : <span className="muted small">—</span>}</td>
                      <td className="small">{q.sla} · age {q.ageHours}h</td>
                      <td>
                        <StatusPill tone={cd.tone}>
                          <Timer size={12} strokeWidth={2.2} aria-hidden /> {cd.label}
                        </StatusPill>
                      </td>
                      <td>
                        <a className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/compliance#${q.id}`}>Claim</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Stethoscope size={16} strokeWidth={2.2} aria-hidden /> Prescription (Rx) viewer flow</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Opening a prescription is never a direct link. The flow is: (1) pick a controlled reason code —{" "}
            <code>PRESCRIPTION_VERIFICATION</code>, <code>ADVERSE_EVENT_TRIAGE</code>, <code>REGULATORY_REQUEST</code>,{" "}
            <code>DISPUTE_EVIDENCE</code>; (2) write ≥20 characters explaining why now; (3) the signed URL that comes
            back has a 5-minute TTL and is watermarked; (4) the buyer receives a notification that their prescription
            was viewed, by whom (role, not always name) and why. Curiosity is not on the reason list.
          </p>
          <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <StatusPill tone="info">Reason code required</StatusPill>
            <StatusPill tone="info">≥20 char justification</StatusPill>
            <StatusPill tone="ok">Buyer notified</StatusPill>
            <StatusPill tone="warn">5-min signed URL TTL</StatusPill>
          </div>
        </Card>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Eye size={16} strokeWidth={2.2} aria-hidden /> Sensitive access — last 24h</span>}
          action={<span className="small muted">SensitiveAccessLog mirror · append-only (A3)</span>}
          pad0
        >
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr><th>At</th><th>Actor</th><th>Reason code</th><th>Subject</th><th>Buyer notified</th><th>Outcome</th></tr>
              </thead>
              <tbody>
                {SENSITIVE_ACCESS_24H.map((r) => {
                  const denied = r.outcome === "DENIED";
                  return (
                    <tr key={r.id} style={denied ? { background: "color-mix(in srgb, var(--vh-danger) 8%, transparent)" } : undefined}>
                      <td className="small muted">{r.at}</td>
                      <td>
                        <div className="mono small">{r.actor}</div>
                        <div className="small muted">{r.role}</div>
                      </td>
                      <td className="mono small">{r.reason}</td>
                      <td className="mono small">{r.subject}</td>
                      <td>
                        <span className="vh-row small" style={{ gap: 6 }}>
                          <CheckCircle2 size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} />
                          notified
                        </span>
                      </td>
                      <td>
                        <span className="vh-row small" style={{ gap: 6 }}>
                          {denied
                            ? <XCircle size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)" }} />
                            : <CheckCircle2 size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} />}
                          <StatusPill tone={denied ? "danger" : "ok"}>{r.outcome}</StatusPill>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0, padding: "12px 18px 16px" }}>
            The DENIED row is <code>support.varma</code> — the Support role does not hold the Rx-viewer scope, so the
            server refused before any key resolved. Denied attempts are logged and the buyer is notified of the
            attempt too.
          </p>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Siren size={16} strokeWidth={2.2} aria-hidden /> Product recall</span>}>
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
            {AUDIT.map((a) => {
              const denied = a.outcome === "DENIED";
              return (
                <li key={a.id} className="vh-row-between" style={{ gap: 8 }}>
                  <span className="small vh-row" style={{ gap: 8, minWidth: 0 }}>
                    {denied
                      ? <XCircle size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)", flexShrink: 0 }} />
                      : <CheckCircle2 size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)", flexShrink: 0 }} />}
                    <span>
                      <span className="mono muted">{a.actor}</span> · {a.action.replace(/_/g, " ")} · reason {a.reason}
                    </span>
                  </span>
                  <StatusPill tone={a.outcome === "SUCCESS" ? "ok" : denied ? "danger" : "warn"}>{a.outcome}</StatusPill>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
