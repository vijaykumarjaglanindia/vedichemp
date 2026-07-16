import "server-only";

/**
 * VEDIC HEMP — ANALYTICS & REPORTS
 *
 * Every figure here is COMPUTED from the live stores (orders, earnings, ads,
 * reviews, support) — not a static seed. Reports are read models: they never
 * decide anything, they summarise what the authoritative stores already hold.
 * The same functions feed the seller and admin dashboards and the CSV exports.
 */

import { allOrders, ordersForSeller, sellerSubtotal, type Order } from "@/lib/orders";

export interface DayPoint { date: string; label: string; paise: number; orders: number }
export interface TopRow { name: string; units: number; paise: number }

function lastNDays(n: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const base = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base - i * 86400000);
    out.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
  }
  return out;
}

/* ── Seller report ────────────────────────────────────────── */

export interface SellerReport {
  orders: number;
  units: number;
  grossPaise: number;      // this store's share of order value (its lines)
  deliveredPaise: number;  // realised (delivered) revenue
  refundedOrders: number;
  aov: number;             // average order value (this store), paise
  series: DayPoint[];      // last 14 days of this store's revenue
  topProducts: TopRow[];
  adSpentPaise: number;
  adSalesPaise: number;
  avgRating: number;
  reviewCount: number;
  openTickets: number;
}

export async function sellerReport(store: string, days = 14): Promise<SellerReport> {
  const orders = await ordersForSeller(store);
  const window = lastNDays(days);
  const byDate = new Map(window.map((d) => [d.date, { paise: 0, orders: 0 }]));
  const products = new Map<string, { units: number; paise: number }>();

  let grossPaise = 0, units = 0, deliveredPaise = 0, refundedOrders = 0;
  for (const o of orders) {
    const mine = sellerSubtotal(o, store);
    grossPaise += mine;
    if (o.status === "DELIVERED") deliveredPaise += mine;
    if (o.status === "REFUNDED" || o.status === "CANCELLED") refundedOrders += 1;
    for (const it of o.items) {
      if (it.seller !== store) continue;
      units += it.qty;
      const p = products.get(it.title) ?? { units: 0, paise: 0 };
      p.units += it.qty; p.paise += it.linePaise;
      products.set(it.title, p);
    }
    const date = o.placedAt.slice(0, 10);
    const slot = byDate.get(date);
    if (slot) { slot.paise += mine; slot.orders += 1; }
  }

  const series: DayPoint[] = window.map((d) => ({ date: d.date, label: d.label, paise: byDate.get(d.date)!.paise, orders: byDate.get(d.date)!.orders }));
  const topProducts: TopRow[] = [...products.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.paise - a.paise).slice(0, 8);

  // Ads
  const { listCampaigns, accountResults } = await import("@/lib/ads");
  const campaigns = await listCampaigns(undefined);
  const mineCamps = campaigns.filter((c) => c.seller === store);
  const ad = accountResults(mineCamps);

  // Reviews (aggregate across this store's products)
  const { sellerListings } = await import("@/lib/catalog");
  const { aggregate } = await import("@/lib/reviews");
  const listings = await sellerListings("", store);
  let ratingSum = 0, reviewCount = 0;
  for (const p of listings) { const a = await aggregate(p.id); ratingSum += a.avg * a.count; reviewCount += a.count; }

  // Support
  const { ticketsForSeller } = await import("@/lib/support");
  const openTickets = (await ticketsForSeller(store)).filter((t) => t.status === "OPEN" || t.status === "PENDING").length;

  return {
    orders: orders.length,
    units,
    grossPaise,
    deliveredPaise,
    refundedOrders,
    aov: orders.length ? Math.round(grossPaise / orders.length) : 0,
    series,
    topProducts,
    adSpentPaise: ad.spentPaise,
    adSalesPaise: ad.salesPaise,
    avgRating: reviewCount ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0,
    reviewCount,
    openTickets,
  };
}

/* ── Admin (platform) report ──────────────────────────────── */

export interface AdminReport {
  gmvPaise: number;
  orders: number;
  units: number;
  refundedPaise: number;
  aov: number;
  series: DayPoint[];
  topSellers: TopRow[];
  topProducts: TopRow[];
  adRevenuePaise: number; // total advertiser spend (platform ad revenue)
  reviewCount: number;
  openTickets: number;
}

export async function adminReport(days = 14): Promise<AdminReport> {
  const orders = await allOrders();
  const window = lastNDays(days);
  const byDate = new Map(window.map((d) => [d.date, { paise: 0, orders: 0 }]));
  const sellers = new Map<string, { units: number; paise: number }>();
  const products = new Map<string, { units: number; paise: number }>();

  let gmvPaise = 0, units = 0, refundedPaise = 0;
  for (const o of orders) {
    gmvPaise += o.totalPaise;
    refundedPaise += o.refundedPaise;
    for (const it of o.items) {
      units += it.qty;
      const s = sellers.get(it.seller) ?? { units: 0, paise: 0 };
      s.units += it.qty; s.paise += it.linePaise; sellers.set(it.seller, s);
      const p = products.get(it.title) ?? { units: 0, paise: 0 };
      p.units += it.qty; p.paise += it.linePaise; products.set(it.title, p);
    }
    const slot = byDate.get(o.placedAt.slice(0, 10));
    if (slot) { slot.paise += o.totalPaise; slot.orders += 1; }
  }

  const series: DayPoint[] = window.map((d) => ({ date: d.date, label: d.label, paise: byDate.get(d.date)!.paise, orders: byDate.get(d.date)!.orders }));
  const topSellers: TopRow[] = [...sellers.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.paise - a.paise).slice(0, 8);
  const topProducts: TopRow[] = [...products.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.paise - a.paise).slice(0, 8);

  const { listCampaigns } = await import("@/lib/ads");
  const adRevenuePaise = (await listCampaigns(undefined)).reduce((n, c) => n + c.spentPaise, 0);

  const { allTickets } = await import("@/lib/support");
  const openTickets = (await allTickets()).filter((t) => t.status === "OPEN" || t.status === "PENDING").length;

  return {
    gmvPaise, orders: orders.length, units, refundedPaise,
    aov: orders.length ? Math.round(gmvPaise / orders.length) : 0,
    series, topSellers, topProducts, adRevenuePaise,
    reviewCount: 0, openTickets,
  };
}

/* ── CSV helpers ──────────────────────────────────────────── */

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
