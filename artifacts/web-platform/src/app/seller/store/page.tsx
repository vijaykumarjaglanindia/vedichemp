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
import { ExternalLink, Plus, Users, BadgeCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, Banner, Rating } from "@/components/ui";
import { SELLER, LICENCES, CAPABILITY_MATRIX, STORE_PREVIEW, daysUntil } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";
import { groupIndian } from "@/lib/money";
import { requestOwnerTransfer } from "../actions";

export const metadata: Metadata = { title: "Store & KYC" };

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ transfer?: string; err?: string }>;
}) {
  const { transfer, err } = await searchParams;
  return (
    <Shell active="/seller/store" breadcrumb={["Seller Central", "Store & KYC"]} title="Store & KYC">
      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        {/* Storefront preview */}
        <Card
          title="Storefront preview"
          action={
            <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/store/${STORE_PREVIEW.handle}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ExternalLink size={13} strokeWidth={2.2} aria-hidden /> View live store
            </a>
          }
          pad0
        >
          <div style={{ height: 88, background: "linear-gradient(120deg, var(--vh-green-700), var(--vh-green-500))", borderRadius: "var(--vh-radius) var(--vh-radius) 0 0" }} aria-hidden />
          <div style={{ padding: "0 18px 18px" }}>
            <div className="vh-row" style={{ gap: 14, marginTop: -28, alignItems: "flex-end" }}>
              <span
                aria-hidden
                style={{
                  width: 56, height: 56, borderRadius: 14, background: "var(--vh-surface)",
                  border: "1px solid var(--vh-line)", boxShadow: "var(--vh-shadow-sm)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "1.3rem", color: "var(--vh-green-700)",
                }}
              >
                {SELLER.name.charAt(0)}
              </span>
              <div style={{ paddingBottom: 4 }}>
                <div className="vh-row" style={{ gap: 6, fontWeight: 800 }}>
                  {SELLER.name}
                  <BadgeCheck size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
                </div>
                <div className="small muted">/store/{STORE_PREVIEW.handle}</div>
              </div>
            </div>
            <p className="small muted" style={{ margin: "10px 0" }}>{STORE_PREVIEW.tagline}</p>
            <div className="vh-row" style={{ gap: 16, flexWrap: "wrap" }}>
              <span className="vh-row small" style={{ gap: 6, fontWeight: 700 }}>
                <Users size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} />
                {groupIndian(STORE_PREVIEW.followers)} followers
              </span>
              <Rating value={STORE_PREVIEW.rating} count={STORE_PREVIEW.reviewCount} />
            </div>
          </div>
        </Card>

        {/* Store profile + business details as V2 form */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Store profile" action={<StatusPill tone="ok">{SELLER.healthScore}/100 health</StatusPill>}>
            <div className="vh-grid cols-2" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="storeName">Store name</label>
                <input className="vh-input" id="storeName" name="storeName" type="text" defaultValue={SELLER.name} maxLength={60} />
                <span className="vh-help">{SELLER.name.length}/60 · shown on every listing</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="regState">Registered state</label>
                <input className="vh-input" id="regState" name="regState" type="text" defaultValue="Karnataka" readOnly />
                <span className="vh-help">Changing state re-runs KYC.</span>
              </div>
            </div>
            <div className="vh-row-between" style={{ marginTop: 12 }}>
              <span className="small muted">Classes listed</span>
              <span className="small" style={{ fontWeight: 600 }}>{SELLER.classes.map((c) => CLASS_META[c].short).join(", ")}</span>
            </div>
          </Card>

          <Card title="Business & tax details">
            <div className="vh-grid" style={{ gap: 8 }}>
              <div className="vh-row-between"><span className="small muted">GSTIN</span><span className="mono small">{SELLER.gstin}</span></div>
              <div className="vh-row-between"><span className="small muted">PAN</span><span className="mono small">AABCV1234M</span></div>
              <div className="vh-row-between"><span className="small muted">Bank account</span><span className="mono small">••••••4821</span></div>
              <div className="vh-row-between">
                <span className="small muted">Penny-drop verification</span>
                <StatusPill tone="ok">Verified — Kotak Mahindra Bank</StatusPill>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div id="licences">
        <Card
          title="Licences"
          action={
            <a className="vh-btn vh-btn-sm vh-btn-primary" href="#add-licence" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={13} strokeWidth={2.2} aria-hidden /> Add licence
            </a>
          }
          pad0
        >
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
                      <td style={{ fontWeight: 600 }}>{l.type.replace("_", " ")}</td>
                      <td className="mono">{l.number ?? "—"}</td>
                      <td className="tabular">{l.validFrom ?? "—"}</td>
                      <td className="tabular">{l.validTo ?? "—"}</td>
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

      <div style={{ height: "var(--sp-3)" }} />

      <Card title="Capability matrix (derived from licences)">
        <p className="small muted" style={{ marginTop: 0 }}>
          A licence unlocks a compliance class; an expired or missing licence blocks it. Regulated classes additionally
          require an APPROVED, batch-matched CoA per batch before that batch can sell (A2).
        </p>
        <div className="vh-grid" style={{ gap: 8 }}>
          {CAPABILITY_MATRIX.map((row) => {
            const meta = CLASS_META[row.cls];
            const tone = row.capability === "LOCKED" ? "neutral" : row.capability === "ACTIVE_RENEW" ? "warn" : "ok";
            return (
              <div key={row.cls} className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: 12 }}>
                <span>
                  <div style={{ fontWeight: 600 }}><span aria-hidden>{meta.emoji}</span> {meta.label}</div>
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
          <Banner severity="info" title="Medical Cannabis" icon="⚕️">
            <span className="small">Even if this store obtains a State Drug licence in future, Medical Cannabis can never be advertised or
            promoted (A1) — that prohibition is independent of any licence held.</span>
          </Banner>
        )}
      </Card>

      <div style={{ height: "var(--sp-3)" }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="KYC status">
          <div className="vh-row-between" style={{ marginBottom: 8 }}>
            <span className="small muted">Overall KYC</span>
            <StatusPill tone={toneForStatus(SELLER.kycState)}>{SELLER.kycState.replace(/_/g, " ")}</StatusPill>
          </div>
          <div className="small muted">Re-verification due annually. Next check: 1 Apr 2027.</div>
        </Card>

        <Card title="Users & roles">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
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

      <div style={{ height: "var(--sp-3)" }} />

      <Card title="Owner transfer">
        {transfer === "requested" ? (
          <Banner severity="ok" title="Transfer request logged">
            The incoming owner receives a KYC link; payouts pause until it clears. The request — and
            every decision on it — is written to the audit trail.
          </Banner>
        ) : (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              Transferring ownership re-runs full KYC on the incoming owner and pauses payouts until it clears. This is a
              high-impact action — it requires a reason of at least 20 characters and is logged whether it succeeds or is
              denied.
            </p>
            {err === "reason" && (
              <div style={{ marginBottom: 12 }}>
                <Banner severity="danger">A reason of at least 20 characters is required — the request was denied and the denial logged.</Banner>
              </div>
            )}
            <form action={requestOwnerTransfer} className="vh-grid" style={{ gap: 12, maxWidth: 560 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="transfer-reason">Reason <span className="req">*</span></label>
                <textarea className="vh-textarea" id="transfer-reason" name="reason" rows={2} minLength={20} maxLength={500} required placeholder="Why is ownership changing? (min 20 characters)" />
              </div>
              <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" style={{ justifySelf: "start" }}>Start owner transfer</button>
            </form>
          </>
        )}
      </Card>
    </Shell>
  );
}
