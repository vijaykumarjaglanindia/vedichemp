import "server-only";

/**
 * VEDIC HEMP — USER ACCOUNTS & ADMIN ACTIONS (A6 spirit, A3 append-only)
 *
 * The runtime (__vh*) seam behind the admin User-management console. Two things
 * the old cookie mock only *claimed*:
 *
 *  - SUSPEND and REINSTATE are MAKER–CHECKER. One admin raises a request; a
 *    DIFFERENT admin approves it. The maker can never approve their own request
 *    (A6 makerId <> checkerId). A restrict/lift is lower-impact and single-admin.
 *  - Every status change and every impersonation is written to an APPEND-ONLY
 *    ledger (A3 spirit — safety/audit records are corrected by new rows, never
 *    edited). Impersonation is read-only and the buyer is notified (A4).
 *
 * The store carries a real email for each account only so the buyer-notice job
 * (A4) can reach them; the console still renders masked contacts and this file
 * never exposes the raw email to a page.
 *
 * The directory itself is a PROJECTION of the real account store: one row per
 * registered buyer, its masked contact derived from that account's own email,
 * its lifetime order count counted from the order book, and its loyalty tier
 * computed from that count against an editable tier table. Only what an admin
 * decides — status, and the ledger of how it got there — is stored here.
 */

import { allAccounts } from "@/lib/accounts";

export type AccountStatus = "ACTIVE" | "RESTRICTED" | "SUSPENDED";

export interface Account {
  id: string;
  handle: string;
  email: string; // for the buyer-notice job only — never rendered by the console
  maskedEmail: string;
  maskedPhone: string;
  status: AccountStatus;
  tier: string;
  ordersLifetime: number;
  joinedAt: string;
  sessions: number;
}

export type PendingKind = "SUSPEND" | "REINSTATE";
export type PendingStatus = "AWAITING_CHECKER" | "APPROVED" | "REJECTED";

export interface PendingAction {
  id: string;
  userId: string;
  handle: string;
  kind: PendingKind;
  maker: string;
  reason: string;
  requestedAt: string;
  status: PendingStatus;
  checker?: string;
  decidedAt?: string;
}

export interface StatusEvent {
  id: string;
  userId: string;
  from: AccountStatus;
  to: AccountStatus;
  actor: string;
  reason: string;
  at: string;
  via: "restrict" | "unrestrict" | "suspend" | "reinstate";
}

export interface ImpersonationEntry {
  id: string;
  userId: string;
  handle: string;
  admin: string;
  reason: string;
  at: string;
  readOnly: true;
  buyerNotified: boolean;
}

interface UserStore {
  accounts: Account[];
  pending: PendingAction[]; // maker-checker queue (append-only per outcome)
  events: StatusEvent[]; // append-only status ledger
  impersonations: ImpersonationEntry[]; // append-only
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhUsers: UserStore | undefined;
}

function store(): UserStore {
  globalThis.__vhUsers ??= { accounts: [], pending: [], events: [], impersonations: [], seq: 1 };
  return globalThis.__vhUsers;
}

const nowIso = () => new Date().toISOString().slice(0, 16).replace("T", " ");

/* ── Loyalty tiers (an owner's lever, not a literal on a row) ─────── */

export interface LoyaltyTier {
  name: string;
  minLifetimeOrders: number; // reached at or above this many lifetime orders
}

export const LOYALTY_TIER_DEFAULTS: LoyaltyTier[] = [
  { name: "Sprout", minLifetimeOrders: 0 },
  { name: "Leaf", minLifetimeOrders: 5 },
  { name: "Bloom", minLifetimeOrders: 25 },
  { name: "Vedic Prime", minLifetimeOrders: 100 },
];

declare global {
  // eslint-disable-next-line no-var
  var __vhLoyaltyTiers: LoyaltyTier[] | undefined;
}

function tierTable(): LoyaltyTier[] {
  return [...(globalThis.__vhLoyaltyTiers ?? LOYALTY_TIER_DEFAULTS)].sort((a, b) => a.minLifetimeOrders - b.minLifetimeOrders);
}

export async function readLoyaltyTiers(): Promise<LoyaltyTier[]> {
  return tierTable().map((t) => ({ ...t }));
}

export async function writeLoyaltyTiers(tiers: LoyaltyTier[]): Promise<void> {
  const clean = tiers
    .filter((t) => t.name.trim() && Number.isInteger(t.minLifetimeOrders) && t.minLifetimeOrders >= 0)
    .map((t) => ({ name: t.name.trim().slice(0, 40), minLifetimeOrders: t.minLifetimeOrders }));
  // An entry tier reached at zero orders must exist, or a new buyer has none.
  if (!clean.some((t) => t.minLifetimeOrders === 0)) return;
  globalThis.__vhLoyaltyTiers = clean;
}

/** The tier a lifetime order count earns. */
export function tierForOrders(lifetimeOrders: number): string {
  const table = tierTable();
  let name = table[0]?.name ?? LOYALTY_TIER_DEFAULTS[0]!.name;
  for (const t of table) if (lifetimeOrders >= t.minLifetimeOrders) name = t.name;
  return name;
}

/* ── Projection from the real stores ──────────────────────────────── */

/**
 * Lifetime orders for a buyer, counted from the order book. Read directly off
 * the order store's in-process seam because the buyer viewer resolves a tier on
 * a synchronous path — the shape is orders.ts's `Order`, narrowed to the one
 * field this needs.
 */
function lifetimeOrders(email: string): number {
  const s = (globalThis as { __vhOrders?: { orders?: { buyerEmail?: string }[] } }).__vhOrders;
  const e = email.trim().toLowerCase();
  return (s?.orders ?? []).filter((o) => (o.buyerEmail ?? "").toLowerCase() === e).length;
}

/** Masked from the account's OWN address — never a typed-in stand-in. */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "•••";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}

function handleFor(email: string): string {
  return email.slice(0, email.indexOf("@") > 0 ? email.indexOf("@") : undefined);
}

/**
 * Reconcile the console's directory with the real account store, then refresh
 * every derived field. A row exists because someone registered; its status is
 * the only thing an admin owns here, so that alone survives a refresh.
 */
function project(): Account[] {
  const s = store();
  for (const a of allAccounts()) {
    if (a.role !== "BUYER") continue;
    if (s.accounts.some((x) => x.email.toLowerCase() === a.email)) continue;
    s.accounts.push({
      id: a.id,
      handle: handleFor(a.email),
      email: a.email,
      maskedEmail: maskEmail(a.email),
      maskedPhone: "—", // no phone is held on an account; nothing to mask
      status: "ACTIVE",
      tier: LOYALTY_TIER_DEFAULTS[0]!.name,
      ordersLifetime: 0,
      joinedAt: a.createdAt.slice(0, 10),
      // The session is a stateless signed cookie, so there is no registry of
      // live sessions to count. Reporting a number would be inventing one.
      sessions: 0,
    });
  }
  for (const row of s.accounts) {
    row.ordersLifetime = lifetimeOrders(row.email);
    row.tier = tierForOrders(row.ordersLifetime);
  }
  return s.accounts;
}

export async function listAccounts(query?: string): Promise<Account[]> {
  const q = (query ?? "").trim().toLowerCase();
  return project().filter((a) => (q ? a.handle.toLowerCase().includes(q) : true));
}

export function findAccount(id: string): Account | undefined {
  return project().find((a) => a.id === id);
}

/** Loyalty tier for a buyer email, or null if they aren't in the directory
 *  (a brand-new account starts at the entry tier). Earned from their real
 *  order history against the tier table — never a value typed onto a row. */
export function tierForEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!allAccounts().some((a) => a.email === e)) return null;
  return tierForOrders(lifetimeOrders(e));
}

function record(a: Account, to: AccountStatus, actor: string, reason: string, via: StatusEvent["via"]) {
  const s = store();
  s.events.unshift({ id: `ue-${s.seq++}`, userId: a.id, from: a.status, to, actor, reason, at: nowIso(), via });
  a.status = to;
}

export type UserResult =
  | { ok: true; account: Account }
  | { ok: false; reason: "missing" | "state" };

/** Single-admin restrict (e.g. checkout paused pending a fraud review). */
export async function restrictAccount(userId: string, actor: string, reason: string): Promise<UserResult> {
  const a = findAccount(userId);
  if (!a) return { ok: false, reason: "missing" };
  if (a.status !== "ACTIVE") return { ok: false, reason: "state" };
  record(a, "RESTRICTED", actor, reason, "restrict");
  return { ok: true, account: a };
}

/** Single-admin lift of a restriction. */
export async function unrestrictAccount(userId: string, actor: string, reason: string): Promise<UserResult> {
  const a = findAccount(userId);
  if (!a) return { ok: false, reason: "missing" };
  if (a.status !== "RESTRICTED") return { ok: false, reason: "state" };
  record(a, "ACTIVE", actor, reason, "unrestrict");
  return { ok: true, account: a };
}

export type RequestResult =
  | { ok: true; pending: PendingAction }
  | { ok: false; reason: "missing" | "state" | "duplicate" };

/**
 * MAKER step. Raise a suspend or reinstate REQUEST — nothing changes on the
 * account yet. A second admin must approve it (A6). At most one open request
 * per account.
 */
export async function requestStatusChange(userId: string, kind: PendingKind, maker: string, reason: string): Promise<RequestResult> {
  const s = store();
  const a = findAccount(userId);
  if (!a) return { ok: false, reason: "missing" };
  if (kind === "SUSPEND" && a.status === "SUSPENDED") return { ok: false, reason: "state" };
  if (kind === "REINSTATE" && a.status !== "SUSPENDED") return { ok: false, reason: "state" };
  if (s.pending.some((p) => p.userId === userId && p.status === "AWAITING_CHECKER")) return { ok: false, reason: "duplicate" };
  const pending: PendingAction = {
    id: `pa-${s.seq++}`, userId, handle: a.handle, kind, maker, reason,
    requestedAt: nowIso(), status: "AWAITING_CHECKER",
  };
  s.pending.unshift(pending);
  return { ok: true, pending };
}

export type DecisionResult =
  | { ok: true; pending: PendingAction; account: Account; approved: boolean }
  | { ok: false; reason: "missing" | "state" | "maker" };

/**
 * CHECKER step. Approve or reject an open request. A6: the checker can never be
 * the maker — a self-approval is refused (and the caller logs the denial).
 */
export async function decidePending(pendingId: string, checker: string, approve: boolean): Promise<DecisionResult> {
  const s = store();
  const p = s.pending.find((x) => x.id === pendingId);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "AWAITING_CHECKER") return { ok: false, reason: "state" };
  const a = findAccount(p.userId);
  if (!a) return { ok: false, reason: "missing" };
  if (approve && p.maker === checker) return { ok: false, reason: "maker" }; // A6

  p.checker = checker;
  p.decidedAt = nowIso();
  p.status = approve ? "APPROVED" : "REJECTED";
  if (approve) {
    if (p.kind === "SUSPEND") record(a, "SUSPENDED", checker, p.reason, "suspend");
    else record(a, "ACTIVE", checker, p.reason, "reinstate");
  }
  return { ok: true, pending: p, account: a, approved: approve };
}

export async function pendingActions(): Promise<PendingAction[]> {
  return store().pending.filter((p) => p.status === "AWAITING_CHECKER");
}

export async function openRequestFor(userId: string): Promise<PendingAction | undefined> {
  return store().pending.find((p) => p.userId === userId && p.status === "AWAITING_CHECKER");
}

/**
 * Log a READ-ONLY impersonation session. Append-only; the buyer is notified
 * (A4). No maker–checker — nothing is mutated on the buyer's behalf.
 */
export async function logImpersonation(userId: string, admin: string, reason: string): Promise<{ ok: boolean; entry?: ImpersonationEntry; account?: Account }> {
  const s = store();
  const a = findAccount(userId);
  if (!a) return { ok: false };
  const entry: ImpersonationEntry = {
    id: `im-${s.seq++}`, userId, handle: a.handle, admin, reason,
    at: nowIso(), readOnly: true, buyerNotified: true,
  };
  s.impersonations.unshift(entry);
  return { ok: true, entry, account: a };
}

export async function impersonationLog(limit = 50): Promise<ImpersonationEntry[]> {
  return store().impersonations.slice(0, limit);
}

export async function statusHistory(userId?: string, limit = 50): Promise<StatusEvent[]> {
  const all = store().events;
  return (userId ? all.filter((e) => e.userId === userId) : all).slice(0, limit);
}
