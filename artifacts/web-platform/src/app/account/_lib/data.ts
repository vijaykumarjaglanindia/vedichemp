/**
 * VEDIC HEMP — BUYER CONSOLE VIEW MODELS & DATE HELPERS
 *
 * Underscore directory = not routed. What lives here is the row shapes the
 * buyer console renders (filled from the live stores), the §0.9 notification
 * suppression contract (policy, not per-user data) and the shared date maths.
 * No sample rows: every figure a buyer sees comes from their own account.
 */

/* ── Activity timeline (dashboard) ──────────────────────────────────────── */
export interface ActivityEvent {
  label: string;
  at?: string;
  actor?: string;
  state: "done" | "current" | "pending" | "failed";
}

/* ── Wallet ─────────────────────────────────────────────────────────────── */
export interface LedgerRow {
  id: string; at: string; kind: string; note: string; amountPaise: number; status: string;
}

/* ── Prescription access log (A4 surface) ───────────────────────────────── */
export interface AccessLogRow {
  id: string; at: string; actor: string; role: string; reasonCode: string; notified: boolean;
}

/* ── Support ────────────────────────────────────────────────────────────── */
export const FAQS = [
  { q: "How do I track my order?", href: "/account/orders" },
  { q: "How long does a refund take to reach my Wallet?", href: "/account/wallet" },
  { q: "Why can't I see Medical Cannabis products?", href: "/account/medical" },
  { q: "How do I pause or skip a subscription?", href: "/account/subscriptions" },
];

/* ── Notifications: what can and cannot be muted (§0.9 contract) ────────── */
export const SUPPRESSION_MATRIX: {
  category: string; kind: "Transactional" | "Promotional"; suppressible: boolean; note: string;
}[] = [
  { category: "Order status", kind: "Transactional", suppressible: false, note: "Always delivered — required for delivery coordination." },
  { category: "Prescription access", kind: "Transactional", suppressible: false, note: "Buyer notice on sensitive reads is mandatory, not a preference." },
  { category: "Payment / wallet", kind: "Transactional", suppressible: false, note: "Money movement must always be confirmed to the buyer." },
  { category: "Subscription reminders", kind: "Transactional", suppressible: true, note: "Can be muted; skip/pause still applies silently." },
  { category: "Offers & recommendations", kind: "Promotional", suppressible: true, note: "Gated on the personalisation/marketing consent toggle." },
  { category: "Newsletters", kind: "Promotional", suppressible: true, note: "Opt-in only; off by default." },
];

/* ── Date helpers (server-side presentation math) ───────────────────────── */
const DAY_MS = 86_400_000;

/** Whole days from now (IST-anchored) until an ISO date. Negative = past. */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00+05:30`).getTime();
  return Math.ceil((target - Date.now()) / DAY_MS);
}

/** Percentage of a validity window already elapsed, clamped to 0–100. */
export function validityElapsedPct(issuedAt: string, validTill: string): number {
  const start = new Date(`${issuedAt}T00:00:00+05:30`).getTime();
  const end = new Date(`${validTill}T00:00:00+05:30`).getTime();
  if (end <= start) return 100;
  const pct = ((Date.now() - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}
