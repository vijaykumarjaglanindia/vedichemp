/**
 * VEDIC HEMP — MARKETING (§0.4 IA)
 *
 * Coupons, lifecycle campaigns (email/SMS/push/WhatsApp), loyalty and
 * referrals. Lifecycle campaign copy is a REAL gate, not a badge: every send
 * runs the same disease-claim check as ad creatives AND the §6 health-data
 * guard server-side (src/lib/marketing.ts). A campaign that implies a medical
 * benefit, or carries a diagnosis in its subject/body, is BLOCKED and can never
 * be sent — a coupon headline that promises to treat something is a compliance
 * defect, not a marketing style choice. The send gate lives on the server; this
 * page only renders what the gate decided.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Mail, MessageSquare, MessageCircle, BellRing, TicketPercent, UsersRound, Gift, Sprout, Send, ShieldAlert, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, MoneyText, Banner } from "@/components/ui";
import { CampaignLabel } from "@/components/ui/ads";
import { AUDIENCES } from "../_lib/data";
import { listCampaigns, CHANNELS, type Channel, type CampaignStatus, type ScreenReason } from "@/lib/marketing";
import { couponLive, readCoupons, type CouponDef } from "@/lib/commerce";
import { createCampaignAction, approveCampaignAction, sendCampaignAction } from "./actions";

export const metadata: Metadata = { title: "Marketing · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;

/** The same status a coupon shows on the dedicated /admin/coupons console —
 *  derived from the real store, never a static label. */
function couponStatus(c: CouponDef): { tone: "ok" | "warn" | "danger"; label: string } {
  if (!c.enabled) return { tone: "warn", label: "Paused" };
  if (c.validTo && new Date().toISOString().slice(0, 10) > c.validTo) return { tone: "danger", label: "Expired" };
  if (c.usageLimit !== undefined && (c.usedCount ?? 0) >= c.usageLimit) return { tone: "danger", label: "Used up" };
  return { tone: "ok", label: "Active" };
}

const CHANNEL_ICON: Record<string, ReactNode> = {
  Email: <Mail {...I} aria-hidden />,
  SMS: <MessageSquare {...I} aria-hidden />,
  WhatsApp: <MessageCircle {...I} aria-hidden />,
  Push: <BellRing {...I} aria-hidden />,
};

const STATUS_TONE: Record<CampaignStatus, "ok" | "warn" | "danger" | "info"> = {
  APPROVED: "ok",
  PENDING_COPY_CHECK: "warn",
  BLOCKED: "danger",
  SENT: "info",
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  APPROVED: "Approved",
  PENDING_COPY_CHECK: "Pending copy-check",
  BLOCKED: "Blocked",
  SENT: "Sent",
};

const REASON_TEXT: Record<ScreenReason, string> = {
  claims: "Blocked: the copy claims to cure / treat / prevent / diagnose — barred by the Drugs & Magic Remedies Act.",
  health: "Blocked: the copy carries a diagnosis, symptom or named condition. Health data never rides out in a send.",
  cbd: "Mentions a CBD Wellness product — held until a reviewer confirms it makes no medical-benefit claim.",
  clean: "Cleared automatically — no CBD mention, no claim, no health data.",
};

const MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  approved: { sev: "ok", text: "Campaign cleared automatically — no claim, no health data. It's ready to send." },
  pending: { sev: "warn", text: "Campaign held at PENDING_COPY_CHECK — it mentions a CBD Wellness product. A reviewer must clear it before it can send." },
  cleared: { sev: "ok", text: "Copy-check cleared. The campaign is APPROVED and can now be sent." },
  sent: { sev: "ok", text: "Campaign sent. The send gate confirmed it was APPROVED first." },
  blocked: { sev: "danger", text: "Campaign BLOCKED — its copy tripped the claims or §6 health-data guard. It is stored as a flagged attempt and can never be sent." },
  claims: { sev: "danger", text: "Blocked on re-screen: the copy claims to cure / treat / prevent / diagnose. It cannot be approved." },
  health: { sev: "danger", text: "Blocked on re-screen: the copy carries health data. It cannot be approved." },
  reason: { sev: "danger", text: "Approval needs a reason of at least 20 characters — a copy-check sign-off is an accountable action." },
  state: { sev: "warn", text: "That campaign isn't awaiting a copy-check." },
  send_not_approved: { sev: "danger", text: "Send refused: the campaign is not APPROVED. Fail closed — only a cleared campaign goes out." },
  send_already_sent: { sev: "warn", text: "That campaign was already sent." },
  send_missing: { sev: "danger", text: "No such campaign." },
  channel: { sev: "danger", text: "Pick a valid channel (Email / SMS / WhatsApp / Push)." },
  name: { sev: "danger", text: "Campaign name should be 4–80 characters." },
  subject: { sev: "danger", text: "Subject should be 3–120 characters." },
  body: { sev: "danger", text: "Message body should be 8–600 characters." },
  audience: { sev: "danger", text: "Rejected: an audience is never built from health data. Name the segment by behaviour or product interest, never by a condition." },
};

export default async function AdminMarketingPage({ searchParams }: { searchParams: Promise<{ mk?: string; r?: string }> }) {
  const { mk } = await searchParams;
  const campaigns = await listCampaigns();
  // Real coupon store — the same one the cart honours and /admin/coupons edits.
  // Show the most-redeemed few here; the full console manages all of them.
  const coupons = Object.entries(await readCoupons())
    .map(([code, c]) => ({ code, ...c }))
    .sort((a, b) => (b.usedCount ?? 0) - (a.usedCount ?? 0))
    .slice(0, 6);
  const liveCount = Object.values(await readCoupons()).filter(couponLive).length;
  const msg = mk ? MESSAGES[mk] : undefined;
  const pendingN = campaigns.filter((c) => c.status === "PENDING_COPY_CHECK").length;
  const blockedN = campaigns.filter((c) => c.status === "BLOCKED").length;

  return (
    <Shell active="/admin/marketing" breadcrumb={["Admin", "Marketing"]} title="Marketing"
      actions={<a className="vh-btn vh-btn-sm vh-btn-primary vh-row" href="#new" style={{ gap: 6 }}><Plus size={14} aria-hidden /> New campaign</a>}
    >
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {msg && <Banner severity={msg.sev}>{msg.text}</Banner>}

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><TicketPercent {...I} aria-hidden /> Coupons</span>}
          action={
            <span className="vh-row small" style={{ gap: 8 }}>
              <StatusPill tone="ok">{liveCount} live</StatusPill>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/coupons">Manage coupons</a>
            </span>
          }
          pad0
        >
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Code</th><th>Description</th><th style={{ textAlign: "right" }}>Uses</th><th>Status</th></tr></thead>
              <tbody>
                {coupons.length === 0 && (
                  <tr><td colSpan={4} className="small muted" style={{ padding: "14px 18px" }}>No coupons yet — <a href="/admin/coupons#new">create one</a>. Discounts always apply server-side at checkout.</td></tr>
                )}
                {coupons.map((c) => {
                  const st = couponStatus(c);
                  return (
                    <tr key={c.code}>
                      <td className="mono" style={{ fontWeight: 600 }}>{c.code}</td>
                      <td>{c.label}{c.owner && c.owner !== "platform" ? <span className="muted"> · {c.owner}</span> : null}</td>
                      <td className="tabular" style={{ textAlign: "right" }}>{(c.usedCount ?? 0).toLocaleString("en-IN")}{c.usageLimit !== undefined ? ` / ${c.usageLimit.toLocaleString("en-IN")}` : ""}</td>
                      <td><StatusPill tone={st.tone}>{st.label}</StatusPill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div id="campaigns" style={{ scrollMarginTop: 90 }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Send {...I} aria-hidden /> Lifecycle campaigns</span>}
          action={
            <span className="vh-row small" style={{ gap: 8 }}>
              {pendingN > 0 && <StatusPill tone="warn">{pendingN} pending copy-check</StatusPill>}
              {blockedN > 0 && <StatusPill tone="danger">{blockedN} blocked</StatusPill>}
              <span className="muted">every send is claim- and §6-checked server-side</span>
            </span>
          }
        >
          <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
            {campaigns.map((m) => (
              <div key={m.id} data-campaign={m.id} data-status={m.status} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: 10, borderColor: m.status === "BLOCKED" ? "var(--vh-danger)" : undefined }}>
                <div className="vh-row-between" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className="vh-row" style={{ gap: 8, minWidth: 0 }}>
                    <span style={{ color: "var(--vh-accent)", display: "inline-flex" }}>{CHANNEL_ICON[m.channel] ?? <Mail {...I} aria-hidden />}</span>
                    <strong>{m.name}</strong>
                    <CampaignLabel>{m.channel}</CampaignLabel>
                  </span>
                  <StatusPill tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</StatusPill>
                </div>

                <div className="small" style={{ display: "grid", gap: 4 }}>
                  <div><span className="muted">Subject: </span>{m.subject}</div>
                  <div className="muted">{m.body}</div>
                  <div className="muted">Audience: {m.audience}{m.sentAt ? ` · sent ${m.sentAt.slice(0, 16).replace("T", " ")}` : ""}</div>
                </div>

                {(m.status === "BLOCKED" || m.status === "PENDING_COPY_CHECK") && (
                  <div className="vh-row small" style={{ gap: 6, color: m.status === "BLOCKED" ? "var(--vh-danger)" : "var(--vh-warn, #a86)" }}>
                    <ShieldAlert size={14} strokeWidth={2.2} aria-hidden />
                    <span>{REASON_TEXT[m.reason]}</span>
                  </div>
                )}

                {m.status === "PENDING_COPY_CHECK" && (
                  <details>
                    <summary className="vh-btn vh-btn-sm vh-btn-primary" style={{ display: "inline-flex", cursor: "pointer", width: "fit-content" }}>Review &amp; clear copy-check</summary>
                    <form action={approveCampaignAction} className="vh-grid" style={{ gap: 8, marginTop: 10, maxWidth: 560 }}>
                      <input type="hidden" name="id" value={m.id} />
                      <label className="vh-label small" htmlFor={`r-${m.id}`}>Reviewer sign-off — confirm this copy makes no medical or disease claim (≥20 chars)</label>
                      <textarea className="vh-input" id={`r-${m.id}`} name="reason" required minLength={20} rows={2} placeholder="Reviewed: describes an AYUSH-licensed wellness range, makes no disease or benefit claim." />
                      <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary" style={{ width: "fit-content" }}>Approve for sending</button>
                    </form>
                  </details>
                )}

                {m.status === "APPROVED" && (
                  <form action={sendCampaignAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary vh-row" style={{ gap: 6 }}><Send size={14} aria-hidden /> Send campaign</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </Card>
        </div>

        <div id="new" style={{ scrollMarginTop: 90 }}>
          <Card title="Create a lifecycle campaign">
            <form action={createCampaignAction} className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-grid cols-2" style={{ gap: 16 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mc-name">Campaign name <span className="req">*</span></label>
                  <input className="vh-input" id="mc-name" name="name" required minLength={4} maxLength={80} placeholder="Diwali wellness digest" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mc-channel">Channel</label>
                  <select className="vh-select" id="mc-channel" name="channel" defaultValue="Email">
                    {(CHANNELS as Channel[]).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mc-subject">Subject / title <span className="req">*</span></label>
                  <input className="vh-input" id="mc-subject" name="subject" required minLength={3} maxLength={120} placeholder="This week on Vedic Hemp" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="mc-audience">Audience</label>
                  <input className="vh-input" id="mc-audience" name="audience" maxLength={80} placeholder="Digest subscribers" />
                </div>
                <div className="vh-field" style={{ gridColumn: "1 / -1" }}>
                  <label className="vh-label" htmlFor="mc-body">Message body <span className="req">*</span></label>
                  <textarea className="vh-input" id="mc-body" name="body" required minLength={8} maxLength={600} rows={3} placeholder="New arrivals in hemp foods and Ayurveda, plus a seasonal recipe." />
                </div>
              </div>
              <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap" }}>
                <p className="small muted" style={{ margin: 0, maxWidth: 520 }}>
                  On save the copy is screened server-side. A disease/medical claim or any health data is BLOCKED; a CBD
                  Wellness mention is held for a reviewer; everything else clears to APPROVED.
                </p>
                <button type="submit" className="vh-btn vh-btn-primary">Screen &amp; create</button>
              </div>
            </form>
          </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><UsersRound {...I} aria-hidden /> Audiences</span>} action={<span className="small muted">Illustrative segments — sizes are live once analytics is connected</span>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Segment</th><th style={{ textAlign: "right" }}>Size</th><th>Basis</th></tr></thead>
              <tbody>
                {AUDIENCES.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.segment}</td>
                    <td className="tabular" style={{ textAlign: "right" }}>{a.size}</td>
                    <td className="small muted">{a.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0, padding: "12px 18px 16px" }}>
            No audience is ever built from health data — prescription status, medical notes and MED_CANNABIS purchase
            history are structurally unavailable to the segmentation service.
          </p>
        </Card>

        <Banner severity="warn" title="Copy-check for CBD messaging">
          Any campaign that mentions a CBD Wellness product is held at <code>PENDING_COPY_CHECK</code> until a
          reviewer confirms it makes no disease or medical-benefit claim (&quot;relieves anxiety&quot;, &quot;treats pain&quot; — not
          permitted; &quot;may support relaxation, AYUSH-licensed&quot; — permitted). Fail closed: the send gate refuses
          anything not <code>APPROVED</code>, so a copy-check that never happened blocks the send.
        </Banner>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Sprout {...I} aria-hidden /> Loyalty</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Sprout → Leaf → Bloom → Vedic Prime — tiers earned on delivered orders. Member counts appear here once the loyalty store is connected.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Gift {...I} aria-hidden /> Referrals</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              <MoneyText paise={250_00} /> wallet credit per successful referral. Redemption totals appear here once the referral ledger is connected.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
