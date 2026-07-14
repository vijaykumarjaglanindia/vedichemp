/**
 * VEDIC HEMP — EARNINGS & WITHDRAWALS (vendor, Dokan-style)
 *
 * Plain marketplace words: what you Earned, what's been Paid out, what's
 * Pending, and what's Available to Withdraw. Earnings come from DELIVERED
 * orders (your item lines) after the platform commission. A withdrawal is a
 * payout request an admin approves — and because it moves money it is
 * maker–checker (A6): one admin approves, a different admin confirms.
 */

import type { Metadata } from "next";
import { Wallet, Landmark, ArrowDownToLine, ReceiptText, Clock } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, DataTable, MoneyText, Stat, StatusPill, type Column } from "@/components/ui";
import {
  earningLines, MIN_WITHDRAW_PAISE, readPayoutAccount, vendorBalance, withdrawalsForSeller,
  WITHDRAW_TONE, type OrderEarning, type WithdrawRequest,
} from "@/lib/earnings";
import { saveWithdrawAccount, submitWithdraw } from "../actions";

export const metadata: Metadata = { title: "Earnings & Withdrawals" };

const DEMO_STORE = "Vedic Botanicals";

const ERRORS: Record<string, string> = {
  min: `The minimum withdrawal is ₹${Math.round(MIN_WITHDRAW_PAISE / 100)}.`,
  balance: "That's more than your available balance.",
  account: "Add a payout account (bank or UPI) before requesting a withdrawal.",
  amount: "Enter a whole-rupee amount.",
  method: "Choose Bank or UPI.",
  destination: "That account number / UPI id doesn't look right.",
};

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string; requested?: string }> }) {
  const { err, saved, requested } = await searchParams;
  const balance = await vendorBalance(DEMO_STORE);
  const lines = await earningLines(DEMO_STORE);
  const account = await readPayoutAccount(DEMO_STORE);
  const history = await withdrawalsForSeller(DEMO_STORE);

  const earnCols: Column<OrderEarning>[] = [
    { key: "ref", header: "Order", render: (l) => <div><div className="mono" style={{ fontWeight: 600 }}>{l.reference}</div><div className="small muted">{l.placedAt}</div></div> },
    { key: "gross", header: "Sale value", align: "right", render: (l) => <MoneyText paise={l.grossPaise} /> },
    { key: "comm", header: "Commission", align: "right", render: (l) => <span className="small">{l.commissionPct}% · −<MoneyText paise={l.commissionPaise} /></span> },
    { key: "earn", header: "You earn", align: "right", render: (l) => <span style={{ fontWeight: 700 }}><MoneyText paise={l.earningPaise} /></span> },
  ];

  const wCols: Column<WithdrawRequest>[] = [
    { key: "id", header: "Request", render: (w) => <span className="mono">{w.id}</span> },
    { key: "amt", header: "Amount", align: "right", render: (w) => <MoneyText paise={w.amountPaise} /> },
    { key: "to", header: "To", render: (w) => <span className="small">{w.method} · {w.destination}</span> },
    { key: "when", header: "Requested", render: (w) => <span className="small muted">{w.requestedAt.slice(0, 10)}</span> },
    { key: "status", header: "Status", render: (w) => <StatusPill tone={WITHDRAW_TONE[w.status]}>{w.status}{w.status === "APPROVED" ? " · awaiting checker" : ""}</StatusPill> },
  ];

  return (
    <Shell active="/seller/earnings" breadcrumb={["Seller Central", "Earnings"]} title="Earnings & Withdrawals">
      {saved === "account" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Payout account saved">New withdrawals will be paid to this account.</Banner></div>}
      {requested && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Withdrawal requested">An admin reviews and approves payouts — a payout of ₹10,000 or more needs a second admin to confirm (A6).</Banner></div>}
      {err && ERRORS[err] && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Couldn't do that">{ERRORS[err]}</Banner></div>}

      {/* Balance cards */}
      <div className="vh-grid cols-4" style={{ marginBottom: "var(--sp-4)" }}>
        <Card><Stat label="Earned" value={`₹${Math.round(balance.earnedPaise / 100).toLocaleString("en-IN")}`} /><div className="small muted" style={{ marginTop: 4 }}>after commission, delivered orders</div></Card>
        <Card><Stat label="Paid out" value={`₹${Math.round(balance.paidPaise / 100).toLocaleString("en-IN")}`} /></Card>
        <Card><Stat label="Pending" value={`₹${Math.round(balance.pendingPaise / 100).toLocaleString("en-IN")}`} /><div className="small muted" style={{ marginTop: 4 }}>requested, not yet paid</div></Card>
        <Card><Stat label="Available to withdraw" value={`₹${Math.round(balance.availablePaise / 100).toLocaleString("en-IN")}`} /></Card>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        {/* Withdraw + account */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <div id="withdraw" style={{ scrollMarginTop: 90 }}>
            <Card title={<span className="vh-row" style={{ gap: 8 }}><ArrowDownToLine size={16} strokeWidth={2.2} aria-hidden /> Request a withdrawal</span>}>
              {account ? (
                <form action={submitWithdraw} className="vh-grid" style={{ gap: 12 }}>
                  <p className="small muted" style={{ margin: 0 }}>
                    Paid to <strong>{account.method} · {account.destination}</strong>. Minimum ₹{Math.round(MIN_WITHDRAW_PAISE / 100)}.
                  </p>
                  <div className="vh-field" style={{ maxWidth: 220 }}>
                    <label className="vh-label" htmlFor="wd-amount">Amount (₹) <span className="req">*</span></label>
                    {/* No client max — the server is the authority on the balance and rejects an over-balance request. */}
                    <input className="vh-input" id="wd-amount" name="amount" type="number" min={1} step={1} placeholder={String(Math.round(balance.availablePaise / 100))} />
                    <span className="vh-help">You can withdraw up to <MoneyText paise={balance.availablePaise} />.</span>
                  </div>
                  <button className="vh-btn vh-btn-primary" type="submit" style={{ justifySelf: "start" }} disabled={balance.availablePaise < MIN_WITHDRAW_PAISE}>Request withdrawal</button>
                  {balance.availablePaise < MIN_WITHDRAW_PAISE && <span className="small muted">Your available balance is below the ₹{Math.round(MIN_WITHDRAW_PAISE / 100)} minimum — keep selling to reach it.</span>}
                </form>
              ) : (
                <Banner severity="warn" title="Add a payout account first">Set a bank account or UPI id below, then you can request withdrawals.</Banner>
              )}
            </Card>
          </div>

          <div id="account" style={{ scrollMarginTop: 90 }}>
            <Card title={<span className="vh-row" style={{ gap: 8 }}><Landmark size={16} strokeWidth={2.2} aria-hidden /> Payout account</span>}>
              {account && <p className="small" style={{ marginTop: 0 }}>Current: <strong>{account.method} · {account.destination}</strong></p>}
              <form action={saveWithdrawAccount} className="vh-grid" style={{ gap: 12 }}>
                <div className="vh-field" style={{ maxWidth: 200 }}>
                  <label className="vh-label" htmlFor="pa-method">Method</label>
                  <select className="vh-select" id="pa-method" name="method" defaultValue={account?.method ?? "UPI"}>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank transfer</option>
                  </select>
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="pa-dest">Account number or UPI id <span className="req">*</span></label>
                  <input className="vh-input" id="pa-dest" name="destination" placeholder="name@bank or 000123456789" />
                  <span className="vh-help">Stored masked — only the last few characters are ever shown.</span>
                </div>
                <button className="vh-btn vh-btn-ghost vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Save payout account</button>
              </form>
            </Card>
          </div>
        </div>

        {/* Earnings statement + history */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><ReceiptText size={16} strokeWidth={2.2} aria-hidden /> Earnings statement</span>} pad0>
            <DataTable columns={earnCols} rows={lines} empty={<div className="vh-empty">No delivered orders yet — earnings appear here once orders are delivered.</div>} />
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Clock size={16} strokeWidth={2.2} aria-hidden /> Withdrawal history</span>} pad0>
            <DataTable columns={wCols} rows={history} empty={<div className="vh-empty">No withdrawals yet.</div>} />
          </Card>
        </div>
      </div>

      <p className="small muted" style={{ marginTop: "var(--sp-3)" }}>
        <Wallet size={13} strokeWidth={2.2} aria-hidden style={{ verticalAlign: -2 }} /> Earnings realise on delivery and
        are shown after the platform commission. A refunded order is never counted as earnings — the buyer is refunded
        first and recovery from you is handled separately (you are never charged for a buyer-first refund twice).
      </p>
    </Shell>
  );
}
