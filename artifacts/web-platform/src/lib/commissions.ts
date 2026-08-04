/**
 * VEDIC HEMP — COMMISSION ENGINE
 *
 * Launch strategy: a 10% Early Adopter rate as the global default —
 * deliberately public, deliberately low. Rates are configurable from Admin at
 * four levels; the most specific wins:
 *
 *   PRODUCT > SELLER (brand) > CATEGORY (compliance class) > GLOBAL
 *
 * A5 still governs every change: an increase takes effect no earlier than 30
 * days after notice (DB CHECK a5_thirty_day_notice), and no posted statement
 * ever moves. Decreases may apply immediately — sellers only ever benefit.
 */

import { readCommissions, type CommissionScheduleRow } from "@/lib/adminstate";

export const LAUNCH_COMMISSION_PCT = 10; // Early Adopter Program — global default
export type CommissionScope = "GLOBAL" | "CATEGORY" | "SELLER" | "PRODUCT";
export const SCOPE_PRECEDENCE: CommissionScope[] = ["PRODUCT", "SELLER", "CATEGORY", "GLOBAL"];

export interface ResolvedCommission {
  ratePct: number;
  scope: CommissionScope;
  target: string;
  source: "schedule" | "launch-default";
}

function activeRows(rows: CommissionScheduleRow[], today: string): CommissionScheduleRow[] {
  return rows.filter((r) => r.effectiveFrom <= today);
}

/**
 * Resolve the rate for a sale. `keys` carries the identifiers at each level,
 * e.g. { PRODUCT: "cbd-balm-30g", SELLER: "Vedic Botanicals", CATEGORY: "CBD_WELLNESS" }.
 */
export async function resolveCommission(keys: Partial<Record<Exclude<CommissionScope, "GLOBAL">, string>>): Promise<ResolvedCommission> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = activeRows(await readCommissions(), today);
  for (const scope of SCOPE_PRECEDENCE) {
    const target = scope === "GLOBAL" ? "GLOBAL" : keys[scope];
    if (!target) continue;
    // Rows are newest-first; the first active match at a scope is the current schedule.
    const hit = rows.find((r) => (r.scope ?? "CATEGORY") === scope && r.target === target);
    if (hit) return { ratePct: hit.ratePct, scope, target, source: "schedule" };
  }
  return { ratePct: LAUNCH_COMMISSION_PCT, scope: "GLOBAL", target: "GLOBAL", source: "launch-default" };
}

export interface PendingCommissionChange {
  scope: CommissionScope;
  target: string;
  ratePct: number;
  currentPct: number;
  isIncrease: boolean;
  noticeSentAt: string;
  effectiveFrom: string;
  /** Days between the notice and the date of effect. A5 requires ≥30 for an
   *  increase; the DB CHECK is the enforcement, this is what a seller sees. */
  noticeDays: number;
}

/**
 * Rate changes already scheduled against this seller but not yet in force. A5
 * is meant to be visible, not merely enforced: a seller should be able to read
 * the notice date, the date of effect, and the gap between them, before the
 * change touches a single settlement.
 */
export async function pendingCommissionChanges(
  keys: Partial<Record<Exclude<CommissionScope, "GLOBAL">, string>>,
): Promise<PendingCommissionChange[]> {
  const today = new Date().toISOString().slice(0, 10);
  const current = await resolveCommission(keys);
  const rows = (await readCommissions()).filter((r) => {
    if (r.effectiveFrom <= today) return false;
    const scope = (r.scope ?? "CATEGORY") as CommissionScope;
    const target = scope === "GLOBAL" ? "GLOBAL" : keys[scope as Exclude<CommissionScope, "GLOBAL">];
    return target !== undefined && r.target === target;
  });
  return rows
    .map((r) => ({
      scope: (r.scope ?? "CATEGORY") as CommissionScope,
      target: r.target,
      ratePct: r.ratePct,
      currentPct: current.ratePct,
      isIncrease: r.ratePct > current.ratePct,
      noticeSentAt: r.noticeSentAt,
      effectiveFrom: r.effectiveFrom,
      noticeDays: Math.round(
        (Date.parse(`${r.effectiveFrom}T00:00:00Z`) - Date.parse(`${r.noticeSentAt}T00:00:00Z`)) / 86_400_000,
      ),
    }))
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
}
