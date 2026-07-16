/**
 * VEDIC HEMP — VENDOR PAYOUTS / WITHDRAWAL APPROVALS (admin, Dokan-style)
 *
 * A vendor requests a withdrawal; an admin approves it and — because a payout
 * MOVES MONEY — a second, different admin confirms it for any payout of
 * ₹10,000 or more (A6, "no single admin moves money"). The store enforces
 * maker ≠ checker; this page is the queue, and every step is audited.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeIndianRupee } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, MoneyText, StatusPill, type Column, DataTable } from "@/components/ui";
import { allWithdrawals, WITHDRAW_CHECKER_THRESHOLD_PAISE, WITHDRAW_TONE, type WithdrawRequest } from "@/lib/earnings";
import { approveWithdrawal, cancelWithdrawal, confirmWithdrawal } from "../../actions";

export const metadata: Metadata = { title: "Vendor payouts · Admin" };

const MSG: Record<string, { severity: "ok" | "danger" | "warn"; title: string; body: string }> = {
  approved: { severity: "ok", title: "Withdrawal approved (maker)", body: "It now awaits a checker to confirm the payout." },
  paid: { severity: "ok", title: "Payout confirmed (checker)", body: "Marked PAID. The vendor's balance reflects it immediately." },
  cancelled: { severity: "ok", title: "Withdrawal cancelled", body: "The amount returns to the vendor's available balance." },
  maker: { severity: "danger", title: "Blocked — maker cannot be checker (A6)", body: "A payout of ₹10,000 or more must be confirmed by a different admin. The attempt was logged." },
  split: { severity: "danger", title: "Blocked — cumulative threshold reached (A6 anti-splitting)", body: "This seller's payouts add up to ₹10,000 or more — several small payouts are still one large money movement, so a different admin must confirm this one. The attempt was logged." },
  state: { severity: "warn", title: "Nothing to do", body: "That request is no longer in a state where the action applies." },
  note: { severity: "danger", title: "A reason is required to cancel", body: "Give at least 10 characters — the vendor sees it." },
};

export default async function AdminWithdrawalsPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string }> }) {
  const { done, err } = await searchParams;
  const all = await allWithdrawals();
  const pending = all.filter((w) => w.status === "PENDING");
  const awaitingChecker = all.filter((w) => w.status === "APPROVED");
  const settled = all.filter((w) => w.status === "PAID" || w.status === "CANCELLED");
  const flag = done ?? err;
  const msg = flag ? MSG[flag] : undefined;

  const settledCols: Column<WithdrawRequest>[] = [
    { key: "id", header: "Request", render: (w) => <span className="mono">{w.id}</span> },
    { key: "seller", header: "Vendor", render: (w) => w.seller },
    { key: "amt", header: "Amount", align: "right", render: (w) => <MoneyText paise={w.amountPaise} /> },
    { key: "status", header: "Status", render: (w) => <StatusPill tone={WITHDRAW_TONE[w.status]}>{w.status}</StatusPill> },
    { key: "who", header: "Maker / checker", render: (w) => <span className="small muted">{w.makerId ?? "—"}{w.checkerId ? ` → ${w.checkerId}` : ""}{w.note ? ` · ${w.note}` : ""}</span> },
  ];

  const RequestCard = ({ w, stage }: { w: WithdrawRequest; stage: "approve" | "confirm" }) => {
    const needsChecker = w.amountPaise >= WITHDRAW_CHECKER_THRESHOLD_PAISE;
    return (
      <div id={`wd-${w.id}`} className="vh-card" style={{ padding: "var(--sp-3)", display: "grid", gap: "var(--sp-2)" }}>
        <div className="vh-row-between" style={{ gap: 8 }}>
          <span><span className="mono" style={{ fontWeight: 600 }}>{w.id}</span> · {w.seller}</span>
          <MoneyText paise={w.amountPaise} />
        </div>
        <div className="small muted">{w.method} · {w.destination} · requested {w.requestedAt.slice(0, 10)}{w.makerId ? ` · approved by ${w.makerId}` : ""}</div>
        {needsChecker && <StatusPill tone="info">₹10,000+ · needs maker + a different checker (A6)</StatusPill>}
        <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {stage === "approve" ? (
            <form action={approveWithdrawal} style={{ display: "inline-flex" }}>
              <input type="hidden" name="withdrawId" value={w.id} />
              <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Approve (maker)</button>
            </form>
          ) : (
            <form action={confirmWithdrawal} style={{ display: "inline-flex" }}>
              <input type="hidden" name="withdrawId" value={w.id} />
              <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Confirm payout (checker)</button>
            </form>
          )}
          <details style={{ position: "relative" }}>
            <summary className="vh-btn vh-btn-sm vh-btn-ghost" style={{ listStyle: "none", cursor: "pointer" }}>Cancel…</summary>
            <form action={cancelWithdrawal} className="vh-card" style={{ position: "absolute", left: 0, zIndex: 5, padding: 12, width: 280, display: "grid", gap: 8 }}>
              <input type="hidden" name="withdrawId" value={w.id} />
              <textarea className="vh-textarea" name="note" rows={2} maxLength={200} placeholder="Reason the vendor will see (≥ 10 chars)" />
              <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Cancel withdrawal</button>
            </form>
          </details>
        </div>
      </div>
    );
  };

  return (
    <Shell
      active="/admin/finance"
      breadcrumb={["Admin", "Finance", "Vendor payouts"]}
      title="Vendor payouts"
      actions={<Link href="/admin/finance" className="vh-btn vh-btn-sm vh-btn-ghost vh-row" style={{ gap: 6 }}><ArrowLeft size={14} strokeWidth={2.2} aria-hidden /> Finance</Link>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.severity} title={msg.title}>{msg.body}</Banner></div>}

      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><BadgeIndianRupee size={16} strokeWidth={2.2} aria-hidden /> Awaiting approval (maker)</span>}
          action={<StatusPill tone={pending.length ? "warn" : "ok"}>{pending.length}</StatusPill>}
        >
          {pending.length === 0 ? <p className="small muted" style={{ margin: 0 }}>No pending requests.</p> : (
            <div className="vh-grid cols-2">{pending.map((w) => <RequestCard key={w.id} w={w} stage="approve" />)}</div>
          )}
        </Card>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><BadgeIndianRupee size={16} strokeWidth={2.2} aria-hidden /> Awaiting checker confirmation</span>}
          action={<StatusPill tone={awaitingChecker.length ? "info" : "ok"}>{awaitingChecker.length}</StatusPill>}
        >
          {awaitingChecker.length === 0 ? <p className="small muted" style={{ margin: 0 }}>Nothing awaiting a checker.</p> : (
            <div className="vh-grid cols-2">{awaitingChecker.map((w) => <RequestCard key={w.id} w={w} stage="confirm" />)}</div>
          )}
        </Card>

        <Card title="Settled" pad0>
          <DataTable columns={settledCols} rows={settled} empty={<div className="vh-empty">No settled payouts yet.</div>} />
        </Card>

        <Banner severity="info" title="Why two admins?">
          A withdrawal pays a vendor real money. Prohibition A6 — &ldquo;no single admin moves money&rdquo; — means a
          payout of ₹10,000 or more needs one admin to approve and a different admin to confirm. The store rejects a
          self-check; splitting a large payout into smaller ones is caught by the same threshold on each.
        </Banner>
      </div>
    </Shell>
  );
}
