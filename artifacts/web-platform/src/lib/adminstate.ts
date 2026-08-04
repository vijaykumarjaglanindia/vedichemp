/**
 * VEDIC HEMP — ADMIN OPERATIONAL STATE (server-side store; DB seam)
 *
 * Recalls and commission schedules are shared operational records — they must
 * be visible to EVERY admin (maker–checker needs a second person to see the
 * maker's work), so they live server-side, never in one admin's cookies.
 */

export interface OpenRecall {
  ref: string;
  at: string;
  initiator: string; // admin email — the maker; A6: cannot also be the closer
  reason: string;
}

export interface CommissionScheduleRow {
  /** Which level this schedule binds: GLOBAL | CATEGORY | SELLER | PRODUCT. */
  scope?: "GLOBAL" | "CATEGORY" | "SELLER" | "PRODUCT";
  /** Class name, seller name, product slug — or "GLOBAL". */
  target: string;
  cls: string;
  ratePct: number;
  noticeSentAt: string; // ISO date the change notice went to sellers
  effectiveFrom: string; // ISO date — DB CHECK enforces >= notice + 30 days (A5)
  by: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhOpenRecall: OpenRecall | null | undefined;
  // eslint-disable-next-line no-var
  var __vhCommissions: CommissionScheduleRow[] | undefined;
}

export async function readOpenRecall(): Promise<OpenRecall | null> {
  return globalThis.__vhOpenRecall ?? null;
}
export async function setOpenRecall(r: OpenRecall | null): Promise<void> {
  globalThis.__vhOpenRecall = r;
}

export async function readCommissions(): Promise<CommissionScheduleRow[]> {
  globalThis.__vhCommissions ??= [];
  return globalThis.__vhCommissions;
}
export async function addCommission(row: CommissionScheduleRow): Promise<void> {
  globalThis.__vhCommissions ??= [];
  globalThis.__vhCommissions.unshift(row);
}

/** A5: the earliest permissible effective date for a notice sent today. */
export function minEffectiveFrom(noticeSentAt: Date): Date {
  return new Date(noticeSentAt.getTime() + 30 * 86400000);
}

/* ── Operational SLAs ─────────────────────────────────────── */

/**
 * The review clocks the platform commits to, in hours. These are promises made
 * to buyers and sellers on their own pages — a prescription reviewed "within 4
 * business hours", a lab report reviewed "within 4" — so they belong in one
 * place an operator can change, not retyped into each sentence.
 *
 * They are commitments, not gates: missing one never makes an unapproved
 * prescription valid or an untested batch sellable. A2 and A4 are unaffected.
 */
export interface OpsSla {
  /** Pharmacist verification of an uploaded prescription (A4 path). */
  rxHours: number;
  /** Compliance review of a submitted lab report (A2 path). */
  coaHours: number;
  /** Verification (KYC) decision on a seller application. */
  kycHours: number;
}

export const OPS_SLA_DEFAULTS: OpsSla = { rxHours: 4, coaHours: 4, kycHours: 24 };

declare global {
  // eslint-disable-next-line no-var
  var __vhOpsSla: Partial<OpsSla> | undefined;
}

export async function readOpsSla(): Promise<OpsSla> {
  return { ...OPS_SLA_DEFAULTS, ...(globalThis.__vhOpsSla ?? {}) };
}

/** Whole positive hours only; anything else leaves the current value alone. */
export async function writeOpsSla(patch: Partial<OpsSla>): Promise<void> {
  const clean: Partial<OpsSla> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (Number.isInteger(v) && (v as number) > 0 && (v as number) <= 720) clean[k as keyof OpsSla] = v as number;
  }
  globalThis.__vhOpsSla = { ...(globalThis.__vhOpsSla ?? {}), ...clean };
}
