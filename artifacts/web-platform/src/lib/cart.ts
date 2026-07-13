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
import { PRODUCTS, type SampleProduct } from "@/lib/sample";
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
  shippingPaise: number;
  totalPaise: number;
  ageGated: boolean; // any CBD_WELLNESS line → age confirmation at checkout
}

/** Free shipping at/above ₹5,000; ₹100 flat below (Marketplace Agreement). */
const FREE_SHIPPING_AT_PAISE = 5_000 * 100;
const FLAT_SHIPPING_PAISE = 100 * 100;

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
 * Price the cart from the canonical catalogue. Unknown ids are dropped;
 * a product outside the viewer's permitted classes can never be priced in
 * (A1 — the medical catalogue cannot enter a public cart even by crafted id).
 */
export async function priceCart(): Promise<PricedCart> {
  const lines = await readCartLines();
  const permitted = permittedClasses({ hasRx: false });
  const priced: PricedLine[] = [];
  for (const line of lines) {
    const product = PRODUCTS.find((p) => p.id === line.id && permitted.includes(p.cls));
    if (!product) continue;
    const qty = Math.min(line.qty, MAX_QTY);
    priced.push({ product, qty, linePaise: product.pricePaise * qty });
  }
  const subtotalPaise = priced.reduce((n, l) => n + l.linePaise, 0);
  const shippingPaise = subtotalPaise === 0 || subtotalPaise >= FREE_SHIPPING_AT_PAISE ? 0 : FLAT_SHIPPING_PAISE;
  return {
    lines: priced,
    count: priced.reduce((n, l) => n + l.qty, 0),
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    ageGated: priced.some((l) => l.product.cls === "CBD_WELLNESS"),
  };
}
