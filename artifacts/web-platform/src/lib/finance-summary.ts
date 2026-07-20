import "server-only";

/**
 * VEDIC HEMP — FINANCE READ-MODEL
 *
 * A single, honest aggregate for the admin finance dashboard. Every figure is
 * DERIVED from the real stores — placed orders and posted settlement runs —
 * never a hand-typed constant. Money stays integer paise throughout.
 *
 *   - GMV and GST collected come from the order store. GST is the tax already
 *     included in buyer prices (inclusive pricing), summed across orders — it
 *     is what was actually collected, not a re-estimate.
 *   - Take rate, recognised commission revenue, and the TCS/TDS withholding
 *     base come from POSTED settlement runs (money that has actually been
 *     settled — an awaiting-checker run is not yet recognised).
 *
 * TCS/TDS are the marketplace's statutory withholding on seller payouts. The
 * rates are named constants with their statutory reference; the dashboard
 * shows the rate alongside the amount so the derivation is transparent.
 */

import { allOrders } from "./orders";
import { allRuns } from "./settlements";

/** GST §52: e-commerce operators collect TCS on the net taxable value of
 *  seller supplies (0.5% CGST + 0.5% SGST = 1%). */
export const TCS_RATE_BPS = 100;
/** Income-tax §194-O: TDS on the gross amount of seller sales made through
 *  the marketplace. */
export const TDS_RATE_BPS = 100;

export interface FinanceSummary {
  gmvPaise: number; // Σ order totals (real placed orders)
  orderCount: number;
  gstCollectedPaise: number; // Σ GST included in order prices
  settledGrossPaise: number; // Σ gross of POSTED settlement runs
  commissionPaise: number; // Σ commission of POSTED runs (recognised platform revenue)
  takeRateBps: number; // commission ÷ gross across all runs (effective rate)
  tcsPaise: number; // TCS on settled gross
  tdsPaise: number; // TDS on settled gross
  taxTotalPaise: number; // GST + TCS + TDS
  revenueBySeller: { seller: string; commissionPaise: number }[]; // posted, desc
}

export async function financeSummary(): Promise<FinanceSummary> {
  const orders = await allOrders();
  const runs = await allRuns();

  const gmvPaise = orders.reduce((n, o) => n + o.totalPaise, 0);
  const gstCollectedPaise = orders.reduce((n, o) => n + (o.gstPaise ?? 0), 0);

  const posted = runs.filter((r) => r.status === "POSTED");
  const settledGrossPaise = posted.reduce((n, r) => n + r.grossPaise, 0);
  const commissionPaise = posted.reduce((n, r) => n + r.commissionPaise, 0);

  // Effective take rate over every run (the ratio is the commission schedule,
  // independent of whether a run has been posted yet). Guard against no runs.
  const allGross = runs.reduce((n, r) => n + r.grossPaise, 0);
  const allCommission = runs.reduce((n, r) => n + r.commissionPaise, 0);
  const takeRateBps = allGross > 0 ? Math.round((allCommission * 10000) / allGross) : 0;

  const tcsPaise = Math.round((settledGrossPaise * TCS_RATE_BPS) / 10000);
  const tdsPaise = Math.round((settledGrossPaise * TDS_RATE_BPS) / 10000);

  const bySeller = new Map<string, number>();
  for (const r of posted) bySeller.set(r.seller, (bySeller.get(r.seller) ?? 0) + r.commissionPaise);
  const revenueBySeller = [...bySeller.entries()]
    .map(([seller, commissionPaise]) => ({ seller, commissionPaise }))
    .sort((a, b) => b.commissionPaise - a.commissionPaise);

  return {
    gmvPaise,
    orderCount: orders.length,
    gstCollectedPaise,
    settledGrossPaise,
    commissionPaise,
    takeRateBps,
    tcsPaise,
    tdsPaise,
    taxTotalPaise: gstCollectedPaise + tcsPaise + tdsPaise,
    revenueBySeller,
  };
}
