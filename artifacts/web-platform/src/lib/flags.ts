/**
 * VEDIC HEMP — PLATFORM FEATURE FLAGS (A6 maker–checker on every change)
 *
 * The settings page promises: "feature flags … are all proposed by one admin
 * and confirmed by a second, different admin before they apply." This store
 * enforces it: a flag NEVER flips directly. One admin PROPOSES a change
 * (maker), a DIFFERENT admin confirms or rejects it (checker), and only a
 * confirmed change applies. The maker confirming their own proposal is refused
 * with a machine reason the action layer audits as DENIED — configuration is a
 * money-and-eligibility surface too, so it gets the same A6 treatment as a
 * settlement.
 *
 * Structural note: no flag here gates a prohibition. A1–A6 are absences in the
 * codebase, not runtime toggles — a flag named for one would be a design
 * defect, and the unit suite asserts the registry never contains one.
 *
 * Distinct from src/lib/features.ts (the storefront cosmetic switchboard):
 * these are PLATFORM capabilities. Server-side store = the DB seam
 * (FeatureFlag + FlagChange tables; PRODUCTION.md).
 */

export interface PlatformFlag {
  key: string;
  desc: string;
  on: boolean;
}

export interface FlagProposal {
  id: string;
  key: string;
  to: boolean; // proposed new state
  maker: string;
  at: string;
}

export interface FlagChange {
  key: string;
  to: boolean;
  maker: string;
  checker: string;
  approved: boolean;
  at: string;
}

interface FlagStore {
  flags: PlatformFlag[];
  pending: FlagProposal[];
  log: FlagChange[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhPlatformFlags: FlagStore | undefined;
}

/**
 * The registry. Every key here gates a capability that EXISTS in the codebase
 * and is read at the point of use — a flag whose name describes a feature
 * nobody wrote is a lie in a control panel. Adding a key without a consumer is
 * the defect this list is kept short to avoid.
 *
 * No key gates a prohibition: A1–A6 are absences, not toggles.
 */
function seed(): FlagStore {
  return {
    flags: [
      { key: "seller_store_connect", desc: "Sellers may connect an external store and import its catalogue themselves", on: true },
      { key: "buyer_subscriptions", desc: "Buyers may set up a repeating order (subscribe & save)", on: true },
    ],
    pending: [],
    log: [],
    seq: 1,
  };
}

/**
 * Is a capability switched on? Unknown keys read as ON: a flag is a way to
 * turn something OFF deliberately, never an accidental kill switch for a
 * capability nobody registered.
 */
export async function capabilityOn(key: string): Promise<boolean> {
  return store().flags.find((f) => f.key === key)?.on ?? true;
}

function store(): FlagStore {
  globalThis.__vhPlatformFlags ??= seed();
  return globalThis.__vhPlatformFlags;
}

export async function listFlags(): Promise<PlatformFlag[]> {
  return store().flags.map((f) => ({ ...f }));
}

export async function listPendingFlagChanges(): Promise<FlagProposal[]> {
  return store().pending.map((p) => ({ ...p }));
}

export async function flagChangeLog(limit = 20): Promise<FlagChange[]> {
  return store().log.slice(0, limit);
}

export type ProposeResult =
  | { ok: true; proposal: FlagProposal }
  | { ok: false; reason: "missing" | "pending" };

/** MAKER: propose flipping a flag. One open proposal per flag; nothing applies here. */
export async function proposeFlagChange(key: string, maker: string): Promise<ProposeResult> {
  const s = store();
  const flag = s.flags.find((f) => f.key === key);
  if (!flag) return { ok: false, reason: "missing" };
  if (s.pending.some((p) => p.key === key)) return { ok: false, reason: "pending" };
  const proposal: FlagProposal = { id: `fc-${s.seq++}`, key, to: !flag.on, maker, at: new Date().toISOString() };
  s.pending.push(proposal);
  return { ok: true, proposal };
}

export type DecideResult =
  | { ok: true; proposal: FlagProposal; approved: boolean }
  | { ok: false; reason: "missing" | "maker" };

/**
 * CHECKER: confirm or reject a pending change. The maker can never be the
 * checker (A6) — that refusal is the whole point of this store.
 */
export async function decideFlagChange(id: string, checker: string, approve: boolean): Promise<DecideResult> {
  const s = store();
  const idx = s.pending.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, reason: "missing" };
  const proposal = s.pending[idx]!;
  if (proposal.maker.toLowerCase() === checker.toLowerCase()) return { ok: false, reason: "maker" };

  s.pending.splice(idx, 1);
  if (approve) {
    const flag = s.flags.find((f) => f.key === proposal.key);
    if (flag) flag.on = proposal.to;
  }
  s.log.unshift({ key: proposal.key, to: proposal.to, maker: proposal.maker, checker, approved: approve, at: new Date().toISOString() });
  return { ok: true, proposal, approved: approve };
}
