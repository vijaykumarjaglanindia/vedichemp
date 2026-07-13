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
