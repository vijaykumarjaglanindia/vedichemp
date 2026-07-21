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
 */

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

function seed(): UserStore {
  return {
    accounts: [
      { id: "u1", handle: "ananya.s", email: "buyer@example.in", maskedEmail: "an***@gmail.com", maskedPhone: "+91 9•••••234", status: "ACTIVE", tier: "Leaf", ordersLifetime: 14, joinedAt: "2025-02-11", sessions: 2 },
      { id: "u2", handle: "rakesh.p", email: "rakesh@example.in", maskedEmail: "ra***@yahoo.com", maskedPhone: "+91 8•••••901", status: "ACTIVE", tier: "Sprout", ordersLifetime: 3, joinedAt: "2025-11-02", sessions: 1 },
      { id: "u3", handle: "meera.k", email: "meera@example.in", maskedEmail: "me***@outlook.com", maskedPhone: "+91 7•••••556", status: "RESTRICTED", tier: "Bloom", ordersLifetime: 41, joinedAt: "2024-06-19", sessions: 0 },
      { id: "u4", handle: "vikram.n", email: "vikram@example.in", maskedEmail: "vi***@gmail.com", maskedPhone: "+91 9•••••112", status: "SUSPENDED", tier: "Sprout", ordersLifetime: 1, joinedAt: "2026-01-30", sessions: 0 },
    ],
    pending: [],
    events: [],
    impersonations: [],
    seq: 1,
  };
}

function store(): UserStore {
  globalThis.__vhUsers ??= seed();
  return globalThis.__vhUsers;
}

const nowIso = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export async function listAccounts(query?: string): Promise<Account[]> {
  const q = (query ?? "").trim().toLowerCase();
  return store().accounts.filter((a) => (q ? a.handle.toLowerCase().includes(q) : true));
}

export function findAccount(id: string): Account | undefined {
  return store().accounts.find((a) => a.id === id);
}

/** Loyalty tier for a buyer email, or null if they aren't in the directory
 *  (a brand-new account starts at the entry tier). */
export function tierForEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  return store().accounts.find((a) => a.email.toLowerCase() === e)?.tier ?? null;
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
