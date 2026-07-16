/**
 * VEDIC HEMP — VENDOR VERIFICATION (KYC) · admin
 *
 * The real review queue for store verifications. Approve a store, ask for more
 * information, reject it, or revoke a live verification. Every decision is
 * audited and the seller is notified. Approval is what lets a store take
 * listings live (the gate lives on the seller's go-live action, not here).
 */

import type { Metadata } from "next";
import { ShieldCheck, BadgeCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { allKyc, statusLabel, licenceExpired, type KycStatus } from "@/lib/vendor";
import { decideVendorKyc, revokeVendorKyc } from "../actions";

export const metadata: Metadata = { title: "Vendor verification · Admin" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { sev: "ok" | "danger"; text: string }> = {
  approve: { sev: "ok", text: "Verified — the store can take its listings live." },
  more_info: { sev: "ok", text: "Sent back for more information — the seller is notified." },
  reject: { sev: "ok", text: "Rejected — the seller is notified with the reason." },
  revoke: { sev: "ok", text: "Verification paused — the store can no longer take listings live until it re-verifies." },
  note: { sev: "danger", text: "That decision needs a short reason (at least 10 characters)." },
  state: { sev: "danger", text: "That store isn't in a state this action can change." },
  missing: { sev: "danger", text: "No verification record for that store." },
};

const TONE: Record<KycStatus, "ok" | "warn" | "danger" | "neutral"> = {
  NOT_STARTED: "neutral", SUBMITTED: "warn", APPROVED: "ok", MORE_INFO: "warn", REJECTED: "danger", SUSPENDED: "danger",
};

export default async function AdminVerificationPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string }> }) {
  const { done, err } = await searchParams;
  const records = await allKyc();
  const pending = records.filter((r) => r.status === "SUBMITTED").length;
  const msg = (done && MESSAGES[done]) || (err && MESSAGES[err]) || undefined;

  return (
    <Shell active="/admin/verification" breadcrumb={["Admin", "People", "Vendor verification"]} title="Vendor verification (KYC)"
      actions={<StatusPill tone={pending ? "warn" : "ok"}>{pending} to review</StatusPill>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      <Card title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck size={16} strokeWidth={2.2} aria-hidden /> Stores</span>} pad0>
        {records.length === 0 ? (
          <div style={{ padding: 12 }}><EmptyState icon="🛡️" headline="No stores yet" sub="Store verification submissions appear here." /></div>
        ) : (
          <div className="vh-grid" style={{ gap: 0 }}>
            {records.map((r) => (
              <div key={r.store} style={{ padding: "14px 16px", borderBottom: "1px solid var(--vh-line)" }}>
                <div className="vh-row-between" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="vh-row" style={{ gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>{r.store}</span>
                      <StatusPill tone={TONE[r.status]}>{r.status === "APPROVED" ? <><BadgeCheck size={12} aria-hidden /> Verified</> : statusLabel(r.status)}</StatusPill>
                      {licenceExpired(r) && <StatusPill tone="danger">Licence expired</StatusPill>}
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      {r.legalName} · GSTIN <span className="mono">{r.gstin}</span> · PAN <span className="mono">{r.pan}</span>
                    </div>
                    <div className="small muted">
                      {r.city}, {r.state} {r.pincode} · payout ••••{r.bankAccountLast4} {r.bankIfsc}
                      {r.drugLicenceNo && <> · licence <span className="mono">{r.drugLicenceNo}</span> (exp {r.drugLicenceExpiry})</>}
                    </div>
                    <div className="small muted" style={{ marginTop: 2 }}>
                      Sells: {r.classes.map((c) => c.replace(/_/g, " ").toLowerCase()).join(", ")}
                      {r.submittedAt && <> · submitted {r.submittedAt}</>}
                    </div>
                    {r.note && <div className="small" style={{ marginTop: 4, color: "var(--vh-warn)" }}>Note: {r.note}</div>}
                  </div>

                  <div className="vh-grid" style={{ gap: 8, justifyItems: "end" }}>
                    {r.status === "SUBMITTED" && (
                      <>
                        <form action={decideVendorKyc}>
                          <input type="hidden" name="store" value={r.store} />
                          <input type="hidden" name="decision" value="approve" />
                          <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Approve</button>
                        </form>
                        <form action={decideVendorKyc} className="vh-row" style={{ gap: 6, alignItems: "flex-end" }}>
                          <input type="hidden" name="store" value={r.store} />
                          <input type="hidden" name="decision" value="more_info" />
                          <input className="vh-input vh-input-sm" name="note" placeholder="What's needed" style={{ width: 160 }} aria-label={`More info reason for ${r.store}`} />
                          <button className="vh-btn vh-btn-sm" type="submit">Ask for more</button>
                        </form>
                        <form action={decideVendorKyc} className="vh-row" style={{ gap: 6, alignItems: "flex-end" }}>
                          <input type="hidden" name="store" value={r.store} />
                          <input type="hidden" name="decision" value="reject" />
                          <input className="vh-input vh-input-sm" name="note" placeholder="Reason" style={{ width: 160 }} aria-label={`Reject reason for ${r.store}`} />
                          <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Reject</button>
                        </form>
                      </>
                    )}
                    {r.status === "APPROVED" && (
                      <form action={revokeVendorKyc} className="vh-row" style={{ gap: 6, alignItems: "flex-end" }}>
                        <input type="hidden" name="store" value={r.store} />
                        <input className="vh-input vh-input-sm" name="note" placeholder="Reason to pause" style={{ width: 170 }} aria-label={`Revoke reason for ${r.store}`} />
                        <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Pause verification</button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}
