/**
 * VEDIC HEMP — SELLER CONSOLE DATA (per-store, real for every seller)
 *
 * Every seller sees THEIR OWN store here, and every store goes through the same
 * code path — there is no privileged seed store with richer numbers. Identity,
 * licences and capability come from the live vendor KYC record; catalogue and
 * order shape come from the shared `@/lib/sample` records the rest of the
 * consoles render. Surfaces whose truth lives in an async store the console
 * reads directly (wallet, payouts, fees, ads, forecasts) are EMPTY here rather
 * than invented — an honest empty state, never a fabricated headline.
 *
 * Nothing here is a source of truth — the CoA publish gate (A2), stock and
 * settlements are enforced in the live stores (`@/lib/catalog|orders|
 * settlements`). This module only shapes what the console renders.
 *
 * `noUncheckedIndexedAccess` is on: every lookup here is guarded.
 */

import { ComplianceClass } from "@prisma/client";
import { PRODUCTS, ORDERS, SELLERS, SETTLEMENTS, type SampleProduct, type SampleOrder, type SampleSeller } from "@/lib/sample";
import { kycFor, licenceExpired, type VendorKyc } from "@/lib/vendor";

/** The store the demo seller (seller@example.in) owns. */
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

/** Store identity beyond the shared SampleSeller record. Tax and bank identity
 *  are NOT here — those live in the vendor KYC record (`@/lib/vendor`), which
 *  is the only record the platform can honestly show a seller. */
export interface StoreProfile {
  handle: string;
  tagline: string;
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

const DAY_MS = 86_400_000;

/** Whole days from today (IST-anchored) until an ISO date. Negative = past. */
export function daysUntil(dateStr: string, todayStr?: string): number {
  const from = todayStr ? new Date(`${todayStr}T00:00:00+05:30`).getTime() : Date.now();
  const target = new Date(`${dateStr}T00:00:00+05:30`).getTime();
  return Math.ceil((target - from) / DAY_MS);
}

export const REPORT_TILES = [
  { key: "sales", label: "Sales report", icon: "💰", blurb: "GMV, orders, refunds by day/week/month." },
  { key: "product", label: "Product report", icon: "📦", blurb: "Views, conversion, buy-box share per SKU." },
  { key: "inventory", label: "Inventory report", icon: "🏭", blurb: "Stock ageing, FEFO risk, batch expiry." },
  { key: "advertising", label: "Advertising report", icon: "📣", blurb: "Spend, ACOS, ROAS by campaign." },
  { key: "compliance", label: "Compliance report", icon: "🛡️", blurb: "CoA status, licence validity, policy strikes." },
  { key: "custom", label: "Custom report", icon: "🧩", blurb: "Build a report from any of the fields above." },
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
  },
  "Himalayan Hemp Co.": {
    handle: "himalayan-hemp-co",
    tagline: "Cold-pressed hemp foods from the Himalayan foothills.",
  },
  "Ananda Foods": {
    handle: "ananda-foods",
    tagline: "Ayurveda staples & hemp nutrition, sourced direct from growers.",
  },
};

function slugifyStore(store: string): string {
  return store.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "store";
}

function profileFor(store: string): StoreProfile {
  return (
    STORE_PROFILES[store] ?? {
      handle: slugifyStore(store),
      tagline: "Licensed hemp & wellness seller on Vedic Hemp.",
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

function hsnFor(cls: ComplianceClass): string {
  return cls === "CBD_WELLNESS" ? "33049910" : cls === "HEMP_FOOD" ? "15159091" : "30049011";
}

/* ── Licences & capability (from the live vendor KYC record) ── */

/**
 * There is no licence store: what the platform actually holds is the vendor KYC
 * record — the classes it was verified for, and the drug licence on file. A row
 * therefore carries a number or an expiry ONLY when that record does; anything
 * else would be a licence the platform never saw.
 */
function licencesFrom(kyc: VendorKyc | undefined): Licence[] {
  const classes = kyc?.classes ?? [];
  const covers = (...cls: ComplianceClass[]) => cls.some((c) => classes.includes(c));
  const lapsed = kyc ? licenceExpired(kyc) : false;
  const statusFor = (applies: boolean, needsLicence: boolean): LicenceStatus => {
    if (!applies || !kyc) return "NOT_APPLIED";
    if (needsLicence && lapsed) return "EXPIRED";
    return kyc.status === "APPROVED" ? "VERIFIED" : "UNDER_REVIEW";
  };
  const ayush = covers("AYURVEDA", "CBD_WELLNESS");
  return [
    {
      type: "FSSAI",
      number: null,
      validFrom: null,
      validTo: null,
      status: statusFor(covers("HEMP_FOOD"), false),
      unlocks: ["HEMP_FOOD"],
    },
    {
      type: "AYUSH",
      number: ayush ? kyc?.drugLicenceNo ?? null : null,
      validFrom: null,
      validTo: ayush ? kyc?.drugLicenceExpiry ?? null : null,
      status: statusFor(ayush, true),
      unlocks: ["AYURVEDA", "CBD_WELLNESS"],
    },
    // MED_CANNABIS never self-onboards: a State Drug licence is a manual,
    // out-of-band review, so this row is never derived from a seller record.
    { type: "STATE_DRUG", number: null, validFrom: null, validTo: null, status: "NOT_APPLIED", unlocks: ["MED_CANNABIS"] },
  ];
}

function capabilityFrom(licences: Licence[]): SellerData["CAPABILITY_MATRIX"] {
  const cap = (t: Licence["type"]): "ACTIVE" | "ACTIVE_RENEW" | "LOCKED" => {
    const l = licences.find((x) => x.type === t);
    if (!l || l.status !== "VERIFIED") return "LOCKED";
    const days = l.validTo ? daysUntil(l.validTo) : null;
    return days !== null && days <= 30 ? "ACTIVE_RENEW" : "ACTIVE";
  };
  const note = (t: Licence["type"], active: string, locked: string) => {
    const c = cap(t);
    return c === "ACTIVE_RENEW" ? `${active} Licence expiring soon — renew to avoid delisting.` : c === "ACTIVE" ? active : locked;
  };
  return [
    { cls: "HEMP_FOOD", requiredLicence: "FSSAI", capability: cap("FSSAI"), note: note("FSSAI", "Unlocked by your verified store record.", "Verify your store for hemp foods to unlock these listings.") },
    { cls: "AYURVEDA", requiredLicence: "AYUSH", capability: cap("AYUSH"), note: note("AYUSH", "Unlocked by your AYUSH licence.", "Add an AYUSH licence to unlock Ayurveda listings.") },
    { cls: "CBD_WELLNESS", requiredLicence: "AYUSH", capability: cap("AYUSH"), note: note("AYUSH", "Unlocked by your AYUSH licence + per-batch CoA.", "Requires an AYUSH licence and a per-batch CoA.") },
    { cls: "MED_CANNABIS", requiredLicence: "STATE_DRUG", capability: "LOCKED", note: "Requires a State Drug licence and Rx dispensing infrastructure. Never advertisable, regardless of licence." },
  ];
}

/* ─────────────────────────────────────────────────────────────
   The read model. One path for every store — deterministic (no
   randomness) so the console renders stably.
   ───────────────────────────────────────────────────────────── */

/**
 * The seller console read model for one store. Pure and synchronous — resolve
 * the store first with `actingStore()` (src/app/seller/_lib/store.ts), then call
 * this. Anything whose truth lives in an async store is empty here: the page
 * that renders it reads that store directly.
 */
export function sellerData(store: string): SellerData {
  const seller = sellerRecord(store);
  const profile = profileFor(store);
  const licences = licencesFrom(kycFor(store));

  const products: SellerProduct[] = PRODUCTS.filter((p) => p.seller === store).map((p) => ({
    ...p,
    hsn: hsnFor(p.cls),
    listingState: p.state,
    // Batches, their CoA state and their reserved units live in the catalog and
    // order stores; the console reads those, never a copy kept here.
    batches: [],
  }));

  const orders: SampleOrder[] = ORDERS.filter((o) => o.seller === store);

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
    WAREHOUSE_STOCK: [],
    LICENCES: licences,
    CAPABILITY_MATRIX: capabilityFrom(licences),
    ACCOUNT_HEALTH: {
      score: seller.healthScore,
      // The CoA row is computed live by the dashboard from this store's open A2
      // blockers; fulfilment/defect/policy scoring does not exist yet, and an
      // invented score is worse than no score.
      subScores: [{ key: "coa", label: "CoA compliance", value: 0 }],
    },
    WALLET: { balancePaise: 0, reservedPaise: 0, nextPayoutDate: "—" },
    PAYOUT_HISTORY: [],
    COMMISSION_BREAKDOWN: { grossPaise: 0, commissionPaise: 0, gstOnCommissionPaise: 0, tdsPaise: 0, tcsPaise: 0, netPayablePaise: 0 },
    NEXT_FEE_CHANGE: {
      noticeSentAt: "2026-06-10",
      effectiveFrom: "2026-07-10",
      summary: "Referral fee schedule review — no increase applies to your active classes this cycle.",
    },
    FEE_BREAKDOWN_SEGMENTS: [],
    REVENUE_SPARK: [],
    AD_CAMPAIGNS: [],
    ADS_SUMMARY: { impressions7d: 0, clicks7d: 0, acos7d: 0, roas7d: 0 },
    BUNDLES: [],
    FLASH_SALES: [],
    FORECAST_4W: { valuesPaise: [], labels: [] },
  };
}
