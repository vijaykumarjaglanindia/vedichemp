/**
 * VEDIC HEMP — REPORTS & ANALYTICS (§0.4 IA)
 *
 * Read-only reporting tiles over marketplace, catalogue and compliance
 * metrics. Nothing here is a source of truth — every number is a rollup of
 * the same server-computed figures shown elsewhere in the console (KPIs,
 * queues, settlements), reframed for trend-reading.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, TrendingUp, PieChart, Trophy, Filter, Download } from "lucide-react";
import { Shell } from "../Shell";
import { Card, Stat, MoneyText } from "@/components/ui";
import { Sparkline, Columns, Donut, BarList } from "@/components/ui/charts";
import { KPIS, SELLERS } from "@/lib/sample";
import { GMV_14D_PAISE, ORDERS_14D, DAY_LABELS_14, CLASS_MIX_GMV, FUNNEL_30D, EXPORTS } from "../_lib/data";
import { formatPaise } from "@/lib/money";

export const metadata: Metadata = { title: "Analytics · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const;

const topSellers = SELLERS
  .filter((s) => s.gmvPaise > 0)
  .map((s) => ({ label: s.name, value: s.gmvPaise, display: formatPaise(s.gmvPaise) }))
  .sort((a, b) => b.value - a.value);

const classMixTotal = CLASS_MIX_GMV.reduce((sum, c) => sum + c.paise, 0);

export default function AdminAnalyticsPage() {
  return (
    <Shell active="/admin/analytics" breadcrumb={["Admin", "Analytics"]} title="Reports & analytics">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><BarChart3 {...I} aria-hidden /> Marketplace snapshot</span>}>
          <div className="vh-grid cols-4">
            <Stat label="GMV today" value={<MoneyText paise={KPIS.gmvTodayPaise} />} delta={{ dir: "up", text: "6.2%" }} />
            <Stat label="Orders today" value={KPIS.ordersToday.toLocaleString("en-IN")} />
            <Stat label="AOV" value={<MoneyText paise={KPIS.aovPaise} />} />
            <Stat label="Auction fill rate" value={`${(KPIS.auctionFillRate * 100).toFixed(0)}%`} />
          </div>
        </Card>

        <div className="vh-grid cols-2">
          <Card title="GMV — last 14 days">
            <Columns values={GMV_14D_PAISE} labels={DAY_LABELS_14} height={128} />
            <p className="small muted" style={{ margin: "var(--sp-2) 0 0" }}>26 Jun – 9 Jul 2026 · server-computed daily rollup.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><TrendingUp {...I} aria-hidden /> Orders — last 14 days</span>}>
            <div style={{ display: "grid", gap: "var(--sp-2)" }}>
              <Sparkline points={ORDERS_14D} width={320} height={96} label="Orders per day, last 14 days" />
              <div className="vh-row-between small muted tabular">
                <span>26 Jun · {ORDERS_14D[0]?.toLocaleString("en-IN") ?? "—"}</span>
                <span>9 Jul · {ORDERS_14D[ORDERS_14D.length - 1]?.toLocaleString("en-IN") ?? "—"}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><PieChart {...I} aria-hidden /> GMV mix by compliance class</span>}>
            <div className="vh-row" style={{ gap: "var(--sp-4)", alignItems: "center", flexWrap: "wrap" }}>
              <Donut
                size={128}
                segments={CLASS_MIX_GMV.map((c) => ({ value: c.paise, color: c.color, label: c.label }))}
                centre="30d"
              />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, flex: 1, minWidth: 200 }}>
                {CLASS_MIX_GMV.map((c) => (
                  <li key={c.cls} className="vh-row-between small">
                    <span className="vh-row" style={{ gap: 6 }}>
                      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                      {c.label}
                    </span>
                    <span className="tabular">
                      <MoneyText paise={c.paise} /> · {Math.round((c.paise / classMixTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="small muted" style={{ margin: "var(--sp-2) 0 0" }}>
              Three classes only, by design. MED_CANNABIS dispensing volume is reported separately under{" "}
              <Link href="/admin/compliance">Compliance</Link> — it is a regulated dispensing register, not a merchandisable
              line of business, and never appears in commercial analytics (A1).
            </p>
          </Card>

          <Card title={<span className="vh-row" style={{ gap: 8 }}><Trophy {...I} aria-hidden /> Top sellers by lifetime GMV</span>}>
            <BarList items={topSellers} />
          </Card>
        </div>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><Filter {...I} aria-hidden /> Conversion funnel — last 30 days</span>}
          action={<span className="small muted tabular">{((FUNNEL_30D[FUNNEL_30D.length - 1]!.value / FUNNEL_30D[0]!.value) * 100).toFixed(1)}% view → purchase</span>}
        >
          <BarList items={FUNNEL_30D} color="var(--vh-ok)" />
          <p className="small muted" style={{ margin: "var(--sp-2) 0 0" }}>
            Funnel counts only surfaces a viewer was eligible to see — restricted products are absent from view
            counts for viewers without a verified Rx, so this funnel cannot leak catalogue shape.
          </p>
        </Card>

        <Card title="Exports" action={<span className="small muted">generated server-side · no PII columns</span>}>
          <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
            {EXPORTS.map((e) => (
              <Link key={e.id} className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/analytics#${e.id}`}>
                <Download {...IB} aria-hidden /> {e.name} ({e.format})
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
