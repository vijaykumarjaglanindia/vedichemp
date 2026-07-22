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
import { Banner, Card, DataTable, StatusPill, toneForStatus, MoneyText, type Column } from "@/components/ui";
import { readCommerce } from "@/lib/commerce";
import { readGiftCredit, redeemGiftCard } from "./actions";
import { Sparkline, Donut } from "@/components/ui/charts";
import { type LedgerRow } from "../_lib/data";
import { getSession } from "@/lib/auth-lite";
import { balancePaise, ledger, creditBreakdown } from "@/lib/wallet";
import { ordersForBuyer } from "@/lib/orders";

/** Whole days between an ISO date and today (>= 0 for past dates). */
function daysAgo(iso: string): number {
  const then = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.floor((Date.now() - then) / 86_400_000);
}
/** Deterministic 2-digit suffix so a buyer's referral code is stable + unique. */
function codeSuffix(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 90) + 10;
}

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

const splitSegments = (b: { cashbackPaise: number; promoPaise: number; refundsPaise: number }) => [
  { label: "Cashback", value: b.cashbackPaise, color: "var(--vh-accent)" },
  { label: "Promo credit", value: b.promoPaise, color: "var(--vh-saffron)" },
  { label: "Refunds", value: b.refundsPaise, color: "var(--vh-info)" },
];

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ gift?: string }>;
}) {
  const { gift } = await searchParams;
  const email = (await getSession())?.email ?? "buyer@example.in";
  const balance = await balancePaise(email);
  const rows = await ledger(email);
  const segments = splitSegments(await creditBreakdown(email));
  const giftCredit = await readGiftCredit();
  const commerce = await readCommerce();

  // Loyalty points — earned only on this buyer's DELIVERED orders, at the
  // configured rate. No fabricated balance.
  const delivered = (await ordersForBuyer(email)).filter((o) => o.status === "DELIVERED");
  const loyaltyPoints = delivered.reduce((n, o) => n + Math.floor(o.totalPaise / 10000) * commerce.loyaltyPtsPer100, 0);
  // Cashback credited in the last 7 days, from the real ledger (0 → no badge).
  const cashbackWeekPaise = rows
    .filter((r) => r.kind === "CASHBACK" && r.status === "POSTED" && daysAgo(r.at) >= 0 && daysAgo(r.at) <= 7)
    .reduce((n, r) => n + r.amountPaise, 0);
  // Running-balance trend built from the ledger itself (oldest → newest),
  // not a fixed demo series. Shown only when there's enough history.
  const chron = [...rows].filter((r) => r.status === "POSTED").reverse();
  let run = 0;
  const balanceTrend = chron.map((r) => (run += r.amountPaise));
  // Referral code derived from the account — stable and unique per buyer.
  const refCode = `VEDIC-${(email.split("@")[0] || "you").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "YOU"}-${codeSuffix(email)}`;
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
              <span className="vh-stat-value tabular"><MoneyText paise={balance} /></span>
              {cashbackWeekPaise > 0 && (
                <span className="vh-stat-delta-up">▲ <MoneyText paise={cashbackWeekPaise} /> cashback this week</span>
              )}
            </div>
            {balanceTrend.length >= 2 && (
              <Sparkline points={balanceTrend} width={220} height={48} label="Wallet balance over your ledger history" />
            )}
          </Card>

          {/* Split donut */}
          <Card title={title(<PieChart {...I} />, "Where your balance comes from")}>
            <div className="vh-row" style={{ gap: 16, alignItems: "center" }}>
              <Donut segments={segments} size={116} />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, flex: 1 }}>
                {segments.map((s) => (
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
          <DataTable columns={columns} rows={rows} />
        </Card>

        <div id="giftcard" style={{ scrollMarginTop: 90 }}>
          <Card title="Gift cards & store credit">
            {gift === "ok" && <div style={{ marginBottom: 10 }}><Banner severity="ok" title="Gift card redeemed">The credit is in your ledger and applies automatically at checkout.</Banner></div>}
            {gift === "bad" && <div style={{ marginBottom: 10 }}><Banner severity="danger">That code doesn&rsquo;t match an active gift card — check for typos.</Banner></div>}
            {gift === "used" && <div style={{ marginBottom: 10 }}><Banner severity="warn">That gift card was already redeemed on this account.</Banner></div>}
            <div className="vh-row-between" style={{ marginBottom: 10 }}>
              <span className="small muted">Gift credit on account</span>
              <strong><MoneyText paise={giftCredit} /></strong>
            </div>
            <form action={redeemGiftCard} className="vh-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="vh-field" style={{ flex: "1 1 200px" }}>
                <label className="vh-label" htmlFor="gc-code">Redeem a gift card</label>
                <input className="vh-input mono" id="gc-code" name="code" placeholder="VEDIC-GIFT-500" maxLength={20} required />
              </div>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit">Redeem</button>
            </form>
            <p className="small muted" style={{ margin: "8px 0 0" }}>Codes redeem once per account, server-validated. Credit spends at checkout; it is never withdrawable as cash.</p>
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title="Vedic Points — loyalty">
            <div className="vh-stat-value tabular" style={{ marginBottom: 4 }}>{loyaltyPoints.toLocaleString("en-IN")} pts</div>
            <p className="small muted" style={{ margin: 0 }}>
              {commerce.loyaltyPtsPer100} points per ₹100 on delivered orders; 100 points = ₹{Math.round(commerce.loyaltyPtsValuePaise / 100)} wallet credit at checkout.
              Points post when the return window closes, and they never expire while your account
              stays active. Computed by the platform from verified orders only.
            </p>
          </Card>
          <Card title="Refer & earn">
            <p className="small" style={{ marginTop: 0 }}>
              Your code: <strong className="mono" style={{ color: "var(--vh-ink)" }}>{refCode}</strong>
            </p>
            <p className="small muted" style={{ margin: 0 }}>
              Friends get ₹{Math.round(commerce.referralCreditPaise / 100)} off their first order above ₹999; you get the same
              wallet credit when it delivers. Referral credits appear in the ledger above — same append-only rules.
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
