/**
 * VEDIC HEMP — ADMIN CONSOLE LOCAL DATA (_lib, not routed)
 *
 * Illustrative series and registries used only by the admin console pages.
 * Same caveat as src/lib/sample.ts: this is presentation data standing in for
 * server-computed figures — nothing in this file is a source of truth, and
 * nothing here contains an advertisable MED_CANNABIS surface (A1).
 */

import type { ComplianceClass } from "@prisma/client";
import type { SampleProduct } from "@/lib/sample";

/* ── Trend series (last 14 days, ending today 9 Jul 2026) ──── */

export const DAY_LABELS_14 = ["26", "27", "28", "29", "30", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** GMV per day, integer paise. */
export const GMV_14D_PAISE = [
  14_82_10_000, 15_10_40_000, 14_20_80_000, 15_64_20_000, 16_02_50_000,
  15_38_90_000, 16_44_30_000, 15_92_60_000, 16_81_40_000, 17_12_00_000,
  16_58_70_000, 17_40_20_000, 17_92_80_000, 18_42_60_000,
];

export const ORDERS_14D = [1042, 1068, 995, 1104, 1131, 1087, 1160, 1122, 1188, 1207, 1173, 1229, 1251, 1284];

export const AOV_14D_PAISE = [1_38_200, 1_39_400, 1_37_100, 1_40_600, 1_41_900, 1_40_200, 1_41_300, 1_40_800, 1_42_100, 1_42_600, 1_41_700, 1_42_900, 1_43_200, 1_43_500];

export const LIVE_SELLERS_14D = [301, 302, 302, 304, 305, 305, 307, 308, 308, 309, 310, 310, 311, 312];

/* ── SLA helpers (presentation only — the real clock is server-side) ── */

export function slaHoursOf(sla: string): number {
  const m = /(\d+)\s*h/.exec(sla);
  const captured = m?.[1];
  return captured ? Number(captured) : 4;
}

/** Countdown pill data for a queue item. Colour never carries this alone — the label always says it. */
export function slaCountdown(sla: string, ageHours: number): { label: string; tone: "ok" | "warn" | "danger" } {
  const total = slaHoursOf(sla);
  const left = total - ageHours;
  if (left <= 0) return { label: "SLA breached", tone: "danger" };
  if (left <= 1) return { label: `${left}h left`, tone: "danger" };
  if (left <= total / 2) return { label: `${left}h left`, tone: "warn" };
  return { label: `${left}h left`, tone: "ok" };
}

/* ── Ad inventory registry (rendered on /admin/ads) ────────── */

export interface AdPlacement {
  id: string;
  placement: string;
  surface: string;
  format: string;
  pricing: "flat/day" | "CPC" | "CPM";
  floorPaise: number;
  status: string;
}

/**
 * Every configurable paid placement on the platform. Each one renders through
 * <AdSlot> (src/components/ui/ads.tsx), so it is always visibly labelled and
 * the A1 render guard runs before anything paints.
 */
/* ── Auction health (7-day series) ─────────────────────────── */

/* ── Seller health mini-series (7 weeks, per seller id) ────── */

export const SELLER_HEALTH_SERIES: Record<string, number[]> = {
  s1: [78, 80, 82, 84, 83, 85, 86],
  s2: [70, 72, 71, 73, 75, 74, 74],
  s3: [72, 70, 66, 64, 61, 60, 58],
};

/** KYC queue presentation metadata, keyed by seller id. */
export const KYC_META: Record<string, { sla: string; ageHours: number }> = {
  s4: { sla: "24h", ageHours: 6 },
};

/* ── CoA queue details, keyed by queue item id (A2) ────────── */

/** Listings awaiting product approval (sample; all live-catalogue rows sit in @/lib/sample). */
/* ── Sensitive access log, last 24h (A4) ───────────────────── */

export interface SensitiveAccessRow {
  id: string; at: string; actor: string; role: string;
  reason: string; subject: string; buyerNotified: boolean; outcome: "GRANTED" | "DENIED";
}

export const SENSITIVE_ACCESS_24H: SensitiveAccessRow[] = [
  { id: "sx1", at: "2026-07-09 11:04", actor: "pharmacist.das", role: "ADMIN_PHARMACIST", reason: "PRESCRIPTION_VERIFICATION", subject: "rx_8821", buyerNotified: true, outcome: "GRANTED" },
  { id: "sx2", at: "2026-07-09 10:31", actor: "support.varma", role: "ADMIN_SUPPORT", reason: "DISPUTE_EVIDENCE", subject: "rx_8790", buyerNotified: true, outcome: "DENIED" },
  { id: "sx3", at: "2026-07-09 08:40", actor: "compliance.nair", role: "ADMIN_COMPLIANCE", reason: "ADVERSE_EVENT_TRIAGE", subject: "rx_8779", buyerNotified: true, outcome: "GRANTED" },
  { id: "sx4", at: "2026-07-08 19:12", actor: "pharmacist.das", role: "ADMIN_PHARMACIST", reason: "PRESCRIPTION_VERIFICATION", subject: "rx_8764", buyerNotified: true, outcome: "GRANTED" },
];

/* ── Courier scorecard + funnel + class mix (analytics/orders) ── */

export const COURIER_SCORECARD = [
  { label: "Delhivery", value: 96.4, display: "96.4% on-time" },
  { label: "BlueDart", value: 95.1, display: "95.1% on-time" },
  { label: "Ecom Express", value: 91.8, display: "91.8% on-time" },
  { label: "India Post", value: 84.2, display: "84.2% on-time" },
];

/**
 * GMV mix by compliance class — three classes only. MED_CANNABIS dispensing
 * volume is reported separately under Compliance, never blended into
 * commercial analytics (A1: it is not a merchandisable line of business).
 */
/* ── Finance: period close ─────────────────────────────────── */

// Revenue, take rate and the GST/TCS/TDS position are DERIVED from the real
// order + settlement stores (src/lib/finance-summary.ts) — no static series.

export const PERIOD_CLOSE_CHECKLIST: { label: string; done: boolean }[] = [
  { label: "All settlement runs for the period posted or parked", done: true },
  { label: "Refund float reconciled to gateway statement", done: true },
  { label: "GST / TCS / TDS withholding report generated", done: true },
  { label: "Disputed orders carried into next period", done: false },
  { label: "Checker sign-off on close (second, different admin — A6)", done: false },
];

/* ── Marketing audiences ───────────────────────────────────── */

export const AUDIENCES = [
  { id: "au1", segment: "All buyers (promotional opt-in)", size: "184k", basis: "Explicit marketing consent" },
  { id: "au2", segment: "Cart abandoners — 72h", size: "12k", basis: "Session events, consented" },
  { id: "au3", segment: "CBD Wellness purchasers", size: "38k", basis: "Purchase history only — no health inference" },
  { id: "au4", segment: "Lapsed 90 days", size: "51k", basis: "Order recency" },
];

/* ── Settings: feature flags + API keys (masked) ───────────── */

// No usage telemetry is wired, so no fabricated "last used" recency is shown.
export const API_KEYS = [
  { id: "k1", name: "logistics-webhook", masked: "vh_live_••••••••3f9a", scope: "shipments:write" },
  { id: "k2", name: "tax-engine", masked: "vh_live_••••••••81cd", scope: "tax:read" },
  { id: "k3", name: "search-indexer", masked: "vh_live_••••••••c044", scope: "catalogue:read" },
];

/* ── CMS media library ─────────────────────────────────────── */

/* ── Analytics exports ─────────────────────────────────────── */
