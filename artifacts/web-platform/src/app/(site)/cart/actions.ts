"use server";

/**
 * VEDIC HEMP — CART & CHECKOUT ACTIONS
 *
 * Server actions are the only writers of commerce state. The client submits
 * ids, quantities and address fields; every price, total and eligibility
 * decision happens here (the server is the only authority — CLAUDE.md §0).
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { readEnabledPayments } from "@/lib/payments";
import { randomUUID } from "node:crypto";
import { clearCartCookies, COUPONS, priceCart, readCartLines, writeCartLines, writeCoupon } from "@/lib/cart";
import { PRODUCTS } from "@/lib/sample";
import { permittedClasses } from "@/lib/compliance";
import { appendOrderHistory, readAddresses, validateAddressFields, writeAddresses } from "@/lib/engage";

const MAX_QTY = 10;

function assertPurchasable(productId: string): void {
  const permitted = permittedClasses({ hasRx: false });
  const product = PRODUCTS.find((p) => p.id === productId && permitted.includes(p.cls));
  if (!product) {
    // Unknown id OR a class this viewer may not buy (A1: the medical catalogue
    // cannot enter a public cart even by crafted form data).
    redirect("/catalogue");
  }
}

export async function addToCart(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const qty = Math.min(Math.max(parseInt(String(formData.get("qty") ?? "1"), 10) || 1, 1), MAX_QTY);
  const intent = String(formData.get("intent") ?? "cart");
  assertPurchasable(id);

  const lines = await readCartLines();
  const existing = lines.find((l) => l.id === id);
  if (existing) existing.qty = Math.min(existing.qty + qty, MAX_QTY);
  else lines.push({ id, qty });
  await writeCartLines(lines);

  redirect(intent === "buy" ? "/checkout" : "/cart");
}

/** "Add all N to cart" on the frequently-bought-together bundle. Every id is
 *  re-checked against the permitted-class universe (A1) — the bundle total the
 *  page showed is decorative; pricing happens in priceCart(). */
export async function addBundleToCart(formData: FormData): Promise<void> {
  const ids = String(formData.get("productIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const permitted = permittedClasses({ hasRx: false });
  const lines = await readCartLines();
  for (const id of ids) {
    if (!PRODUCTS.some((p) => p.id === id && permitted.includes(p.cls))) continue;
    const existing = lines.find((l) => l.id === id);
    if (existing) existing.qty = Math.min(existing.qty + 1, MAX_QTY);
    else lines.push({ id, qty: 1 });
  }
  await writeCartLines(lines);
  redirect("/cart");
}

export async function setQty(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const delta = String(formData.get("delta") ?? "");
  const lines = await readCartLines();
  const line = lines.find((l) => l.id === id);
  if (line) {
    line.qty = Math.min(Math.max(line.qty + (delta === "up" ? 1 : -1), 0), MAX_QTY);
  }
  await writeCartLines(lines.filter((l) => l.qty > 0));
  redirect("/cart");
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const lines = (await readCartLines()).filter((l) => l.id !== id);
  await writeCartLines(lines);
  redirect("/cart");
}

/* ── Coupons ──────────────────────────────────────────────── */

/** Apply a coupon CODE. The amount is never client-supplied — priceCart()
 *  derives the deduction from the server-side coupon table. */
export async function applyCoupon(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!(code in COUPONS)) redirect("/cart?coupon=unknown");
  await writeCoupon(code);
  redirect("/cart");
}

export async function removeCoupon(): Promise<void> {
  await writeCoupon(null);
  redirect("/cart");
}

/* ── Checkout ─────────────────────────────────────────────── */

export interface OrderRecord {
  reference: string;
  placedAt: string;
  name: string;
  city: string;
  pincode: string;
  payment: string;
  items: { title: string; qty: number; emoji: string; seller: string }[];
  subtotalPaise: number;
  discountPaise?: number;
  couponCode?: string | null;
  shippingPaise: number;
  totalPaise: number;
}

// Prepaid only: the platform forwards an order to the seller only after
// payment capture. "cod" is not a member — a forged value is rejected.

export async function placeOrder(formData: FormData): Promise<void> {
  const cart = await priceCart();
  if (cart.lines.length === 0) redirect("/cart");

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const payment = String(formData.get("payment") ?? "");
  const ageConfirm = formData.get("ageConfirm") === "on";

  // Server-side validation (§0.6). The error code drives an inline banner and
  // the draft cookie re-fills the form — no typed input is lost.
  let err: string | null = null;
  if (name.length < 2 || name.length > 60 || /\d/.test(name)) err = "name";
  else if (!/^[6-9]\d{9}$/.test(mobile)) err = "mobile";
  else if (line1.length < 8) err = "address";
  else if (!city || !state) err = "city";
  else if (!/^\d{6}$/.test(pincode)) err = "pincode";
  // The accepted set is the ADMIN's payment configuration (Admin → Finance →
  // Payments) — a forged value for a disabled method fails here regardless
  // of anything the client rendered.
  else if (!(await readEnabledPayments()).some((m) => m.key === payment)) err = "payment";
  else if (cart.ageGated && !ageConfirm) err = "age";

  const jar = await cookies();
  if (err) {
    jar.set("vh-checkout-draft", JSON.stringify({ name, mobile, line1, city, state, pincode, payment }), {
      path: "/", httpOnly: true, sameSite: "lax", maxAge: 900,
    });
    redirect(`/checkout?err=${err}`);
  }

  // Totals are recomputed here, never taken from the form (V-G-07). The order
  // reference is server-issued; the idempotency key guards the future DB write.
  const reference = `VH${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const record: OrderRecord = {
    reference,
    placedAt: new Date().toISOString(),
    name,
    city,
    pincode,
    payment,
    items: cart.lines.map((l) => ({ title: l.product.title, qty: l.qty, emoji: l.product.emoji, seller: l.product.seller })),
    subtotalPaise: cart.subtotalPaise,
    discountPaise: cart.discountPaise,
    couponCode: cart.discountPaise > 0 || cart.couponCode ? cart.couponCode : null,
    shippingPaise: cart.shippingPaise,
    totalPaise: cart.totalPaise,
  };
  // Demo persistence: the confirmation cookie. With DATABASE_URL attached this
  // becomes db.order.create({ idempotencyKey }) via src/server (PRODUCTION.md).
  void randomUUID(); // idempotency key placeholder for the DB write
  jar.set("vh-last-order", JSON.stringify(record), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 3600 });
  await appendOrderHistory(record); // powers My Account → Orders in demo mode

  // "Save this address" — validated again here, deduped on line1+PIN (§1.3).
  if (formData.get("saveAddress") === "on") {
    const fields = { name, mobile, line1, city, state, pincode };
    if (!validateAddressFields(fields)) {
      const book = await readAddresses();
      const dupe = book.some((a) => a.line1 === line1 && a.pincode === pincode);
      if (!dupe && book.length < 6) {
        await writeAddresses([
          { id: `ad-${Date.now().toString(36)}`, ...fields, kind: "HOME", isDefault: book.length === 0 },
          ...book,
        ]);
      }
    }
  }
  jar.delete("vh-checkout-draft");
  await clearCartCookies();
  await writeCoupon(null);
  redirect("/checkout/confirmed");
}
