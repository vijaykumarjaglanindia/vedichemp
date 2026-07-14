/**
 * VEDIC HEMP — COMMERCE SETTINGS (the owner's levers)
 *
 * Every business number is an admin setting: shipping thresholds, loyalty
 * and referral economics, gift-card codes, the buyer coupon table, and the
 * display copy of each category. What is NOT here, by design: compliance
 * flags (rxRequired / ageGated / advertisable) — those are the law's, not
 * the owner's. Server-side stores; DB seam throughout.
 */

export interface CommerceSettings {
  freeShipAtPaise: number;
  flatShipPaise: number;
  loyaltyPtsPer100: number;
  loyaltyPtsValuePaise: number; // value of 100 points, in paise
  referralCreditPaise: number;
}

export const COMMERCE_DEFAULTS: CommerceSettings = {
  freeShipAtPaise: 5_000_00,
  flatShipPaise: 100_00,
  loyaltyPtsPer100: 5,
  loyaltyPtsValuePaise: 10_00,
  referralCreditPaise: 200_00,
};

export interface CouponDef {
  pct: number;              // percentage discount (0 when fixed-amount or free-ship only)
  fixedPaise?: number;      // flat discount in paise (takes precedence over pct)
  capPaise: number;         // max discount for a % coupon (0 = no cap)
  minPaise: number;         // minimum eligible spend
  cls?: string;             // restrict to one compliance class
  freeShip?: boolean;
  label: string;
  /** false = admin-disabled (a launch coupon can be switched off, not deleted). */
  enabled: boolean;
  validTo?: string;         // YYYY-MM-DD inclusive expiry
  usageLimit?: number;      // total redemptions allowed across all buyers
  usedCount?: number;       // redemptions so far
  owner?: string;           // "platform" or the seller store name that created it
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/** A coupon is live if it's enabled, not past its expiry, and under its usage cap. */
export function couponLive(c: CouponDef): boolean {
  if (!c.enabled) return false;
  if (c.validTo && todayStr() > c.validTo) return false;
  if (c.usageLimit !== undefined && (c.usedCount ?? 0) >= c.usageLimit) return false;
  return true;
}

export type CouponCheck =
  | { ok: true; def: CouponDef }
  | { ok: false; reason: "unknown" | "disabled" | "expired" | "exhausted" };

/** Why a code is or isn't usable right now (drives specific buyer messaging). */
export async function checkCoupon(code: string): Promise<CouponCheck> {
  const def = (await readCoupons())[code];
  if (!def) return { ok: false, reason: "unknown" };
  if (!def.enabled) return { ok: false, reason: "disabled" };
  if (def.validTo && todayStr() > def.validTo) return { ok: false, reason: "expired" };
  if (def.usageLimit !== undefined && (def.usedCount ?? 0) >= def.usageLimit) return { ok: false, reason: "exhausted" };
  return { ok: true, def };
}

export const LAUNCH_COUPONS: Record<string, CouponDef> = {
  VEDIC10: { pct: 10, capPaise: 200_00, minPaise: 0, label: "10% off up to ₹200", enabled: true },
  FLAT15: { pct: 15, capPaise: 1_000_00, minPaise: 999_00, cls: "CBD_WELLNESS", label: "15% off CBD Wellness over ₹999", enabled: true },
  FREESHIP499: { pct: 0, capPaise: 0, minPaise: 499_00, cls: "HEMP_FOOD", freeShip: true, label: "Free shipping on Hemp Food over ₹499", enabled: true },
  MONSOON15: { pct: 15, capPaise: 500_00, minPaise: 0, label: "15% off up to ₹500", enabled: true },
};

export const DEFAULT_GIFT_CARDS: Record<string, number> = {
  "VEDIC-GIFT-500": 500_00,
  "VEDIC-GIFT-1000": 1_000_00,
};

declare global {
  // eslint-disable-next-line no-var
  var __vhCommerce: Partial<CommerceSettings> | undefined;
  // eslint-disable-next-line no-var
  var __vhCoupons: Record<string, CouponDef> | undefined;
  // eslint-disable-next-line no-var
  var __vhGiftCards: Record<string, number> | undefined;
}

export async function readCommerce(): Promise<CommerceSettings> {
  return { ...COMMERCE_DEFAULTS, ...(globalThis.__vhCommerce ?? {}) };
}
export async function writeCommerce(patch: Partial<CommerceSettings>): Promise<void> {
  globalThis.__vhCommerce = { ...(globalThis.__vhCommerce ?? {}), ...patch };
}

/** Launch coupons overlaid with admin creations/edits/disables. */
export async function readCoupons(): Promise<Record<string, CouponDef>> {
  return { ...LAUNCH_COUPONS, ...(globalThis.__vhCoupons ?? {}) };
}
export async function readActiveCoupons(): Promise<Record<string, CouponDef>> {
  return Object.fromEntries(Object.entries(await readCoupons()).filter(([, c]) => c.enabled));
}
/** Enabled AND not expired AND not exhausted — what a buyer can actually use. */
export async function readLiveCoupons(): Promise<Record<string, CouponDef>> {
  return Object.fromEntries(Object.entries(await readCoupons()).filter(([, c]) => couponLive(c)));
}
export async function writeCoupon(code: string, def: CouponDef): Promise<void> {
  globalThis.__vhCoupons = { ...(globalThis.__vhCoupons ?? {}), [code]: def };
}

/** Record one redemption (called at checkout). Copies launch coupons into the
 *  override store so their usage is tracked too. */
export async function redeemCoupon(code: string): Promise<void> {
  const def = (await readCoupons())[code];
  if (!def) return;
  await writeCoupon(code, { ...def, usedCount: (def.usedCount ?? 0) + 1 });
}

export async function readGiftCards(): Promise<Record<string, number>> {
  return { ...DEFAULT_GIFT_CARDS, ...(globalThis.__vhGiftCards ?? {}) };
}
export async function addGiftCard(code: string, paise: number): Promise<void> {
  globalThis.__vhGiftCards = { ...(globalThis.__vhGiftCards ?? {}), [code]: paise };
}

/* ── Category display copy (compliance flags stay locked) ─────────── */

export interface ClassDisplay {
  label?: string;
  short?: string;
  blurb?: string;
  emoji?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhClassDisplay: Record<string, ClassDisplay> | undefined;
}

export function classDisplayOverride(cls: string): ClassDisplay {
  return globalThis.__vhClassDisplay?.[cls] ?? {};
}
export async function writeClassDisplay(cls: string, d: ClassDisplay): Promise<void> {
  globalThis.__vhClassDisplay = { ...(globalThis.__vhClassDisplay ?? {}), [cls]: d };
}
