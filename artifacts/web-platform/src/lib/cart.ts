import "server-only";

/**
 * VEDIC HEMP — CART (server-side, cookie-backed)
 *
 * The cart is an httpOnly cookie of {productId, qty} lines. Everything with a
 * price is computed HERE, on the server, from the canonical product list —
 * the client never sends a price, only ids and quantities (V-G-07).
 *
 * A companion non-httpOnly cookie carries only the item COUNT so the header
 * badge can render without making every page dynamic. It is display-only;
 * nothing reads it server-side.
 *
 * Swapping PRODUCTS for a Prisma query is the single integration point when
 * a database is attached (see PRODUCTION.md).
 */

import { cookies } from "next/headers";
import { readLiveProducts } from "@/lib/catalog";
import { readActiveCoupons, readCommerce } from "@/lib/commerce";
import { type SampleProduct } from "@/lib/sample";
import { permittedClasses } from "@/lib/compliance";

const CART_COOKIE = "vh-cart";
const COUNT_COOKIE = "vh-cart-n";
const MAX_LINES = 50;
const MAX_QTY = 10;

export interface CartLine {
  id: string;
  qty: number;
}

export interface PricedLine {
  product: SampleProduct;
  qty: number;
  linePaise: number;
}

export interface PricedCart {
  lines: PricedLine[];
  count: number;
  subtotalPaise: number;
  discountPaise: number;
  couponCode: string | null;
  couponNote: string | null; // why an applied coupon is currently not deducting
  shippingPaise: number;
  totalPaise: number;
  ageGated: boolean; // any CBD_WELLNESS line → age confirmation at checkout
}

/** Shipping thresholds come from Admin → Settings → Commerce. */

/**
 * Coupon table — server-side only; the client submits a code, never an
 * amount. `cls` scopes a coupon to one compliance class's lines. A1 note:
 * there is deliberately no coupon type that could apply to MED_CANNABIS —
 * a discount is a promotion.
 */
// Coupons are admin-managed — see lib/commerce.ts (launch table + overrides).

const COUPON_COOKIE = "vh-coupon";

export async function readCoupon(): Promise<string | null> {
  const jar = await cookies();
  const code = jar.get(COUPON_COOKIE)?.value ?? "";
  return code in (await readActiveCoupons()) ? code : null;
}

export async function writeCoupon(code: string | null): Promise<void> {
  const jar = await cookies();
  if (code) jar.set(COUPON_COOKIE, code, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
  else jar.delete(COUPON_COOKIE);
}

export async function readCartLines(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { v: number; items: CartLine[] };
    if (parsed.v !== 1 || !Array.isArray(parsed.items)) return [];
    return parsed.items
      .filter((l) => typeof l.id === "string" && Number.isInteger(l.qty) && l.qty > 0)
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export async function writeCartLines(lines: CartLine[]): Promise<void> {
  const jar = await cookies();
  const clean = lines.filter((l) => l.qty > 0).slice(0, MAX_LINES);
  const count = clean.reduce((n, l) => n + l.qty, 0);
  const opts = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 30 };
  jar.set(CART_COOKIE, JSON.stringify({ v: 1, items: clean }), { ...opts, httpOnly: true });
  // Display-only badge count (read by a tiny client island in the header).
  jar.set(COUNT_COOKIE, String(count), { ...opts, httpOnly: false });
}

export async function clearCartCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
  jar.set(COUNT_COOKIE, "0", { path: "/", httpOnly: false });
}

/**
 * Price the cart from the canonical LIVE catalogue. Unknown ids are dropped;
 * a product outside the viewer's permitted classes can never be priced in
 * (A1 — the medical catalogue cannot enter a public cart even by crafted id),
 * and a listing that was archived or suspended after being carted simply
 * drops out — an unsellable product cannot be bought.
 */
export async function priceCart(): Promise<PricedCart> {
  const lines = await readCartLines();
  const permitted = permittedClasses({ hasRx: false });
  const catalogue = await readLiveProducts();
  const priced: PricedLine[] = [];
  for (const line of lines) {
    const product = catalogue.find((p) => p.id === line.id && permitted.includes(p.cls));
    if (!product) continue;
    const qty = Math.min(line.qty, MAX_QTY);
    priced.push({ product, qty, linePaise: product.pricePaise * qty });
  }
  const subtotalPaise = priced.reduce((n, l) => n + l.linePaise, 0);
  const commerce = await readCommerce();
  let shippingPaise = subtotalPaise === 0 || subtotalPaise >= commerce.freeShipAtPaise ? 0 : commerce.flatShipPaise;

  // Coupon: the cookie stores only a CODE — every rupee of discount is
  // derived here from the coupon table and the priced lines (V-G-07).
  const couponCode = await readCoupon();
  let discountPaise = 0;
  let couponNote: string | null = null;
  if (couponCode && subtotalPaise > 0) {
    const c = (await readActiveCoupons())[couponCode]!;
    const eligiblePaise = c.cls
      ? priced.filter((l) => l.product.cls === c.cls).reduce((n, l) => n + l.linePaise, 0)
      : subtotalPaise;
    if (eligiblePaise < c.minPaise) {
      couponNote = c.cls
        ? `Needs ${c.label.toLowerCase()} — eligible items in your cart don't reach the minimum yet.`
        : `Minimum spend not reached for ${couponCode}.`;
    } else if (c.freeShip) {
      shippingPaise = 0;
    } else {
      discountPaise = Math.min(Math.floor((eligiblePaise * c.pct) / 100), c.capPaise);
    }
  }

  return {
    lines: priced,
    count: priced.reduce((n, l) => n + l.qty, 0),
    subtotalPaise,
    discountPaise,
    couponCode,
    couponNote,
    shippingPaise,
    totalPaise: subtotalPaise - discountPaise + shippingPaise,
    ageGated: priced.some((l) => l.product.cls === "CBD_WELLNESS"),
  };
}
