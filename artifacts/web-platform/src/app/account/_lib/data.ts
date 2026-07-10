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

export const CAMPAIGN_OFFERS: CampaignOffer[] = [
  {
    id: "off1",
    code: "FLAT15",
    headline: "15% off CBD Wellness",
    detail: "Vedic Botanicals balms, tinctures and roll-ons — AYUSH-licensed, batch CoA on every unit.",
    cls: "CBD_WELLNESS",
    endsOn: "2026-07-31",
    minSpendPaise: 99900,
  },
  {
    id: "off2",
    code: "FREESHIP499",
    headline: "Free shipping on Hemp Food",
    detail: "Cold-pressed oils, protein and hearts from FSSAI-licensed sellers, delivered free.",
    cls: "HEMP_FOOD",
    endsOn: "2026-07-20",
    minSpendPaise: 49900,
  },
];

/* ── Activity timeline (dashboard) ──────────────────────────────────────── */
export interface ActivityEvent {
  label: string;
  at?: string;
  actor?: string;
  state: "done" | "current" | "pending" | "failed";
}

export const ACTIVITY: ActivityEvent[] = [
  { label: "Order VH2026070912 is out for delivery", at: "Today · 09:40", state: "current" },
  {
    label: "Your prescription was viewed by pharmacist.das — reason PRESCRIPTION_VERIFICATION logged, and you were notified (A4)",
    at: "Yesterday · 14:22",
    actor: "Pharmacist",
    state: "done",
  },
  { label: "Coupon FLAT15 applied at checkout", at: "2026-07-07", state: "done" },
  { label: "Order VH2026070845 shipped by Himalayan Hemp Co.", at: "2026-07-06", state: "done" },
];

/* ── Wallet ─────────────────────────────────────────────────────────────── */
export interface LedgerRow {
  id: string; at: string; kind: string; note: string; amountPaise: number; status: string;
}

export const LEDGER: LedgerRow[] = [
  { id: "tx1", at: "2026-07-08", kind: "CASHBACK", note: "Order VH2026070912 · 2% cashback", amountPaise: 3538, status: "POSTED" },
  { id: "tx2", at: "2026-07-02", kind: "REFUND", note: "Return · order VH2026062810", amountPaise: 249900, status: "POSTED" },
  { id: "tx3", at: "2026-06-30", kind: "PROMO", note: "Welcome bonus", amountPaise: 10000, status: "POSTED" },
  { id: "tx4", at: "2026-06-28", kind: "DEBIT", note: "Applied to order VH2026062810", amountPaise: -50000, status: "POSTED" },
  { id: "tx5", at: "2026-06-20", kind: "WITHDRAWAL", note: "Payout to bank ····4471", amountPaise: -100000, status: "PROCESSING" },
];

export const WALLET_SPLIT = {
  cashbackPaise: 68450,
  promoPaise: 10000,
  refundsPaise: 50000,
} as const;

export const WALLET_BALANCE_PAISE =
  WALLET_SPLIT.cashbackPaise + WALLET_SPLIT.promoPaise + WALLET_SPLIT.refundsPaise;

/** Weekly wallet balance points (paise) for the trend sparkline. */
export const WALLET_TREND = [82000, 88450, 84950, 104950, 101412, 125312, 128450];

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

export const ACCESS_LOG: AccessLogRow[] = [
  { id: "al1", at: "2026-06-18 14:22", actor: "pharmacist.das", role: "Pharmacist", reasonCode: "PRESCRIPTION_VERIFICATION", notified: true },
  { id: "al2", at: "2026-05-30 09:47", actor: "compliance.nair", role: "Compliance", reasonCode: "ROUTINE_AUDIT", notified: true },
];

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

export const NOTIFICATIONS: NotificationRow[] = [
  { id: "n1", category: "Orders", kind: "Transactional", title: "Your order is out for delivery", body: "VH2026070912 arrives today by 7 PM.", at: "2h ago", unread: true },
  { id: "n2", category: "Medical", kind: "Transactional", title: "Your prescription was viewed", body: "pharmacist.das viewed your Rx for verification.", at: "Yesterday", unread: true },
  { id: "n3", category: "Wallet", kind: "Transactional", title: "Refund credited", body: "₹2,499.00 credited to your Wallet.", at: "3 days ago", unread: false },
  { id: "n4", category: "Offers", kind: "Promotional", title: "15% off Ayurveda essentials", body: "Picked for you based on your recent browsing.", at: "5 days ago", unread: false },
];

export const SUPPRESSION_MATRIX: {
  category: string; kind: "Transactional" | "Promotional"; suppressible: boolean; note: string;
}[] = [
  { category: "Order status", kind: "Transactional", suppressible: false, note: "Always delivered — required for delivery coordination." },
  { category: "Prescription access (A4)", kind: "Transactional", suppressible: false, note: "Buyer notice on sensitive reads is mandatory, not a preference." },
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
