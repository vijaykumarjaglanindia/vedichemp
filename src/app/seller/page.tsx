/**
 * VEDIC HEMP — SELLER HOME (§2.1)
 *
 * Account-health, compliance blockers (A2/A5), performance chart, pending
 * orders, low-stock alerts, settlements due and an ads mini-card.
 * Acknowledging a blocker never resolves it — the publish gate is a
 * server/DB fact, not a checkbox the seller can tick away.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  AlertTriangle, FileWarning, Hourglass, PackagePlus, FileUp, Printer, Wallet,
  ArrowRight, CheckCircle2,
} from "lucide-react";
import { Shell } from "./Shell";
import { Card, Stat, ProgressRing, DataTable, StatusPill, MoneyText, type Column } from "@/components/ui";
import { Columns, BarList } from "@/components/ui/charts";
import type { SampleOrder } from "@/lib/sample";
import {
  SELLER, ACCOUNT_HEALTH, TODAY_KPIS, SELLER_ORDERS, WAREHOUSE_STOCK, LOW_STOCK_THRESHOLD,
  SELLER_SETTLEMENTS, LICENCES, BLOCKED_BATCHES, PENDING_REVIEW_BATCHES, daysUntil,
  ADS_SUMMARY, AD_CAMPAIGNS, GMV_7D,
} from "./_lib/data";

export const metadata: Metadata = { title: "Seller Home" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const PERIODS = ["7d", "30d", "90d"] as const;

const QUICK_ACTIONS = [
  { label: "Add product", href: "/seller/products/new", icon: <PackagePlus {...I} /> },
  { label: "Upload CoA", href: "/seller/products/p8#coa-upload", icon: <FileUp {...I} /> },
  { label: "Print labels", href: "/seller/orders?status=PACKED", icon: <Printer {...I} /> },
  { label: "View payouts", href: "/seller/finance", icon: <Wallet {...I} /> },
];

function BlockerRow({
  icon, severity, title, body, remediation,
}: {
  icon: ReactNode;
  severity: "danger" | "warn" | "info";
  title: string;
  body: string;
  remediation?: { label: string; href: string };
}) {
  const color = severity === "danger" ? "var(--vh-danger)" : severity === "warn" ? "var(--vh-warn)" : "var(--vh-info)";
  const bg = severity === "danger" ? "var(--vh-danger-bg)" : severity === "warn" ? "var(--vh-warn-bg)" : "var(--vh-info-bg)";
  return (
    <div
      className="vh-row"
      role={severity === "danger" ? "alert" : "status"}
      style={{ alignItems: "flex-start", gap: 12, border: "1px solid var(--vh-line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--vh-radius-sm)", padding: "12px 14px", background: `color-mix(in srgb, ${bg} 45%, var(--vh-surface))` }}
    >
      <span aria-hidden style={{ color, marginTop: 2, flexShrink: 0, display: "inline-flex" }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: ".88rem" }}>{title}</div>
        <div className="small muted" style={{ marginTop: 2 }}>{body}</div>
        {remediation && (
          <a className="small" href={remediation.href} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontWeight: 700 }}>
            {remediation.label} <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}

export default async function SellerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = PERIODS.includes(rawPeriod as (typeof PERIODS)[number]) ? (rawPeriod as (typeof PERIODS)[number]) : "7d";

  const pendingOrders = SELLER_ORDERS.filter((o) => o.status === "PENDING");
  const lowStock = WAREHOUSE_STOCK.filter((w) => w.qty - w.reserved < LOW_STOCK_THRESHOLD);
  const awaitingSettlement = SELLER_SETTLEMENTS.filter((s) => s.status === "AWAITING_CHECKER");
  const settlementDuePaise = awaitingSettlement.reduce((sum, s) => sum + s.netPaise, 0);
  const ayush = LICENCES.find((l) => l.type === "AYUSH");
  const ayushDays = ayush?.validTo ? daysUntil(ayush.validTo) : null;
  const openBlockers = BLOCKED_BATCHES.length + (ayushDays !== null && ayushDays <= 30 ? 1 : 0);
  const weekGmvPaise = GMV_7D.valuesPaise.reduce((s, v) => s + v, 0);

  const orderColumns: Column<SampleOrder>[] = [
    { key: "reference", header: "Order", render: (o) => <div><div style={{ fontWeight: 600 }}>{o.reference}</div><div className="small muted">{o.placedAt}</div></div> },
    { key: "buyer", header: "Buyer", render: (o) => o.buyer ?? "—" },
    { key: "total", header: "Total", align: "right", render: (o) => <MoneyText paise={o.totalPaise} /> },
    {
      key: "actions", header: "", align: "right", render: (o) => (
        <span className="vh-row" style={{ gap: 8, justifyContent: "flex-end" }}>
          <button className="vh-btn vh-btn-sm vh-btn-primary" type="button">Accept</button>
          <a className="small" href={`/seller/orders/${o.id}`}>Details →</a>
        </span>
      ),
    },
  ];

  return (
    <Shell
      active="/seller"
      breadcrumb={["Seller Central", "Home"]}
      title={`Welcome back, ${SELLER.name}`}
      actions={
        <nav className="vh-seg" aria-label="Reporting period">
          {PERIODS.map((p) => (
            <a key={p} href={`/seller?period=${p}`} className={p === period ? "on" : undefined} aria-current={p === period ? "true" : undefined}>
              {p}
            </a>
          ))}
        </nav>
      }
    >
      {/* Quick actions */}
      <div className="vh-row" style={{ gap: 8, marginBottom: "var(--sp-4)", flexWrap: "wrap" }}>
        {QUICK_ACTIONS.map((a, i) => (
          <a key={a.href} className={`vh-btn vh-btn-sm ${i === 0 ? "vh-btn-primary" : "vh-btn-ghost"}`} href={a.href} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ display: "inline-flex" }}>{a.icon}</span>
            {a.label}
          </a>
        ))}
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        {/* Performance */}
        <Card title="Performance" action={<span className="small muted">GMV, trailing 7 days ({period})</span>}>
          <div className="vh-row" style={{ gap: 24, alignItems: "baseline", marginBottom: 16 }}>
            <span style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              <MoneyText paise={weekGmvPaise} />
            </span>
            <span className="small" style={{ color: "var(--vh-ok)", fontWeight: 700 }}>▲ 8.2% vs prior week</span>
          </div>
          <Columns values={GMV_7D.valuesPaise} labels={GMV_7D.labels} height={112} />
          <div className="vh-grid cols-4" style={{ marginTop: "var(--sp-4)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--vh-line)" }}>
            <Stat label="GMV today" value={<MoneyText paise={TODAY_KPIS.gmvPaise} />} />
            <Stat label="Orders" value={TODAY_KPIS.orders} delta={{ dir: "up", text: "+3" }} />
            <Stat label="AOV" value={<MoneyText paise={TODAY_KPIS.aovPaise} />} />
            <Stat label="Buy-box" value={`${TODAY_KPIS.buyBoxPercent}%`} delta={{ dir: "down", text: "1.1pt" }} />
          </div>
        </Card>

        {/* Account health */}
        <Card title="Account health">
          <div className="vh-row" style={{ gap: 20, alignItems: "center", marginBottom: 16 }}>
            <ProgressRing percent={ACCOUNT_HEALTH.score} size={84} />
            <div>
              <div className="vh-row" style={{ gap: 6, fontWeight: 700, fontSize: "1.05rem" }}>
                <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-ok)" }} />
                Good standing
              </div>
              <div className="small muted">Composite of fulfilment, defect rate, policy and CoA compliance.</div>
            </div>
          </div>
          <BarList
            items={ACCOUNT_HEALTH.subScores.map((s) => ({
              label: s.label,
              value: s.value,
              display: s.note ? `${s.value} · ${s.note}` : `${s.value}/100`,
            }))}
          />
        </Card>
      </div>

      {/* Compliance blockers — acknowledge ≠ resolve */}
      <Card
        title="Compliance blockers"
        action={<StatusPill tone={openBlockers > 0 ? "danger" : "ok"}>{openBlockers} open</StatusPill>}
      >
        <div className="vh-grid" style={{ gap: 8 }}>
          {ayushDays !== null && ayushDays <= 30 && (
            <BlockerRow
              icon={<AlertTriangle {...I} />}
              severity="warn"
              title={`AYUSH licence expires in ${ayushDays} days`}
              body={`Licence ${ayush?.number} lapses ${ayush?.validTo}. CBD Wellness and Ayurveda listings are delisted the moment it expires.`}
              remediation={{ label: "Renew licence", href: "/seller/store#licences" }}
            />
          )}
          {BLOCKED_BATCHES.map(({ product, batch }) => (
            <BlockerRow
              key={batch.code}
              icon={<FileWarning {...I} />}
              severity="danger"
              title={`CoA missing for batch ${batch.code}`}
              body={`${product.title} — this batch cannot be published without an APPROVED, batch-matched Certificate of Analysis (A2). There is no override.`}
              remediation={{ label: "Upload CoA", href: `/seller/products/${product.id}#coa-upload` }}
            />
          ))}
          {PENDING_REVIEW_BATCHES.length > 0 && (
            <BlockerRow
              icon={<Hourglass {...I} />}
              severity="info"
              title={`${PENDING_REVIEW_BATCHES.length} batch(es) awaiting CoA review`}
              body="Typical SLA 4h. New stock stays unsellable until compliance approves the matching lab report."
            />
          )}
          <div className="vh-row" style={{ gap: 8, marginTop: 4 }}>
            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="button" disabled title="Acknowledging a blocker does not resolve it">
              Acknowledge
            </button>
            <span className="small muted">Acknowledging does not resolve a blocker — the publish gate only opens when the underlying condition changes.</span>
          </div>
        </div>
      </Card>

      <div style={{ height: "var(--sp-4)" }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Orders to accept" action={<a className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/orders?status=PENDING">Go to orders</a>} pad0>
          <DataTable columns={orderColumns} rows={pendingOrders} empty={<div className="vh-empty">No orders waiting on you.</div>} />
        </Card>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Low-stock alerts" action={<a className="vh-btn vh-btn-sm vh-btn-primary" href="/seller/inventory">Review inventory</a>}>
            {lowStock.length === 0 ? (
              <div className="small muted">All sellable batches are above the {LOW_STOCK_THRESHOLD}-unit threshold.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {lowStock.map((w) => (
                  <li key={`${w.product}-${w.batch}`} className="vh-row-between">
                    <span>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{w.product}</div>
                      <div className="small muted">Batch {w.batch} · {w.warehouse}</div>
                    </span>
                    <StatusPill tone={w.qty - w.reserved <= 15 ? "danger" : "warn"}>{w.qty - w.reserved} left</StatusPill>
                  </li>
                ))}
              </ul>
            )}
            <div className="small muted" style={{ marginTop: 8 }}>FEFO applies — oldest expiry ships first.</div>
          </Card>

          <div className="vh-grid cols-2">
            <Card title="Settlements due">
              <Stat label="Awaiting posting" value={<MoneyText paise={settlementDuePaise} />} />
              <div className="small muted" style={{ marginTop: 8 }}>Posted only after maker–checker sign-off (A6). Statements are immutable once posted (A3).</div>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/finance" style={{ marginTop: 8, display: "inline-block" }}>View finance →</a>
            </Card>
            <Card title="Vedic Ads">
              <Stat label="ROAS (7d)" value={`${ADS_SUMMARY.roas7d}x`} delta={{ dir: "up", text: "0.3x vs prior" }} />
              <div className="small muted" style={{ marginTop: 8 }}>{AD_CAMPAIGNS.filter((c) => c.status === "ACTIVE").length} active campaign(s) · ACOS {ADS_SUMMARY.acos7d}%</div>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/ads" style={{ marginTop: 8, display: "inline-block" }}>View Vedic Ads →</a>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
