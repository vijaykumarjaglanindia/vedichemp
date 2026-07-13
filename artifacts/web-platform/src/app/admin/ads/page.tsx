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
 *
 * It also hosts the ad-inventory registry: every configurable placement on
 * the platform, each of which renders on its surface through <AdSlot> so it
 * is always visibly labelled and A1-guarded at render time too.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, LayoutTemplate, Pencil, Timer, Eye, Gauge, ShieldCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, Stat, StatusPill, toneForStatus, MoneyText, Banner, ComplianceBadge } from "@/components/ui";
import { Sparkline } from "@/components/ui/charts";
import { PRODUCTS, COMPLIANCE_QUEUE } from "@/lib/sample";
import { AD_PLACEMENTS, AUCTION_HEALTH, slaCountdown } from "../_lib/data";

export const metadata: Metadata = { title: "Ads · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

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
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
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

        {/* Auction health */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Gauge {...I} aria-hidden /> Auction health</span>}
          action={<span className="small muted">7-day trend under each figure</span>}
        >
          <div className="vh-grid cols-3">
            <div style={{ display: "grid", gap: 8 }}>
              <Stat label="Fill rate" value={`${AUCTION_HEALTH.fillRatePct}%`} delta={{ dir: "up", text: "1.2 pts this week" }} />
              <Sparkline points={AUCTION_HEALTH.fillRateSpark} width={150} height={36} label="Auction fill rate, last 7 days" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <Stat label="Avg CPC" value={<MoneyText paise={AUCTION_HEALTH.avgCpcPaise} />} />
              <Sparkline points={AUCTION_HEALTH.cpcSparkPaise} width={150} height={36} label="Average cost per click, last 7 days" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <Stat label="A1 violations (unblocked)" value={AUCTION_HEALTH.violations24h} delta={{ dir: "up", text: "flat at zero — as designed" }} />
              <Sparkline points={AUCTION_HEALTH.violationSpark} width={150} height={36} stroke="var(--vh-ok)" label="Unblocked A1 violations, last 7 days — zero throughout" />
            </div>
          </div>
        </Card>

        {/* Ad inventory registry */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><LayoutTemplate {...I} aria-hidden /> Ad inventory registry</span>}
          action={<StatusPill tone="info">{AD_PLACEMENTS.length} placements</StatusPill>}
          pad0
        >
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th>Placement</th>
                  <th>Surface</th>
                  <th>Format</th>
                  <th style={{ textAlign: "right" }}>Floor price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {AD_PLACEMENTS.map((p) => (
                  <tr key={p.id}>
                    <td className="mono small" style={{ fontWeight: 600 }}>{p.placement}</td>
                    <td>{p.surface}</td>
                    <td className="small">{p.format}</td>
                    <td style={{ textAlign: "right" }}>
                      <MoneyText paise={p.floorPaise} />{" "}
                      <span className="small muted">{p.pricing === "flat/day" ? "/day" : p.pricing}</span>
                    </td>
                    <td><StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill></td>
                    <td>
                      <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/ads#${p.id}-edit`} aria-label={`Edit placement ${p.placement}`}>
                        <Pencil {...IB} aria-hidden /> Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0, padding: "12px 18px 16px" }}>
            Every placement above renders on its surface through <code>&lt;AdSlot&gt;</code> — it is always visibly
            labelled &quot;Sponsored&quot;, and the A1 render guard throws before a MED_CANNABIS creative could paint. Editing
            a placement changes floor price and format only; class eligibility is not a field on this form.
          </p>
        </Card>

        {/* Violations monitor */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck {...I} aria-hidden /> Ad-class violations monitor</span>}
          action={<StatusPill tone="ok">0 leaks / 24h</StatusPill>}
        >
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

        {/* Creative approval queue */}
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Megaphone {...I} aria-hidden /> Campaign approval queue</span>}
          action={<StatusPill tone={AD_CREATIVE_QUEUE.length ? "warn" : "ok"}>{AD_CREATIVE_QUEUE.length} pending</StatusPill>}
        >
          {AD_CREATIVE_QUEUE.length === 0 ? (
            <p className="small muted">No creatives pending review.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--sp-2)" }}>
              {AD_CREATIVE_QUEUE.map((q) => {
                const cd = slaCountdown(q.sla, q.ageHours);
                return (
                  <li key={q.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: "var(--sp-2)", gap: 8, flexWrap: "wrap" }}>
                    <span>
                      <div className="vh-row" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{q.subject}</span>
                        <StatusPill tone={cd.tone}>
                          <Timer size={12} strokeWidth={2.2} aria-hidden /> {cd.label}
                        </StatusPill>
                      </div>
                      <div className="small muted vh-row" style={{ gap: 8, marginTop: 4 }}>
                        SLA {q.sla} · age {q.ageHours}h {q.class && <ComplianceBadge cls={q.class} />}
                      </div>
                    </span>
                    <span className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/ads#${q.id}-creative`}>
                        <Eye {...IB} aria-hidden /> View creative
                      </Link>
                      <Link className="vh-btn vh-btn-sm vh-btn-primary" href={`/admin/ads#${q.id}-approve`}>Approve (maker)</Link>
                      <Link className="vh-btn vh-btn-sm vh-btn-danger" href={`/admin/ads#${q.id}-reject`}>Reject</Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="small muted" style={{ marginTop: "var(--sp-2)", marginBottom: 0 }}>
            CBD Wellness creatives need maker–checker approval: a copy reviewer approves the claim language, and a
            second, different reviewer confirms no disease claim or medical-benefit language slipped through before
            the campaign goes live.
          </p>
        </Card>

        {/* Auction governance + billing */}
        <div className="vh-grid cols-2">
          <Card title="Auction governance">
            <p className="small muted" style={{ marginTop: 0 }}>
              {advertisableCandidates.length} products across HEMP_FOOD, AYURVEDA and CBD_WELLNESS are eligible auction
              candidates today. Auction fill rate and floor pricing are operational levers — they never touch class
              eligibility, which is decided before a candidate reaches the auction at all.
            </p>
            <div className="vh-grid cols-2">
              <div className="vh-stat">
                <span className="vh-stat-label">Eligible candidates</span>
                <span className="vh-stat-value tabular">{advertisableCandidates.length}</span>
              </div>
              <div className="vh-stat">
                <span className="vh-stat-label">Structurally ineligible</span>
                <span className="vh-stat-value tabular">{PRODUCTS.length - advertisableCandidates.length}</span>
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
      </div>
    </Shell>
  );
}
