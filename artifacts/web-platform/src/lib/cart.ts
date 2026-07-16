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
import { readLiveProducts, resolvePriceStock, wholesaleUnitPrice } from "@/lib/catalog";
import { checkCoupon, readActiveCoupons } from "@/lib/commerce";
import { type SampleProduct } from "@/lib/sample";
import { permittedClasses } from "@/lib/compliance";
import { getSession } from "@/lib/auth-lite";
import { isBusinessBuyer } from "@/lib/b2b";

const CART_COOKIE = "vh-cart";
const COUNT_COOKIE = "vh-cart-n";
const MAX_LINES = 50;
const MAX_QTY = 10;

export interface CartLine {
  id: string;
  qty: number;
  variantId?: string; // chosen option (size/pack), when the product has variants
}

export interface PricedLine {
  product: SampleProduct;
  qty: number;
  linePaise: number;
  stockQty: number; // on-hand at pricing time; the cap the buyer can order
  capped: boolean; // true if requested qty was trimmed to available stock
  variantId?: string;
  variantLabel?: string; // e.g. "500 g" — shown in cart and carried into the order
  unitPaise: number; // per-unit price used (variant price when present)
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
  // Shipping detail (server-computed; the zone is the entered state's, else an estimate)
  shippingZone: string;
  shippingEta: string; // "2–3 days"
  shippingFree: boolean;
  shippingEstimated: boolean; // true when no destination state was supplied yet
  weightGrams: number;
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
      .map((l) => ({ id: l.id, qty: l.qty, ...(typeof l.variantId === "string" ? { variantId: l.variantId } : {}) }))
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
export async function priceCart(opts?: { destState?: string }): Promise<PricedCart> {
  const lines = await readCartLines();
  const permitted = permittedClasses({ hasRx: false });
  const catalogue = await readLiveProducts();

  // Approved business (B2B) buyers get the seller's wholesale price at qty.
  // (Imports are static — the B2B lookup must not add first-render latency to
  // the cart for the far more common anonymous / retail shopper.)
  const session = await getSession();
  const business = session?.email ? await isBusinessBuyer(session.email) : false;

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const product = catalogue.find((p) => p.id === line.id && permitted.includes(p.cls));
    if (!product) continue;
    // Resolve the chosen variant's price + stock (falls back to the simple
    // product when it has no variants). The server prices the variant, never
    // a client-supplied amount.
    const resolved = resolvePriceStock(product, line.variantId);
    let unitPaise = resolved.pricePaise;
    const { stockQty: available, variant } = resolved;
    // Wholesale break: only for an approved business account, on a simple
    // product, when the line quantity reaches a tier and it beats the price.
    if (business && !variant) {
      const w = wholesaleUnitPrice(product, Math.min(line.qty, MAX_QTY));
      if (w !== null && w < unitPaise) unitPaise = w;
    }
    // Out-of-stock lines drop out entirely; in-stock lines are capped at what's
    // actually on hand — the server never prices in units it cannot fulfil.
    if (available <= 0) continue;
    const requested = Math.min(line.qty, MAX_QTY);
    const qty = Math.min(requested, available);
    priced.push({
      product, qty, linePaise: unitPaise * qty, stockQty: available, capped: qty < requested,
      unitPaise,
      ...(variant ? { variantId: variant.id, variantLabel: variant.label } : {}),
    });
  }
  const subtotalPaise = priced.reduce((n, l) => n + l.linePaise, 0);

  // Real shipping: order weight (from the products) drives a zone-based quote.
  const { readShipping } = await import("@/lib/shipping");
  const { shippingQuote, etaLabel } = await import("@/lib/shipping");
  const shipCfg = await readShipping();
  const weightGrams = priced.reduce((n, l) => n + ((l.product as { weightGrams?: number }).weightGrams ?? shipCfg.defaultWeightGrams) * l.qty, 0);
  const quote = await shippingQuote({ subtotalPaise, weightGrams, destState: opts?.destState });
  let shippingPaise = quote.paise;

  // Coupon: the cookie stores only a CODE — every rupee of discount is
  // derived here from the coupon table and the priced lines (V-G-07).
  const couponCode = await readCoupon();
  let discountPaise = 0;
  let couponNote: string | null = null;
  if (couponCode && subtotalPaise > 0) {
    const check = await checkCoupon(couponCode);
    if (!check.ok) {
      // The code was valid when applied but has since expired / run out.
      couponNote =
        check.reason === "expired" ? `${couponCode} has expired.`
        : check.reason === "exhausted" ? `${couponCode} has reached its usage limit.`
        : `${couponCode} is no longer available.`;
    } else {
      const c = check.def;
      const eligiblePaise = c.cls
        ? priced.filter((l) => l.product.cls === c.cls).reduce((n, l) => n + l.linePaise, 0)
        : subtotalPaise;
      if (eligiblePaise < c.minPaise) {
        couponNote = c.cls
          ? `Needs ${c.label.toLowerCase()} — eligible items in your cart don't reach the minimum yet.`
          : `Minimum spend not reached for ${couponCode}.`;
      } else if (c.freeShip) {
        shippingPaise = 0;
      } else if (c.fixedPaise && c.fixedPaise > 0) {
        // Flat discount, never more than the eligible spend.
        discountPaise = Math.min(c.fixedPaise, eligiblePaise);
      } else {
        const raw = Math.floor((eligiblePaise * c.pct) / 100);
        discountPaise = c.capPaise > 0 ? Math.min(raw, c.capPaise) : raw;
      }
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
    shippingZone: quote.zoneName,
    shippingEta: etaLabel(quote),
    shippingFree: shippingPaise === 0 && subtotalPaise > 0,
    shippingEstimated: !opts?.destState,
    weightGrams,
  };
}
