/**
 * VEDIC HEMP — SELLER CONSOLE DATA (per-store, real for every seller)
 *
 * Every seller sees THEIR OWN store here, and every store goes through the same
 * code path — there is no privileged seed store with richer numbers. What this
 * module holds is store IDENTITY: the storefront handle and tagline, the
 * licences on the live vendor KYC record, and the compliance classes those
 * licences unlock.
 *
 * It holds nothing transactional. Orders, stock, earnings, settlements and ad
 * results are read from their own live stores by the page that renders them —
 * there is no copy here to drift out of date, and no seeded figure that could
 * be mistaken for a real one.
 *
 * `noUncheckedIndexedAccess` is on: every lookup here is guarded.
 */

import { ComplianceClass } from "@prisma/client";
import { SELLERS, type SampleSeller } from "@/lib/sample";
import { kycFor, licenceExpired, type VendorKyc } from "@/lib/vendor";


/* ── Types ─────────────────────────────────────────────────── */

export type LicenceStatus = "VERIFIED" | "UNDER_REVIEW" | "EXPIRED" | "NOT_APPLIED";

export interface Licence {
  type: "FSSAI" | "AYUSH" | "STATE_DRUG";
  number: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: LicenceStatus;
  unlocks: ComplianceClass[];
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

/** What the seller sub-consoles read for one store: identity, the licences on
 *  its KYC record, and what those licences unlock. Everything transactional —
 *  orders, stock, money, ads — is read from its own live store by the page that
 *  renders it, never copied through here. */
export interface SellerData {
  store: string;
  SELLER: SampleSeller;
  PROFILE: StoreProfile;
  STORE_PREVIEW: { handle: string; tagline: string };
  LICENCES: Licence[];
  CAPABILITY_MATRIX: { cls: ComplianceClass; requiredLicence: Licence["type"]; capability: "ACTIVE" | "ACTIVE_RENEW" | "LOCKED"; note: string }[];
  ACCOUNT_HEALTH: { score: number; subScores: { key: string; label: string; value: number; note?: string }[] };
}

/* ── Generic constants (store-independent) ─────────────────── */

const DAY_MS = 86_400_000;

/** Whole days from today (IST-anchored) until an ISO date. Negative = past. */
export function daysUntil(dateStr: string, todayStr?: string): number {
  const from = todayStr ? new Date(`${todayStr}T00:00:00+05:30`).getTime() : Date.now();
  const target = new Date(`${dateStr}T00:00:00+05:30`).getTime();
  return Math.ceil((target - from) / DAY_MS);
}

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
 * Store identity for one store. Pure and synchronous — resolve the store first
 * with `actingStore()` (src/app/seller/_lib/store.ts), then call this. Anything
 * transactional lives in its own async store; the page that renders it reads
 * that store directly rather than taking a copy from here.
 */
export function sellerData(store: string): SellerData {
  const seller = sellerRecord(store);
  const profile = profileFor(store);
  const licences = licencesFrom(kycFor(store));

  return {
    store,
    SELLER: seller,
    PROFILE: profile,
    STORE_PREVIEW: { handle: profile.handle, tagline: profile.tagline },
    LICENCES: licences,
    CAPABILITY_MATRIX: capabilityFrom(licences),
    ACCOUNT_HEALTH: {
      score: seller.healthScore,
      // The CoA row is computed live by the dashboard from this store's open A2
      // blockers; fulfilment/defect/policy scoring does not exist yet, and an
      // invented score is worse than no score.
      subScores: [{ key: "coa", label: "CoA compliance", value: 0 }],
    },
  };
}
