import "server-only";

/**
 * VEDIC HEMP — SUBSCRIPTIONS (§1.8, runtime store)
 *
 * A real per-buyer subscription store. The state machine is server-authoritative
 * — the buttons are decoration:
 *   - skip is idempotent (repeated taps never double-skip),
 *   - cancel is terminal,
 *   - a CANCELLED subscription accepts no further ops.
 * Every change appends to an APPEND-ONLY event log (A3 spirit). A regulated
 * (CBD) subscription whose prescription requirement isn't met is shown PAUSED on
 * read — never cancelled, never silently shipped — computed from the buyer's
 * live prescriptions by the page, not stored here.
 */

export type SubStatus = "ACTIVE" | "PAUSED" | "CANCELLED";

/** Allowed delivery cadences, in days. */
export const CADENCES = [14, 28, 42, 56] as const;
export type Cadence = (typeof CADENCES)[number];

export function cadenceLabel(days: number): string {
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "Every week" : `Every ${weeks} weeks`;
}

export interface Subscription {
  id: string;
  buyerEmail: string;
  productId: string;
  product: string;
  emoji: string;
  cls: string;
  regulated: boolean;
  cadenceDays: number;
  pricePaise: number;
  status: SubStatus;
  skippedNext: boolean;
  nextDeliveryAt: string; // YYYY-MM-DD
  createdAt: string;
}

export interface SubEvent {
  id: string;
  subId: string;
  op: "create" | "skip" | "unskip" | "pause" | "resume" | "cancel";
  at: string;
  note?: string;
}

interface SubStore {
  subs: Subscription[];
  events: SubEvent[]; // append-only
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhSubscriptions: SubStore | undefined;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00+05:30`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function seed(): SubStore {
  const today = todayStr();
  return {
    subs: [
      { id: "sub-1", buyerEmail: "buyer@example.in", productId: "cbd-balm-30g", product: "CBD Wellness Balm 30g", emoji: "🌿", cls: "CBD_WELLNESS", regulated: true, cadenceDays: 28, pricePaise: 149900, status: "ACTIVE", skippedNext: false, nextDeliveryAt: addDays(today, 12), createdAt: today },
      { id: "sub-2", buyerEmail: "buyer@example.in", productId: "hemp-protein-500g", product: "Hemp Protein Powder 500g", emoji: "🥤", cls: "HEMP_FOOD", regulated: false, cadenceDays: 42, pricePaise: 89900, status: "ACTIVE", skippedNext: false, nextDeliveryAt: addDays(today, 19), createdAt: today },
    ],
    events: [],
    seq: 3,
  };
}

function store(): SubStore {
  globalThis.__vhSubscriptions ??= seed();
  return globalThis.__vhSubscriptions;
}

function record(subId: string, op: SubEvent["op"], note?: string) {
  const s = store();
  s.events.unshift({ id: `se-${s.seq++}`, subId, op, at: todayStr(), ...(note ? { note } : {}) });
}

export async function mySubscriptions(email: string): Promise<Subscription[]> {
  return store().subs
    .filter((x) => x.buyerEmail.toLowerCase() === email.toLowerCase())
    .sort((a, b) => (a.status === "CANCELLED" ? 1 : 0) - (b.status === "CANCELLED" ? 1 : 0));
}

export function findSub(id: string): Subscription | undefined {
  return store().subs.find((x) => x.id === id);
}

export async function subscriptionCount(email: string): Promise<{ active: number; total: number }> {
  const mine = await mySubscriptions(email);
  return { active: mine.filter((s) => s.status === "ACTIVE").length, total: mine.length };
}

export interface CreateSubInput {
  buyerEmail: string;
  productId: string;
  product: string;
  emoji: string;
  cls: string;
  pricePaise: number;
  cadenceDays: number;
}

export type CreateSubResult =
  | { ok: true; sub: Subscription }
  | { ok: false; reason: "cadence" | "duplicate" };

/** Create an ACTIVE subscription. One per (buyer, product) — a second attempt
 *  is a no-op-ish "duplicate" so a buyer can't stack the same repeat order. */
export async function createSubscription(input: CreateSubInput): Promise<CreateSubResult> {
  const s = store();
  if (!(CADENCES as readonly number[]).includes(input.cadenceDays)) return { ok: false, reason: "cadence" };
  const exists = s.subs.some(
    (x) => x.buyerEmail.toLowerCase() === input.buyerEmail.toLowerCase() && x.productId === input.productId && x.status !== "CANCELLED",
  );
  if (exists) return { ok: false, reason: "duplicate" };
  const sub: Subscription = {
    id: `sub-${s.seq++}`,
    buyerEmail: input.buyerEmail,
    productId: input.productId,
    product: input.product,
    emoji: input.emoji || "🌿",
    cls: input.cls,
    regulated: input.cls === "CBD_WELLNESS" || input.cls === "MED_CANNABIS",
    cadenceDays: input.cadenceDays,
    pricePaise: input.pricePaise,
    status: "ACTIVE",
    skippedNext: false,
    nextDeliveryAt: addDays(todayStr(), input.cadenceDays),
    createdAt: todayStr(),
  };
  s.subs.unshift(sub);
  record(sub.id, "create", cadenceLabel(sub.cadenceDays));
  return { ok: true, sub };
}

export type SubOp = "skip" | "unskip" | "pause" | "resume" | "cancel";
export type SubActionResult =
  | { ok: true; sub: Subscription }
  | { ok: false; reason: "missing" | "terminal" | "state" };

/** The server-side state machine. Returns the updated subscription or a reason. */
export async function applySubOp(id: string, op: SubOp): Promise<SubActionResult> {
  const sub = findSub(id);
  if (!sub) return { ok: false, reason: "missing" };
  if (sub.status === "CANCELLED") return { ok: false, reason: "terminal" };

  switch (op) {
    case "skip":
      // Idempotent: already-skipped stays skipped, and the following cycle
      // ships as usual (advance the next-delivery date by one cadence once).
      if (!sub.skippedNext) {
        sub.skippedNext = true;
        sub.nextDeliveryAt = addDays(sub.nextDeliveryAt, sub.cadenceDays);
      }
      break;
    case "unskip":
      if (sub.skippedNext) {
        sub.skippedNext = false;
        sub.nextDeliveryAt = addDays(sub.nextDeliveryAt, -sub.cadenceDays);
      }
      break;
    case "pause":
      if (sub.status !== "ACTIVE") return { ok: false, reason: "state" };
      sub.status = "PAUSED";
      break;
    case "resume":
      if (sub.status !== "PAUSED") return { ok: false, reason: "state" };
      sub.status = "ACTIVE";
      break;
    case "cancel":
      sub.status = "CANCELLED";
      break;
  }
  record(id, op);
  return { ok: true, sub };
}

export async function subEvents(subId?: string, limit = 50): Promise<SubEvent[]> {
  const all = store().events;
  return (subId ? all.filter((e) => e.subId === subId) : all).slice(0, limit);
}
