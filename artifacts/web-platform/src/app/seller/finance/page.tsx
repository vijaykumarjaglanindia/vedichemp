/**
 * VEDIC HEMP — FINANCE (§2.6)
 *
 * Settlements are posted by the marketplace under maker–checker (A6) and,
 * once posted, are immutable (A3) — corrections are new rows referencing the
 * old, never edits. Fee increases require 30 days' notice and are never
 * retroactive (A5).
 */

import type { Metadata } from "next";
import { withBase } from "@/lib/base";
import { Download } from "lucide-react";
import { Shell } from "../Shell";
import { Card, Stat, DataTable, StatusPill, toneForStatus, MoneyText, Banner, type Column } from "@/components/ui";
import { Sparkline, Donut } from "@/components/ui/charts";
import {
  SELLER_SETTLEMENTS, WALLET, PAYOUT_HISTORY, COMMISSION_BREAKDOWN, NEXT_FEE_CHANGE,
  FEE_BREAKDOWN_SEGMENTS, REVENUE_SPARK, daysUntil,
} from "../_lib/data";

export const metadata: Metadata = { title: "Finance" };

interface SettlementRowLocal { id: string; seller: string; period: string; netPaise: number; status: string; maker: string; checker?: string }
interface PayoutRow { id: string; date: string; amountPaise: number; status: string; utr: string }

/** Fixed categorical order — hue follows the fee line, never its rank. */
const FEE_COLORS = ["var(--vh-accent)", "var(--vh-saffron)", "var(--vh-info)", "var(--vh-clay-600)"] as const;

export default function FinancePage() {
  const settlementColumns: Column<SettlementRowLocal>[] = [
    { key: "period", header: "Period", render: (s) => s.period },
    { key: "net", header: "Net payable", align: "right", render: (s) => <MoneyText paise={s.netPaise} /> },
    { key: "status", header: "Status", render: (s) => <StatusPill tone={toneForStatus(s.status)}>{s.status.replace(/_/g, " ")}</StatusPill> },
    { key: "maker", header: "Maker", render: (s) => <span className="small muted">{s.maker}</span> },
    { key: "checker", header: "Checker", render: (s) => <span className="small muted">{s.checker ?? "—"}</span> },
    {
      key: "statement", header: "", align: "right", render: (s) =>
        s.status === "POSTED" ? (
          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={withBase(`/api/v1/seller/statements/${s.id}`)} download aria-label={`Download statement for ${s.period}`}>
            <Download size={13} strokeWidth={2.2} aria-hidden />
          </a>
        ) : null,
    },
  ];

  const payoutColumns: Column<PayoutRow>[] = [
    { key: "date", header: "Date", render: (p) => <span className="tabular">{p.date}</span> },
    { key: "amount", header: "Amount", align: "right", render: (p) => <MoneyText paise={p.amountPaise} /> },
    { key: "status", header: "Status", render: (p) => <StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill> },
    { key: "utr", header: "UTR", render: (p) => <span className="mono small">{p.utr}</span> },
  ];

  const totalNetPosted = SELLER_SETTLEMENTS.filter((s) => s.status === "POSTED").reduce((sum, s) => sum + s.netPaise, 0);
  const feeNoticeDays = daysUntil(NEXT_FEE_CHANGE.effectiveFrom) - daysUntil(NEXT_FEE_CHANGE.noticeSentAt);
  const feeSegments = FEE_BREAKDOWN_SEGMENTS.map((f, i) => ({
    value: f.paise,
    color: FEE_COLORS[i % FEE_COLORS.length] as string,
    label: f.label,
  }));
  const totalFeesPaise = FEE_BREAKDOWN_SEGMENTS.reduce((s, f) => s + f.paise, 0);

  return (
    <Shell active="/seller/finance" breadcrumb={["Seller Central", "Finance"]} title="Finance">
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-4)" }}>
        <Card>
          <Stat label="Revenue (posted)" value={<MoneyText paise={totalNetPosted} />} delta={{ dir: "up", text: "12 weeks trending up" }} />
          <div style={{ marginTop: 8 }}>
            <Sparkline points={REVENUE_SPARK} width={180} height={40} label="Weekly net revenue, 12 weeks" />
          </div>
        </Card>
        <Card><Stat label="Wallet balance" value={<MoneyText paise={WALLET.balancePaise} />} /></Card>
        <Card><Stat label="Reserved (returns/disputes)" value={<MoneyText paise={WALLET.reservedPaise} />} /></Card>
        <Card><Stat label="Next payout" value={<span className="tabular">{WALLET.nextPayoutDate}</span>} /></Card>
      </div>

      <Card title="Settlement reports" pad0>
        <DataTable columns={settlementColumns} rows={SELLER_SETTLEMENTS} empty={<div className="vh-empty">No settlements yet.</div>} />
      </Card>
      <p className="small muted" style={{ margin: "8px 0 var(--sp-4)" }}>
        Settlements are posted by the marketplace under maker–checker (A6) — no single admin moves money. Once posted,
        a statement is immutable (A3); a correction is a new row that references the old one, never an edit.
      </p>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Fee breakdown" action={<span className="small muted">Current period</span>}>
          <div className="vh-row" style={{ gap: 24, alignItems: "center", marginBottom: 16 }}>
            <Donut segments={feeSegments} size={128} />
            <div className="vh-grid" style={{ gap: 8, flex: 1 }}>
              {FEE_BREAKDOWN_SEGMENTS.map((f, i) => (
                <div key={f.label} className="vh-row-between small">
                  <span className="vh-row" style={{ gap: 8 }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: FEE_COLORS[i % FEE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{f.label}</span>
                  </span>
                  <MoneyText paise={f.paise} className="small" />
                </div>
              ))}
              <div className="vh-row-between small" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 8, fontWeight: 700 }}>
                <span>Total deductions</span>
                <MoneyText paise={totalFeesPaise} />
              </div>
            </div>
          </div>
          <div className="vh-grid" style={{ gap: 6 }}>
            <div className="vh-row-between"><span className="small muted">Gross sales</span><MoneyText paise={COMMISSION_BREAKDOWN.grossPaise} /></div>
            <div className="vh-row-between" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 6, fontWeight: 700 }}>
              <span>Net payable</span><MoneyText paise={COMMISSION_BREAKDOWN.netPayablePaise} />
            </div>
          </div>
        </Card>

        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Payout history" pad0>
            <DataTable columns={payoutColumns} rows={PAYOUT_HISTORY} empty={<div className="vh-empty">No payouts yet.</div>} />
          </Card>

          <Banner severity={feeNoticeDays >= 30 ? "info" : "warn"} title="Upcoming fee change (A5)">
            <span className="small">
              {NEXT_FEE_CHANGE.summary} Notice sent {NEXT_FEE_CHANGE.noticeSentAt}, effective {NEXT_FEE_CHANGE.effectiveFrom}
              {" "}({feeNoticeDays} days&rsquo; notice). Fee increases are never retroactive — <span className="mono">effectiveFrom</span> is always at
              least 30 days after the notice was sent, enforced as a database constraint.
            </span>
          </Banner>
        </div>
      </div>
    </Shell>
  );
}
