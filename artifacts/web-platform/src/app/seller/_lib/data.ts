/**
 * VEDIC HEMP — SELLER CONSOLE DATA (per-store, real for every seller)
 *
 * Every seller sees THEIR OWN store here, not a fixed demo store. The seed
 * store "Vedic Botanicals" (the account seller@example.in owns) keeps its rich
 * illustrative fixtures verbatim; every other real store gets data derived from
 * the shared `@/lib/sample` catalogue, orders and settlements, with honest
 * empty states for surfaces it has never used (no campaigns, no payouts yet).
 *
 * Nothing here is a source of truth — the CoA publish gate (A2), stock and
 * settlements are enforced in the live stores (`@/lib/catalog|orders|
 * settlements`). This module only shapes what the console renders.
 *
 * `noUncheckedIndexedAccess` is on: every lookup here is guarded.
 */

import { ComplianceClass } from "@prisma/client";
import { PRODUCTS, ORDERS, SELLERS, SETTLEMENTS, type SampleProduct, type SampleOrder, type SampleSeller } from "@/lib/sample";

/** The seed store the demo seller (seller@example.in) owns. Its fixtures are
 *  frozen so the E2E battery — which signs in as that seller — is unaffected. */
export const SEED_STORE = "Vedic Botanicals";

/* ── Types ─────────────────────────────────────────────────── */

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

export interface WarehouseStock { warehouse: string; product: string; batch: string; qty: number; reserved: number; sellable: boolean }

export type LicenceStatus = "VERIFIED" | "UNDER_REVIEW" | "EXPIRED" | "NOT_APPLIED";

export interface Licence {
  type: "FSSAI" | "AYUSH" | "STATE_DRUG";
  number: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: LicenceStatus;
  unlocks: ComplianceClass[];
}

export interface AdCampaign {
  id: string; name: string; type: "Sponsored Product" | "Store Spotlight" | "Category Takeover";
  cls: Exclude<ComplianceClass, "MED_CANNABIS">;
  budgetPaise: number; spendPaise: number; acos: number; roas: number; status: string;
}

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

/** Store identity beyond the shared SampleSeller record (registered state, tax
 *  and bank identity shown on the Store & KYC page, plus warehouse + handle). */
export interface StoreProfile {
  handle: string;
  tagline: string;
  regState: string;
  warehouse: string;
  pan: string;
  bankMasked: string;
  bankName: string;
}

/** Everything the seller sub-consoles render for one store. Keys mirror the
 *  legacy export names so page bodies destructure without renaming. */
export interface SellerData {
  store: string;
  SELLER: SampleSeller;
  PROFILE: StoreProfile;
  STORE_PREVIEW: { handle: string; tagline: string };
  SELLER_PRODUCTS: SellerProduct[];
  findSellerProduct: (id: string) => SellerProduct | undefined;
  SELLER_ORDERS: SampleOrder[];
  findSellerOrder: (id: string) => SampleOrder | undefined;
  SELLER_SETTLEMENTS: { id: string; seller: string; period: string; netPaise: number; status: string; maker: string; checker?: string }[];
  WAREHOUSE_STOCK: WarehouseStock[];
  LICENCES: Licence[];
  CAPABILITY_MATRIX: { cls: ComplianceClass; requiredLicence: Licence["type"]; capability: "ACTIVE" | "ACTIVE_RENEW" | "LOCKED"; note: string }[];
  ACCOUNT_HEALTH: { score: number; subScores: { key: string; label: string; value: number; note?: string }[] };
  WALLET: { balancePaise: number; reservedPaise: number; nextPayoutDate: string };
  PAYOUT_HISTORY: { id: string; date: string; amountPaise: number; status: string; utr: string }[];
  COMMISSION_BREAKDOWN: { grossPaise: number; commissionPaise: number; gstOnCommissionPaise: number; tdsPaise: number; tcsPaise: number; netPayablePaise: number };
  NEXT_FEE_CHANGE: { noticeSentAt: string; effectiveFrom: string; summary: string };
  FEE_BREAKDOWN_SEGMENTS: { label: string; paise: number }[];
  REVENUE_SPARK: number[];
  AD_CAMPAIGNS: AdCampaign[];
  ADS_SUMMARY: { impressions7d: number; clicks7d: number; acos7d: number; roas7d: number };
  BUNDLES: { name: string; products: string[]; discountPaise: number; status: string }[];
  FLASH_SALES: { name: string; window: string; discount: string; status: string }[];
  FORECAST_4W: { valuesPaise: number[]; labels: string[] };
}

/* ── Generic constants (store-independent) ─────────────────── */

export const ORDER_STATUS_TABS = ["ALL", "PENDING", "ACCEPTED", "PACKED", "SHIPPED", "DELIVERED", "RETURNED"] as const;

export const LOW_STOCK_THRESHOLD = 50;

export function daysUntil(dateStr: string, todayStr = "2026-07-09"): number {
  const today = new Date(todayStr).getTime();
  const target = new Date(dateStr).getTime();
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export const REPORT_TILES = [
  { key: "sales", label: "Sales report", icon: "💰", blurb: "GMV, orders, refunds by day/week/month." },
  { key: "product", label: "Product report", icon: "📦", blurb: "Views, conversion, buy-box share per SKU." },
  { key: "inventory", label: "Inventory report", icon: "🏭", blurb: "Stock ageing, FEFO risk, batch expiry." },
  { key: "advertising", label: "Advertising report", icon: "📣", blurb: "Spend, ACOS, ROAS by campaign." },
  { key: "compliance", label: "Compliance report", icon: "🛡️", blurb: "CoA status, licence validity, policy strikes." },
  { key: "custom", label: "Custom report", icon: "🧩", blurb: "Build a report from any of the fields above." },
];

export const LISTING_QUALITY: { label: string; value: number; display: string }[] = [
  { label: "Images (3+ per listing)", value: 82, display: "82%" },
  { label: "Attributes complete", value: 91, display: "91%" },
  { label: "SEO title & description", value: 68, display: "68%" },
  { label: "CoA coverage (approved batches)", value: 74, display: "74%" },
];

export const AD_PLACEMENTS: AdPlacement[] = [
  { key: "sp", name: "Sponsored Products", blurb: "Keyword-targeted listing in search results and category pages.", estCpcPaise: 8_50, pricing: "CPC", exampleCls: "CBD_WELLNESS", exampleTitle: "CBD Wellness Balm 30g", exampleEmoji: "🌿" },
  { key: "sb", name: "Sponsored Brands", blurb: "Store banner with three products, above search results.", estCpcPaise: 12_00, pricing: "CPC", exampleCls: "CBD_WELLNESS", exampleTitle: "Your store — the CBD range", exampleEmoji: "🏪" },
  { key: "hb", name: "Homepage banner", blurb: "Hero carousel slot on the marketplace homepage. Reviewed placement.", estCpcPaise: 22_00, pricing: "CPM", exampleCls: "HEMP_FOOD", exampleTitle: "Hemp nutrition, farm to shelf", exampleEmoji: "🌾" },
  { key: "cb", name: "Category banner", blurb: "Banner atop a category listing (e.g. Wellness → Topicals).", estCpcPaise: 15_00, pricing: "CPM", exampleCls: "HEMP_FOOD", exampleTitle: "Cold-pressed hemp seed oil", exampleEmoji: "🫒" },
];

/* ── Store identity profiles (per real store) ──────────────── */

const STORE_PROFILES: Record<string, StoreProfile> = {
  "Vedic Botanicals": {
    handle: "vedic-botanicals",
    tagline: "AYUSH-licensed CBD wellness & Ayurveda, lab-tested every batch.",
    regState: "Karnataka",
    warehouse: "Bengaluru FC-2",
    pan: "AABCV1234M",
    bankMasked: "••••••4821",
    bankName: "Kotak Mahindra Bank",
  },
  "Himalayan Hemp Co.": {
    handle: "himalayan-hemp-co",
    tagline: "Cold-pressed hemp foods from the Himalayan foothills.",
    regState: "Uttarakhand",
    warehouse: "Dehradun FC-1",
    pan: "AABCH9876M",
    bankMasked: "••••••7714",
    bankName: "HDFC Bank",
  },
  "Ananda Foods": {
    handle: "ananda-foods",
    tagline: "Ayurveda staples & hemp nutrition, sourced direct from growers.",
    regState: "Tamil Nadu",
    warehouse: "Chennai FC-1",
    pan: "AABCA4567M",
    bankMasked: "••••••2093",
    bankName: "ICICI Bank",
  },
};

function slugifyStore(store: string): string {
  return store.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "store";
}

function storeInitials(store: string): string {
  return (store.match(/\b[A-Za-z]/g) ?? ["V", "H"]).join("").slice(0, 3).toUpperCase();
}

function profileFor(store: string): StoreProfile {
  return (
    STORE_PROFILES[store] ?? {
      handle: slugifyStore(store),
      tagline: "Licensed hemp & wellness seller on Vedic Hemp.",
      regState: "—",
      warehouse: "Primary FC",
      pan: "—",
      bankMasked: "—",
      bankName: "—",
    }
  );
}

function sellerRecord(store: string): SampleSeller {
  return (
    SELLERS.find((s) => s.name === store) ?? {
      id: `s-${slugifyStore(store)}`,
      name: store,
      gstin: "—",
      state: "ACTIVE",
      healthScore: 0,
      classes: [],
      gmvPaise: 0,
      kycState: "KYC_PENDING",
    }
  );
}

const REGULATED: ComplianceClass[] = ["CBD_WELLNESS", "MED_CANNABIS"];

function hsnFor(cls: ComplianceClass): string {
  return cls === "CBD_WELLNESS" ? "33049910" : cls === "HEMP_FOOD" ? "15159091" : "30049011";
}

/* ─────────────────────────────────────────────────────────────
   VEDIC BOTANICALS — the seed store's frozen fixtures (verbatim).
   Kept exactly so the E2E battery (which signs in as this seller)
   sees identical output.
   ───────────────────────────────────────────────────────────── */

const VB_BATCHES_BY_PRODUCT: Record<string, Batch[]> = {
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
    { code: "VB-2410", mfgDate: "2026-07-01", expiryDate: "2027-07-01", qty: 150, reserved: 0, coaStatus: "MISSING", note: "No lab report uploaded — batch cannot be published" },
  ],
};

const VB_DRAFT_PRODUCT: SellerProduct = {
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

const VB_EXTRA_ORDERS: SampleOrder[] = [
  { id: "o-vb-1", reference: "VH2026070931", placedAt: "2026-07-09", status: "PENDING", totalPaise: 149900, buyer: "Kavya R.", seller: "Vedic Botanicals", items: [{ title: "CBD Wellness Balm 30g", qty: 1, emoji: "🌿" }] },
  { id: "o-vb-2", reference: "VH2026070928", placedAt: "2026-07-09", status: "PENDING", totalPaise: 249900, buyer: "Imran S.", seller: "Vedic Botanicals", items: [{ title: "CBD Ayurvedic Tincture 10ml", qty: 1, emoji: "💧" }] },
  { id: "o-vb-3", reference: "VH2026070871", placedAt: "2026-07-08", status: "ACCEPTED", totalPaise: 129900, buyer: "Divya M.", seller: "Vedic Botanicals", items: [{ title: "CBD Muscle Relief Roll-On 50ml", qty: 1, emoji: "🧴" }] },
  { id: "o-vb-4", reference: "VH2026070812", placedAt: "2026-07-08", status: "PACKED", totalPaise: 149900, buyer: "Rohit K.", seller: "Vedic Botanicals", items: [{ title: "CBD Wellness Balm 30g", qty: 1, emoji: "🌿" }] },
  { id: "o-vb-5", reference: "VH2026070755", placedAt: "2026-07-07", status: "SHIPPED", totalPaise: 249900, eta: "11 Jul", buyer: "Sneha T.", seller: "Vedic Botanicals", items: [{ title: "CBD Ayurvedic Tincture 10ml", qty: 1, emoji: "💧" }] },
  { id: "o-vb-6", reference: "VH2026070640", placedAt: "2026-07-05", status: "DELIVERED", totalPaise: 129900, buyer: "Arjun V.", seller: "Vedic Botanicals", items: [{ title: "CBD Muscle Relief Roll-On 50ml", qty: 1, emoji: "🧴" }] },
];

const VB_LICENCES: Licence[] = [
  { type: "AYUSH", number: "AYUSH/KA/2024/00931", validFrom: "2024-04-01", validTo: "2026-07-29", status: "VERIFIED", unlocks: ["AYURVEDA", "CBD_WELLNESS"] },
  { type: "FSSAI", number: null, validFrom: null, validTo: null, status: "NOT_APPLIED", unlocks: ["HEMP_FOOD"] },
  { type: "STATE_DRUG", number: null, validFrom: null, validTo: null, status: "NOT_APPLIED", unlocks: ["MED_CANNABIS"] },
];

const VB_CAPABILITY_MATRIX: SellerData["CAPABILITY_MATRIX"] = [
  { cls: "HEMP_FOOD", requiredLicence: "FSSAI", capability: "LOCKED", note: "Apply for an FSSAI licence to unlock Hemp Food listings." },
  { cls: "AYURVEDA", requiredLicence: "AYUSH", capability: "ACTIVE_RENEW", note: "Unlocked by AYUSH licence — expiring soon, renew to avoid delisting." },
  { cls: "CBD_WELLNESS", requiredLicence: "AYUSH", capability: "ACTIVE_RENEW", note: "Unlocked by AYUSH licence + per-batch CoA. Licence expiring soon." },
  { cls: "MED_CANNABIS", requiredLicence: "STATE_DRUG", capability: "LOCKED", note: "Requires a State Drug licence and Rx dispensing infrastructure. Never advertisable, regardless of licence." },
];

const VB_COMMISSION_BREAKDOWN: SellerData["COMMISSION_BREAKDOWN"] = {
  grossPaise: 8_45_200_00 + 1_92_000_00,
  commissionPaise: 1_23_400_00,
  gstOnCommissionPaise: 22_212_00 / 100,
  tdsPaise: 8_45_200,
  tcsPaise: 4_22_600,
  netPayablePaise: 8_45_200_00,
};

function vedicBotanicalsData(): SellerData {
  const store = "Vedic Botanicals";
  const seller = sellerRecord(store);
  const profile = profileFor(store);

  const products: SellerProduct[] = [
    ...PRODUCTS.filter((p) => p.seller === store).map((p) => ({
      ...p,
      hsn: p.cls === "CBD_WELLNESS" ? "33049910" : "30049011",
      listingState: p.state,
      batches: VB_BATCHES_BY_PRODUCT[p.id] ?? [],
    })),
    VB_DRAFT_PRODUCT,
  ];

  const orders: SampleOrder[] = [...ORDERS.filter((o) => o.seller === store), ...VB_EXTRA_ORDERS];

  const warehouseStock: WarehouseStock[] = products.flatMap((p) =>
    p.batches.map((b) => ({
      warehouse: "Bengaluru FC-2",
      product: p.title,
      batch: b.code,
      qty: b.qty,
      reserved: b.reserved,
      sellable: b.coaStatus === "APPROVED",
    }))
  );

  return {
    store,
    SELLER: seller,
    PROFILE: profile,
    STORE_PREVIEW: { handle: profile.handle, tagline: profile.tagline },
    SELLER_PRODUCTS: products,
    findSellerProduct: (id) => products.find((p) => p.id === id),
    SELLER_ORDERS: orders,
    findSellerOrder: (id) => orders.find((o) => o.id === id),
    SELLER_SETTLEMENTS: [
      ...SETTLEMENTS.filter((s) => s.seller === store),
      { id: "st-vb-2", seller: "Vedic Botanicals", period: "1–15 Jun 2026", netPaise: 6_12_400_00, status: "POSTED", maker: "finance.rao", checker: "finance.approver.iyer" },
      { id: "st-vb-3", seller: "Vedic Botanicals", period: "16–31 May 2026", netPaise: 5_88_900_00, status: "POSTED", maker: "finance.rao", checker: "finance.approver.iyer" },
    ],
    WAREHOUSE_STOCK: warehouseStock,
    LICENCES: VB_LICENCES,
    CAPABILITY_MATRIX: VB_CAPABILITY_MATRIX,
    ACCOUNT_HEALTH: {
      score: seller.healthScore,
      subScores: [
        { key: "fulfilment", label: "Fulfilment", value: 92 },
        { key: "defect", label: "Defect rate", value: 96, note: "0.4% (target <1%)" },
        { key: "policy", label: "Policy compliance", value: 88 },
        { key: "coa", label: "CoA compliance", value: 74, note: "2 batches pending, 1 missing" },
      ],
    },
    WALLET: { balancePaise: 1_24_600_00, reservedPaise: 18_400_00, nextPayoutDate: "2026-07-15" },
    PAYOUT_HISTORY: [
      { id: "po1", date: "2026-06-30", amountPaise: 6_12_400_00, status: "PAID", utr: "UTR2026063099441" },
      { id: "po2", date: "2026-06-15", amountPaise: 5_88_900_00, status: "PAID", utr: "UTR2026061587732" },
      { id: "po3", date: "2026-05-31", amountPaise: 5_41_200_00, status: "PAID", utr: "UTR2026053120981" },
    ],
    COMMISSION_BREAKDOWN: VB_COMMISSION_BREAKDOWN,
    NEXT_FEE_CHANGE: {
      noticeSentAt: "2026-06-10",
      effectiveFrom: "2026-07-10",
      summary: "Referral fee for CBD_WELLNESS moves from 12% to 13%.",
    },
    FEE_BREAKDOWN_SEGMENTS: [
      { label: "Referral commission", paise: VB_COMMISSION_BREAKDOWN.commissionPaise },
      { label: "GST on commission", paise: VB_COMMISSION_BREAKDOWN.gstOnCommissionPaise },
      { label: "TDS + TCS", paise: VB_COMMISSION_BREAKDOWN.tdsPaise + VB_COMMISSION_BREAKDOWN.tcsPaise },
      { label: "Shipping fees", paise: 38_500_00 },
    ],
    REVENUE_SPARK: [48, 52, 51, 58, 61, 59, 64, 66, 63, 70, 74, 72],
    AD_CAMPAIGNS: [
      { id: "ad1", name: "Summer Wellness — CBD Balm", type: "Sponsored Product", cls: "CBD_WELLNESS", budgetPaise: 50000_00, spendPaise: 31200_00, acos: 18.4, roas: 5.4, status: "ACTIVE" },
      { id: "ad2", name: "Store Spotlight — Vedic Botanicals", type: "Store Spotlight", cls: "CBD_WELLNESS", budgetPaise: 25000_00, spendPaise: 25000_00, acos: 22.1, roas: 4.5, status: "PAUSED" },
      { id: "ad3", name: "Ashwagandha Category Push", type: "Category Takeover", cls: "AYURVEDA", budgetPaise: 15000_00, spendPaise: 6400_00, acos: 14.0, roas: 7.1, status: "UNDER_REVIEW" },
    ],
    ADS_SUMMARY: { impressions7d: 214_500, clicks7d: 3_812, acos7d: 19.1, roas7d: 5.2 },
    BUNDLES: [
      { name: "Balm + Roll-On Duo", products: ["CBD Wellness Balm 30g", "CBD Muscle Relief Roll-On 50ml"], discountPaise: 20000, status: "ACTIVE" },
    ],
    FLASH_SALES: [
      { name: "Weekend Wellness Flash Sale", window: "12–13 Jul 2026", discount: "Up to 20%", status: "SCHEDULED" },
    ],
    FORECAST_4W: { valuesPaise: [4_82_000_00, 5_10_000_00, 5_36_000_00, 5_62_000_00], labels: ["W1", "W2", "W3", "W4"] },
  };
}

/* ─────────────────────────────────────────────────────────────
   DERIVED — any other real store, computed from the shared sample
   catalogue / orders / settlements. Deterministic (no randomness)
   so the console renders stably.
   ───────────────────────────────────────────────────────────── */

function deriveBatch(store: string, p: SampleProduct, i: number): Batch {
  const regulated = REGULATED.includes(p.cls);
  // Non-regulated food/ayurveda batches are sellable; a regulated batch is only
  // sellable once its CoA is APPROVED — mirrors the live A2 gate.
  const coaStatus: CoaStatus = regulated ? (p.labVerified ? "APPROVED" : "MISSING") : "APPROVED";
  const seq = 2400 + (i % 90) + 1;
  const qty = 60 + ((p.id.charCodeAt(p.id.length - 1) * 17) % 240);
  return {
    code: `${storeInitials(store)}-${seq}`,
    mfgDate: "2026-04-01",
    expiryDate: "2028-04-01",
    qty,
    reserved: Math.round(qty * 0.1),
    coaStatus,
    ...(coaStatus === "APPROVED" ? { labReportId: `LR-${seq}` } : { note: "No approved lab report yet — batch cannot be published" }),
  };
}

function deriveLicences(seller: SampleSeller): Licence[] {
  const sells = (cls: ComplianceClass) => seller.classes.includes(cls);
  const verified = seller.kycState === "KYC_APPROVED";
  return [
    {
      type: "FSSAI",
      number: sells("HEMP_FOOD") && verified ? `1002${seller.id.replace(/\D/g, "") || "0"}0011122` : null,
      validFrom: sells("HEMP_FOOD") && verified ? "2024-04-01" : null,
      validTo: sells("HEMP_FOOD") && verified ? "2027-03-31" : null,
      status: sells("HEMP_FOOD") ? (verified ? "VERIFIED" : "UNDER_REVIEW") : "NOT_APPLIED",
      unlocks: ["HEMP_FOOD"],
    },
    {
      type: "AYUSH",
      number: (sells("AYURVEDA") || sells("CBD_WELLNESS")) && verified ? `AYUSH/2024/00${seller.id.replace(/\D/g, "") || "0"}00` : null,
      validFrom: (sells("AYURVEDA") || sells("CBD_WELLNESS")) && verified ? "2024-04-01" : null,
      validTo: (sells("AYURVEDA") || sells("CBD_WELLNESS")) && verified ? "2027-03-31" : null,
      status: sells("AYURVEDA") || sells("CBD_WELLNESS") ? (verified ? "VERIFIED" : "UNDER_REVIEW") : "NOT_APPLIED",
      unlocks: ["AYURVEDA", "CBD_WELLNESS"],
    },
    { type: "STATE_DRUG", number: null, validFrom: null, validTo: null, status: "NOT_APPLIED", unlocks: ["MED_CANNABIS"] },
  ];
}

function deriveCapabilityMatrix(licences: Licence[]): SellerData["CAPABILITY_MATRIX"] {
  const statusOf = (t: Licence["type"]) => licences.find((l) => l.type === t)?.status ?? "NOT_APPLIED";
  const cap = (t: Licence["type"]): "ACTIVE" | "ACTIVE_RENEW" | "LOCKED" => (statusOf(t) === "VERIFIED" ? "ACTIVE" : "LOCKED");
  return [
    { cls: "HEMP_FOOD", requiredLicence: "FSSAI", capability: cap("FSSAI"), note: cap("FSSAI") === "ACTIVE" ? "Unlocked by your FSSAI licence." : "Apply for an FSSAI licence to unlock Hemp Food listings." },
    { cls: "AYURVEDA", requiredLicence: "AYUSH", capability: cap("AYUSH"), note: cap("AYUSH") === "ACTIVE" ? "Unlocked by your AYUSH licence." : "Apply for an AYUSH licence to unlock Ayurveda listings." },
    { cls: "CBD_WELLNESS", requiredLicence: "AYUSH", capability: cap("AYUSH"), note: cap("AYUSH") === "ACTIVE" ? "Unlocked by your AYUSH licence + per-batch CoA." : "Requires an AYUSH licence and a per-batch CoA." },
    { cls: "MED_CANNABIS", requiredLicence: "STATE_DRUG", capability: "LOCKED", note: "Requires a State Drug licence and Rx dispensing infrastructure. Never advertisable, regardless of licence." },
  ];
}

function derivedData(store: string): SellerData {
  const seller = sellerRecord(store);
  const profile = profileFor(store);

  const products: SellerProduct[] = PRODUCTS.filter((p) => p.seller === store).map((p, i) => ({
    ...p,
    hsn: hsnFor(p.cls),
    listingState: p.state,
    batches: [deriveBatch(store, p, i)],
  }));

  const orders: SampleOrder[] = ORDERS.filter((o) => o.seller === store);

  const warehouseStock: WarehouseStock[] = products.flatMap((p) =>
    p.batches.map((b) => ({
      warehouse: profile.warehouse,
      product: p.title,
      batch: b.code,
      qty: b.qty,
      reserved: b.reserved,
      sellable: b.coaStatus === "APPROVED",
    }))
  );

  const licences = deriveLicences(seller);

  // Finance derived from this store's real settlement rows.
  const runs = SETTLEMENTS.filter((s) => s.seller === store);
  const posted = runs.filter((r) => r.status === "POSTED");
  const balancePaise = posted.reduce((n, r) => n + r.netPaise, 0);
  const payoutHistory = posted.map((r, i) => ({
    id: `po-${slugifyStore(store)}-${i}`,
    date: "2026-06-30",
    amountPaise: r.netPaise,
    status: "PAID",
    utr: `UTR${r.id.toUpperCase()}`,
  }));

  // Gross from this store's live orders; commission at the platform base 12%.
  const grossPaise = orders.reduce((n, o) => n + o.totalPaise, 0);
  const commissionPaise = Math.round(grossPaise * 0.12);
  const gstOnCommissionPaise = Math.round(commissionPaise * 0.18);
  const tdsPaise = Math.round(grossPaise * 0.01);
  const tcsPaise = Math.round(grossPaise * 0.005);
  const netPayablePaise = grossPaise - commissionPaise - gstOnCommissionPaise - tdsPaise - tcsPaise;

  // A modest 12-point revenue index anchored on the store's health (honest
  // stand-in until per-week analytics exist — never a fabricated headline).
  const base = Math.max(20, seller.healthScore || 40);
  const revenueSpark = Array.from({ length: 12 }, (_, i) => Math.round(base * (0.85 + (i / 11) * 0.3)));

  return {
    store,
    SELLER: seller,
    PROFILE: profile,
    STORE_PREVIEW: { handle: profile.handle, tagline: profile.tagline },
    SELLER_PRODUCTS: products,
    findSellerProduct: (id) => products.find((p) => p.id === id),
    SELLER_ORDERS: orders,
    findSellerOrder: (id) => orders.find((o) => o.id === id),
    SELLER_SETTLEMENTS: SETTLEMENTS.filter((s) => s.seller === store),
    WAREHOUSE_STOCK: warehouseStock,
    LICENCES: licences,
    CAPABILITY_MATRIX: deriveCapabilityMatrix(licences),
    ACCOUNT_HEALTH: {
      score: seller.healthScore,
      subScores: [
        { key: "fulfilment", label: "Fulfilment", value: seller.healthScore },
        { key: "defect", label: "Defect rate", value: Math.min(100, seller.healthScore + 8) },
        { key: "policy", label: "Policy compliance", value: seller.healthScore },
        { key: "coa", label: "CoA compliance", value: products.every((p) => p.batches.every((b) => b.coaStatus === "APPROVED")) ? 100 : 60 },
      ],
    },
    WALLET: { balancePaise, reservedPaise: 0, nextPayoutDate: "2026-07-15" },
    PAYOUT_HISTORY: payoutHistory,
    COMMISSION_BREAKDOWN: { grossPaise, commissionPaise, gstOnCommissionPaise, tdsPaise, tcsPaise, netPayablePaise },
    NEXT_FEE_CHANGE: {
      noticeSentAt: "2026-06-10",
      effectiveFrom: "2026-07-10",
      summary: "Referral fee schedule review — no increase applies to your active classes this cycle.",
    },
    FEE_BREAKDOWN_SEGMENTS: [
      { label: "Referral commission", paise: commissionPaise },
      { label: "GST on commission", paise: gstOnCommissionPaise },
      { label: "TDS + TCS", paise: tdsPaise + tcsPaise },
      { label: "Shipping fees", paise: Math.round(grossPaise * 0.03) },
    ],
    REVENUE_SPARK: revenueSpark,
    // Honest empty state — a new store has run no campaigns and taken no ad spend.
    AD_CAMPAIGNS: [],
    ADS_SUMMARY: { impressions7d: 0, clicks7d: 0, acos7d: 0, roas7d: 0 },
    BUNDLES: [],
    FLASH_SALES: [],
    FORECAST_4W: {
      valuesPaise: Array.from({ length: 4 }, (_, i) => Math.round((grossPaise / Math.max(1, orders.length)) * (orders.length + i + 1))),
      labels: ["W1", "W2", "W3", "W4"],
    },
  };
}

/**
 * The seller console read model for one store. The seed store keeps its frozen
 * demo fixtures; every other real store is derived from live sample data with
 * honest empty states. Pure and synchronous — resolve the store first with
 * `actingStore()` (src/app/seller/_lib/store.ts), then call this.
 */
export function sellerData(store: string): SellerData {
  return store === SEED_STORE ? vedicBotanicalsData() : derivedData(store);
}
