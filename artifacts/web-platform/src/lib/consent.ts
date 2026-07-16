import "server-only";

/**
 * VEDIC HEMP — CONSENT LEDGER (append-only)
 *
 * Consent changes are EVENTS, never a mutable flag: each grant or withdrawal
 * appends an immutable row, so the full history is always reproducible (what
 * the DPDP export and a regulator need). The current resolution is derived
 * from the latest event per purpose; the ledger itself is never edited.
 *
 * Store = the DB seam (a `ConsentEvent` table keyed by buyer email).
 */

export type ConsentPurpose = "analytics" | "personalisation" | "marketing";
export const CONSENT_PURPOSES: ConsentPurpose[] = ["analytics", "personalisation", "marketing"];

/** Defaults before any explicit choice (marketing is opt-IN). */
export const CONSENT_DEFAULTS: Record<ConsentPurpose, boolean> = {
  analytics: true, personalisation: true, marketing: false,
};

export interface ConsentEvent {
  id: string;
  at: string; // ISO datetime
  user: string; // buyer email
  purpose: ConsentPurpose;
  granted: boolean;
  actor: string; // who made the change (the buyer)
  source: string; // e.g. "profile"
}

interface ConsentStore {
  events: Record<string, ConsentEvent[]>; // email → append-only events
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhConsent: ConsentStore | undefined;
}

function store(): ConsentStore {
  globalThis.__vhConsent ??= { events: {}, seq: 1 };
  return globalThis.__vhConsent;
}

const key = (email: string) => email.toLowerCase();
const nowIso = () => new Date().toISOString().slice(0, 19).replace("T", " ");

export function isPurpose(v: string): v is ConsentPurpose {
  return (CONSENT_PURPOSES as string[]).includes(v);
}

export async function appendConsent(user: string, purpose: ConsentPurpose, granted: boolean, actor: string, source = "profile"): Promise<ConsentEvent> {
  const s = store();
  const k = key(user);
  s.events[k] ??= [];
  const ev: ConsentEvent = { id: `cn-${s.seq++}`, at: nowIso(), user, purpose, granted, actor, source };
  s.events[k]!.push(ev);
  return ev;
}

export async function consentHistory(user: string): Promise<ConsentEvent[]> {
  return [...(store().events[key(user)] ?? [])];
}

/** The current resolution — latest event per purpose, else the default. */
export async function currentConsent(user: string): Promise<Record<ConsentPurpose, boolean>> {
  const events = store().events[key(user)] ?? [];
  const out = { ...CONSENT_DEFAULTS };
  for (const p of CONSENT_PURPOSES) {
    const last = [...events].reverse().find((e) => e.purpose === p);
    if (last) out[p] = last.granted;
  }
  return out;
}
