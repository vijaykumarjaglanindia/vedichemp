/**
 * VEDIC HEMP — WALLET (§1.7)
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, Stat, DataTable, StatusPill, toneForStatus, MoneyText, Banner, type Column } from "@/components/ui";

export const metadata: Metadata = { title: "Wallet" };

interface LedgerRow { id: string; at: string; kind: string; note: string; amountPaise: number; status: string }

const LEDGER: LedgerRow[] = [
  { id: "tx1", at: "2026-07-08", kind: "CASHBACK", note: "Order VH2026070912 · 2% cashback", amountPaise: 3538, status: "POSTED" },
  { id: "tx2", at: "2026-07-02", kind: "REFUND", note: "Return · order VH2026062810", amountPaise: 249900, status: "POSTED" },
  { id: "tx3", at: "2026-06-30", kind: "PROMO", note: "Welcome bonus", amountPaise: 10000, status: "POSTED" },
  { id: "tx4", at: "2026-06-28", kind: "DEBIT", note: "Applied to order VH2026062810", amountPaise: -50000, status: "POSTED" },
  { id: "tx5", at: "2026-06-20", kind: "WITHDRAWAL", note: "Payout to bank ····4471", amountPaise: -100000, status: "PROCESSING" },
];

const CASHBACK_PAISE = 68450;
const PROMO_PAISE = 10000;
const REFUNDS_PAISE = 50000;
const BALANCE_PAISE = CASHBACK_PAISE + PROMO_PAISE + REFUNDS_PAISE;

export default function WalletPage() {
  const columns: Column<LedgerRow>[] = [
    { key: "at", header: "Date", render: (r) => r.at },
    {
      key: "kind", header: "Type", render: (r) => (
        <span className="vh-row" style={{ gap: 8 }}>
          <StatusPill tone={toneForStatus(r.status)}>{r.kind}</StatusPill>
        </span>
      ),
    },
    { key: "note", header: "Details", render: (r) => <span className="small">{r.note}</span> },
    { key: "amount", header: "Amount", align: "right", render: (r) => <MoneyText paise={r.amountPaise} sign /> },
  ];

  return (
    <Shell active="/account/wallet" breadcrumb={["My Account", "Wallet"]} title="Wallet">
      <div className="vh-grid" style={{ gap: 18 }}>
        <div className="vh-grid cols-4">
          <Stat label="Total balance" value={<MoneyText paise={BALANCE_PAISE} />} />
          <Stat label="Cashback" value={<MoneyText paise={CASHBACK_PAISE} />} />
          <Stat label="Promo credit" value={<MoneyText paise={PROMO_PAISE} />} />
          <Stat label="Refunds" value={<MoneyText paise={REFUNDS_PAISE} />} />
        </div>

        <Banner severity="info" title="Withdrawals" icon="🏦">
          Withdrawing to your bank account requires identity verification. Promo credit is non-withdrawable
          and can only be used against orders.{" "}
          <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled style={{ marginLeft: 8 }}>
            Verify identity to withdraw
          </span>
        </Banner>

        <Card title="Transaction history" action={<span className="small muted">Append-only ledger — entries are never edited or deleted</span>}>
          <DataTable columns={columns} rows={LEDGER} />
        </Card>

        <Card title="If your balance ever goes negative">
          <p className="small muted" style={{ margin: 0 }}>
            A negative wallet balance can occur when a promo credit is clawed back after a return. It is
            shown in red and is settled automatically against your next cashback or refund — it is never
            collected by blocking your account, and it never affects your ability to pay by card or UPI.
          </p>
        </Card>
      </div>
    </Shell>
  );
}
