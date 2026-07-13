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
  pct: number;
  capPaise: number;
  minPaise: number;
  cls?: string;
  freeShip?: boolean;
  label: string;
  /** false = admin-disabled (a launch coupon can be switched off, not deleted). */
  enabled: boolean;
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
export async function writeCoupon(code: string, def: CouponDef): Promise<void> {
  globalThis.__vhCoupons = { ...(globalThis.__vhCoupons ?? {}), [code]: def };
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
