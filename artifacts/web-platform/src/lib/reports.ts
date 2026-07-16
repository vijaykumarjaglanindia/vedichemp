import "server-only";

/**
 * VEDIC HEMP — LISTING REPORTS (buyer trust & safety)
 *
 * A shopper can report a listing for a policy concern — a counterfeit, the
 * wrong category, prohibited medical claims, something unsafe. Reports land in
 * an admin queue; the platform can dismiss a report (with a reason) or uphold
 * it, and upholding suspends the listing through the same server guard the
 * catalogue moderation uses. Every decision is audited.
 *
 * Store = the DB seam (a `ListingReport` table). Reports are trust-and-safety
 * records: like other safety records they are corrected by new rows, not edited
 * away (CLAUDE.md A3 spirit) — a decision sets status and appends a note.
 */

export type ReportReason =
  | "COUNTERFEIT"
  | "WRONG_CATEGORY"
  | "PROHIBITED_CLAIMS"
  | "UNSAFE"
  | "OFFENSIVE"
  | "OTHER";

export type ReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";

export interface ListingReport {
  id: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  seller: string;
  reason: ReportReason;
  detail: string;
  reporter: string; // buyer email or "guest"
  status: ReportStatus;
  createdAt: string;
  decidedAt?: string;
  adminNote?: string;
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "COUNTERFEIT", label: "Looks counterfeit or not genuine" },
  { value: "WRONG_CATEGORY", label: "Listed in the wrong category" },
  { value: "PROHIBITED_CLAIMS", label: "Makes medical claims it shouldn't" },
  { value: "UNSAFE", label: "Safety concern with the product" },
  { value: "OFFENSIVE", label: "Offensive or inappropriate content" },
  { value: "OTHER", label: "Something else" },
];

export function reasonLabel(r: ReportReason): string {
  return REPORT_REASONS.find((x) => x.value === r)?.label ?? r;
}

interface ReportStore {
  items: ListingReport[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhListingReports: ReportStore | undefined;
}

function store(): ReportStore {
  globalThis.__vhListingReports ??= { items: [], seq: 1 };
  return globalThis.__vhListingReports;
}

export function isReason(v: string): v is ReportReason {
  return REPORT_REASONS.some((r) => r.value === v);
}

export async function addReport(input: {
  productId: string;
  productSlug: string;
  productTitle: string;
  seller: string;
  reason: ReportReason;
  detail: string;
  reporter: string;
}): Promise<ListingReport> {
  const s = store();
  const report: ListingReport = {
    id: `rp${s.seq++}`,
    productId: input.productId,
    productSlug: input.productSlug,
    productTitle: input.productTitle,
    seller: input.seller,
    reason: input.reason,
    detail: input.detail,
    reporter: input.reporter,
    status: "OPEN",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  s.items.unshift(report);
  return report;
}

export async function openReports(): Promise<ListingReport[]> {
  return store().items.filter((r) => r.status === "OPEN");
}

export async function allReports(): Promise<ListingReport[]> {
  return [...store().items].sort((a, b) => {
    // Open first, then most recent.
    if ((a.status === "OPEN") !== (b.status === "OPEN")) return a.status === "OPEN" ? -1 : 1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/** How many OPEN reports name a given listing — surfaced to admin moderation. */
export async function openReportCountByProduct(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const r of store().items) if (r.status === "OPEN") counts[r.productId] = (counts[r.productId] ?? 0) + 1;
  return counts;
}

export function findReport(id: string): ListingReport | undefined {
  return store().items.find((r) => r.id === id);
}

export type DecideResult = { ok: true; report: ListingReport } | { ok: false; reason: string };

/** Uphold or dismiss an OPEN report. Decision is terminal for that report. */
export async function decideReport(id: string, uphold: boolean, note?: string): Promise<DecideResult> {
  const r = findReport(id);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "OPEN") return { ok: false, reason: "state" };
  r.status = uphold ? "ACTIONED" : "DISMISSED";
  r.decidedAt = new Date().toISOString().slice(0, 10);
  if (note) r.adminNote = note;
  return { ok: true, report: r };
}

/** When a report is upheld, every other OPEN report on the same listing is
 *  resolved as ACTIONED too — the listing has already been dealt with. */
export async function resolveOthersForProduct(productId: string, exceptId: string, note: string): Promise<void> {
  for (const r of store().items) {
    if (r.productId === productId && r.status === "OPEN" && r.id !== exceptId) {
      r.status = "ACTIONED";
      r.decidedAt = new Date().toISOString().slice(0, 10);
      r.adminNote = note;
    }
  }
}
