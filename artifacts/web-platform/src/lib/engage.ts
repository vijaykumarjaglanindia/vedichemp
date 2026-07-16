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

/* ── Address book (§1.3) ──────────────────────────────────── */

export interface StoredAddress {
  id: string;
  name: string;
  mobile: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  kind: string; // HOME | WORK | OTHER
  isDefault: boolean;
}

export async function readAddresses(): Promise<StoredAddress[]> {
  return readJson<StoredAddress[]>("vh-addr", []);
}

/** Shared address validation — used by the address book and checkout save. */
export function validateAddressFields(f: {
  name: string; mobile: string; line1: string; city: string; state: string; pincode: string;
}): string | null {
  if (f.name.length < 2 || f.name.length > 60 || /\d/.test(f.name)) return "name";
  if (!/^[6-9]\d{9}$/.test(f.mobile)) return "mobile";
  if (f.line1.length < 8 || f.line1.length > 120) return "line1";
  if (!f.city || !f.state) return "city";
  if (!/^\d{6}$/.test(f.pincode)) return "pincode";
  return null;
}

export async function writeAddresses(list: StoredAddress[]): Promise<void> {
  // Exactly one default whenever any address exists.
  const capped = list.slice(0, 6);
  if (capped.length > 0 && !capped.some((a) => a.isDefault)) capped[0]!.isDefault = true;
  await writeJson("vh-addr", capped);
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

/* ── Returns (refund-first) ───────────────────────────────── */

export interface StoredReturn {
  reason: string;
  at: string;
}

export async function readReturns(): Promise<Record<string, StoredReturn>> {
  return readJson<Record<string, StoredReturn>>("vh-returns", {});
}

export async function writeReturns(map: Record<string, StoredReturn>): Promise<void> {
  await writeJson("vh-returns", map);
}

/* ── Buyer reviews & questions (PDP) ──────────────────────── */

export interface MyReview {
  rating: number;
  text: string;
}

export async function readMyReviews(): Promise<Record<string, MyReview>> {
  return readJson<Record<string, MyReview>>("vh-myreviews", {});
}

export async function writeMyReviews(map: Record<string, MyReview>): Promise<void> {
  await writeJson("vh-myreviews", map);
}

export async function readMyQuestions(): Promise<Record<string, string>> {
  return readJson<Record<string, string>>("vh-myqs", {});
}

export async function writeMyQuestions(map: Record<string, string>): Promise<void> {
  await writeJson("vh-myqs", map);
}

/* ── Storefront copy (seller-published, live on the public store) ── */

export interface StoreCopy {
  tagline: string;
  story: string;
  // Search & social (Store SEO). All optional — the storefront falls back to
  // the tagline/name when a field is blank.
  metaTitle?: string;
  metaDescription?: string;
  website?: string; // full https URL
  instagram?: string; // handle only (no @)
  facebook?: string; // page handle
  youtube?: string; // channel handle (with or without the leading @)
}

/** Canonical outbound URL for a stored social handle. Only ever builds a URL
 *  on a known domain from a validated handle — never echoes a raw user string
 *  into href (no javascript:/data: injection, no open redirect). */
export function socialUrl(kind: "website" | "instagram" | "facebook" | "youtube", value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (kind === "website") return /^https:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v) ? v : null;
  const handle = v.replace(/^@/, "");
  if (!/^[A-Za-z0-9_.-]{2,40}$/.test(handle)) return null;
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "facebook") return `https://facebook.com/${handle}`;
  return `https://youtube.com/@${handle}`;
}

// Server-side demo store: published storefront copy must be visible to every
// visitor, not just the seller's browser. Resets on restart; DB seam in prod.
const gStore = globalThis as unknown as { __vhStoreCopy?: StoreCopy | null };

export async function readStoreCopy(): Promise<StoreCopy | null> {
  return gStore.__vhStoreCopy ?? null;
}

export async function writeStoreCopy(copy: StoreCopy): Promise<void> {
  gStore.__vhStoreCopy = copy;
}

/* ── Store availability (Dokan-style vacation mode) ───────── */

export interface StoreAvailability {
  onVacation: boolean;
  message: string;
}

const gAvail = globalThis as unknown as { __vhStoreAvailability?: StoreAvailability | null };

export async function readStoreAvailability(): Promise<StoreAvailability | null> {
  return gAvail.__vhStoreAvailability ?? null;
}

export async function writeStoreAvailability(a: StoreAvailability): Promise<void> {
  gAvail.__vhStoreAvailability = a;
}

/* ── Store announcement (time-boxed storefront notice) ────── */

export interface StoreAnnouncement {
  message: string;
  tone: "info" | "sale" | "warn";
  startsAt?: string; // YYYY-MM-DD — optional window start
  endsAt?: string;   // YYYY-MM-DD — optional window end (inclusive)
  active: boolean;   // seller's on/off switch
}

const gAnn = globalThis as unknown as { __vhStoreAnnouncement?: StoreAnnouncement | null };

export async function readStoreAnnouncement(): Promise<StoreAnnouncement | null> {
  return gAnn.__vhStoreAnnouncement ?? null;
}

export async function writeStoreAnnouncement(a: StoreAnnouncement | null): Promise<void> {
  gAnn.__vhStoreAnnouncement = a;
}

/** Live = switched on AND within its date window (if one is set). `today` is
 *  passed in (YYYY-MM-DD) so callers stay pure and testable. */
export function announcementLive(a: StoreAnnouncement | null | undefined, today: string): boolean {
  if (!a || !a.active || !a.message) return false;
  if (a.startsAt && today < a.startsAt) return false;
  if (a.endsAt && today > a.endsAt) return false;
  return true;
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
