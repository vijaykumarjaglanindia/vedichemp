import "server-only";

/**
 * VEDIC HEMP — DISPENSING / DISPATCH REGISTER (A3, append-only)
 *
 * A3: a dispensing register can never be deleted or ALTERED — a correction is a
 * NEW row referencing the old, never an edit. So this is a monotonic sequence of
 * immutable rows: every regulated (CBD/MED) order line, at the moment it is
 * DISPATCHED (the seller marks the order shipped), lands here with its batch and
 * CoA state. If a row was wrong, `correctDispense` appends a superseding row that
 * points back at it — the original stays, marked superseded.
 *
 * §6: no health data, and no full buyer identity. The destination is the STATE
 * and the PIN REGION only (first three digits); the buyer's email, name and full
 * address never enter this log. What it records is *what regulated product, from
 * which batch, went to which region, when, and who dispatched it* — the facts a
 * regulator asks for, and nothing about the patient.
 */

import { REGULATED_CLASSES } from "@/lib/catalog";
import type { ComplianceClass } from "@prisma/client";

export interface DispenseEntry {
  seq: number;
  id: string;
  at: string; // ISO datetime (minute precision)
  orderRef: string;
  seller: string; // dispatching store
  dispatcher: string; // actor string, e.g. "seller:Vedic Botanicals"
  productId: string;
  productTitle: string;
  variantId?: string; // when the regulated line was a specific variant
  variantLabel?: string; // e.g. "10 ml" — shown on the row
  cls: ComplianceClass; // regulated class only
  batchCode: string; // "" when the listing carries no batch (should not happen for a live regulated line)
  coaState: string; // CoA state at dispatch time — frozen into the record
  qty: number;
  destState: string; // buyer's state (place of supply)
  pinRegion: string; // first 3 of the PIN + "•••" — never the full pincode
  /** Set only on a CORRECTION row: the seq of the entry this supersedes, plus why. */
  correctionOf?: number;
  correctionReason?: string;
}

interface DispenseStore {
  entries: DispenseEntry[]; // append-only, newest first
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhDispensing: DispenseStore | undefined;
}

function store(): DispenseStore {
  globalThis.__vhDispensing ??= { entries: [], seq: 1 };
  return globalThis.__vhDispensing;
}

const nowIso = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export function isRegulatedClass(cls: string): boolean {
  return (REGULATED_CLASSES as readonly string[]).includes(cls);
}

/** The PIN region — first three digits only, the rest masked (§6). */
export function pinRegion(pincode: string): string {
  const p = (pincode || "").replace(/\D/g, "");
  return p.length >= 3 ? `${p.slice(0, 3)}•••` : "•••••";
}

export interface RecordDispenseInput {
  orderRef: string;
  seller: string;
  dispatcher: string;
  productId: string;
  productTitle: string;
  variantId?: string;
  variantLabel?: string;
  cls: ComplianceClass;
  batchCode: string;
  coaState: string;
  qty: number;
  destState: string;
  pincode: string;
}

/**
 * Append one dispatch row. Idempotent per (orderRef, productId): a re-dispatch
 * of the same line never double-logs — the caller (a single SHIPPED transition)
 * already guards this, and this is a second belt.
 */
export async function recordDispense(input: RecordDispenseInput): Promise<DispenseEntry | null> {
  if (!isRegulatedClass(input.cls)) return null; // only regulated lines are dispensed
  const s = store();
  // Dedup per (orderRef, productId, variantId): two different variants of the
  // same regulated product are two distinct dispatched lines, not one.
  const already = s.entries.some(
    (e) => e.orderRef === input.orderRef && e.productId === input.productId
      && (e.variantId ?? "") === (input.variantId ?? "") && e.correctionOf === undefined,
  );
  if (already) return null;
  const entry: DispenseEntry = {
    seq: s.seq++,
    id: `dsp-${Date.now().toString(36)}-${s.seq}`,
    at: nowIso(),
    orderRef: input.orderRef,
    seller: input.seller,
    dispatcher: input.dispatcher,
    productId: input.productId,
    productTitle: input.productTitle,
    ...(input.variantId ? { variantId: input.variantId } : {}),
    ...(input.variantLabel ? { variantLabel: input.variantLabel } : {}),
    cls: input.cls,
    batchCode: input.batchCode,
    coaState: input.coaState,
    qty: input.qty,
    destState: input.destState || "—",
    pinRegion: pinRegion(input.pincode),
    // no buyer email/name/full address/health data — by construction
  };
  s.entries.unshift(entry);
  return entry;
}

export function findEntry(seq: number): DispenseEntry | undefined {
  return store().entries.find((e) => e.seq === seq);
}

export type CorrectionResult = { ok: true; entry: DispenseEntry } | { ok: false; reason: "missing" | "superseded" | "reason" };

/**
 * A3 correction: append a NEW row that supersedes an earlier one. The original
 * is never edited or removed. `patch` carries the corrected batch/coa/qty; every
 * other field is copied from the original. A row can only be superseded once.
 */
export async function correctDispense(input: {
  seq: number; actor: string; reason: string; patch: Partial<Pick<DispenseEntry, "batchCode" | "coaState" | "qty">>;
}): Promise<CorrectionResult> {
  const s = store();
  const orig = findEntry(input.seq);
  if (!orig) return { ok: false, reason: "missing" };
  if (s.entries.some((e) => e.correctionOf === input.seq)) return { ok: false, reason: "superseded" };
  if (input.reason.trim().length < 8) return { ok: false, reason: "reason" };
  const entry: DispenseEntry = {
    ...orig,
    seq: s.seq++,
    id: `dsp-${Date.now().toString(36)}-${s.seq}`,
    at: nowIso(),
    dispatcher: input.actor,
    batchCode: input.patch.batchCode ?? orig.batchCode,
    coaState: input.patch.coaState ?? orig.coaState,
    qty: input.patch.qty ?? orig.qty,
    correctionOf: input.seq,
    correctionReason: input.reason.trim(),
  };
  s.entries.unshift(entry);
  return { ok: true, entry };
}

/** The full immutable register, newest first. */
export async function dispenseRegister(limit = 200): Promise<DispenseEntry[]> {
  return store().entries.slice(0, limit);
}

/** Seqs that have been superseded by a later correction (rendered struck-through). */
export async function supersededSeqs(): Promise<Set<number>> {
  const set = new Set<number>();
  for (const e of store().entries) if (e.correctionOf !== undefined) set.add(e.correctionOf);
  return set;
}
