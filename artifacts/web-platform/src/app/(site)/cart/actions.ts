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
import { randomUUID } from "node:crypto";
import { clearCartCookies, priceCart, readCartLines, writeCartLines } from "@/lib/cart";
import { PRODUCTS } from "@/lib/sample";
import { permittedClasses } from "@/lib/compliance";

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
  shippingPaise: number;
  totalPaise: number;
}

const PAYMENTS = ["cod", "upi", "card"] as const;

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
  else if (!PAYMENTS.includes(payment as (typeof PAYMENTS)[number])) err = "payment";
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
    shippingPaise: cart.shippingPaise,
    totalPaise: cart.totalPaise,
  };
  // Demo persistence: the confirmation cookie. With DATABASE_URL attached this
  // becomes db.order.create({ idempotencyKey }) via src/server (PRODUCTION.md).
  void randomUUID(); // idempotency key placeholder for the DB write
  jar.set("vh-last-order", JSON.stringify(record), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 3600 });
  jar.delete("vh-checkout-draft");
  await clearCartCookies();
  redirect("/checkout/confirmed");
}
