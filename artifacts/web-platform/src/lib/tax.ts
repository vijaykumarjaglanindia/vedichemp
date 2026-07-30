import "server-only";

/**
 * VEDIC HEMP — GST (server-authoritative, inclusive pricing)
 *
 * Indian B2C prices are GST-INCLUSIVE: the sticker price is what the buyer
 * pays, and the tax is a derived component of it — so computing GST never
 * changes a total, it explains one. All money is integer paise; rates are
 * integer basis points (bps) so nothing here ever touches a float.
 *
 * The rate table is an ADMIN SETTING, not a constant: GST slabs move by
 * government notification, so each row carries the date it takes effect and the
 * notification it came from, and a rate lookup for a past date returns the rate
 * that was in force then — an old invoice never silently reprints at a new slab.
 * The defaults below are the seam's starting table, editable at /admin/finance.
 *
 * Place of supply: seller state == buyer state → CGST+SGST split; otherwise
 * IGST. The seller of record's state comes from the KYC record, never the UI.
 */

export interface GstBreakdown {
  rateBps: number;        // e.g. 1800 = 18%
  taxablePaise: number;   // price net of GST
  gstPaise: number;       // total GST included in the price
  cgstPaise: number;      // half of GST when intra-state, else 0
  sgstPaise: number;      // half of GST when intra-state, else 0
  igstPaise: number;      // full GST when inter-state, else 0
  interState: boolean;
}

/** One slab. Exactly one of `hsnPrefix` / `cls` identifies what it applies to:
 *  an HSN-prefix row wins over the compliance-class fallback. */
export interface GstRate {
  hsnPrefix?: string;      // e.g. "3304" — matched as a prefix of the product HSN
  cls?: string;            // compliance-class fallback when no HSN row matches
  bps: number;             // 1800 = 18%
  effectiveFrom: string;   // YYYY-MM-DD — the notification's date of effect
  notification?: string;   // the notification this rate came from
  note?: string;
}

/** The starting table. An admin edit replaces it in the store below. */
export const GST_RATE_DEFAULTS: GstRate[] = [
  { hsnPrefix: "1207", bps: 500, effectiveFrom: "2017-07-01", note: "Hemp seeds" },
  { hsnPrefix: "1208", bps: 500, effectiveFrom: "2017-07-01", note: "Hemp seed flour" },
  { hsnPrefix: "1209", bps: 500, effectiveFrom: "2017-07-01", note: "Sowing seed" },
  { hsnPrefix: "1515", bps: 500, effectiveFrom: "2017-07-01", note: "Hemp seed oil" },
  { hsnPrefix: "3004", bps: 1200, effectiveFrom: "2017-07-01", note: "Ayurvedic medicaments" },
  { hsnPrefix: "3304", bps: 1800, effectiveFrom: "2017-07-01", note: "Topicals / cosmetics" },
  { cls: "HEMP_FOOD", bps: 500, effectiveFrom: "2017-07-01" },
  { cls: "AYURVEDA", bps: 1200, effectiveFrom: "2017-07-01" },
  { cls: "CBD_WELLNESS", bps: 1800, effectiveFrom: "2017-07-01" },
  { cls: "MED_CANNABIS", bps: 1200, effectiveFrom: "2017-07-01", note: "Dispensed as a medicament" },
];

/** Applied when neither an HSN row nor a class row covers a line. */
export const GST_FALLBACK_BPS = 1800;

declare global {
  // eslint-disable-next-line no-var
  var __vhTaxRates: GstRate[] | undefined;
}

/** Sync read of the seam — `gstRateBps` is called from sync render paths. */
function currentRates(): GstRate[] {
  return globalThis.__vhTaxRates ?? GST_RATE_DEFAULTS;
}

export async function readTaxRates(): Promise<GstRate[]> {
  return currentRates().map((r) => ({ ...r }));
}

/** Replace the rate table (Admin → Finance). Rows with no date of effect are
 *  refused: a slab without one cannot be applied to the right invoices. */
export async function writeTaxRates(rates: GstRate[]): Promise<void> {
  globalThis.__vhTaxRates = rates
    .filter((r) => (r.hsnPrefix || r.cls) && Number.isInteger(r.bps) && r.bps >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom))
    .map((r) => ({ ...r }));
}

/** The row in force on `onDate` — the latest effectiveFrom not after it. */
function inForce(rows: GstRate[], onDate: string): GstRate | undefined {
  return rows
    .filter((r) => r.effectiveFrom <= onDate)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];
}

/**
 * The GST rate for a line. `onDate` (YYYY-MM-DD) selects the slab that was in
 * force then, so a reprinted invoice keeps the rate it was raised at; it
 * defaults to today. `table` lets a caller price a whole document against one
 * snapshot of the rates.
 */
export function gstRateBps(hsn: string | undefined, cls: string, onDate?: string, table?: GstRate[]): number {
  const rows = table ?? currentRates();
  const date = onDate ?? new Date().toISOString().slice(0, 10);
  if (hsn) {
    const byHsn = rows.filter((r) => r.hsnPrefix && hsn.startsWith(r.hsnPrefix));
    // Longest prefix wins, then the row in force on the date.
    const best = byHsn.sort((a, b) => (b.hsnPrefix!.length - a.hsnPrefix!.length))[0]?.hsnPrefix;
    const hit = best ? inForce(byHsn.filter((r) => r.hsnPrefix === best), date) : undefined;
    if (hit) return hit.bps;
  }
  return inForce(rows.filter((r) => r.cls === cls), date)?.bps ?? GST_FALLBACK_BPS;
}

/** Split a GST-INCLUSIVE amount into taxable + GST parts (integer paise).
 *  gst = round(inclusive * bps / (10000 + bps)); taxable = inclusive - gst. */
export function splitInclusiveGst(inclusivePaise: number, rateBps: number, interState: boolean): GstBreakdown {
  const gstPaise = Math.round((inclusivePaise * rateBps) / (10000 + rateBps));
  const taxablePaise = inclusivePaise - gstPaise;
  // Intra-state: CGST + SGST halves (odd paise goes to CGST — deterministic).
  const half = Math.floor(gstPaise / 2);
  return {
    rateBps,
    taxablePaise,
    gstPaise,
    cgstPaise: interState ? 0 : gstPaise - half,
    sgstPaise: interState ? 0 : half,
    igstPaise: interState ? gstPaise : 0,
    interState,
  };
}

/** Whether supply crosses state lines (case-insensitive state names). */
export function isInterState(sellerState: string | undefined, buyerState: string | undefined): boolean {
  if (!sellerState || !buyerState) return false; // default to intra-state split
  return sellerState.trim().toLowerCase() !== buyerState.trim().toLowerCase();
}

/** Total GST included across priced lines: sum per line at each line's rate. */
export function gstIncludedInLines(
  lines: { linePaise: number; hsn?: string; cls: string }[],
  interState = false,
  onDate?: string,
): number {
  return lines.reduce((n, l) => n + splitInclusiveGst(l.linePaise, gstRateBps(l.hsn, l.cls, onDate), interState).gstPaise, 0);
}
