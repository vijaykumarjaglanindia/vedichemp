/**
 * VEDIC HEMP — VEDIC ADS (§2.8)
 *
 * A1 is enforced at three independent layers: this API/UI rejects it, the
 * catalogue index omits it, and the ad auction drops it with a logged
 * violation. This page is layer one — Medical Cannabis is never a
 * selectable class in campaign creation. It cannot be advertised or
 * promoted, by anyone, ever. There is no override endpoint.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, Banner, type Column } from "@/components/ui";
import { AD_CAMPAIGNS, ADS_SUMMARY, type AdCampaign } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";

export const metadata: Metadata = { title: "Vedic Ads" };

export default function AdsPage() {
  const columns: Column<AdCampaign>[] = [
    { key: "name", header: "Campaign", render: (c) => <div style={{ fontWeight: 600 }}>{c.name}</div> },
    { key: "type", header: "Type", render: (c) => c.type },
    { key: "cls", header: "Class", render: (c) => `${CLASS_META[c.cls].emoji} ${CLASS_META[c.cls].short}` },
    { key: "budget", header: "Budget", align: "right", render: (c) => <MoneyText paise={c.budgetPaise} /> },
    { key: "spend", header: "Spend", align: "right", render: (c) => <MoneyText paise={c.spendPaise} /> },
    { key: "acos", header: "ACOS", align: "right", render: (c) => `${c.acos}%` },
    { key: "roas", header: "ROAS", align: "right", render: (c) => `${c.roas}x` },
    { key: "status", header: "Status", render: (c) => <StatusPill tone={toneForStatus(c.status)}>{c.status.replace(/_/g, " ")}</StatusPill> },
  ];

  return (
    <Shell
      active="/seller/ads"
      breadcrumb={["Seller Central", "Vedic Ads"]}
      title="Vedic Ads"
      actions={<button className="vh-btn vh-btn-sm vh-btn-primary" type="button">+ Create campaign</button>}
    >
      <div className="vh-grid cols-4" style={{ marginBottom: 18 }}>
        <Card title="Impressions (7d)"><div style={{ fontSize: "1.5rem", fontWeight: 700 }} className="tabular">{ADS_SUMMARY.impressions7d.toLocaleString("en-IN")}</div></Card>
        <Card title="Clicks (7d)"><div style={{ fontSize: "1.5rem", fontWeight: 700 }} className="tabular">{ADS_SUMMARY.clicks7d.toLocaleString("en-IN")}</div></Card>
        <Card title="ACOS (7d)"><div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{ADS_SUMMARY.acos7d}%</div></Card>
        <Card title="ROAS (7d)"><div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{ADS_SUMMARY.roas7d}x</div></Card>
      </div>

      <Card title="Campaigns" pad0>
        <DataTable columns={columns} rows={AD_CAMPAIGNS} empty={<div className="vh-empty">No campaigns yet.</div>} />
      </Card>

      <div style={{ height: 16 }} />

      <Card title="Eligible classes for advertising">
        <div className="vh-grid" style={{ gap: 10 }}>
          {(["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"] as const).map((cls) => {
            const meta = CLASS_META[cls];
            return (
              <div key={cls} className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: 10, padding: 12 }}>
                <span>{meta.emoji} {meta.label}</span>
                <StatusPill tone="ok">Selectable</StatusPill>
              </div>
            );
          })}
          <div
            className="vh-row-between"
            style={{ border: "1px solid var(--vh-danger)", borderRadius: 10, padding: 12, background: "var(--vh-danger-bg)", opacity: 0.85 }}
            aria-disabled
          >
            <span>⚕️ Medical Cannabis — advertising prohibited by law (Drugs &amp; Magic Remedies Act)</span>
            <StatusPill tone="danger">Not selectable</StatusPill>
          </div>
        </div>
      </Card>

      <div style={{ height: 16 }} />

      <Banner severity="danger" title="A1 — enforced at three independent layers" icon="⛔">
        Medical Cannabis can never be advertised or promoted, by anyone, ever. This campaign builder does not offer
        it as a class (layer 1: API/UI rejects). The catalogue index omits it from any ad-eligible feed (layer 2).
        The auction drops any candidate of this class and writes a logged violation (layer 3). There is no
        `force`/override parameter at any layer.
      </Banner>
    </Shell>
  );
}
