/**
 * VEDIC HEMP — STORE & KYC (§2.2)
 *
 * Store profile, business/tax details, bank verification, licences and the
 * capability matrix a licence derives. An expired licence blocks the class
 * it unlocks — this is a server-side fact rendered here, not a UI opinion.
 * Separation of duties: no single user here can both edit payout bank
 * details and approve a settlement (A6-adjacent control on this console).
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, Banner } from "@/components/ui";
import { SELLER, LICENCES, CAPABILITY_MATRIX, daysUntil } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";

export const metadata: Metadata = { title: "Store & KYC" };

export default function StorePage() {
  return (
    <Shell active="/seller/store" breadcrumb={["Seller Central", "Store & KYC"]} title="Store & KYC">
      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: 18 }}>
        <Card title="Store profile">
          <div className="vh-grid" style={{ gap: 10 }}>
            <div className="vh-row-between"><span className="small muted">Store name</span><span>{SELLER.name}</span></div>
            <div className="vh-row-between"><span className="small muted">Registered state</span><span>{SELLER.state}</span></div>
            <div className="vh-row-between"><span className="small muted">Classes listed</span><span>{SELLER.classes.map((c) => CLASS_META[c].short).join(", ")}</span></div>
            <div className="vh-row-between"><span className="small muted">Account health</span><StatusPill tone="ok">{SELLER.healthScore}/100</StatusPill></div>
          </div>
        </Card>

        <Card title="Business & tax details">
          <div className="vh-grid" style={{ gap: 10 }}>
            <div className="vh-row-between"><span className="small muted">GSTIN</span><span className="mono">{SELLER.gstin}</span></div>
            <div className="vh-row-between"><span className="small muted">PAN</span><span className="mono">AABCV1234M</span></div>
            <div className="vh-row-between"><span className="small muted">Bank account</span><span className="mono">••••••4821</span></div>
            <div className="vh-row-between">
              <span className="small muted">Penny-drop verification</span>
              <StatusPill tone="ok">Verified — Kotak Mahindra Bank</StatusPill>
            </div>
          </div>
        </Card>
      </div>

      <div id="licences">
        <Card title="Licences" action={<a className="vh-btn vh-btn-sm vh-btn-ghost" href="#add-licence">+ Add licence</a>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th>Type</th><th>Number</th><th>Valid from</th><th>Valid to</th><th>Status</th><th>Unlocks</th>
                </tr>
              </thead>
              <tbody>
                {LICENCES.map((l) => {
                  const days = l.validTo ? daysUntil(l.validTo) : null;
                  const expiringSoon = days !== null && days <= 30;
                  return (
                    <tr key={l.type}>
                      <td>{l.type.replace("_", " ")}</td>
                      <td className="mono">{l.number ?? "—"}</td>
                      <td>{l.validFrom ?? "—"}</td>
                      <td>{l.validTo ?? "—"}</td>
                      <td>
                        <StatusPill tone={l.status === "VERIFIED" ? (expiringSoon ? "warn" : "ok") : l.status === "NOT_APPLIED" ? "neutral" : "danger"}>
                          {l.status === "VERIFIED" && expiringSoon ? `Verified — expires in ${days}d` : l.status.replace("_", " ")}
                        </StatusPill>
                      </td>
                      <td>{l.unlocks.map((c) => CLASS_META[c].short).join(", ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div style={{ height: 16 }} />

      <Card title="Capability matrix (derived from licences)">
        <p className="small muted" style={{ marginTop: 0 }}>
          A licence unlocks a compliance class; an expired or missing licence blocks it. Regulated classes additionally
          require an APPROVED, batch-matched CoA per batch before that batch can sell (A2).
        </p>
        <div className="vh-grid" style={{ gap: 10 }}>
          {CAPABILITY_MATRIX.map((row) => {
            const meta = CLASS_META[row.cls];
            const tone = row.capability === "LOCKED" ? "neutral" : row.capability === "ACTIVE_RENEW" ? "warn" : "ok";
            return (
              <div key={row.cls} className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: 10, padding: 12 }}>
                <span>
                  <div style={{ fontWeight: 600 }}>{meta.emoji} {meta.label}</div>
                  <div className="small muted">{row.note}</div>
                </span>
                <StatusPill tone={tone}>
                  {row.capability === "LOCKED" ? "Locked" : row.capability === "ACTIVE_RENEW" ? "Active — renew licence" : "Active"}
                </StatusPill>
              </div>
            );
          })}
        </div>
        {CAPABILITY_MATRIX.some((r) => r.cls === "MED_CANNABIS") && (
          <Banner severity="info" title="Medical Cannabis" icon="⚕️" >
            <span className="small">Even if this store obtains a State Drug licence in future, Medical Cannabis can never be advertised or
            promoted (A1) — that prohibition is independent of any licence held.</span>
          </Banner>
        )}
      </Card>

      <div style={{ height: 16 }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="KYC status">
          <div className="vh-row-between" style={{ marginBottom: 8 }}>
            <span className="small muted">Overall KYC</span>
            <StatusPill tone={toneForStatus(SELLER.kycState)}>{SELLER.kycState.replace(/_/g, " ")}</StatusPill>
          </div>
          <div className="small muted">Re-verification due annually. Next check: 1 Apr 2027.</div>
        </Card>

        <Card title="Users & roles">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            <li className="vh-row-between"><span>Priya Vedic (Owner)</span><StatusPill tone="ok">Active</StatusPill></li>
            <li className="vh-row-between"><span>Arun K. (Catalogue manager)</span><StatusPill tone="ok">Active</StatusPill></li>
            <li className="vh-row-between"><span>Nisha R. (Finance viewer)</span><StatusPill tone="ok">Active</StatusPill></li>
          </ul>
          <p className="small muted" style={{ marginTop: 10 }}>
            Separation of duties: the user who edits payout bank details can never be the same user who approves a
            settlement touching this store — that check runs on the marketplace side (A6).
          </p>
        </Card>
      </div>

      <div style={{ height: 16 }} />

      <Card title="Owner transfer">
        <p className="small muted" style={{ marginTop: 0 }}>
          Transferring ownership re-runs full KYC on the incoming owner and pauses payouts until it clears. This is a
          high-impact action — it requires a reason of at least 20 characters and is logged whether it succeeds or is
          denied.
        </p>
        <button className="vh-btn vh-btn-sm vh-btn-danger" type="button">Start owner transfer</button>
      </Card>
    </Shell>
  );
}
