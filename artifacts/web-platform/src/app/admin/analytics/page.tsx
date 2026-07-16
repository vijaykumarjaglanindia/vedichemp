/**
 * VEDIC HEMP — REPORTS & ANALYTICS (admin)
 *
 * Every figure is computed live from the marketplace stores (orders, ads,
 * support) — a read model, never a source of truth. A plain-language summary
 * tops the page and the data exports to CSV.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, TrendingUp, Trophy, Download, Store, Megaphone } from "lucide-react";
import { Shell } from "../Shell";
import { Card, MoneyText, StatusPill } from "@/components/ui";
import { Columns, BarList } from "@/components/ui/charts";
import { adminReport } from "@/lib/analytics";
import { formatPaise } from "@/lib/money";

export const metadata: Metadata = { title: "Analytics · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;

export default async function AdminAnalyticsPage() {
  const r = await adminReport(14);
  const last7 = r.series.slice(-7).reduce((n, d) => n + d.paise, 0);
  const prev7 = r.series.slice(0, 7).reduce((n, d) => n + d.paise, 0);
  const wow = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : (last7 > 0 ? 100 : 0);

  const summary =
    r.orders === 0
      ? "No orders yet in this window. As the marketplace transacts, GMV, top sellers and product mix populate here."
      : `The marketplace took ${r.orders} order${r.orders === 1 ? "" : "s"} (${r.units} items) worth ${formatPaise(r.gmvPaise)} in GMV. `
        + `The last 7 days were ${wow >= 0 ? "up" : "down"} ${Math.abs(wow)}% versus the previous 7. `
        + (r.topSellers[0] ? `Top seller: ${r.topSellers[0].name}. ` : "")
        + (r.refundedPaise > 0 ? `${formatPaise(r.refundedPaise)} was refunded to buyers. ` : "")
        + (r.openTickets > 0 ? `${r.openTickets} support ticket${r.openTickets === 1 ? "" : "s"} open across the platform.` : "");

  return (
    <Shell active="/admin/analytics" breadcrumb={["Admin", "Analytics"]} title="Reports & analytics"
      actions={<Link className="vh-btn vh-btn-sm vh-btn-ghost vh-row" href="/admin/analytics/export" style={{ gap: 6 }}><Download size={14} aria-hidden /> Export CSV</Link>}
    >
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><TrendingUp {...I} aria-hidden style={{ color: "var(--vh-accent)" }} /> Marketplace, in plain words</span>}>
          <p className="small" style={{ margin: 0 }}>{summary}</p>
        </Card>

        <div className="vh-grid cols-4">
          <Card><span className="vh-stat-label">GMV (14 days)</span><div className="vh-stat-value tabular"><MoneyText paise={r.gmvPaise} /></div><div className="small muted">{r.orders} orders</div></Card>
          <Card><span className="vh-stat-label">Avg order value</span><div className="vh-stat-value tabular"><MoneyText paise={r.aov} /></div><div className="small muted">{r.units} items</div></Card>
          <Card><span className="vh-stat-label">Refunded to buyers</span><div className="vh-stat-value tabular"><MoneyText paise={r.refundedPaise} /></div><div className="small muted">buyer-first</div></Card>
          <Card><div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Megaphone size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Ad revenue</span></div><div className="vh-stat-value tabular"><MoneyText paise={r.adRevenuePaise} /></div><div className="small muted">advertiser spend</div></Card>
        </div>

        <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
          <Card title="GMV — last 14 days" action={<StatusPill tone={wow >= 0 ? "ok" : "warn"}>{wow >= 0 ? "+" : ""}{wow}% WoW</StatusPill>}>
            <Columns values={r.series.map((d) => d.paise)} labels={r.series.map((d, i) => (i % 2 === 0 ? d.label : ""))} height={140} />
            <p className="small muted" style={{ marginTop: 10 }}>Daily gross merchandise value across all sellers. Last bar is today.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Trophy size={16} strokeWidth={2.2} aria-hidden /> Top sellers</span>}>
            {r.topSellers.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>No sales yet.</p>
            ) : (
              <BarList items={r.topSellers.map((s) => ({ label: s.name, value: s.paise, display: `${formatPaise(s.paise)} · ${s.units}u` }))} />
            )}
          </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Store size={16} strokeWidth={2.2} aria-hidden /> Top products</span>}>
          {r.topProducts.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>No sales yet.</p>
          ) : (
            <BarList items={r.topProducts.map((p) => ({ label: p.name, value: p.paise, display: `${formatPaise(p.paise)} · ${p.units}u` }))} />
          )}
        </Card>
      </div>
    </Shell>
  );
}
