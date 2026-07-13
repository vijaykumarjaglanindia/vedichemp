/**
 * VEDIC HEMP — VEDIC ADS (§2.8)
 *
 * A1 is enforced at three independent layers: this API/UI rejects it, the
 * catalogue index omits it, and the ad auction drops it with a logged
 * violation. This page is layer one — Medical Cannabis is never a
 * selectable class in campaign creation. It cannot be advertised or
 * promoted, by anyone, ever. There is no override endpoint.
 *
 * Every example creative below renders through <AdSlot>/<SponsoredLabel>,
 * which themselves throw on a MED_CANNABIS creative.
 */

import type { Metadata } from "next";
import { Ban, Megaphone, MousePointerClick, Eye, TrendingUp, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, Stat, type Column } from "@/components/ui";
import { Sparkline, BarList } from "@/components/ui/charts";
import { AdSlot, SponsoredLabel } from "@/components/ui/ads";
import { AD_CAMPAIGNS, ADS_SUMMARY, AD_PLACEMENTS, CAMPAIGN_SPARKS, type AdCampaign } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";

export const metadata: Metadata = { title: "Vedic Ads" };

export default function AdsPage() {
  const columns: Column<AdCampaign>[] = [
    {
      key: "name", header: "Campaign", render: (c) => (
        <div>
          <div style={{ fontWeight: 600 }}>{c.name}</div>
          <div className="small muted">{c.type} · {CLASS_META[c.cls].short}</div>
        </div>
      ),
    },
    {
      key: "trend", header: "7-day clicks", render: (c) => (
        <Sparkline points={CAMPAIGN_SPARKS[c.id] ?? [0, 0]} width={110} height={32} label={`${c.name} 7-day click trend`} />
      ),
    },
    { key: "budget", header: "Budget", align: "right", render: (c) => <MoneyText paise={c.budgetPaise} /> },
    { key: "spend", header: "Spend", align: "right", render: (c) => <MoneyText paise={c.spendPaise} /> },
    { key: "acos", header: "ACOS", align: "right", render: (c) => <span className="tabular">{c.acos}%</span> },
    { key: "roas", header: "ROAS", align: "right", render: (c) => <span className="tabular" style={{ fontWeight: 700 }}>{c.roas}x</span> },
    { key: "status", header: "Status", render: (c) => <StatusPill tone={toneForStatus(c.status)}>{c.status.replace(/_/g, " ")}</StatusPill> },
  ];

  const pacingItems = AD_CAMPAIGNS.map((c) => ({
    label: c.name,
    value: Math.round((c.spendPaise / c.budgetPaise) * 100),
    display: `${Math.round((c.spendPaise / c.budgetPaise) * 100)}% of budget`,
  }));

  return (
    <Shell
      active="/seller/ads"
      breadcrumb={["Seller Central", "Vedic Ads"]}
      title="Vedic Ads"
      actions={
        <button className="vh-btn vh-btn-sm vh-btn-primary" type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} strokeWidth={2.2} aria-hidden /> Create campaign
        </button>
      }
    >
      {/* 7-day summary */}
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-4)" }}>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Eye size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Impressions (7d)</span></div>
          <div className="vh-stat-value tabular">{ADS_SUMMARY.impressions7d.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><MousePointerClick size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Clicks (7d)</span></div>
          <div className="vh-stat-value tabular">{ADS_SUMMARY.clicks7d.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Megaphone size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">ACOS (7d)</span></div>
          <div className="vh-stat-value tabular">{ADS_SUMMARY.acos7d}%</div>
        </Card>
        <Card>
          <div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><TrendingUp size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">ROAS (7d)</span></div>
          <div className="vh-stat-value tabular">{ADS_SUMMARY.roas7d}x</div>
        </Card>
      </div>

      {/* Campaigns */}
      <Card title="Campaigns" pad0>
        <DataTable columns={columns} rows={AD_CAMPAIGNS} empty={<div className="vh-empty">No campaigns yet — create your first campaign.</div>} />
      </Card>

      <div style={{ height: "var(--sp-4)" }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        {/* Budget pacing */}
        <Card title="Budget pacing" action={<span className="small muted">This month</span>}>
          <BarList items={pacingItems} />
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            A campaign pauses automatically at 100% of budget. Store Spotlight is fully paced — top up or let it rest.
          </p>
        </Card>

        {/* A1 lock — elevated, distinct */}
        <div
          role="note"
          aria-label="Medical Cannabis advertising prohibition"
          style={{
            border: "1px solid var(--vh-danger)",
            borderRadius: "var(--vh-radius)",
            background: "color-mix(in srgb, var(--vh-danger-bg) 55%, var(--vh-surface))",
            padding: "var(--sp-4)",
          }}
        >
          <div className="vh-row" style={{ gap: 10, marginBottom: 8 }}>
            <Ban size={20} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-danger)", flexShrink: 0 }} />
            <h3 style={{ margin: 0, color: "var(--vh-danger)" }}>Medical Cannabis — advertising prohibited by law</h3>
          </div>
          <p className="small" style={{ margin: "0 0 8px" }}>
            Advertising or promoting Medical Cannabis is prohibited under the <strong>Drugs &amp; Magic Remedies
            (Objectionable Advertisements) Act, 1954</strong> and platform prohibition <strong>A1</strong>. No licence,
            spend level or account tier changes this — it applies to anyone, ever.
          </p>
          <p className="small" style={{ margin: "0 0 8px" }}>
            Enforced at three independent layers: <strong>(1)</strong> this campaign builder and its API reject the
            class, <strong>(2)</strong> the catalogue index omits it from every ad-eligible feed, and
            <strong> (3)</strong> the auction drops any candidate of this class and writes a logged violation.
            There is no override endpoint at any layer.
          </p>
          <StatusPill tone="danger">Not selectable in any campaign</StatusPill>
        </div>
      </div>

      {/* Placement inventory */}
      <Card
        title="Placement inventory"
        action={<span className="small muted">Placements configured in Admin → Ads</span>}
      >
        <div className="vh-grid cols-2" style={{ gap: "var(--sp-3)" }}>
          {AD_PLACEMENTS.map((p) => (
            <div key={p.key} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius)", padding: 16 }}>
              <div className="vh-row-between" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span className="small tabular" style={{ fontWeight: 700 }}>
                  est. <MoneyText paise={p.estCpcPaise} /> <span className="muted">/{p.pricing === "CPC" ? "click" : "1k views"}</span>
                </span>
              </div>
              <p className="small muted" style={{ margin: "0 0 12px" }}>{p.blurb}</p>
              <AdSlot cls={p.exampleCls} placement={p.name}>
                <div className="vh-row" style={{ gap: 12 }}>
                  <span aria-hidden style={{ fontSize: "1.8rem" }}>{p.exampleEmoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{p.exampleTitle}</div>
                    <div className="small muted">{CLASS_META[p.exampleCls].short} · example creative</div>
                  </div>
                </div>
              </AdSlot>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          Every paid surface renders through <span className="mono">AdSlot</span> and is always labelled{" "}
          <SponsoredLabel /> — there is no unlabelled variant, and the component itself throws on a MED_CANNABIS
          creative (A1 render guard).
        </p>
      </Card>
    </Shell>
  );
}
