/**
 * VEDIC HEMP — REPORTS & ANALYTICS (§0.4 IA)
 *
 * Read-only reporting tiles over marketplace, catalogue and compliance
 * metrics. Nothing here is a source of truth — every number is a rollup of
 * the same server-computed figures shown elsewhere in the console (KPIs,
 * queues, settlements), reframed for trend-reading.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, Stat, MoneyText } from "@/components/ui";
import { KPIS, ORDERS, SELLERS } from "@/lib/sample";

export const metadata: Metadata = { title: "Analytics · Admin" };

const gmvBySeller = SELLERS.map((s) => ({ name: s.name, gmvPaise: s.gmvPaise })).sort((a, b) => b.gmvPaise - a.gmvPaise);
const maxGmv = Math.max(...gmvBySeller.map((s) => s.gmvPaise), 1);

export default function AdminAnalyticsPage() {
  return (
    <Shell active="/admin/analytics" breadcrumb={["Admin", "Analytics"]} title="Reports & analytics">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Card title="Marketplace snapshot">
          <div className="vh-grid cols-4">
            <Stat label="GMV today" value={<MoneyText paise={KPIS.gmvTodayPaise} />} delta={{ dir: "up", text: "6.2%" }} />
            <Stat label="Orders today" value={KPIS.ordersToday.toLocaleString("en-IN")} />
            <Stat label="AOV" value={<MoneyText paise={KPIS.aovPaise} />} />
            <Stat label="Auction fill rate" value={`${(KPIS.auctionFillRate * 100).toFixed(0)}%`} />
          </div>
        </Card>

        <Card title="GMV by seller">
          <div style={{ display: "grid", gap: 10 }}>
            {gmvBySeller.map((s) => (
              <div key={s.name}>
                <div className="vh-row-between small" style={{ marginBottom: 4 }}>
                  <span>{s.name}</span>
                  <MoneyText paise={s.gmvPaise} />
                </div>
                <div style={{ height: 8, background: "var(--vh-line)", borderRadius: 999 }}>
                  <div
                    style={{
                      height: 8, borderRadius: 999, background: "var(--vh-green-600)",
                      width: `${Math.max(2, (s.gmvPaise / maxGmv) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="vh-grid cols-3">
          <Card title="Order status mix">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {Array.from(new Set(ORDERS.map((o) => o.status))).map((status) => (
                <li key={status} className="vh-row-between small">
                  <span>{status.replace(/_/g, " ")}</span>
                  <span className="tabular">{ORDERS.filter((o) => o.status === status).length}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Compliance SLA">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              <li className="vh-row-between small"><span>Rx pending (4h SLA)</span><span className="tabular">{KPIS.rxPendingSla}</span></li>
              <li className="vh-row-between small"><span>CoA pending (4h SLA)</span><span className="tabular">{KPIS.coaPendingSla}</span></li>
              <li className="vh-row-between small"><span>Disputes open</span><span className="tabular">{KPIS.disputesOpen}</span></li>
            </ul>
          </Card>
          <Card title="Seller health">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {SELLERS.map((s) => (
                <li key={s.id} className="vh-row-between small">
                  <span>{s.name}</span>
                  <span className="tabular">{s.healthScore}/100</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
