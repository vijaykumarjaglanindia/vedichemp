/**
 * VEDIC HEMP — MARKETING (§0.4 IA)
 *
 * Coupons, lifecycle campaigns (email/SMS/push/WhatsApp), loyalty and
 * referrals. CBD Wellness campaign copy goes through the same disease-claim
 * check as ad creatives before it sends — a coupon headline that implies a
 * medical benefit is a compliance defect, not a marketing style choice.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, MoneyText, Banner } from "@/components/ui";

export const metadata: Metadata = { title: "Marketing · Admin" };

const COUPONS = [
  { id: "c1", code: "FLAT15", desc: "15% off Ayurveda essentials", uses: 4820, status: "ACTIVE" },
  { id: "c2", code: "HEMP50", desc: "₹50 off first hemp food order", uses: 12_400, status: "ACTIVE" },
  { id: "c3", code: "MONSOON10", desc: "10% off wellness balms", uses: 0, status: "SCHEDULED" },
];

const CAMPAIGNS = [
  { id: "m1", channel: "Email", name: "Weekly wellness digest", audience: "184k", status: "SENDING" },
  { id: "m2", channel: "WhatsApp", name: "Order delivered follow-up", audience: "Transactional", status: "ACTIVE" },
  { id: "m3", channel: "Push", name: "Cart abandonment nudge", audience: "12k", status: "ACTIVE" },
  { id: "m4", channel: "SMS", name: "Festival sale — CBD Wellness range", audience: "96k", status: "PENDING_COPY_CHECK" },
];

export default function AdminMarketingPage() {
  return (
    <Shell active="/admin/marketing" breadcrumb={["Admin", "Marketing"]} title="Marketing">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Card title="Coupons" pad0>
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
        </Card>

        <Card title="Lifecycle campaigns" pad0>
          <table className="vh-table">
            <thead><tr><th>Channel</th><th>Campaign</th><th>Audience</th><th>Status</th></tr></thead>
            <tbody>
              {CAMPAIGNS.map((m) => (
                <tr key={m.id}>
                  <td>{m.channel}</td>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td className="small muted">{m.audience}</td>
                  <td><StatusPill tone={m.status === "PENDING_COPY_CHECK" ? "warn" : "ok"}>{m.status.replace(/_/g, " ")}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Banner severity="warn" title="Copy-check for CBD messaging">
          Any campaign that mentions a CBD Wellness product is held at <code>PENDING_COPY_CHECK</code> until a
          reviewer confirms it makes no disease or medical-benefit claim ("relieves anxiety", "treats pain" — not
          permitted; "may support relaxation, AYUSH-licensed" — permitted). Fail closed: if the copy-check step
          itself errors, the send is blocked, not defaulted to allow.
        </Banner>

        <div className="vh-grid cols-2">
          <Card title="Loyalty">
            <p className="small muted" style={{ marginTop: 0 }}>Sprout → Leaf → Bloom → Vedic Prime. 41,200 members in Leaf or above.</p>
          </Card>
          <Card title="Referrals">
            <p className="small muted" style={{ marginTop: 0 }}>
              <MoneyText paise={250_00} /> wallet credit per successful referral · 3,140 referrals this quarter.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
