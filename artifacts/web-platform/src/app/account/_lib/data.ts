/**
 * VEDIC HEMP — BUYER CONSOLE LOCAL SAMPLE DATA (presentation only)
 *
 * Underscore directory = not routed. Illustrative UI data for the buyer
 * console, complementing @/lib/sample. Same ground rules:
 *  - NO advertisable MED_CANNABIS anywhere (A1) — campaign offers are
 *    restricted to HEMP_FOOD / AYURVEDA / CBD_WELLNESS at the type level
 *    and re-asserted at render time via assertCreativeClassRenderable().
 *  - Money is integer paise, rendered only via <MoneyText>.
 */

import { ComplianceClass } from "@prisma/client";

/* ── Campaign offers (dashboard "Offers for you") ─────────────────────────
 * Only ever HEMP_FOOD / AYURVEDA / CBD_WELLNESS creatives. Placements are
 * configured in Admin → Ads; this is the render-side sample. */
export interface CampaignOffer {
  id: string;
  code: string;
  headline: string;
  detail: string;
  cls: ComplianceClass;
  endsOn: string;
  minSpendPaise: number | null;
}

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

/** Weekly wallet balance points (paise) for the trend sparkline. */
/* ── Prescriptions & access log (A4 surface) ────────────────────────────── */
export interface SamplePrescription {
  id: string; doctor: string; regNo: string; issuedAt: string; validTill: string; status: string;
}

export const PRESCRIPTIONS: SamplePrescription[] = [
  {
    id: "rx1",
    doctor: "Dr. Kavita Rao, MD (Pain Medicine)",
    regNo: "MCI-88213",
    issuedAt: "2026-04-02",
    validTill: "2026-07-02",
    status: "EXPIRED",
  },
];

export interface AccessLogRow {
  id: string; at: string; actor: string; role: string; reasonCode: string; notified: boolean;
}

/* ── Subscriptions ──────────────────────────────────────────────────────── */
export interface SampleSubscription {
  id: string; product: string; emoji: string; cadence: string; nextDelivery: string;
  pricePaise: number; status: string; regulated: boolean;
}

export const SUBSCRIPTIONS: SampleSubscription[] = [
  { id: "sub1", product: "CBD Wellness Balm 30g", emoji: "🌿", cadence: "Every 4 weeks", nextDelivery: "2026-07-13", pricePaise: 149900, status: "ACTIVE", regulated: true },
  { id: "sub2", product: "Hemp Protein Powder 500g", emoji: "🥤", cadence: "Every 6 weeks", nextDelivery: "2026-07-20", pricePaise: 89900, status: "ACTIVE", regulated: false },
];

/* ── Support ────────────────────────────────────────────────────────────── */
export interface Ticket {
  id: string; subject: string; category: string; status: string; updatedAt: string;
}

export const TICKETS: Ticket[] = [
  { id: "t1", subject: "Return not picked up yet", category: "Orders", status: "OPEN", updatedAt: "2026-07-08" },
  { id: "t2", subject: "Wallet refund shows pending", category: "Wallet", status: "AWAITING_REPLY", updatedAt: "2026-07-05" },
  { id: "t3", subject: "Wrong item in order VH2026063099", category: "Orders", status: "RESOLVED", updatedAt: "2026-06-29" },
];

export const FAQS = [
  { q: "How do I track my order?", href: "/account/orders" },
  { q: "How long does a refund take to reach my Wallet?", href: "/account/wallet" },
  { q: "Why can't I see Medical Cannabis products?", href: "/account/medical" },
  { q: "How do I pause or skip a subscription?", href: "/account/subscriptions" },
];

/* ── Notifications ──────────────────────────────────────────────────────── */
export interface NotificationRow {
  id: string; category: string; kind: "Transactional" | "Promotional";
  title: string; body: string; at: string; unread: boolean;
}

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
