/**
 * VEDIC HEMP — WALLET (§1.7)
 *
 * All amounts are integer paise from the server ledger; the ledger itself is
 * append-only (A3 discipline) — corrections are new rows, never edits.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Landmark, PieChart, ReceiptText, TrendingUp } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import { Sparkline, Donut } from "@/components/ui/charts";
import { LEDGER, type LedgerRow, WALLET_SPLIT, WALLET_BALANCE_PAISE, WALLET_TREND } from "../_lib/data";

export const metadata: Metadata = { title: "Wallet" };

const I = { size: 16, strokeWidth: 2.2 } as const;

function title(icon: ReactNode, text: string) {
  return (
    <span className="vh-row" style={{ gap: 8 }}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {text}
    </span>
  );
}

const SPLIT_SEGMENTS = [
  { label: "Cashback", value: WALLET_SPLIT.cashbackPaise, color: "var(--vh-accent)" },
  { label: "Promo credit", value: WALLET_SPLIT.promoPaise, color: "var(--vh-saffron)" },
  { label: "Refunds", value: WALLET_SPLIT.refundsPaise, color: "var(--vh-info)" },
];

export default function WalletPage() {
  const columns: Column<LedgerRow>[] = [
    { key: "at", header: "Date", render: (r) => <span className="tabular">{r.at}</span> },
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
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <div className="vh-grid cols-3" style={{ alignItems: "stretch" }}>
          {/* Balance + trend */}
          <Card title={title(<TrendingUp {...I} />, "Balance")}>
            <div className="vh-stat" style={{ marginBottom: 8 }}>
              <span className="vh-stat-label">Total balance</span>
              <span className="vh-stat-value tabular"><MoneyText paise={WALLET_BALANCE_PAISE} /></span>
              <span className="vh-stat-delta-up">▲ ₹35.38 cashback this week</span>
            </div>
            <Sparkline points={WALLET_TREND} width={220} height={48} label="Wallet balance trend, last 7 weeks" />
          </Card>

          {/* Split donut */}
          <Card title={title(<PieChart {...I} />, "Where your balance comes from")}>
            <div className="vh-row" style={{ gap: 16, alignItems: "center" }}>
              <Donut segments={SPLIT_SEGMENTS} size={116} />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, flex: 1 }}>
                {SPLIT_SEGMENTS.map((s) => (
                  <li key={s.label} className="vh-row-between small">
                    <span className="vh-row" style={{ gap: 8 }}>
                      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                      {s.label}
                    </span>
                    <MoneyText paise={s.value} />
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Withdrawals — gated with clear remediation */}
          <Card title={title(<Landmark {...I} />, "Withdraw to bank")}>
            <div className="vh-row" style={{ gap: 8, marginBottom: 8 }}>
              <StatusPill tone="warn">Identity not verified</StatusPill>
            </div>
            <p className="small muted" style={{ margin: "0 0 8px" }}>
              Withdrawing cashback or refunds to your bank account unlocks after a one-time identity
              verification. Promo credit is non-withdrawable and can only be used against orders.
            </p>
            <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/account/profile#security">
              Verify identity to withdraw
            </Link>
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              Takes about 2 minutes in Profile → Security.
            </p>
          </Card>
        </div>

        <Card
          title={title(<ReceiptText {...I} />, "Transaction history")}
          action={<span className="small muted">Append-only ledger — entries are never edited or deleted</span>}
          pad0
        >
          <DataTable columns={columns} rows={LEDGER} />
        </Card>

        <div className="vh-grid cols-2">
          <Card title="Vedic Points — loyalty">
            <div className="vh-stat-value tabular" style={{ marginBottom: 4 }}>1,240 pts</div>
            <p className="small muted" style={{ margin: 0 }}>
              5 points per ₹100 on delivered orders; 100 points = ₹10 wallet credit at checkout.
              Points post when the return window closes, and they never expire while your account
              stays active. Computed by the platform from verified orders only.
            </p>
          </Card>
          <Card title="Refer & earn">
            <p className="small" style={{ marginTop: 0 }}>
              Your code: <strong className="mono" style={{ color: "var(--vh-ink)" }}>VEDIC-ASHA-21</strong>
            </p>
            <p className="small muted" style={{ margin: 0 }}>
              Friends get ₹200 off their first order above ₹999; you get ₹200 wallet credit when it
              delivers. Referral credits appear in the ledger above — same append-only rules.
            </p>
          </Card>
        </div>

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
