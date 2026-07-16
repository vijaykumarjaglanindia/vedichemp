import "server-only";

/**
 * VEDIC HEMP — GST (server-authoritative, inclusive pricing)
 *
 * Indian B2C prices are GST-INCLUSIVE: the sticker price is what the buyer
 * pays, and the tax is a derived component of it — so computing GST never
 * changes a total, it explains one. All money is integer paise; rates are
 * integer basis points (bps) so nothing here ever touches a float.
 *
 * Rate table by HSN prefix (fallback by compliance class):
 *   1207/1208/1515 hemp seeds & oils (food)     →  5%
 *   3004 ayurvedic medicaments                  → 12%
 *   3304 topicals / cosmetics (CBD wellness)    → 18%
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

const HSN_RATES_BPS: [prefix: string, bps: number][] = [
  ["1207", 500], ["1208", 500], ["1209", 500], ["1515", 500], // hemp foods & oils
  ["3004", 1200], // ayurvedic medicaments
  ["3304", 1800], // topicals / cosmetics
];

const CLASS_RATES_BPS: Record<string, number> = {
  HEMP_FOOD: 500,
  AYURVEDA: 1200,
  CBD_WELLNESS: 1800,
  MED_CANNABIS: 1200, // dispensed as a medicament
};

export function gstRateBps(hsn: string | undefined, cls: string): number {
  if (hsn) for (const [prefix, bps] of HSN_RATES_BPS) if (hsn.startsWith(prefix)) return bps;
  return CLASS_RATES_BPS[cls] ?? 1800;
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
): number {
  return lines.reduce((n, l) => n + splitInclusiveGst(l.linePaise, gstRateBps(l.hsn, l.cls), interState).gstPaise, 0);
}
