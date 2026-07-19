/**
 * VEDIC HEMP — SELLER HOME READ MODEL (live, from the marketplace stores)
 *
 * The seller dashboard's operational cards are computed here from the SAME
 * stores the rest of the console mutates — never a hardcoded mock. In
 * particular the compliance blockers are the real A2 gate: a regulated listing
 * whose batch has no APPROVED CoA (catalog.coaBlocksPublish) is surfaced as a
 * blocker, and "acknowledging" it changes nothing — only an approved,
 * batch-matched lab report opens the publish gate. A read model, never a source
 * of truth: it only reads.
 */

import { sellerListings, coaBlocksPublish, type CatalogProduct } from "@/lib/catalog";
import { ordersForSeller, sellerSubtotal, type Order } from "@/lib/orders";
import { runsForSeller } from "@/lib/settlements";

/** "This seller" is the Vedic Botanicals store (CONTRACT — the seed store the
 *  demo seller session owns). */
export const SELLER_STORE = "Vedic Botanicals";

export interface Blocker {
  productId: string;
  title: string;
  batchCode: string;
  coaState: string; // NONE | PENDING_REVIEW | REJECTED (never APPROVED — that's not a blocker)
}
export interface LowStockRow {
  productId: string;
  title: string;
  stockQty: number;
  lowStockAt: number;
}
export interface SellerKpis {
  gmvPaise: number;
  orders: number;
  aovPaise: number;
  series: { label: string; paise: number }[];
}
export interface SellerHome {
  blockers: Blocker[];
  lowStock: LowStockRow[];
  toAccept: Order[];
  settlementDuePaise: number;
  kpis: SellerKpis;
}

/** A2 blockers: regulated listings without an APPROVED CoA, excluding archived
 *  drafts (a listing removed from the catalogue isn't an open blocker). */
export function blockersFrom(listings: CatalogProduct[]): Blocker[] {
  return listings
    .filter((p) => p.status !== "ARCHIVED" && coaBlocksPublish({ cls: p.cls, coaState: p.coaState }))
    .map((p) => ({ productId: p.id, title: p.title, batchCode: p.batchCode || "—", coaState: p.coaState }));
}

/** Low stock: LIVE listings at or below the seller's own threshold (and not
 *  already zero — a stockout is a different, harder state). */
export function lowStockFrom(listings: CatalogProduct[]): LowStockRow[] {
  return listings
    .filter((p) => p.status === "LIVE" && p.stockQty > 0 && p.stockQty <= p.lowStockAt)
    .map((p) => ({ productId: p.id, title: p.title, stockQty: p.stockQty, lowStockAt: p.lowStockAt }));
}

/** GMV KPIs from the seller's real orders (their SHARE of each order), scoped
 *  to the window `[today - days + 1, today]` so the headline total, the KPIs
 *  and the daily series all describe the SAME period the selector picked —
 *  no all-time figure floating above a 7-day chart. */
export function kpisFrom(orders: Order[], today: string, days = 7): SellerKpis {
  const end = new Date(`${today}T00:00:00Z`);
  const startIso = new Date(end.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const inWindow = orders.filter((o) => {
    const d = (o.placedAt ?? "").slice(0, 10);
    return d >= startIso && d <= today;
  });
  const gmvPaise = inWindow.reduce((n, o) => n + sellerSubtotal(o, SELLER_STORE), 0);
  const count = inWindow.length;
  const aovPaise = count ? Math.round(gmvPaise / count) : 0;

  const series: { label: string; paise: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10);
    const paise = inWindow
      .filter((o) => (o.placedAt ?? "").slice(0, 10) === iso)
      .reduce((n, o) => n + sellerSubtotal(o, SELLER_STORE), 0);
    series.push({ label: iso.slice(5), paise });
  }
  return { gmvPaise, orders: count, aovPaise, series };
}

export async function sellerHome(email: string, today: string, days = 7): Promise<SellerHome> {
  const listings = await sellerListings(email, SELLER_STORE);
  const orders = await ordersForSeller(SELLER_STORE);
  const runs = await runsForSeller(SELLER_STORE);

  return {
    blockers: blockersFrom(listings),
    lowStock: lowStockFrom(listings),
    toAccept: orders.filter((o) => o.status === "PLACED"),
    settlementDuePaise: runs.filter((r) => r.status === "AWAITING_CHECKER").reduce((n, r) => n + r.netPaise, 0),
    kpis: kpisFrom(orders, today, days),
  };
}
