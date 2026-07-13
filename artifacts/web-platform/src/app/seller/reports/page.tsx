/**
 * VEDIC HEMP — REPORTS (§2.4/2.5/2.6/2.8 rollup)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { withBase } from "@/lib/base";
import type { ReactNode } from "react";
import { Coins, Package, Factory, Megaphone, ShieldCheck, Puzzle, Download } from "lucide-react";
import { Shell } from "../Shell";
import { Card, MoneyText } from "@/components/ui";
import { Donut, BarList } from "@/components/ui/charts";
import { REPORT_TILES, SALES_BY_CLASS, TOP_PRODUCTS_30D } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";
import { formatPaise } from "@/lib/money";

const CSV_KEYS = new Set(["sales", "product", "inventory", "advertising", "compliance"]);
const VIEW_HREFS: Record<string, string> = {
  sales: "/seller/finance",
  product: "/seller/products",
  inventory: "/seller/inventory",
  advertising: "/seller/ads",
  compliance: "/seller/products",
  custom: "/seller/assistant",
};

export const metadata: Metadata = { title: "Reports" };

const TILE_ICONS: Record<string, ReactNode> = {
  sales: <Coins size={18} strokeWidth={2.2} aria-hidden />,
  product: <Package size={18} strokeWidth={2.2} aria-hidden />,
  inventory: <Factory size={18} strokeWidth={2.2} aria-hidden />,
  advertising: <Megaphone size={18} strokeWidth={2.2} aria-hidden />,
  compliance: <ShieldCheck size={18} strokeWidth={2.2} aria-hidden />,
  custom: <Puzzle size={18} strokeWidth={2.2} aria-hidden />,
};

/** Fixed categorical order — colour follows the class, never its rank. */
const CLASS_COLORS: Record<string, string> = {
  CBD_WELLNESS: "var(--vh-accent)",
  AYURVEDA: "var(--vh-saffron)",
  HEMP_FOOD: "var(--vh-info)",
};

export default function ReportsPage() {
  const totalPaise = SALES_BY_CLASS.reduce((s, x) => s + x.paise, 0);
  const classSegments = SALES_BY_CLASS.map((s) => ({
    value: s.paise,
    color: CLASS_COLORS[s.cls] ?? "var(--vh-accent)",
    label: CLASS_META[s.cls].short,
  }));

  return (
    <Shell active="/seller/reports" breadcrumb={["Seller Central", "Reports"]} title="Reports">
      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        <Card title="Sales by class" action={<span className="small muted">Trailing 30 days</span>}>
          <div className="vh-row" style={{ gap: 24, alignItems: "center" }}>
            <Donut segments={classSegments} size={128} />
            <div className="vh-grid" style={{ gap: 8, flex: 1 }}>
              {SALES_BY_CLASS.map((s) => (
                <div key={s.cls} className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 8 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: CLASS_COLORS[s.cls] ?? "var(--vh-accent)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{CLASS_META[s.cls].short}</span>
                  </span>
                  <span className="muted tabular">{Math.round((s.paise / totalPaise) * 100)}% · <MoneyText paise={s.paise} className="small" /></span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Top products" action={<span className="small muted">GMV, trailing 30 days</span>}>
          <BarList items={TOP_PRODUCTS_30D.map((p) => ({ label: p.title, value: p.paise, display: formatPaise(p.paise) }))} />
        </Card>
      </div>

      <div className="vh-grid cols-3">
        {REPORT_TILES.map((r) => (
          <Card key={r.key}>
            <div className="vh-row" style={{ gap: 10, marginBottom: 8, color: "var(--vh-accent)" }}>
              {TILE_ICONS[r.key] ?? <Puzzle size={18} strokeWidth={2.2} aria-hidden />}
              <h3 style={{ margin: 0, color: "var(--vh-ink)" }}>{r.label}</h3>
            </div>
            <p className="small muted" style={{ marginTop: 0 }}>{r.blurb}</p>
            <div className="vh-row" style={{ gap: 8 }}>
              {CSV_KEYS.has(r.key) ? (
                <a className="vh-btn vh-btn-sm vh-btn-primary" href={withBase(`/api/v1/seller/reports/${r.key}`)} download style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Download size={13} strokeWidth={2.2} aria-hidden /> Export CSV
                </a>
              ) : (
                <span className="vh-btn vh-btn-sm vh-btn-ghost" title="Custom reports are built with the BI connector at go-live" aria-disabled="true">
                  Via BI connector
                </span>
              )}
              {VIEW_HREFS[r.key] && (
                <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={VIEW_HREFS[r.key]!}>View</Link>
              )}
            </div>
          </Card>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: "var(--sp-3)" }}>
        Compliance reports never surface health data (Rx contents) — only aggregate counts of licence/CoA state.
        Any drill-down into a specific sensitive record goes through the reason-code viewer, not this dashboard.
      </p>
    </Shell>
  );
}
