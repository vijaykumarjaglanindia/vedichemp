/**
 * VEDIC HEMP — SELLER CONSOLE SAMPLE DATA (illustrative, seller-scoped)
 *
 * Extends the shared `@/lib/sample` fixtures with the batch/CoA, licence,
 * ads, marketing and finance detail the Seller Central UI needs. This file
 * is local to `src/app/seller/**` — it does not modify any shared file.
 * "This seller" is always SELLERS[0] ("Vedic Botanicals"), per CONTRACT.
 *
 * `noUncheckedIndexedAccess` is on: every lookup here is guarded.
 */

import { ComplianceClass } from "@prisma/client";
import { PRODUCTS, ORDERS, SELLERS, SETTLEMENTS, type SampleProduct, type SampleOrder } from "@/lib/sample";

const seller = SELLERS.find((s) => s.name === "Vedic Botanicals");
if (!seller) throw new Error("Seed seller 'Vedic Botanicals' missing from sample data");
export const SELLER = seller;

/* ── Batches & CoA (A2) ───────────────────────────────────── */

export type CoaStatus = "APPROVED" | "PENDING_REVIEW" | "MISSING" | "REJECTED";

export interface Batch {
  code: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
  reserved: number;
  coaStatus: CoaStatus;
  labReportId?: string;
  note?: string;
}

export interface SellerProduct extends SampleProduct {
  hsn: string;
  listingState: string;
  batches: Batch[];
}

const BATCHES_BY_PRODUCT: Record<string, Batch[]> = {
  p4: [
    { code: "VB-2405", mfgDate: "2025-11-01", expiryDate: "2027-11-01", qty: 84, reserved: 12, coaStatus: "APPROVED", labReportId: "LR-4401" },
    { code: "VB-2406", mfgDate: "2026-05-10", expiryDate: "2028-05-10", qty: 340, reserved: 0, coaStatus: "PENDING_REVIEW", labReportId: "LR-4410", note: "Submitted to compliance queue — SLA 4h" },
  ],
  p5: [
    { code: "VB-2408", mfgDate: "2026-03-01", expiryDate: "2027-03-01", qty: 118, reserved: 20, coaStatus: "APPROVED", labReportId: "LR-4407" },
    { code: "VB-2409", mfgDate: "2026-06-01", expiryDate: "2027-06-01", qty: 95, reserved: 0, coaStatus: "PENDING_REVIEW", labReportId: "LR-4412", note: "Submitted to compliance queue — SLA 4h" },
  ],
  p8: [
    { code: "VB-2401", mfgDate: "2025-08-01", expiryDate: "2027-08-01", qty: 41, reserved: 6, coaStatus: "APPROVED", labReportId: "LR-4390" },
    { code: "VB-2410", mfgDate: "2026-07-01", expiryDate: "2027-07-01", qty: 150, reserved: 0, coaStatus: "MISSING", note: "No lab report uploaded — batch cannot be published (A2)" },
  ],
};

const DRAFT_PRODUCT: SellerProduct = {
  id: "p-vb-draft1",
  title: "CBD Sleep Gummies 30ct",
  slug: "cbd-sleep-gummies-30ct",
  cls: "CBD_WELLNESS",
  pricePaise: 119900,
  mrpPaise: 149900,
  seller: "Vedic Botanicals",
  rating: 0,
  emoji: "🍬",
  labVerified: false,
  state: "DRAFT",
  hsn: "21069099",
  listingState: "DRAFT",
  batches: [],
};

export const SELLER_PRODUCTS: SellerProduct[] = [
  ...PRODUCTS.filter((p) => p.seller === "Vedic Botanicals").map((p) => ({
    ...p,
    hsn: p.cls === "CBD_WELLNESS" ? "33049910" : "30049011",
    listingState: p.state,
    batches: BATCHES_BY_PRODUCT[p.id] ?? [],
  })),
  DRAFT_PRODUCT,
];

export function findSellerProduct(id: string): SellerProduct | undefined {
  return SELLER_PRODUCTS.find((p) => p.id === id);
}

/** Any batch across the catalogue whose CoA blocks it from being sellable. */
export const BLOCKED_BATCHES: { product: SellerProduct; batch: Batch }[] = SELLER_PRODUCTS.flatMap((p) =>
  p.batches.filter((b) => b.coaStatus === "MISSING" || b.coaStatus === "REJECTED").map((b) => ({ product: p, batch: b }))
);

export const PENDING_REVIEW_BATCHES: { product: SellerProduct; batch: Batch }[] = SELLER_PRODUCTS.flatMap((p) =>
  p.batches.filter((b) => b.coaStatus === "PENDING_REVIEW").map((b) => ({ product: p, batch: b }))
);

/* ── Orders (seller-scoped, extended for full status coverage) ──── */

const EXTRA_ORDERS: SampleOrder[] = [
  { id: "o-vb-1", reference: "VH2026070931", placedAt: "2026-07-09", status: "PENDING", totalPaise: 149900, buyer: "Kavya R.", seller: "Vedic Botanicals", items: [{ title: "CBD Wellness Balm 30g", qty: 1, emoji: "🌿" }] },
  { id: "o-vb-2", reference: "VH2026070928", placedAt: "2026-07-09", status: "PENDING", totalPaise: 249900, buyer: "Imran S.", seller: "Vedic Botanicals", items: [{ title: "CBD Ayurvedic Tincture 10ml", qty: 1, emoji: "💧" }] },
  { id: "o-vb-3", reference: "VH2026070871", placedAt: "2026-07-08", status: "ACCEPTED", totalPaise: 129900, buyer: "Divya M.", seller: "Vedic Botanicals", items: [{ title: "CBD Muscle Relief Roll-On 50ml", qty: 1, emoji: "🧴" }] },
  { id: "o-vb-4", reference: "VH2026070812", placedAt: "2026-07-08", status: "PACKED", totalPaise: 149900, buyer: "Rohit K.", seller: "Vedic Botanicals", items: [{ title: "CBD Wellness Balm 30g", qty: 1, emoji: "🌿" }] },
  { id: "o-vb-5", reference: "VH2026070755", placedAt: "2026-07-07", status: "SHIPPED", totalPaise: 249900, eta: "11 Jul", buyer: "Sneha T.", seller: "Vedic Botanicals", items: [{ title: "CBD Ayurvedic Tincture 10ml", qty: 1, emoji: "💧" }] },
  { id: "o-vb-6", reference: "VH2026070640", placedAt: "2026-07-05", status: "DELIVERED", totalPaise: 129900, buyer: "Arjun V.", seller: "Vedic Botanicals", items: [{ title: "CBD Muscle Relief Roll-On 50ml", qty: 1, emoji: "🧴" }] },
];

export const SELLER_ORDERS: SampleOrder[] = [
  ...ORDERS.filter((o) => o.seller === "Vedic Botanicals"),
  ...EXTRA_ORDERS,
];

export function findSellerOrder(id: string): SampleOrder | undefined {
  return SELLER_ORDERS.find((o) => o.id === id);
}

export const ORDER_STATUS_TABS = ["ALL", "PENDING", "ACCEPTED", "PACKED", "SHIPPED", "DELIVERED", "RETURNED"] as const;

/* ── Inventory ─────────────────────────────────────────────── */

export interface WarehouseStock { warehouse: string; product: string; batch: string; qty: number; reserved: number; sellable: boolean }

export const WAREHOUSE_STOCK: WarehouseStock[] = SELLER_PRODUCTS.flatMap((p) =>
  p.batches.map((b) => ({
    warehouse: "Bengaluru FC-2",
    product: p.title,
    batch: b.code,
    qty: b.qty,
    reserved: b.reserved,
    sellable: b.coaStatus === "APPROVED",
  }))
);

export const LOW_STOCK_THRESHOLD = 50;

/* ── Licences & KYC (A2 / A5 derivation) ──────────────────── */

export type LicenceStatus = "VERIFIED" | "UNDER_REVIEW" | "EXPIRED" | "NOT_APPLIED";

export interface Licence {
  type: "FSSAI" | "AYUSH" | "STATE_DRUG";
  number: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: LicenceStatus;
  unlocks: ComplianceClass[];
}

export const LICENCES: Licence[] = [
  { type: "AYUSH", number: "AYUSH/KA/2024/00931", validFrom: "2024-04-01", validTo: "2026-07-29", status: "VERIFIED", unlocks: ["AYURVEDA", "CBD_WELLNESS"] },
  { type: "FSSAI", number: null, validFrom: null, validTo: null, status: "NOT_APPLIED", unlocks: ["HEMP_FOOD"] },
  { type: "STATE_DRUG", number: null, validFrom: null, validTo: null, status: "NOT_APPLIED", unlocks: ["MED_CANNABIS"] },
];

export function daysUntil(dateStr: string, todayStr = "2026-07-09"): number {
  const today = new Date(todayStr).getTime();
  const target = new Date(dateStr).getTime();
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export const CAPABILITY_MATRIX: {
  cls: ComplianceClass;
  requiredLicence: Licence["type"];
  capability: "ACTIVE" | "ACTIVE_RENEW" | "LOCKED";
  note: string;
}[] = [
  { cls: "HEMP_FOOD", requiredLicence: "FSSAI", capability: "LOCKED", note: "Apply for an FSSAI licence to unlock Hemp Food listings." },
  { cls: "AYURVEDA", requiredLicence: "AYUSH", capability: "ACTIVE_RENEW", note: "Unlocked by AYUSH licence — expiring soon, renew to avoid delisting." },
  { cls: "CBD_WELLNESS", requiredLicence: "AYUSH", capability: "ACTIVE_RENEW", note: "Unlocked by AYUSH licence + per-batch CoA (A2). Licence expiring soon." },
  { cls: "MED_CANNABIS", requiredLicence: "STATE_DRUG", capability: "LOCKED", note: "Requires a State Drug licence and Rx dispensing infrastructure. Never advertisable (A1), regardless of licence." },
];

/* ── Finance / settlements (A6 / A3 / A5) ─────────────────── */

export const SELLER_SETTLEMENTS = [
  ...SETTLEMENTS.filter((s) => s.seller === "Vedic Botanicals"),
  { id: "st-vb-2", seller: "Vedic Botanicals", period: "1–15 Jun 2026", netPaise: 6_12_400_00, status: "POSTED", maker: "finance.rao", checker: "finance.approver.iyer" },
  { id: "st-vb-3", seller: "Vedic Botanicals", period: "16–31 May 2026", netPaise: 5_88_900_00, status: "POSTED", maker: "finance.rao", checker: "finance.approver.iyer" },
];

export const WALLET = {
  balancePaise: 1_24_600_00,
  reservedPaise: 18_400_00,
  nextPayoutDate: "2026-07-15",
};

export const PAYOUT_HISTORY = [
  { id: "po1", date: "2026-06-30", amountPaise: 6_12_400_00, status: "PAID", utr: "UTR2026063099441" },
  { id: "po2", date: "2026-06-15", amountPaise: 5_88_900_00, status: "PAID", utr: "UTR2026061587732" },
  { id: "po3", date: "2026-05-31", amountPaise: 5_41_200_00, status: "PAID", utr: "UTR2026053120981" },
];

export const COMMISSION_BREAKDOWN = {
  grossPaise: 8_45_200_00 + 1_92_000_00,
  commissionPaise: 1_23_400_00,
  gstOnCommissionPaise: 22_212_00 / 100,
  tdsPaise: 8_45_200,
  tcsPaise: 4_22_600,
  netPayablePaise: 8_45_200_00,
};

export const NEXT_FEE_CHANGE = {
  noticeSentAt: "2026-06-10",
  effectiveFrom: "2026-07-10",
  summary: "Referral fee for CBD_WELLNESS moves from 12% to 13%.",
};

/* ── Ads (A1) ──────────────────────────────────────────────── */

export interface AdCampaign {
  id: string; name: string; type: "Sponsored Product" | "Store Spotlight" | "Category Takeover";
  cls: Exclude<ComplianceClass, "MED_CANNABIS">;
  budgetPaise: number; spendPaise: number; acos: number; roas: number; status: string;
}

export const AD_CAMPAIGNS: AdCampaign[] = [
  { id: "ad1", name: "Summer Wellness — CBD Balm", type: "Sponsored Product", cls: "CBD_WELLNESS", budgetPaise: 50000_00, spendPaise: 31200_00, acos: 18.4, roas: 5.4, status: "ACTIVE" },
  { id: "ad2", name: "Store Spotlight — Vedic Botanicals", type: "Store Spotlight", cls: "CBD_WELLNESS", budgetPaise: 25000_00, spendPaise: 25000_00, acos: 22.1, roas: 4.5, status: "PAUSED" },
  { id: "ad3", name: "Ashwagandha Category Push", type: "Category Takeover", cls: "AYURVEDA", budgetPaise: 15000_00, spendPaise: 6400_00, acos: 14.0, roas: 7.1, status: "UNDER_REVIEW" },
];

export const ADS_SUMMARY = {
  impressions7d: 214_500,
  clicks7d: 3_812,
  acos7d: 19.1,
  roas7d: 5.2,
};

/* ── Marketing ─────────────────────────────────────────────── */

// Seller coupons are real: they live in the commerce coupon store (owner-tagged)
// and are rendered live on /seller/marketing from readCoupons(). No mock table.

export const BUNDLES = [
  { name: "Balm + Roll-On Duo", products: ["CBD Wellness Balm 30g", "CBD Muscle Relief Roll-On 50ml"], discountPaise: 20000, status: "ACTIVE" },
];

export const FLASH_SALES = [
  { name: "Weekend Wellness Flash Sale", window: "12–13 Jul 2026", discount: "Up to 20%", status: "SCHEDULED" },
];

// Customers: product questions come from the real Q&A store (src/lib/qa.ts)
// and store reviews from src/lib/store-reviews.ts. Response metrics are derived
// from those — no mock questions/reviews/messages or hand-typed averages.

/* ── Reports ───────────────────────────────────────────────── */

export const REPORT_TILES = [
  { key: "sales", label: "Sales report", icon: "💰", blurb: "GMV, orders, refunds by day/week/month." },
  { key: "product", label: "Product report", icon: "📦", blurb: "Views, conversion, buy-box share per SKU." },
  { key: "inventory", label: "Inventory report", icon: "🏭", blurb: "Stock ageing, FEFO risk, batch expiry." },
  { key: "advertising", label: "Advertising report", icon: "📣", blurb: "Spend, ACOS, ROAS by campaign." },
  { key: "compliance", label: "Compliance report", icon: "🛡️", blurb: "CoA status, licence validity, policy strikes." },
  { key: "custom", label: "Custom report", icon: "🧩", blurb: "Build a report from any of the fields above." },
];

/* ── Account health (Seller Home §2.1) ────────────────────── */

export const ACCOUNT_HEALTH = {
  score: SELLER.healthScore,
  subScores: [
    { key: "fulfilment", label: "Fulfilment", value: 92 },
    { key: "defect", label: "Defect rate", value: 96, note: "0.4% (target <1%)" },
    { key: "policy", label: "Policy compliance", value: 88 },
    { key: "coa", label: "CoA compliance", value: 74, note: "2 batches pending, 1 missing" },
  ],
};

export const TODAY_KPIS = {
  gmvPaise: 68_400_00,
  orders: 14,
  aovPaise: Math.round((68_400_00) / 14),
  buyBoxPercent: 91,
};

/* ── Performance series (Home / Finance / Assistant) ──────── */

/** Daily GMV in paise, trailing 7 days ending today (10 Jul 2026). */
export const GMV_7D = {
  valuesPaise: [52_300_00, 61_800_00, 48_900_00, 72_100_00, 66_400_00, 58_200_00, 68_400_00],
  labels: ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
};

/** Weekly net revenue, indexed (12 weeks) — for the finance sparkline. */
export const REVENUE_SPARK = [48, 52, 51, 58, 61, 59, 64, 66, 63, 70, 74, 72];

/** Weekly forecast GMV in paise, next 4 weeks (assistant). */
export const FORECAST_4W = {
  valuesPaise: [4_82_000_00, 5_10_000_00, 5_36_000_00, 5_62_000_00],
  labels: ["W1", "W2", "W3", "W4"],
};

/* ── Listing quality (Products) ────────────────────────────── */

export const LISTING_QUALITY: { label: string; value: number; display: string }[] = [
  { label: "Images (3+ per listing)", value: 82, display: "82%" },
  { label: "Attributes complete", value: 91, display: "91%" },
  { label: "SEO title & description", value: 68, display: "68%" },
  { label: "CoA coverage (approved batches)", value: 74, display: "74%" },
];

/* ── Fee breakdown (Finance donut) ─────────────────────────── */

export const FEE_BREAKDOWN_SEGMENTS: { label: string; paise: number }[] = [
  { label: "Referral commission", paise: COMMISSION_BREAKDOWN.commissionPaise },
  { label: "GST on commission", paise: COMMISSION_BREAKDOWN.gstOnCommissionPaise },
  { label: "TDS + TCS", paise: COMMISSION_BREAKDOWN.tdsPaise + COMMISSION_BREAKDOWN.tcsPaise },
  { label: "Shipping fees", paise: 38_500_00 },
];

/* ── Ads: placement inventory, pacing, per-campaign series ── */

export interface AdPlacement {
  key: string;
  name: string;
  blurb: string;
  estCpcPaise: number;
  pricing: "CPC" | "CPM";
  exampleCls: Exclude<ComplianceClass, "MED_CANNABIS">;
  exampleTitle: string;
  exampleEmoji: string;
}

export const AD_PLACEMENTS: AdPlacement[] = [
  { key: "sp", name: "Sponsored Products", blurb: "Keyword-targeted listing in search results and category pages.", estCpcPaise: 8_50, pricing: "CPC", exampleCls: "CBD_WELLNESS", exampleTitle: "CBD Wellness Balm 30g", exampleEmoji: "🌿" },
  { key: "sb", name: "Sponsored Brands", blurb: "Store banner with three products, above search results.", estCpcPaise: 12_00, pricing: "CPC", exampleCls: "CBD_WELLNESS", exampleTitle: "Vedic Botanicals — the CBD range", exampleEmoji: "🏪" },
  { key: "hb", name: "Homepage banner", blurb: "Hero carousel slot on the marketplace homepage. Reviewed placement.", estCpcPaise: 22_00, pricing: "CPM", exampleCls: "HEMP_FOOD", exampleTitle: "Hemp nutrition, farm to shelf", exampleEmoji: "🌾" },
  { key: "cb", name: "Category banner", blurb: "Banner atop a category listing (e.g. Wellness → Topicals).", estCpcPaise: 15_00, pricing: "CPM", exampleCls: "HEMP_FOOD", exampleTitle: "Cold-pressed hemp seed oil", exampleEmoji: "🫒" },
];

/** 7-day performance series per campaign (indexed clicks/day). */
export const CAMPAIGN_SPARKS: Record<string, number[]> = {
  ad1: [38, 44, 41, 52, 58, 54, 61],
  ad2: [22, 25, 21, 18, 12, 8, 0],
  ad3: [0, 0, 4, 9, 12, 15, 19],
};

/* ── Reports: sales by class + top products ────────────────── */

export const SALES_BY_CLASS: { cls: Exclude<ComplianceClass, "MED_CANNABIS">; paise: number }[] = [
  { cls: "CBD_WELLNESS", paise: 6_58_900_00 },
  { cls: "AYURVEDA", paise: 1_86_300_00 },
];

export const TOP_PRODUCTS_30D: { title: string; paise: number }[] = [
  { title: "CBD Wellness Balm 30g", paise: 3_12_400_00 },
  { title: "CBD Ayurvedic Tincture 10ml", paise: 2_08_100_00 },
  { title: "CBD Muscle Relief Roll-On 50ml", paise: 1_38_400_00 },
  { title: "Ashwagandha co-listed bundle", paise: 86_300_00 },
];

/* ── Storefront preview (Store & KYC) ──────────────────────── */

// Store rating/review-count come from the real store-reviews store, and the
// team roster from the real staff store — see src/app/seller/store/page.tsx.
// Only the handle and a fallback tagline are static identity here.
export const STORE_PREVIEW = {
  handle: "vedic-botanicals",
  tagline: "AYUSH-licensed CBD wellness & Ayurveda, lab-tested every batch.",
};
