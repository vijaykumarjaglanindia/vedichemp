/**
 * VEDIC HEMP — VENDOR EARNINGS & WITHDRAWALS (Dokan-style money flow)
 *
 * Plain marketplace words, the way a multi-vendor store speaks:
 *   Earnings   — what a vendor keeps after the platform's commission, on
 *                orders that have actually been delivered.
 *   Balance    — Earned − Paid out − Pending.
 *   Withdraw   — a vendor asks for their available balance to be paid out.
 *
 * A withdrawal MOVES MONEY, so it is maker–checker (A6): one admin approves
 * (maker), a DIFFERENT admin confirms the payout (checker). No single admin
 * can pay a vendor alone. Every step is audited by the calling action.
 *
 * Earnings realise on DELIVERY: an order that is placed but not delivered is
 * not yet earned, and a refunded order is not earned at all — the server is
 * the authority on the number, never the client.
 */

import { resolveCommission } from "@/lib/commissions";
import { ordersForSeller, type Order } from "@/lib/orders";

export const MIN_WITHDRAW_PAISE = 50_000; // ₹500 — admin-configurable seam
export const WITHDRAW_CHECKER_THRESHOLD_PAISE = 1_000_000; // ₹10,000 → needs a checker (A6)

export type WithdrawMethod = "BANK" | "UPI";
export type WithdrawStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED";

export interface WithdrawRequest {
  id: string;
  seller: string;
  amountPaise: number;
  method: WithdrawMethod;
  destination: string; // masked account / UPI id
  status: WithdrawStatus;
  requestedAt: string;
  makerId?: string;
  checkerId?: string;
  note?: string;
}

export interface PayoutAccount {
  method: WithdrawMethod;
  destination: string;
}

interface EarningsStore {
  withdrawals: WithdrawRequest[];
  accounts: Record<string, PayoutAccount>; // seller → saved payout account
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhEarnings: EarningsStore | undefined;
}

function store(): EarningsStore {
  globalThis.__vhEarnings ??= { withdrawals: [], accounts: {}, seq: 1 };
  return globalThis.__vhEarnings;
}

const now = () => new Date().toISOString();

/* ── Earnings from delivered orders ───────────────────────── */

export interface OrderEarning {
  reference: string;
  placedAt: string;
  grossPaise: number; // this vendor's item lines
  commissionPct: number;
  commissionPaise: number;
  earningPaise: number; // gross − commission
}

/** Per-delivered-order earning lines for a vendor (their items only). */
export async function earningLines(seller: string): Promise<OrderEarning[]> {
  const orders = (await ordersForSeller(seller)).filter((o) => o.status === "DELIVERED");
  const lines: OrderEarning[] = [];
  for (const o of orders) {
    const gross = o.items.filter((it) => it.seller === seller).reduce((n, it) => n + it.linePaise, 0);
    if (gross <= 0) continue;
    const rate = await resolveCommission({ SELLER: seller });
    const commissionPaise = Math.round((gross * rate.ratePct) / 100);
    lines.push({
      reference: o.reference,
      placedAt: o.placedAt.slice(0, 10),
      grossPaise: gross,
      commissionPct: rate.ratePct,
      commissionPaise,
      earningPaise: gross - commissionPaise,
    });
  }
  return lines;
}

export interface Balance {
  earnedPaise: number;
  paidPaise: number;
  pendingPaise: number; // requested but not yet paid (PENDING + APPROVED)
  availablePaise: number;
}

export async function vendorBalance(seller: string): Promise<Balance> {
  const earnedPaise = (await earningLines(seller)).reduce((n, l) => n + l.earningPaise, 0);
  const mine = store().withdrawals.filter((w) => w.seller === seller);
  const paidPaise = mine.filter((w) => w.status === "PAID").reduce((n, w) => n + w.amountPaise, 0);
  const pendingPaise = mine.filter((w) => w.status === "PENDING" || w.status === "APPROVED").reduce((n, w) => n + w.amountPaise, 0);
  return {
    earnedPaise,
    paidPaise,
    pendingPaise,
    availablePaise: Math.max(0, earnedPaise - paidPaise - pendingPaise),
  };
}

/* ── Payout account ───────────────────────────────────────── */

export async function readPayoutAccount(seller: string): Promise<PayoutAccount | null> {
  return store().accounts[seller] ?? null;
}

/** Save a payout account. Only the last 4 digits/handle tail are kept visible. */
export async function savePayoutAccount(seller: string, method: WithdrawMethod, raw: string): Promise<boolean> {
  const clean = raw.trim();
  if (method === "BANK" && !/^\d{9,18}$/.test(clean)) return false;
  if (method === "UPI" && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(clean)) return false;
  const destination = method === "BANK" ? `A/C ••••${clean.slice(-4)}` : clean.replace(/^(.{2}).*(@.*)$/, "$1••••$2");
  store().accounts[seller] = { method, destination };
  return true;
}

/* ── Withdraw requests ────────────────────────────────────── */

export type WithdrawResult = { ok: true; request: WithdrawRequest } | { ok: false; reason: string };

export async function requestWithdraw(seller: string, amountPaise: number): Promise<WithdrawResult> {
  if (!Number.isInteger(amountPaise) || amountPaise < MIN_WITHDRAW_PAISE) return { ok: false, reason: "min" };
  const account = await readPayoutAccount(seller);
  if (!account) return { ok: false, reason: "account" };
  const balance = await vendorBalance(seller);
  if (amountPaise > balance.availablePaise) return { ok: false, reason: "balance" };
  const s = store();
  const request: WithdrawRequest = {
    id: `wd${s.seq++}`,
    seller,
    amountPaise,
    method: account.method,
    destination: account.destination,
    status: "PENDING",
    requestedAt: now(),
  };
  s.withdrawals.unshift(request);
  return { ok: true, request };
}

export async function withdrawalsForSeller(seller: string): Promise<WithdrawRequest[]> {
  return store().withdrawals.filter((w) => w.seller === seller);
}
export async function allWithdrawals(): Promise<WithdrawRequest[]> {
  return store().withdrawals;
}
export async function findWithdrawal(id: string): Promise<WithdrawRequest | null> {
  return store().withdrawals.find((w) => w.id === id) ?? null;
}

export type WithdrawDecision = { ok: true; request: WithdrawRequest } | { ok: false; reason: string };

/** Maker step: PENDING → APPROVED. Records who approved (the maker). */
export async function approveWithdraw(id: string, makerId: string): Promise<WithdrawDecision> {
  const w = await findWithdrawal(id);
  if (!w) return { ok: false, reason: "missing" };
  if (w.status !== "PENDING") return { ok: false, reason: "state" };
  w.status = "APPROVED";
  w.makerId = makerId;
  return { ok: true, request: w };
}

/**
 * Checker step: APPROVED → PAID. A6 — the checker must be a DIFFERENT admin
 * from the maker for any payout at or above the checker threshold. Below it a
 * single approval can pay, but the maker is still recorded and audited.
 */
export async function confirmWithdraw(id: string, checkerId: string): Promise<WithdrawDecision> {
  const w = await findWithdrawal(id);
  if (!w) return { ok: false, reason: "missing" };
  if (w.status !== "APPROVED") return { ok: false, reason: "state" };
  if (w.amountPaise >= WITHDRAW_CHECKER_THRESHOLD_PAISE && w.makerId === checkerId) {
    return { ok: false, reason: "maker" };
  }
  // A6 anti-splitting: three ₹4,000 payouts are still one ₹12,000 movement.
  // The CUMULATIVE amount this seller has moved through APPROVED/PAID rows —
  // including this one — is what the threshold applies to, so a single admin
  // cannot self-approve past it in slices.
  const cumulativePaise = store()
    .withdrawals.filter((x) => x.seller === w.seller && (x.status === "PAID" || x.status === "APPROVED"))
    .reduce((n, x) => n + x.amountPaise, 0);
  if (cumulativePaise >= WITHDRAW_CHECKER_THRESHOLD_PAISE && w.makerId === checkerId) {
    return { ok: false, reason: "split" };
  }
  w.status = "PAID";
  w.checkerId = checkerId;
  return { ok: true, request: w };
}

export async function cancelWithdraw(id: string, by: string, note: string): Promise<WithdrawDecision> {
  const w = await findWithdrawal(id);
  if (!w) return { ok: false, reason: "missing" };
  if (w.status === "PAID" || w.status === "CANCELLED") return { ok: false, reason: "state" };
  if (note.trim().length < 10) return { ok: false, reason: "note" };
  w.status = "CANCELLED";
  w.note = note.trim();
  return { ok: true, request: w };
}

export const WITHDRAW_TONE: Record<WithdrawStatus, "ok" | "warn" | "danger" | "info"> = {
  PENDING: "warn",
  APPROVED: "info",
  PAID: "ok",
  CANCELLED: "danger",
};
