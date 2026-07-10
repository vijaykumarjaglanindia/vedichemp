/**
 * VEDIC HEMP — MARKETING (§0.4 IA)
 *
 * Coupons, lifecycle campaigns (email/SMS/push/WhatsApp), loyalty and
 * referrals. CBD Wellness campaign copy goes through the same disease-claim
 * check as ad creatives before it sends — a coupon headline that implies a
 * medical benefit is a compliance defect, not a marketing style choice.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Mail, MessageSquare, MessageCircle, BellRing, TicketPercent, UsersRound, Gift, Sprout } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, MoneyText, Banner } from "@/components/ui";
import { CampaignLabel } from "@/components/ui/ads";
import { AUDIENCES } from "../_lib/data";

export const metadata: Metadata = { title: "Marketing · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;

const COUPONS = [
  { id: "c1", code: "FLAT15", desc: "15% off Ayurveda essentials", uses: 4820, status: "ACTIVE" },
  { id: "c2", code: "HEMP50", desc: "₹50 off first hemp food order", uses: 12_400, status: "ACTIVE" },
  { id: "c3", code: "MONSOON10", desc: "10% off wellness balms", uses: 0, status: "SCHEDULED" },
];

const CHANNEL_ICON: Record<string, ReactNode> = {
  Email: <Mail {...I} aria-hidden />,
  SMS: <MessageSquare {...I} aria-hidden />,
  WhatsApp: <MessageCircle {...I} aria-hidden />,
  Push: <BellRing {...I} aria-hidden />,
};

const CAMPAIGNS = [
  { id: "m1", channel: "Email", name: "Weekly wellness digest", audience: "184k", status: "SENDING" },
  { id: "m2", channel: "WhatsApp", name: "Order delivered follow-up", audience: "Transactional", status: "ACTIVE" },
  { id: "m3", channel: "Push", name: "Cart abandonment nudge", audience: "12k", status: "ACTIVE" },
  { id: "m4", channel: "SMS", name: "Festival sale — CBD Wellness range", audience: "96k", status: "PENDING_COPY_CHECK" },
];

export default function AdminMarketingPage() {
  return (
    <Shell active="/admin/marketing" breadcrumb={["Admin", "Marketing"]} title="Marketing">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><TicketPercent {...I} aria-hidden /> Coupons</span>} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Code</th><th>Description</th><th style={{ textAlign: "right" }}>Uses</th><th>Status</th></tr></thead>
              <tbody>
                {COUPONS.map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>{c.code}</td>
                    <td>{c.desc}</td>
                    <td className="tabular" style={{ textAlign: "right" }}>{c.uses.toLocaleString("en-IN")}</td>
                    <td><StatusPill tone={c.status === "ACTIVE" ? "ok" : "info"}>{c.status}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Lifecycle campaigns" action={<span className="small muted">every send is visibly labelled a campaign</span>}>
          <div className="vh-grid cols-2">
            {CAMPAIGNS.map((m) => (
              <div key={m.id} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: 8 }}>
                <div className="vh-row-between" style={{ gap: 8 }}>
                  <span className="vh-row" style={{ gap: 8, minWidth: 0 }}>
                    <span style={{ color: "var(--vh-accent)", display: "inline-flex" }}>{CHANNEL_ICON[m.channel] ?? <Mail {...I} aria-hidden />}</span>
                    <strong>{m.name}</strong>
                  </span>
                  <CampaignLabel>{m.channel}</CampaignLabel>
                </div>
                <div className="vh-row-between small">
                  <span className="muted">Audience: {m.audience}</span>
                  <StatusPill tone={m.status === "PENDING_COPY_CHECK" ? "warn" : "ok"}>{m.status.replace(/_/g, " ")}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><UsersRound {...I} aria-hidden /> Audiences</span>} pad0>
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
            history are structurally unavailable to the segmentation service (A1/A4).
          </p>
        </Card>

        <Banner severity="warn" title="Copy-check for CBD messaging">
          Any campaign that mentions a CBD Wellness product is held at <code>PENDING_COPY_CHECK</code> until a
          reviewer confirms it makes no disease or medical-benefit claim (&quot;relieves anxiety&quot;, &quot;treats pain&quot; — not
          permitted; &quot;may support relaxation, AYUSH-licensed&quot; — permitted). Fail closed: if the copy-check step
          itself errors, the send is blocked, not defaulted to allow.
        </Banner>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Sprout {...I} aria-hidden /> Loyalty</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Sprout → Leaf → Bloom → Vedic Prime. 41,200 members in Leaf or above.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Gift {...I} aria-hidden /> Referrals</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              <MoneyText paise={250_00} /> wallet credit per successful referral · 3,140 referrals this quarter.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
