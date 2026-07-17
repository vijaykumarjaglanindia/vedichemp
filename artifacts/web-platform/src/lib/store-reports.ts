import "server-only";

/**
 * VEDIC HEMP — STORE ABUSE REPORTS (A3 append-only)
 *
 * A buyer can flag a whole STOREFRONT (distinct from a single listing or
 * review): counterfeit branding, misleading storefront copy, or — the serious
 * one — a seller soliciting payment OFF the platform (which strips every buyer
 * protection). Reports are append-only; one open report per (reporter, store),
 * so a store can't be brigaded. A report never hides the store on its own — a
 * moderator decides (dismiss, or acknowledge & escalate to compliance). The
 * resolution is stamped onto the open reports; nothing is deleted.
 */

export const STORE_REPORT_REASONS = ["COUNTERFEIT", "MISLEADING", "OFF_PLATFORM", "PROHIBITED_ITEM", "OTHER"] as const;
export type StoreReportReason = (typeof STORE_REPORT_REASONS)[number];

export interface StoreReport {
  id: string;
  storeSlug: string;
  storeName: string;
  reporter: string; // buyer email
  reason: StoreReportReason;
  at: string;
  resolution?: "DISMISSED" | "ACTIONED";
  resolvedBy?: string;
  resolvedAt?: string;
}

interface StoreReportStore {
  reports: StoreReport[]; // append-only
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhStoreReports: StoreReportStore | undefined;
}

function store(): StoreReportStore {
  globalThis.__vhStoreReports ??= { reports: [], seq: 1 };
  return globalThis.__vhStoreReports;
}

const today = () => new Date().toISOString().slice(0, 10);

export function isStoreReportReason(x: string): x is StoreReportReason {
  return (STORE_REPORT_REASONS as readonly string[]).includes(x);
}

export type StoreReportResult =
  | { ok: true; report: StoreReport }
  | { ok: false; reason: "reason" | "duplicate" };

export async function reportStore(input: { storeSlug: string; storeName: string; reporter: string; reason: string }): Promise<StoreReportResult> {
  const s = store();
  if (!isStoreReportReason(input.reason)) return { ok: false, reason: "reason" };
  const already = s.reports.some(
    (x) => x.storeSlug === input.storeSlug && x.reporter.toLowerCase() === input.reporter.toLowerCase() && !x.resolution,
  );
  if (already) return { ok: false, reason: "duplicate" };
  const report: StoreReport = {
    id: `sr-${s.seq++}`,
    storeSlug: input.storeSlug,
    storeName: input.storeName,
    reporter: input.reporter,
    reason: input.reason,
    at: today(),
  };
  s.reports.unshift(report);
  return { ok: true, report };
}

/** Stores with at least one OPEN report — the admin queue. */
export async function reportedStores(): Promise<{ storeSlug: string; storeName: string; reports: StoreReport[] }[]> {
  const open = store().reports.filter((r) => !r.resolution);
  const byStore = new Map<string, { storeSlug: string; storeName: string; reports: StoreReport[] }>();
  for (const r of open) {
    const entry = byStore.get(r.storeSlug) ?? { storeSlug: r.storeSlug, storeName: r.storeName, reports: [] };
    entry.reports.push(r);
    byStore.set(r.storeSlug, entry);
  }
  return [...byStore.values()];
}

export async function storeReports(slug?: string): Promise<StoreReport[]> {
  return store().reports.filter((r) => !slug || r.storeSlug === slug);
}

export type ResolveResult = { ok: true; count: number } | { ok: false; reason: "state" };

/** Resolve every open report on a store. "dismiss" keeps the store; "action"
 *  acknowledges it (the caller escalates to compliance / audits). Append-only. */
export async function resolveStoreReports(slug: string, action: "dismiss" | "action", by: string): Promise<ResolveResult> {
  const s = store();
  const open = s.reports.filter((r) => r.storeSlug === slug && !r.resolution);
  if (open.length === 0) return { ok: false, reason: "state" };
  const resolution = action === "action" ? "ACTIONED" : "DISMISSED";
  for (const r of open) {
    r.resolution = resolution;
    r.resolvedBy = by;
    r.resolvedAt = today();
  }
  return { ok: true, count: open.length };
}
