/**
 * VEDIC HEMP — ENGAGEMENT STATE (demo persistence)
 *
 * Cookie-backed state for everything a visitor or seller does besides the
 * cart: wishlist, followed stores, order history, support tickets and the
 * Seller Central demo mutations. Same contract as the cart (src/lib/cart.ts):
 * httpOnly cookies written ONLY by server actions, small compact JSON, and a
 * display-only mirror (`vh-wish-n`) for the header badge. With DATABASE_URL
 * attached each reader/writer swaps to a Prisma call — the call sites keep
 * their signatures (PRODUCTION.md).
 */

import { cookies } from "next/headers";

const YEAR = 60 * 60 * 24 * 365;
const OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: YEAR };

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const jar = await cookies();
  try {
    const raw = jar.get(name)?.value;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(name: string, value: unknown): Promise<void> {
  const jar = await cookies();
  jar.set(name, JSON.stringify(value), OPTS);
}

/* ── Wishlist ─────────────────────────────────────────────── */

export async function readWishlist(): Promise<string[]> {
  return readJson<string[]>("vh-wish", []);
}

export async function writeWishlist(ids: string[]): Promise<void> {
  const jar = await cookies();
  const capped = ids.slice(0, 30);
  await writeJson("vh-wish", capped);
  // Display-only mirror for the header badge (client island reads it).
  jar.set("vh-wish-n", String(capped.length), { ...OPTS, httpOnly: false });
}

/* ── Followed stores ──────────────────────────────────────── */

export async function readFollows(): Promise<string[]> {
  return readJson<string[]>("vh-follow", []);
}

export async function writeFollows(slugs: string[]): Promise<void> {
  await writeJson("vh-follow", slugs.slice(0, 20));
}

/* ── Order history (buyer) ────────────────────────────────── */

export interface StoredOrder {
  reference: string;
  placedAt: string;
  city: string;
  pincode: string;
  payment: string;
  items: { title: string; qty: number; emoji: string; seller: string }[];
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
}

export async function readOrderHistory(): Promise<StoredOrder[]> {
  return readJson<StoredOrder[]>("vh-orders", []);
}

export async function appendOrderHistory(order: StoredOrder): Promise<void> {
  const list = [order, ...(await readOrderHistory())].slice(0, 4);
  await writeJson("vh-orders", list);
}

/* ── Support tickets ──────────────────────────────────────── */

export interface StoredTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
}

export async function readTickets(): Promise<StoredTicket[]> {
  return readJson<StoredTicket[]>("vh-tickets", []);
}

export async function appendTicket(t: StoredTicket): Promise<void> {
  await writeJson("vh-tickets", [t, ...(await readTickets())].slice(0, 6));
}

/* ── Seller Central demo state ────────────────────────────── */

/** Status overrides for sample orders: { [orderId]: "ACCEPTED" | "PACKED" } */
export async function readSellerOrderOverrides(): Promise<Record<string, string>> {
  return readJson<Record<string, string>>("vh-sell-ord", {});
}

export async function writeSellerOrderOverrides(map: Record<string, string>): Promise<void> {
  await writeJson("vh-sell-ord", map);
}

export interface SubmittedProduct {
  id: string;
  title: string;
  cls: string;
  pricePaise: number;
  mrpPaise: number;
  hsn: string;
  listingState: string; // UNDER_REVIEW | DRAFT
}

export async function readSubmittedProducts(): Promise<SubmittedProduct[]> {
  return readJson<SubmittedProduct[]>("vh-sell-prods", []);
}

export async function appendSubmittedProduct(p: SubmittedProduct): Promise<void> {
  await writeJson("vh-sell-prods", [p, ...(await readSubmittedProducts())].slice(0, 6));
}

/** Q&A replies pending copy-check: { [questionId]: replyText } */
export async function readSellerReplies(): Promise<Record<string, string>> {
  return readJson<Record<string, string>>("vh-sell-replies", {});
}

export async function writeSellerReplies(map: Record<string, string>): Promise<void> {
  await writeJson("vh-sell-replies", map);
}

export interface StoredCampaign {
  id: string;
  name: string;
  type: string;
  budgetPaise: number;
  status: string;
}

export async function readCampaigns(): Promise<StoredCampaign[]> {
  return readJson<StoredCampaign[]>("vh-sell-camps", []);
}

export async function appendCampaign(c: StoredCampaign): Promise<void> {
  await writeJson("vh-sell-camps", [c, ...(await readCampaigns())].slice(0, 5));
}

export interface StoredCoupon {
  code: string;
  pct: number;
  status: string;
}

export async function readCoupons(): Promise<StoredCoupon[]> {
  return readJson<StoredCoupon[]>("vh-sell-coupons", []);
}

export async function appendCoupon(c: StoredCoupon): Promise<void> {
  await writeJson("vh-sell-coupons", [c, ...(await readCoupons())].slice(0, 5));
}

/** Extra units added per batch code: { [batchCode]: addedQty } */
export async function readStockAdds(): Promise<Record<string, number>> {
  return readJson<Record<string, number>>("vh-sell-stock", {});
}

export async function writeStockAdds(map: Record<string, number>): Promise<void> {
  await writeJson("vh-sell-stock", map);
}
