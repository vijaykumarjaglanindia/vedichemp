/**
 * VEDIC HEMP — REPORTS (seller)
 *
 * Real numbers, computed live from this store's orders, ads, reviews and
 * tickets — not a static seed. A plain-language summary sits on top so the
 * seller doesn't have to read charts to know how the week went, and the whole
 * thing exports to CSV.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Download, Coins, Package, Star, Megaphone, TrendingUp } from "lucide-react";
import { Shell } from "../Shell";
import { Card, MoneyText, StatusPill } from "@/components/ui";
import { Columns, BarList } from "@/components/ui/charts";
import { sellerReport } from "@/lib/analytics";
import { formatPaise } from "@/lib/money";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const STORE = "Vedic Botanicals";

export default async function SellerReportsPage() {
  const r = await sellerReport(STORE, 14);
  const last7 = r.series.slice(-7).reduce((n, d) => n + d.paise, 0);
  const prev7 = r.series.slice(0, 7).reduce((n, d) => n + d.paise, 0);
  const wow = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : (last7 > 0 ? 100 : 0);
  const adReturn = r.adSpentPaise > 0 ? Math.round((r.adSalesPaise / r.adSpentPaise) * 100) / 100 : 0;

  const summary =
    r.orders === 0
      ? "No orders yet in this window. Once buyers start purchasing, your sales, top products and ad results show up here."
      : `You took ${r.orders} order${r.orders === 1 ? "" : "s"} (${r.units} item${r.units === 1 ? "" : "s"}) worth ${formatPaise(r.grossPaise)}. `
        + `Sales in the last 7 days were ${wow >= 0 ? "up" : "down"} ${Math.abs(wow)}% versus the previous 7. `
        + (r.topProducts[0] ? `Your best seller is “${r.topProducts[0].name}”. ` : "")
        + (r.adSpentPaise > 0 ? `Ads brought back ₹${adReturn.toFixed(2)} in sales for every ₹1 spent. ` : "")
        + (r.openTickets > 0 ? `You have ${r.openTickets} open support ticket${r.openTickets === 1 ? "" : "s"} to answer.` : "");

  return (
    <Shell active="/seller/reports" breadcrumb={["Seller Central", "Reports"]} title="Reports"
      actions={<Link className="vh-btn vh-btn-sm vh-btn-ghost vh-row" href="/seller/reports/export" style={{ gap: 6 }}><Download size={14} aria-hidden /> Export CSV</Link>}
    >
      {/* Plain-language summary */}
      <div style={{ marginBottom: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><TrendingUp size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} /> This fortnight, in plain words</span>}>
          <p className="small" style={{ margin: 0 }}>{summary}</p>
        </Card>
      </div>

      {/* KPI tiles */}
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-4)" }}>
        <Card><div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Coins size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Sales (your share)</span></div><div className="vh-stat-value tabular"><MoneyText paise={r.grossPaise} /></div><div className="small muted">{r.orders} orders · {r.units} items</div></Card>
        <Card><div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><TrendingUp size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Avg order</span></div><div className="vh-stat-value tabular"><MoneyText paise={r.aov} /></div><div className="small muted">{r.refundedOrders} refunded/cancelled</div></Card>
        <Card><div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Star size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Avg rating</span></div><div className="vh-stat-value tabular">{r.avgRating || "—"}</div><div className="small muted">{r.reviewCount} reviews</div></Card>
        <Card><div className="vh-row" style={{ gap: 8, marginBottom: 4 }}><Megaphone size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} /><span className="vh-stat-label">Sales from ads</span></div><div className="vh-stat-value tabular"><MoneyText paise={r.adSalesPaise} /></div><div className="small muted">{adReturn > 0 ? `₹${adReturn.toFixed(2)} back per ₹1` : "no ad spend yet"}</div></Card>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Sales — last 14 days" action={<StatusPill tone={wow >= 0 ? "ok" : "warn"}>{wow >= 0 ? "+" : ""}{wow}% WoW</StatusPill>}>
          <Columns values={r.series.map((d) => d.paise)} labels={r.series.map((d, i) => (i % 2 === 0 ? d.label : ""))} height={140} />
          <p className="small muted" style={{ marginTop: 10 }}>Each bar is one day&rsquo;s sales (your share of order value). The last bar is today.</p>
        </Card>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Package size={16} strokeWidth={2.2} aria-hidden /> Top products</span>}>
          {r.topProducts.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>No sales yet — your best sellers will rank here.</p>
          ) : (
            <BarList items={r.topProducts.map((p) => ({ label: p.name, value: p.paise, display: `${formatPaise(p.paise)} · ${p.units}u` }))} />
          )}
        </Card>
      </div>
    </Shell>
  );
}
