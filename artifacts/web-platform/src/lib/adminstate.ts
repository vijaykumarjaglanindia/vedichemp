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
