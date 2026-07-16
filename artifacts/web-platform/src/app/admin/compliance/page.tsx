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
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Stethoscope, FlaskConical, Siren, Lock, Brush, Megaphone, HeartPulse, ScrollText,
  Timer, CheckCircle2, XCircle, Eye,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner, ComplianceBadge, EmptyState } from "@/components/ui";
import { COMPLIANCE_QUEUE, AUDIT } from "@/lib/sample";
import { SENSITIVE_ACCESS_24H, slaCountdown } from "../_lib/data";
import { closeRecall, initiateRecall, decidePrescriptionAction, revealPrescriptionAction } from "../actions";
import { pendingPrescriptions, allPrescriptions, accessLog, SENSITIVE_REASONS, reasonLabel } from "@/lib/prescriptions";

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

const RECALL_NOTES: Record<string, { sev: "ok" | "danger" | "warn"; title: string; body: string }> = {
  initiated: { sev: "ok", title: "Recall initiated (maker)", body: "Affected batches are frozen from sale immediately; a second, different compliance officer must review before the recall can ever be closed. The record is append-only (A3)." },
  denied: { sev: "danger", title: "Close denied — maker cannot be checker (A6)", body: "You initiated this recall, so you cannot also close it. The denied attempt has been logged. A different compliance officer must close it." },
  closed: { sev: "ok", title: "Recall closed (checker)", body: "A second, different compliance officer reviewed and closed the recall. Both the initiation and the close are in the audit trail — the record itself is append-only (A3)." },
  none: { sev: "warn", title: "No open recall", body: "There is no open recall to close." },
  reason: { sev: "warn", title: "Reason required", body: "Initiating a recall needs at least 20 characters of free-text reason — it is written into the immutable recall record." },
};

export default async function AdminCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ recall?: string; ref?: string; rx?: string; rxerr?: string }>;
}) {
  const { recall, ref, rx: rxDone, rxerr } = await searchParams;
  const rxPending = await pendingPrescriptions();
  const rxApproved = (await allPrescriptions()).filter((r) => r.status === "APPROVED");
  const liveAccess = await accessLog();
  const accessRows = liveAccess.length
    ? liveAccess.map((e) => ({ id: e.id, at: e.at, actor: e.viewer, role: e.viewerRole, reason: e.reasonCode, subject: e.prescriptionId, buyerNotified: e.buyerNotified, outcome: e.outcome }))
    : SENSITIVE_ACCESS_24H;
  const RX_MSG: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
    approve: { sev: "ok", text: "Prescription verified — the buyer can order eligible items, and they've been notified." },
    reject: { sev: "ok", text: "Prescription rejected — the buyer is asked to re-upload." },
    revealed: { sev: "ok", text: "Access logged and the buyer notified. A 5-minute, watermarked link was issued." },
    note: { sev: "danger", text: "A rejection needs a short reason (at least 10 characters)." },
    reasoncode: { sev: "danger", text: "Choose a reason from the controlled list — the access was denied and logged." },
    reasontext: { sev: "danger", text: "State why this must be viewed now (at least 20 characters) — the denied attempt was logged." },
    scope: { sev: "danger", text: "Only Pharmacist/Compliance may view health data — the attempt was denied and logged." },
    missing: { sev: "warn", text: "That prescription no longer exists." },
    state: { sev: "warn", text: "That prescription was already reviewed." },
  };
  const rxMsg = (rxDone && RX_MSG[rxDone]) || (rxerr && RX_MSG[rxerr]) || undefined;
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
            <Link key={c.id} href={c.href} className="vh-card" style={{ padding: "var(--sp-3)", display: "block" }}>
              <div style={{ marginBottom: 8, color: "var(--vh-accent)" }}>{c.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
              <div className="small muted">{c.desc}</div>
            </Link>
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
                        <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/compliance#${q.id}`}>Claim</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div id="rx" style={{ scrollMarginTop: 90 }}>
          {rxMsg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={rxMsg.sev}>{rxMsg.text}</Banner></div>}
          <Card
            title={<span className="vh-row" style={{ gap: 8 }}><Stethoscope size={16} strokeWidth={2.2} aria-hidden /> Prescription verification (A4)</span>}
            action={<StatusPill tone={rxPending.length ? "warn" : "ok"}>{rxPending.length} to verify</StatusPill>}
          >
            <p className="small muted" style={{ marginTop: 0 }}>
              A pharmacist verifies each prescription — a model may read fields, but only a human approves. Opening a
              prescription image is never a direct link: it needs a controlled reason code and ≥20 characters of
              justification, the access is logged before any link is issued, and the buyer is notified every time.
            </p>

            {/* Pending verification queue */}
            {rxPending.length === 0 ? (
              <div className="small muted" style={{ marginBottom: 12 }}>No prescriptions awaiting verification.</div>
            ) : (
              <div className="vh-grid" style={{ gap: 0, marginBottom: 12 }}>
                {rxPending.map((r) => (
                  <div key={r.id} style={{ borderTop: "1px solid var(--vh-line)", padding: "12px 0" }}>
                    <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap" }}>
                      <span>
                        <span className="mono small" style={{ fontWeight: 700 }}>{r.id}</span> · {r.buyerName}
                        <div className="small muted">{r.doctor} · {r.regNo} · valid till {r.validTill}</div>
                      </span>
                      <span className="vh-row" style={{ gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
                        <form action={decidePrescriptionAction}>
                          <input type="hidden" name="rxId" value={r.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit"><CheckCircle2 size={13} aria-hidden /> Verify</button>
                        </form>
                        <form action={decidePrescriptionAction} className="vh-row" style={{ gap: 6, alignItems: "flex-end" }}>
                          <input type="hidden" name="rxId" value={r.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <input className="vh-input vh-input-sm" name="note" placeholder="Reason (≥10)" style={{ width: 150 }} aria-label={`Reject reason for ${r.id}`} />
                          <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Reject</button>
                        </form>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reveal flow — logged reason, buyer notified */}
            <div style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 6 }}>Open a prescription image</div>
              {rxApproved.length === 0 ? (
                <div className="small muted">No verified prescriptions on file to open.</div>
              ) : (
                <form action={revealPrescriptionAction} className="vh-grid" style={{ gap: 10, maxWidth: 620 }}>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="rx-id">Prescription</label>
                    <select className="vh-input" id="rx-id" name="rxId" defaultValue={rxApproved[0]!.id}>
                      {rxApproved.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.buyerName}</option>)}
                    </select>
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="rx-reason">Reason code (controlled list)</label>
                    <select className="vh-input" id="rx-reason" name="reasonCode" defaultValue="">
                      <option value="" disabled>Choose a reason…</option>
                      {SENSITIVE_REASONS.map((c) => <option key={c} value={c}>{reasonLabel(c)}</option>)}
                    </select>
                  </div>
                  <div className="vh-field">
                    <label className="vh-label" htmlFor="rx-text">Why must this be viewed now? (≥20 characters)</label>
                    <textarea className="vh-input" id="rx-text" name="reasonText" rows={2} maxLength={300} required placeholder="Justification — not health data. The buyer sees that it was viewed and why." />
                  </div>
                  <div className="vh-row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button className="vh-btn vh-btn-sm vh-btn-outline" type="submit"><Eye size={13} aria-hidden /> Open (logs access, notifies buyer)</button>
                    <span className="vh-pill vh-pill-warn">Link is watermarked · 5-min TTL</span>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>

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
                {accessRows.map((r) => {
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
                          {r.buyerNotified
                            ? <><CheckCircle2 size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} /> notified</>
                            : <span className="muted">— not viewed</span>}
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
          <div id="recall" style={{ scrollMarginTop: 90 }}>
            {recall && RECALL_NOTES[recall] && (
              <div style={{ marginBottom: 12 }}>
                <Banner severity={RECALL_NOTES[recall].sev} title={ref ? `${RECALL_NOTES[recall].title} · ${ref}` : RECALL_NOTES[recall].title}>
                  {RECALL_NOTES[recall].body}
                </Banner>
              </div>
            )}
            <form action={initiateRecall} className="vh-grid" style={{ gap: 10, marginBottom: 10 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="recall-reason">Reason <span className="req">*</span></label>
                <textarea className="vh-textarea" id="recall-reason" name="reason" rows={2} minLength={20} maxLength={500} required placeholder="Batch, defect and source of the safety signal (min 20 characters)" />
              </div>
              <div className="vh-row" style={{ gap: 8 }}>
                <button type="submit" className="vh-btn vh-btn-sm vh-btn-danger">Initiate recall (maker)</button>
              </div>
            </form>
            <form action={closeRecall}>
              <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost">Close recall (needs checker)</button>
            </form>
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
