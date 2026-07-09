/**
 * VEDIC HEMP — ADVERTISING GOVERNANCE (§3.1 / A1)
 *
 * A1 is the single hardest line on the platform: MED_CANNABIS is never
 * advertised or promoted, by anyone, ever. That is enforced in three
 * independent layers so one bug cannot produce an unlawful outcome —
 * the API rejects the campaign, the search/recommendation index omits the
 * product, and the ad auction drops any candidate of that class with a
 * logged violation. This page is a governance console over those three
 * layers, not a fourth place the rule lives.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, MoneyText, Banner, ComplianceBadge } from "@/components/ui";
import { PRODUCTS, COMPLIANCE_QUEUE } from "@/lib/sample";

export const metadata: Metadata = { title: "Ads · Admin" };

const AD_CREATIVE_QUEUE = COMPLIANCE_QUEUE.filter((q) => q.kind === "Ad Creative Review");
const advertisableCandidates = PRODUCTS.filter((p) => p.cls !== "MED_CANNABIS");

// Ad-class violation monitor: blocked must always be true for MED_CANNABIS.
// This sample row demonstrates what the log looks like — blocked:false here
// would be a SEV-1, not a data point.
const VIOLATION_LOG = [
  { id: "v1", layer: "API", productClass: "MED_CANNABIS", blocked: true, at: "2026-07-09 09:41" },
  { id: "v2", layer: "INDEX", productClass: "MED_CANNABIS", blocked: true, at: "2026-07-08 22:03" },
  { id: "v3", layer: "AUCTION", productClass: "MED_CANNABIS", blocked: true, at: "2026-07-08 18:17" },
];

export default function AdminAdsPage() {
  return (
    <Shell active="/admin/ads" breadcrumb={["Admin", "Ads"]} title="Advertising governance">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Banner severity="danger" title="A1 — no MED_CANNABIS advertising, ever">
          There is no column, flag or override endpoint that makes a Medical Cannabis product advertisable. This is
          asserted at three independent layers, each of which is a test that fails the build if weakened:
          <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            <li><strong>API</strong> — <code>assertAdvertisable()</code> rejects a campaign at creation.</li>
            <li><strong>Index</strong> — the search/recommendation index omits MED_CANNABIS from any advertisable
              feed at ingest time; it is absent, not filtered client-side.</li>
            <li><strong>Auction</strong> — <code>auctionAssertClass()</code> drops any surviving candidate on every
              single auction call and writes an <code>AdClassViolation</code> row.</li>
          </ol>
        </Banner>

        <Card title="Ad-class violations monitor" action={<StatusPill tone="ok">0 leaks / 24h</StatusPill>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Every row below must read <code>blocked = true</code>. A single row with <code>blocked = false</code> for
            a MED_CANNABIS candidate is not a bug ticket — it is a SEV-1 page to Compliance and Security.
          </p>
          <table className="vh-table">
            <thead>
              <tr><th>Layer</th><th>Product class</th><th>Blocked</th><th>At</th></tr>
            </thead>
            <tbody>
              {VIOLATION_LOG.map((v) => (
                <tr key={v.id}>
                  <td>{v.layer}</td>
                  <td className="mono small">{v.productClass}</td>
                  <td>
                    {v.blocked ? <StatusPill tone="ok">true</StatusPill> : <StatusPill tone="danger">false — SEV-1</StatusPill>}
                  </td>
                  <td className="small muted">{v.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Campaign approval queue" action={<StatusPill tone={AD_CREATIVE_QUEUE.length ? "warn" : "ok"}>{AD_CREATIVE_QUEUE.length} pending</StatusPill>}>
          {AD_CREATIVE_QUEUE.length === 0 ? (
            <p className="small muted">No creatives pending review.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {AD_CREATIVE_QUEUE.map((q) => (
                <li key={q.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 10 }}>
                  <span>
                    <div style={{ fontWeight: 600 }}>{q.subject}</div>
                    <div className="small muted">SLA {q.sla} · age {q.ageHours}h · {q.class && <ComplianceBadge cls={q.class} />}</div>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/ads#${q.id}-creative`}>View creative</a>
                    <a className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/ads#${q.id}-approve`}>Approve (maker)</a>
                    <a className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/ads#${q.id}-reject`}>Reject</a>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
            CBD Wellness creatives need maker–checker approval: a copy reviewer approves the claim language, and a
            second, different reviewer confirms no disease claim or medical-benefit language slipped through before
            the campaign goes live.
          </p>
        </Card>

        <Card title="Auction governance">
          <p className="small muted" style={{ marginTop: 0 }}>
            {advertisableCandidates.length} products across HEMP_FOOD, AYURVEDA and CBD_WELLNESS are eligible auction
            candidates today. Auction fill rate and floor pricing are operational levers — they never touch class
            eligibility, which is decided before a candidate reaches the auction at all.
          </p>
          <div className="vh-grid cols-3">
            <div className="vh-stat">
              <span className="vh-stat-label">Eligible candidates</span>
              <span className="vh-stat-value tabular">{advertisableCandidates.length}</span>
            </div>
            <div className="vh-stat">
              <span className="vh-stat-label">Structurally ineligible</span>
              <span className="vh-stat-value tabular">{PRODUCTS.length - advertisableCandidates.length}</span>
            </div>
            <div className="vh-stat">
              <span className="vh-stat-label">Fill rate</span>
              <span className="vh-stat-value tabular">82%</span>
            </div>
          </div>
        </Card>

        <Card title="Ad billing">
          <p className="small muted" style={{ marginTop: 0 }}>
            Ad spend settles through the same seller settlement pipeline as order revenue — no separate,
            unaudited ad-billing ledger exists.
          </p>
          <MoneyText paise={4_12_600} />
          <span className="small muted"> billed to sellers this week</span>
        </Card>
      </div>
    </Shell>
  );
}
