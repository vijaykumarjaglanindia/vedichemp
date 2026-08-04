/**
 * VEDIC HEMP — SHIPPING & DELIVERY
 *
 * Real delivery pricing: the country is split into zones, each with a base
 * charge, a per-kg surcharge and a delivery estimate. Order weight comes from
 * the products (their weight field), so the quote reflects what's actually in
 * the cart. Free shipping kicks in above a threshold. Serviceability for
 * regulated (age-gated) classes is decided per PIN — a courier network that
 * can't do an age-checked handover in a PIN is simply not serviceable there.
 *
 * Everything here is server-authoritative; the cart shows an estimate, and
 * checkout computes the exact charge from the entered state. Rates are
 * admin-editable (the store below is the DB seam).
 */

export interface ShippingZone {
  id: string;
  name: string;
  states: string[]; // state names matched case-insensitively against the address
  basePaise: number; // covers the first kg
  perKgPaise: number; // each additional kg
  etaMinDays: number;
  etaMaxDays: number;
}

export interface ShippingSettings {
  zones: ShippingZone[];
  freeAtPaise: number;      // free shipping at/above this order subtotal
  defaultWeightGrams: number; // used when a product has no weight set
  /** CBD wellness (age-gated) can't be handed over in these PIN prefixes yet. */
  regulatedBlockedPins: string[];
}

const DEFAULT_ZONES: ShippingZone[] = [
  { id: "metro", name: "Metro & nearby", states: ["maharashtra", "delhi", "karnataka", "telangana", "gujarat", "tamil nadu"], basePaise: 40_00, perKgPaise: 20_00, etaMinDays: 2, etaMaxDays: 3 },
  { id: "national", name: "Rest of India", states: [], basePaise: 80_00, perKgPaise: 30_00, etaMinDays: 4, etaMaxDays: 6 },
  { id: "remote", name: "North-East & remote", states: ["assam", "manipur", "meghalaya", "mizoram", "nagaland", "tripura", "arunachal pradesh", "sikkim", "jammu and kashmir", "ladakh", "andaman and nicobar islands", "lakshadweep"], basePaise: 120_00, perKgPaise: 40_00, etaMinDays: 7, etaMaxDays: 9 },
];

const DEFAULTS: ShippingSettings = {
  zones: DEFAULT_ZONES,
  freeAtPaise: 5_000_00,
  defaultWeightGrams: 250,
  // Empty by default: a PIN is refused a sale only once the courier network has
  // actually been proven unable to do an age-checked handover there, and that
  // is an operator's finding to record at /admin/shipping — never a literal.
  regulatedBlockedPins: [],
};

/** What an operator may change on one zone. The zone's id and the set of zones
 *  are structural; the rates, the delivery window and the states it covers are
 *  commercial decisions. */
export interface ZoneOverride {
  basePaise?: number;
  perKgPaise?: number;
  etaMinDays?: number;
  etaMaxDays?: number;
  states?: string[];
}

declare global {
  // eslint-disable-next-line no-var
  var __vhShipping: Partial<Pick<ShippingSettings, "freeAtPaise" | "defaultWeightGrams" | "regulatedBlockedPins">> & { rates?: Record<string, ZoneOverride> } | undefined;
}

function overrides() {
  globalThis.__vhShipping ??= {};
  return globalThis.__vhShipping;
}

export async function readShipping(): Promise<ShippingSettings> {
  const o = overrides();
  const zones = DEFAULT_ZONES.map((z) => ({ ...z, ...(o.rates?.[z.id] ?? {}) }));
  return {
    zones,
    freeAtPaise: o.freeAtPaise ?? DEFAULTS.freeAtPaise,
    defaultWeightGrams: o.defaultWeightGrams ?? DEFAULTS.defaultWeightGrams,
    regulatedBlockedPins: o.regulatedBlockedPins ?? DEFAULTS.regulatedBlockedPins,
  };
}

/** A PIN prefix is 2–6 digits; anything else would silently widen the block. */
export function normalisePinPrefixes(input: string[] | string): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[\s,]+/);
  return [...new Set(raw.map((p) => p.trim()).filter((p) => /^[1-8]\d{1,5}$/.test(p)))].sort();
}

/** Admin edits a zone's base + per-kg rate, the free-shipping threshold, and
 *  the PIN prefixes the courier network cannot age-check a handover in. */
export async function writeShipping(patch: {
  rates?: Record<string, ZoneOverride>;
  freeAtPaise?: number;
  defaultWeightGrams?: number;
  regulatedBlockedPins?: string[] | string;
}): Promise<void> {
  const o = overrides();
  if (patch.rates) {
    // A window that ends before it starts, or a negative rate, is refused per
    // field rather than accepted and rendered as nonsense to a buyer.
    const clean: Record<string, ZoneOverride> = {};
    for (const [id, z] of Object.entries(patch.rates)) {
      const next: ZoneOverride = {};
      if (Number.isInteger(z.basePaise) && z.basePaise! >= 0) next.basePaise = z.basePaise;
      if (Number.isInteger(z.perKgPaise) && z.perKgPaise! >= 0) next.perKgPaise = z.perKgPaise;
      if (Number.isInteger(z.etaMinDays) && Number.isInteger(z.etaMaxDays) && z.etaMinDays! >= 1 && z.etaMaxDays! >= z.etaMinDays!) {
        next.etaMinDays = z.etaMinDays;
        next.etaMaxDays = z.etaMaxDays;
      }
      if (z.states) next.states = [...new Set(z.states.map((x) => x.trim().toLowerCase()).filter(Boolean))];
      clean[id] = { ...(o.rates?.[id] ?? {}), ...next };
    }
    o.rates = { ...(o.rates ?? {}), ...clean };
  }
  if (patch.freeAtPaise !== undefined) o.freeAtPaise = patch.freeAtPaise;
  if (patch.defaultWeightGrams !== undefined) o.defaultWeightGrams = patch.defaultWeightGrams;
  if (patch.regulatedBlockedPins !== undefined) o.regulatedBlockedPins = normalisePinPrefixes(patch.regulatedBlockedPins);
}

export async function resolveZone(destState: string | undefined, settings?: ShippingSettings): Promise<ShippingZone> {
  const s = settings ?? (await readShipping());
  const state = (destState ?? "").trim().toLowerCase();
  if (state) {
    for (const z of s.zones) if (z.states.includes(state)) return z;
  }
  return s.zones.find((z) => z.id === "national") ?? s.zones[0]!;
}

export interface ShippingQuote {
  paise: number;
  zoneName: string;
  etaMinDays: number;
  etaMaxDays: number;
  freeApplied: boolean;
  weightGrams: number;
}

/** The exact (or estimated, when destState is unknown) shipping charge. */
export async function shippingQuote(input: {
  subtotalPaise: number;
  weightGrams: number;
  destState?: string;
}): Promise<ShippingQuote> {
  const s = await readShipping();
  const zone = await resolveZone(input.destState, s);
  const kg = Math.max(1, Math.ceil(input.weightGrams / 1000));
  let paise = input.subtotalPaise === 0 ? 0 : zone.basePaise + zone.perKgPaise * (kg - 1);
  let freeApplied = false;
  if (input.subtotalPaise > 0 && input.subtotalPaise >= s.freeAtPaise) {
    paise = 0;
    freeApplied = true;
  }
  return { paise, zoneName: zone.name, etaMinDays: zone.etaMinDays, etaMaxDays: zone.etaMaxDays, freeApplied, weightGrams: input.weightGrams };
}

/** Whether a PIN can receive a given class (age-gated classes have a narrower net). */
export async function serviceability(pin: string, cls: string): Promise<{ ok: boolean; reason?: "pin" | "regulated" }> {
  if (!/^[1-8]\d{5}$/.test(pin)) return { ok: false, reason: "pin" };
  const s = await readShipping();
  if (cls === "CBD_WELLNESS" && s.regulatedBlockedPins.some((p) => pin.startsWith(p))) {
    return { ok: false, reason: "regulated" };
  }
  return { ok: true };
}

/** A human delivery estimate string ("2–3 days") for a zone. */
export function etaLabel(q: { etaMinDays: number; etaMaxDays: number }): string {
  return q.etaMinDays === q.etaMaxDays ? `${q.etaMinDays} days` : `${q.etaMinDays}–${q.etaMaxDays} days`;
}
