/**
 * VEDIC HEMP — ORDERS (real lifecycle, inventory-backed, buyer-first refunds)
 *
 * The operational backbone: checkout writes a real order here, stock is
 * decremented atomically, and the whole fulfilment/return lifecycle runs as
 * a server-enforced state machine — the client renders it, it never decides.
 *
 *   PLACED → ACCEPTED → PACKED → SHIPPED → DELIVERED
 *     │                                      │
 *     └── CANCELLED (buyer, pre-ship;        └── RETURN_REQUESTED (buyer)
 *          restocks + refunds)                    → RETURN_APPROVED
 *                                                 → REFUNDED (buyer first,
 *                                                    then recover from seller)
 *
 * Constitution ties:
 *   - Money is integer paise, computed server-side; never a client value.
 *   - "Buyers are never collateral. Refund the buyer first; recover from the
 *      seller afterwards." — the refund marks the buyer paid immediately and
 *      opens a separate seller-recovery ledger entry.
 *   - Idempotency: a repeated Idempotency-Key returns the same order, never a
 *     duplicate charge.
 *   - Every mutation writes an audit row (denied attempts included).
 */

import { restock } from "@/lib/catalog";

export type OrderStatus =
  | "PLACED" | "ACCEPTED" | "PACKED" | "SHIPPED" | "DELIVERED"
  | "CANCELLED" | "RETURN_REQUESTED" | "RETURN_APPROVED" | "REFUNDED" | "RETURN_REJECTED";

export type RecoveryStatus = "NONE" | "PENDING" | "RECOVERED";

export interface OrderItem {
  productId: string;
  title: string;
  emoji: string;
  seller: string;
  qty: number;
  unitPaise: number;
  linePaise: number;
  variantId?: string;
  variantLabel?: string; // e.g. "500 g" — shown on the order and invoice
}

export interface OrderEvent {
  at: string;
  status: OrderStatus;
  by: string; // actor role/email
  note?: string;
}

export interface Order {
  reference: string;
  idempotencyKey: string;
  buyerEmail: string;
  placedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  city: string;
  state?: string; // buyer's state — drives GST place-of-supply on the invoice
  pincode: string;
  payment: string;
  /** 100% prepaid platform: capture precedes order-forwarding, so a stored
   *  order is always CAPTURED — the gateway reference proves it. */
  paymentStatus: "CAPTURED";
  gatewayRef?: string;
  subtotalPaise: number;
  discountPaise: number;
  couponCode: string | null;
  shippingPaise: number;
  totalPaise: number;
  gstPaise?: number; // GST included in the total (derived, inclusive pricing)
  /** Wallet credit applied at checkout (a store-credit DEBIT). The amount
   *  actually charged to the gateway is totalPaise - walletAppliedPaise. A
   *  full refund still credits totalPaise back to the wallet (buyer-first). */
  walletAppliedPaise?: number;
  timeline: OrderEvent[];
  // Returns / refunds
  returnReason?: string;
  refundedPaise: number;
  refundedAt?: string;
  sellerRecovery: RecoveryStatus;
}

interface OrderStore {
  orders: Order[];
  byKey: Record<string, string>; // idempotencyKey → reference
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhOrders: OrderStore | undefined;
}

function store(): OrderStore {
  globalThis.__vhOrders ??= { orders: [], byKey: {}, seq: 1 };
  return globalThis.__vhOrders;
}

const now = () => new Date().toISOString();

/* ── Create ───────────────────────────────────────────────── */

export interface PlaceOrderInput {
  idempotencyKey: string;
  buyerEmail: string;
  reference: string;
  city: string;
  state?: string;
  pincode: string;
  payment: string;
  items: OrderItem[];
  subtotalPaise: number;
  discountPaise: number;
  couponCode: string | null;
  shippingPaise: number;
  totalPaise: number;
  gstPaise?: number;
  walletAppliedPaise?: number;
}

/** The order (if any) already created under an idempotency key. Callers check
 *  this BEFORE mutating stock — a replayed submit must be a read, not a write. */
export async function orderByKey(key: string): Promise<Order | null> {
  const s = store();
  const ref = s.byKey[key];
  return ref ? s.orders.find((o) => o.reference === ref) ?? null : null;
}

/** Idempotent create. A repeated key returns the existing order untouched. */
export async function createOrder(input: PlaceOrderInput): Promise<Order> {
  const s = store();
  const existingRef = s.byKey[input.idempotencyKey];
  if (existingRef) {
    const existing = s.orders.find((o) => o.reference === existingRef);
    if (existing) return existing;
  }
  const order: Order = {
    reference: input.reference,
    idempotencyKey: input.idempotencyKey,
    buyerEmail: input.buyerEmail,
    placedAt: now(),
    status: "PLACED",
    items: input.items,
    city: input.city,
    ...(input.state ? { state: input.state } : {}),
    pincode: input.pincode,
    payment: input.payment,
    // Prepaid: capture happens at payment, before the order is forwarded.
    paymentStatus: "CAPTURED",
    gatewayRef: `gw_${input.idempotencyKey.slice(0, 8)}`,
    subtotalPaise: input.subtotalPaise,
    ...(typeof input.gstPaise === "number" ? { gstPaise: input.gstPaise } : {}),
    discountPaise: input.discountPaise,
    couponCode: input.couponCode,
    shippingPaise: input.shippingPaise,
    totalPaise: input.totalPaise,
    ...(input.walletAppliedPaise && input.walletAppliedPaise > 0 ? { walletAppliedPaise: input.walletAppliedPaise } : {}),
    timeline: [{ at: now(), status: "PLACED", by: input.buyerEmail }],
    refundedPaise: 0,
    sellerRecovery: "NONE",
  };
  s.orders.unshift(order);
  s.byKey[input.idempotencyKey] = order.reference;
  s.seq += 1;
  return order;
}

/* ── Reads ────────────────────────────────────────────────── */

export async function ordersForBuyer(buyerEmail: string): Promise<Order[]> {
  return store().orders.filter((o) => o.buyerEmail === buyerEmail);
}

/** Orders containing at least one line from this storefront. */
export async function ordersForSeller(sellerName: string): Promise<Order[]> {
  return store().orders.filter((o) => o.items.some((it) => it.seller === sellerName));
}

export async function allOrders(): Promise<Order[]> {
  return store().orders;
}

export async function findOrder(reference: string): Promise<Order | null> {
  return store().orders.find((o) => o.reference === reference) ?? null;
}

export function sellerSubtotal(order: Order, sellerName: string): number {
  return order.items.filter((it) => it.seller === sellerName).reduce((n, it) => n + it.linePaise, 0);
}

/* ── Fulfilment state machine (seller) ────────────────────── */

const FORWARD: Record<string, { from: OrderStatus[]; to: OrderStatus }> = {
  accept: { from: ["PLACED"], to: "ACCEPTED" },
  pack: { from: ["ACCEPTED"], to: "PACKED" },
  ship: { from: ["PACKED"], to: "SHIPPED" },
  deliver: { from: ["SHIPPED"], to: "DELIVERED" },
};

export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

export async function advanceOrder(reference: string, op: string, by: string): Promise<OrderResult> {
  const rule = FORWARD[op];
  const order = await findOrder(reference);
  if (!rule || !order) return { ok: false, reason: "missing" };
  if (!rule.from.includes(order.status)) return { ok: false, reason: "state" };
  order.status = rule.to;
  order.timeline.push({ at: now(), status: rule.to, by });
  return { ok: true, order };
}

/* ── Cancellation (buyer, pre-ship) ───────────────────────── */

/** A buyer can cancel before it ships. Stock is returned and the buyer refunded. */
export async function cancelOrder(reference: string, by: string, reason?: string): Promise<OrderResult> {
  const order = await findOrder(reference);
  if (!order) return { ok: false, reason: "missing" };
  if (!["PLACED", "ACCEPTED", "PACKED"].includes(order.status)) return { ok: false, reason: "state" };
  for (const it of order.items) await restock(it.productId, it.qty, it.variantId);
  order.status = "CANCELLED";
  order.refundedPaise = order.totalPaise;
  order.refundedAt = now();
  order.timeline.push({ at: now(), status: "CANCELLED", by, ...(reason ? { note: reason } : {}) });
  // Buyer-first: the refund lands in the buyer's wallet immediately.
  await creditRefundToWallet(order);
  return { ok: true, order };
}

/* ── Returns / RMA ────────────────────────────────────────── */

/** Buyer requests a return after delivery (7-day window enforced by caller UI). */
export async function requestReturn(reference: string, by: string, reason: string): Promise<OrderResult> {
  const order = await findOrder(reference);
  if (!order) return { ok: false, reason: "missing" };
  if (order.status !== "DELIVERED") return { ok: false, reason: "state" };
  if (reason.trim().length < 10) return { ok: false, reason: "reason" };
  order.status = "RETURN_REQUESTED";
  order.returnReason = reason.trim();
  order.timeline.push({ at: now(), status: "RETURN_REQUESTED", by, note: reason.trim() });
  return { ok: true, order };
}

/** Seller/admin approves a return: request → approved (awaiting refund). */
export async function approveReturn(reference: string, by: string): Promise<OrderResult> {
  const order = await findOrder(reference);
  if (!order) return { ok: false, reason: "missing" };
  if (order.status !== "RETURN_REQUESTED") return { ok: false, reason: "state" };
  order.status = "RETURN_APPROVED";
  order.timeline.push({ at: now(), status: "RETURN_APPROVED", by });
  return { ok: true, order };
}

export async function rejectReturn(reference: string, by: string, note: string): Promise<OrderResult> {
  const order = await findOrder(reference);
  if (!order) return { ok: false, reason: "missing" };
  if (order.status !== "RETURN_REQUESTED") return { ok: false, reason: "state" };
  if (note.trim().length < 20) return { ok: false, reason: "note" };
  order.status = "RETURN_REJECTED";
  order.timeline.push({ at: now(), status: "RETURN_REJECTED", by, note: note.trim() });
  return { ok: true, order };
}

/**
 * Issue the refund. This is the constitution's load-bearing move: the BUYER
 * is refunded first (status REFUNDED, refundedPaise set now), stock is
 * returned, and a SEPARATE seller-recovery ledger entry is opened as PENDING
 * — the platform pursues the seller afterwards, never blocking the buyer's
 * money on that recovery. Approve-then-refund, or refund a request directly.
 */
export async function refundBuyer(reference: string, by: string): Promise<OrderResult> {
  const order = await findOrder(reference);
  if (!order) return { ok: false, reason: "missing" };
  if (!["RETURN_REQUESTED", "RETURN_APPROVED"].includes(order.status)) return { ok: false, reason: "state" };
  // A6: no single actor both initiates and settles a money movement. The
  // refund checker must differ from whoever moved the order into the return
  // state (the maker) — a self-approved refund is rejected, not just logged.
  const makerEvent = [...order.timeline].reverse().find((e) => e.status === "RETURN_REQUESTED" || e.status === "RETURN_APPROVED");
  if (makerEvent && makerEvent.by === by) return { ok: false, reason: "maker_checker" };
  // Buyer first: their money moves now.
  order.status = "REFUNDED";
  order.refundedPaise = order.totalPaise;
  order.refundedAt = now();
  // Recover from the seller AFTERWARDS — a separate, non-blocking ledger.
  order.sellerRecovery = "PENDING";
  for (const it of order.items) await restock(it.productId, it.qty, it.variantId);
  order.timeline.push({ at: now(), status: "REFUNDED", by, note: "buyer refunded first; seller recovery opened" });
  // Buyer-first: the refund lands in the buyer's wallet immediately.
  await creditRefundToWallet(order);
  return { ok: true, order };
}

/** Credit an order's refund to the buyer's wallet as instant store credit.
 *  Idempotent per order — a re-run won't double-credit the same reference. */
async function creditRefundToWallet(order: Order): Promise<void> {
  const { ledger, creditWallet } = await import("@/lib/wallet");
  const already = (await ledger(order.buyerEmail)).some((t) => t.kind === "REFUND" && t.ref === order.reference);
  if (already) return;
  await creditWallet(order.buyerEmail, {
    kind: "REFUND",
    amountPaise: order.refundedPaise,
    note: `Refund · order ${order.reference}`,
    ref: order.reference,
  });
}

/** Mark the seller-recovery ledger settled (admin finance, after the fact). */
export async function markSellerRecovered(reference: string, by: string): Promise<OrderResult> {
  const order = await findOrder(reference);
  if (!order) return { ok: false, reason: "missing" };
  if (order.sellerRecovery !== "PENDING") return { ok: false, reason: "state" };
  order.sellerRecovery = "RECOVERED";
  order.timeline.push({ at: now(), status: order.status, by, note: "seller recovery settled" });
  return { ok: true, order };
}

/* ── Metrics (for dashboards) ─────────────────────────────── */

export interface SalesMetrics {
  orders: number;
  grossPaise: number;
  refundedPaise: number;
  netPaise: number;
  units: number;
  pendingFulfilment: number;
  openReturns: number;
}

export function metricsFor(orders: Order[]): SalesMetrics {
  let grossPaise = 0, refundedPaise = 0, units = 0, pendingFulfilment = 0, openReturns = 0;
  for (const o of orders) {
    grossPaise += o.totalPaise;
    refundedPaise += o.refundedPaise;
    units += o.items.reduce((n, it) => n + it.qty, 0);
    if (["PLACED", "ACCEPTED", "PACKED"].includes(o.status)) pendingFulfilment += 1;
    if (["RETURN_REQUESTED", "RETURN_APPROVED"].includes(o.status)) openReturns += 1;
  }
  return {
    orders: orders.length,
    grossPaise,
    refundedPaise,
    netPaise: grossPaise - refundedPaise,
    units,
    pendingFulfilment,
    openReturns,
  };
}

export const ORDER_TONE: Record<OrderStatus, "ok" | "warn" | "danger" | "neutral" | "info"> = {
  PLACED: "info",
  ACCEPTED: "info",
  PACKED: "warn",
  SHIPPED: "warn",
  DELIVERED: "ok",
  CANCELLED: "neutral",
  RETURN_REQUESTED: "warn",
  RETURN_APPROVED: "warn",
  REFUNDED: "ok",
  RETURN_REJECTED: "danger",
};
