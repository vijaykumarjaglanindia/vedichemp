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
import { clearCartCookies, priceCart, readCartLines, writeCartLines, writeCoupon } from "@/lib/cart";
import { decrementStock, findProduct, hasVariants, isLowStock, readLiveProducts, selectVariant } from "@/lib/catalog";
import { notify } from "@/lib/notify";
import { redeemCoupon } from "@/lib/commerce";
import { permittedClasses } from "@/lib/compliance";
import { getSession } from "@/lib/auth-lite";
import { createOrder, type OrderItem } from "@/lib/orders";
import { appendOrderHistory, readAddresses, validateAddressFields, writeAddresses } from "@/lib/engage";

const MAX_QTY = 10;

/** Returns the resolved variant id to store (validated), or throws via redirect. */
async function assertPurchasable(productId: string, variantId?: string): Promise<string | undefined> {
  const permitted = permittedClasses({ hasRx: false });
  const product = (await readLiveProducts()).find((p) => p.id === productId && permitted.includes(p.cls));
  if (!product) {
    // Unknown id, a non-LIVE listing (draft/suspended/archived), OR a class
    // this viewer may not buy (A1: the medical catalogue cannot enter a
    // public cart even by crafted form data).
    redirect("/catalogue");
  }
  // Variant products: a variant must be chosen, and it must have stock.
  if (hasVariants(product!)) {
    const v = selectVariant(product!, variantId);
    if (!v || v.stockQty <= 0) redirect(`/products/${product!.slug}?oos=1`);
    return v!.id;
  }
  // Simple product: out of stock cannot enter the cart (server is the authority).
  if (product!.stockQty <= 0) redirect(`/products/${product!.slug}?oos=1`);
  return undefined;
}

export async function addToCart(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const rawVariant = String(formData.get("variantId") ?? "") || undefined;
  const qty = Math.min(Math.max(parseInt(String(formData.get("qty") ?? "1"), 10) || 1, 1), MAX_QTY);
  const intent = String(formData.get("intent") ?? "cart");
  const variantId = await assertPurchasable(id, rawVariant);

  const lines = await readCartLines();
  // A line is unique per (product, variant): two sizes of the same product
  // are two lines.
  const existing = lines.find((l) => l.id === id && l.variantId === variantId);
  if (existing) existing.qty = Math.min(existing.qty + qty, MAX_QTY);
  else lines.push({ id, qty, ...(variantId ? { variantId } : {}) });
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
  const catalogue = await readLiveProducts();
  const lines = await readCartLines();
  for (const id of ids) {
    if (!catalogue.some((p) => p.id === id && permitted.includes(p.cls))) continue;
    const existing = lines.find((l) => l.id === id);
    if (existing) existing.qty = Math.min(existing.qty + 1, MAX_QTY);
    else lines.push({ id, qty: 1 });
  }
  await writeCartLines(lines);
  redirect("/cart");
}

export async function setQty(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || undefined;
  const delta = String(formData.get("delta") ?? "");
  const lines = await readCartLines();
  // Target the exact (product, variant) line — two sizes are two lines.
  const line = lines.find((l) => l.id === id && l.variantId === variantId);
  if (line) {
    line.qty = Math.min(Math.max(line.qty + (delta === "up" ? 1 : -1), 0), MAX_QTY);
  }
  await writeCartLines(lines.filter((l) => l.qty > 0));
  redirect("/cart");
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || undefined;
  const lines = (await readCartLines()).filter((l) => !(l.id === id && l.variantId === variantId));
  await writeCartLines(lines);
  redirect("/cart");
}

/* ── Coupons ──────────────────────────────────────────────── */

/** Apply a coupon CODE. The amount is never client-supplied — priceCart()
 *  derives the deduction from the server-side coupon table. */
export async function applyCoupon(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const { checkCoupon } = await import("@/lib/commerce");
  const check = await checkCoupon(code);
  if (!check.ok) redirect(`/cart?coupon=${check.reason}`);
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
  // Real order: decrement stock atomically per line, then create the order.
  // An Idempotency-Key (form-supplied UUIDv4, else generated) makes a replay
  // return the same order rather than double-charging or double-decrementing.
  const idempotencyKey = (() => {
    const k = String(formData.get("idempotencyKey") ?? "");
    return /^[0-9a-f-]{16,}$/i.test(k) ? k : randomUUID();
  })();
  const session = await getSession();
  const buyerEmail = session?.email ?? "guest@vedichemp.in";
  const orderItems: OrderItem[] = cart.lines.map((l) => ({
    productId: l.product.id,
    title: l.product.title,
    emoji: l.product.emoji,
    seller: l.product.seller,
    qty: l.qty,
    unitPaise: l.unitPaise,
    linePaise: l.linePaise,
    ...(l.variantId ? { variantId: l.variantId } : {}),
    ...(l.variantLabel ? { variantLabel: l.variantLabel } : {}),
  }));
  for (const it of orderItems) await decrementStock(it.productId, it.qty, it.variantId);
  await createOrder({
    idempotencyKey,
    buyerEmail,
    reference,
    city,
    pincode,
    payment,
    items: orderItems,
    subtotalPaise: cart.subtotalPaise,
    discountPaise: cart.discountPaise,
    couponCode: cart.discountPaise > 0 || cart.couponCode ? cart.couponCode : null,
    shippingPaise: cart.shippingPaise,
    totalPaise: cart.totalPaise,
  });

  // Count the coupon redemption only if it actually applied (no blocking note).
  if (cart.couponCode && !cart.couponNote) await redeemCoupon(cart.couponCode);

  // Credit ad-driven sales: if the buyer clicked a promoted tile for any of
  // these products recently, the campaign gets the sale (feeds "Sales from ads").
  const { attributeOrderSales } = await import("@/lib/ads");
  await attributeOrderSales(buyerEmail, orderItems.map((it) => ({ productId: it.productId, linePaise: it.linePaise })));

  // Notify the buyer their order is in, and every seller with a line in it that
  // there's an order to pack. Low stock after the decrement pings the seller too
  // — the same step that consumed the stock raises the signal.
  const itemCount = orderItems.reduce((n, it) => n + it.qty, 0);
  await notify("buyer", buyerEmail, {
    kind: "ORDER_PLACED",
    title: `Order ${reference} confirmed`,
    body: `${itemCount} item${itemCount === 1 ? "" : "s"} · ₹${(cart.totalPaise / 100).toLocaleString("en-IN")} paid. We'll tell you when it ships.`,
    href: `/account/orders/live-${reference}`,
  });
  for (const seller of [...new Set(orderItems.map((it) => it.seller))]) {
    const lines = orderItems.filter((it) => it.seller === seller);
    await notify("seller", seller, {
      kind: "ORDER_NEW",
      title: `New order ${reference}`,
      body: `${lines.reduce((n, it) => n + it.qty, 0)} item${lines.length === 1 ? "" : "s"} to pack · ${lines[0]!.title}${lines.length > 1 ? ` +${lines.length - 1} more` : ""}`,
      href: "/seller/orders#real-orders",
    });
  }
  for (const it of orderItems) {
    const p = await findProduct(it.productId);
    if (p && isLowStock(p)) {
      await notify("seller", it.seller, {
        kind: "LOW_STOCK",
        title: `Low stock — ${p.title}`,
        body: `${p.stockQty} left (alert at ${p.lowStockAt}). Restock to keep selling.`,
        href: "/seller/inventory",
      });
    }
  }
  jar.set("vh-last-order", JSON.stringify(record), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 3600 });
  await appendOrderHistory(record); // confirmation page still reads the cookie

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
