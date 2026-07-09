/**
 * VEDIC HEMP — SELLER HOME (§2.1)
 *
 * Account-health, compliance blockers (A2/A5), today's KPIs, pending orders,
 * low-stock alerts, settlements due and an ads mini-card. Acknowledging a
 * blocker never resolves it — the publish gate is a server/DB fact, not a
 * checkbox the seller can tick away.
 */

import type { Metadata } from "next";
import { Shell } from "./Shell";
import { Card, Stat, ProgressRing, Banner, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import type { SampleOrder } from "@/lib/sample";
import {
  SELLER, ACCOUNT_HEALTH, TODAY_KPIS, SELLER_ORDERS, WAREHOUSE_STOCK, LOW_STOCK_THRESHOLD,
  SELLER_SETTLEMENTS, LICENCES, BLOCKED_BATCHES, PENDING_REVIEW_BATCHES, daysUntil, ADS_SUMMARY, AD_CAMPAIGNS,
} from "./_lib/data";

export const metadata: Metadata = { title: "Seller Home" };

const PERIODS = ["7d", "30d", "90d"] as const;

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

  const orderColumns: Column<SampleOrder>[] = [
    { key: "reference", header: "Order", render: (o) => <div><div style={{ fontWeight: 600 }}>{o.reference}</div><div className="small muted">{o.placedAt}</div></div> },
    { key: "buyer", header: "Buyer", render: (o) => o.buyer ?? "—" },
    { key: "items", header: "Items", render: (o) => o.items.map((it) => it.title).join(", ") },
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
        <span className="vh-row" style={{ gap: 6 }}>
          {PERIODS.map((p) => (
            <a key={p} href={`/seller?period=${p}`} className={`vh-pill ${p === period ? "vh-pill-info" : "vh-pill-neutral"}`}>
              {p}
            </a>
          ))}
        </span>
      }
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: 18 }}>
        <Card title="Account health">
          <div className="vh-row" style={{ gap: 20, alignItems: "center", marginBottom: 14 }}>
            <ProgressRing percent={ACCOUNT_HEALTH.score} size={84} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Good standing</div>
              <div className="small muted">Composite of fulfilment, defect rate, policy and CoA compliance.</div>
            </div>
          </div>
          <div className="vh-grid cols-2" style={{ gap: 10 }}>
            {ACCOUNT_HEALTH.subScores.map((s) => (
              <div key={s.key} className="vh-row-between" style={{ fontSize: "0.85rem" }}>
                <span className="muted">{s.label}</span>
                <span className="tabular" style={{ fontWeight: 600 }}>
                  {s.value}
                  {s.note && <span className="small muted" style={{ fontWeight: 400 }}> · {s.note}</span>}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Compliance blockers" action={<StatusPill tone="danger">{BLOCKED_BATCHES.length + (ayushDays !== null && ayushDays <= 30 ? 1 : 0)} open</StatusPill>}>
          <div className="vh-grid" style={{ gap: 10 }}>
            {ayushDays !== null && ayushDays <= 30 && (
              <Banner severity="warn" title={`AYUSH licence expires in ${ayushDays} days`}>
                <span className="small">Licence {ayush?.number} lapses {ayush?.validTo}. CBD Wellness and Ayurveda listings are delisted the moment it expires.</span>{" "}
                <a href="/seller/store#licences">Renew licence →</a>
              </Banner>
            )}
            {BLOCKED_BATCHES.map(({ product, batch }) => (
              <Banner key={batch.code} severity="danger" title={`CoA missing for batch ${batch.code}`}>
                <span className="small">{product.title} — this batch cannot be published without an APPROVED, batch-matched Certificate of Analysis (A2). There is no override.</span>{" "}
                <a href={`/seller/products/${product.id}#batches`}>Upload CoA →</a>
              </Banner>
            ))}
            {PENDING_REVIEW_BATCHES.length > 0 && (
              <Banner severity="info" title={`${PENDING_REVIEW_BATCHES.length} batch(es) awaiting CoA review`}>
                <span className="small">Typical SLA 4h. New stock stays unsellable until compliance approves the matching lab report.</span>
              </Banner>
            )}
            <div className="vh-row" style={{ gap: 8 }}>
              <button className="vh-btn vh-btn-sm vh-btn-ghost" type="button" disabled title="Acknowledging a blocker does not resolve it">
                Acknowledge
              </button>
              <span className="small muted">Acknowledging does not resolve a blocker — the publish gate only opens when the underlying condition changes.</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title={`Today's performance (${period})`}>
        <div className="vh-grid cols-4">
          <Stat label="GMV" value={<MoneyText paise={TODAY_KPIS.gmvPaise} />} delta={{ dir: "up", text: "8.2% vs prior period" }} />
          <Stat label="Orders" value={TODAY_KPIS.orders} delta={{ dir: "up", text: "3 vs prior period" }} />
          <Stat label="AOV" value={<MoneyText paise={TODAY_KPIS.aovPaise} />} />
          <Stat label="Buy-box win rate" value={`${TODAY_KPIS.buyBoxPercent}%`} delta={{ dir: "down", text: "1.1pt vs prior period" }} />
        </div>
      </Card>

      <div className="vh-spacer" style={{ height: 18 }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Pending orders to accept" action={<a className="small" href="/seller/orders?status=PENDING">View all →</a>} pad0>
          <DataTable columns={orderColumns} rows={pendingOrders} empty={<div className="vh-empty">No orders waiting on you.</div>} />
        </Card>

        <div className="vh-grid" style={{ gap: 18 }}>
          <Card title="Low-stock alerts">
            {lowStock.length === 0 ? (
              <div className="small muted">All sellable batches are above the {LOW_STOCK_THRESHOLD}-unit threshold.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
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
            <div className="small muted" style={{ marginTop: 10 }}>FEFO applies — oldest expiry ships first. See <a href="/seller/inventory">Inventory</a>.</div>
          </Card>

          <div className="vh-grid cols-2">
            <Card title="Settlements due">
              <Stat label="Awaiting posting" value={<MoneyText paise={settlementDuePaise} />} />
              <div className="small muted" style={{ marginTop: 8 }}>Posted only after maker–checker sign-off (A6). Statements are immutable once posted (A3).</div>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/finance" style={{ marginTop: 10, display: "inline-block" }}>View finance →</a>
            </Card>
            <Card title="Vedic Ads">
              <Stat label="ROAS (7d)" value={`${ADS_SUMMARY.roas7d}x`} delta={{ dir: "up", text: "0.3x vs prior" }} />
              <div className="small muted" style={{ marginTop: 8 }}>{AD_CAMPAIGNS.filter((c) => c.status === "ACTIVE").length} active campaign(s) · ACOS {ADS_SUMMARY.acos7d}%</div>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/ads" style={{ marginTop: 10, display: "inline-block" }}>View Vedic Ads →</a>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
