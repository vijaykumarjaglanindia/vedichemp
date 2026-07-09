/**
 * VEDIC HEMP — FINANCE (§2.6)
 *
 * Settlements are posted by the marketplace under maker–checker (A6) and,
 * once posted, are immutable (A3) — corrections are new rows referencing the
 * old, never edits. Fee increases require 30 days' notice and are never
 * retroactive (A5).
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, Stat, DataTable, StatusPill, toneForStatus, MoneyText, Banner, type Column } from "@/components/ui";
import { SELLER_SETTLEMENTS, WALLET, PAYOUT_HISTORY, COMMISSION_BREAKDOWN, NEXT_FEE_CHANGE, daysUntil } from "../_lib/data";

export const metadata: Metadata = { title: "Finance" };

interface SettlementRowLocal { id: string; seller: string; period: string; netPaise: number; status: string; maker: string; checker?: string }
interface PayoutRow { id: string; date: string; amountPaise: number; status: string; utr: string }

export default function FinancePage() {
  const settlementColumns: Column<SettlementRowLocal>[] = [
    { key: "period", header: "Period", render: (s) => s.period },
    { key: "net", header: "Net payable", align: "right", render: (s) => <MoneyText paise={s.netPaise} /> },
    { key: "status", header: "Status", render: (s) => <StatusPill tone={toneForStatus(s.status)}>{s.status.replace(/_/g, " ")}</StatusPill> },
    { key: "maker", header: "Maker", render: (s) => <span className="small muted">{s.maker}</span> },
    { key: "checker", header: "Checker", render: (s) => <span className="small muted">{s.checker ?? "—"}</span> },
  ];

  const payoutColumns: Column<PayoutRow>[] = [
    { key: "date", header: "Date", render: (p) => p.date },
    { key: "amount", header: "Amount", align: "right", render: (p) => <MoneyText paise={p.amountPaise} /> },
    { key: "status", header: "Status", render: (p) => <StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill> },
    { key: "utr", header: "UTR", render: (p) => <span className="mono small">{p.utr}</span> },
  ];

  const totalNetPosted = SELLER_SETTLEMENTS.filter((s) => s.status === "POSTED").reduce((sum, s) => sum + s.netPaise, 0);
  const feeNoticeDays = daysUntil(NEXT_FEE_CHANGE.effectiveFrom) - daysUntil(NEXT_FEE_CHANGE.noticeSentAt);

  return (
    <Shell active="/seller/finance" breadcrumb={["Seller Central", "Finance"]} title="Finance">
      <div className="vh-grid cols-4" style={{ marginBottom: 18 }}>
        <Stat label="Revenue (posted, lifetime shown)" value={<MoneyText paise={totalNetPosted} />} />
        <Stat label="Wallet balance" value={<MoneyText paise={WALLET.balancePaise} />} />
        <Stat label="Reserved (returns/disputes)" value={<MoneyText paise={WALLET.reservedPaise} />} />
        <Stat label="Next payout" value={WALLET.nextPayoutDate} />
      </div>

      <Card title="Settlement reports" pad0>
        <DataTable columns={settlementColumns} rows={SELLER_SETTLEMENTS} empty={<div className="vh-empty">No settlements yet.</div>} />
      </Card>
      <p className="small muted" style={{ margin: "10px 0 20px" }}>
        Settlements are posted by the marketplace under maker–checker (A6) — no single admin moves money. Once posted,
        a statement is immutable (A3); a correction is a new row that references the old one, never an edit.
      </p>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="Commission / GST / TDS / TCS breakdown">
          <div className="vh-grid" style={{ gap: 8 }}>
            <div className="vh-row-between"><span className="small muted">Gross sales</span><MoneyText paise={COMMISSION_BREAKDOWN.grossPaise} /></div>
            <div className="vh-row-between"><span className="small muted">Referral commission</span><MoneyText paise={-COMMISSION_BREAKDOWN.commissionPaise} /></div>
            <div className="vh-row-between"><span className="small muted">GST on commission</span><MoneyText paise={-COMMISSION_BREAKDOWN.gstOnCommissionPaise} /></div>
            <div className="vh-row-between"><span className="small muted">TDS (194-O)</span><MoneyText paise={-COMMISSION_BREAKDOWN.tdsPaise} /></div>
            <div className="vh-row-between"><span className="small muted">TCS (206C)</span><MoneyText paise={-COMMISSION_BREAKDOWN.tcsPaise} /></div>
            <div className="vh-row-between" style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 8, fontWeight: 700 }}>
              <span>Net payable</span><MoneyText paise={COMMISSION_BREAKDOWN.netPayablePaise} />
            </div>
          </div>
        </Card>

        <div className="vh-grid" style={{ gap: 18 }}>
          <Card title="Payout history" pad0>
            <DataTable columns={payoutColumns} rows={PAYOUT_HISTORY} empty={<div className="vh-empty">No payouts yet.</div>} />
          </Card>

          <Banner severity={feeNoticeDays >= 30 ? "info" : "warn"} title="Upcoming fee change (A5)">
            <span className="small">
              {NEXT_FEE_CHANGE.summary} Notice sent {NEXT_FEE_CHANGE.noticeSentAt}, effective {NEXT_FEE_CHANGE.effectiveFrom}
              {" "}({feeNoticeDays} days' notice). Fee increases are never retroactive — `effectiveFrom` is always at
              least 30 days after the notice was sent, enforced as a database constraint.
            </span>
          </Banner>
        </div>
      </div>
    </Shell>
  );
}
