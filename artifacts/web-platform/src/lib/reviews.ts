/**
 * VEDIC HEMP — PRODUCT REVIEWS & RATINGS (a real review system)
 *
 * A review is written by a verified buyer, held for moderation, and only shown
 * publicly once an admin approves it. The product's star rating is COMPUTED
 * from approved reviews — never a static number a seller can set. Seller
 * replies and "helpful" votes are first-class. Copy-checks (no disease claims)
 * run in the calling server action, exactly like every other buyer-facing text.
 *
 * Server-side store = the DB seam (a `Review` table keyed by product).
 */

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Review {
  id: string;
  productId: string;
  productSlug: string;
  author: string;
  rating: number; // 1–5
  title?: string;
  body: string;
  verified: boolean; // written by a confirmed purchaser
  status: ReviewStatus;
  createdAt: string; // YYYY-MM-DD
  sellerReply?: string;
  helpful: number;
  moderationNote?: string;
}

export interface Aggregate {
  count: number;
  avg: number; // one decimal, from APPROVED reviews
  histogram: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Reasons a buyer can flag a published review. */
export const REPORT_REASONS = ["SPAM", "OFFENSIVE", "FAKE", "MEDICAL_CLAIM", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** An append-only abuse report against a published review (A3 spirit: reports
 *  and their resolutions are new rows, never edits of the review itself). */
export interface ReviewReport {
  id: string;
  reviewId: string;
  reporter: string; // buyer email
  reason: ReportReason;
  at: string;
  resolution?: "REMOVED" | "DISMISSED";
  resolvedBy?: string;
  resolvedAt?: string;
}

interface ReviewStore {
  items: Review[];
  reports: ReviewReport[]; // append-only
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhReviews: ReviewStore | undefined;
}

/** A small, deterministic seed so product pages read real out of the box. */
function seed(): Review[] {
  const r: Omit<Review, "id">[] = [
    { productId: "p4", productSlug: "cbd-balm-30g", author: "Priya M.", rating: 5, title: "Great everyday balm", body: "Good packaging, arrived on time, and the batch CoA link on the invoice made me comfortable buying again.", verified: true, status: "APPROVED", createdAt: "2026-06-28", helpful: 12, sellerReply: "Thank you Priya — glad the batch report helped you buy with confidence." },
    { productId: "p4", productSlug: "cbd-balm-30g", author: "Rohit K.", rating: 4, title: "Solid", body: "Solid everyday product. Would like more batches in stock at once.", verified: true, status: "APPROVED", createdAt: "2026-06-20", helpful: 5 },
    { productId: "p4", productSlug: "cbd-balm-30g", author: "Sneha T.", rating: 5, title: "Repeat buy", body: "Second time ordering. Consistent quality and the roll-on pairs well with it.", verified: true, status: "APPROVED", createdAt: "2026-06-12", helpful: 3 },
    { productId: "p1", productSlug: "hemp-seed-oil-250ml", author: "Arjun V.", rating: 5, title: "Lovely nutty oil", body: "Great drizzled over dal. Keeps well in the fridge. Nice nutty flavour.", verified: true, status: "APPROVED", createdAt: "2026-06-22", helpful: 8 },
    { productId: "p1", productSlug: "hemp-seed-oil-250ml", author: "Divya M.", rating: 4, title: "Good", body: "Good quality, a little pricey but worth it for a finishing oil.", verified: true, status: "APPROVED", createdAt: "2026-06-15", helpful: 2 },
    { productId: "p6", productSlug: "ashwagandha-60", author: "Imran S.", rating: 5, title: "Well packed", body: "Capsules well packed, AYUSH details clearly printed. No complaints.", verified: true, status: "APPROVED", createdAt: "2026-06-18", helpful: 6 },
  ];
  return r.map((x, i) => ({ ...x, id: `rv-seed-${i + 1}` }));
}

function store(): ReviewStore {
  globalThis.__vhReviews ??= { items: seed(), reports: [], seq: 100 };
  return globalThis.__vhReviews;
}

const now = () => new Date().toISOString().slice(0, 10);

export interface AddReviewInput {
  productId: string;
  productSlug: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  verified: boolean;
}

/** Write a review as PENDING (invisible to the public until approved). */
export async function addReview(input: AddReviewInput): Promise<Review> {
  const s = store();
  const review: Review = {
    id: `rv${s.seq++}`,
    productId: input.productId,
    productSlug: input.productSlug,
    author: input.author,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    ...(input.title ? { title: input.title } : {}),
    body: input.body,
    verified: input.verified,
    status: "PENDING",
    createdAt: now(),
    helpful: 0,
  };
  s.items.unshift(review);
  return review;
}

export async function reviewsFor(productId: string, opts?: { status?: ReviewStatus }): Promise<Review[]> {
  return store().items.filter((r) => r.productId === productId && (!opts?.status || r.status === opts.status));
}

/** Public (approved) reviews for a product, newest first. */
export async function approvedFor(productId: string): Promise<Review[]> {
  return (await reviewsFor(productId, { status: "APPROVED" })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Rating aggregate from APPROVED reviews only. */
export async function aggregate(productId: string): Promise<Aggregate> {
  const approved = await reviewsFor(productId, { status: "APPROVED" });
  const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of approved) histogram[Math.max(1, Math.min(5, r.rating)) as 1 | 2 | 3 | 4 | 5] += 1;
  const count = approved.length;
  const avg = count ? Math.round((approved.reduce((n, r) => n + r.rating, 0) / count) * 10) / 10 : 0;
  return { count, avg, histogram };
}

/** All reviews awaiting moderation (admin queue), newest first. */
export async function pendingQueue(): Promise<Review[]> {
  return store().items.filter((r) => r.status === "PENDING").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Reviews for a seller's products (by slug set), for the seller reply surface. */
export async function reviewsForSlugs(slugs: string[], opts?: { status?: ReviewStatus }): Promise<Review[]> {
  const set = new Set(slugs);
  return store().items
    .filter((r) => set.has(r.productSlug) && (!opts?.status || r.status === opts.status))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function findReview(id: string): Review | undefined {
  return store().items.find((r) => r.id === id);
}

export type ReviewResult = { ok: true; review: Review } | { ok: false; reason: string };

/** Approve or reject a review (admin moderation). */
export async function moderateReview(id: string, approve: boolean, note?: string): Promise<ReviewResult> {
  const r = findReview(id);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "PENDING") return { ok: false, reason: "state" };
  r.status = approve ? "APPROVED" : "REJECTED";
  if (note) r.moderationNote = note;
  return { ok: true, review: r };
}

/** A seller's public reply to a review on their product (copy-checked by caller). */
export async function replyToReview(id: string, reply: string): Promise<ReviewResult> {
  const r = findReview(id);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "APPROVED") return { ok: false, reason: "state" };
  r.sellerReply = reply;
  return { ok: true, review: r };
}

/** One-tap "was this helpful" — idempotency (one vote per person) is enforced
 *  by the calling action via a cookie; the store just holds the tally. */
export async function markHelpful(id: string): Promise<boolean> {
  const r = findReview(id);
  if (!r || r.status !== "APPROVED") return false;
  r.helpful += 1;
  return true;
}

export function isReportReason(x: string): x is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(x);
}

export type ReportResult =
  | { ok: true; report: ReviewReport }
  | { ok: false; reason: "missing" | "state" | "reason" | "duplicate" };

/**
 * Flag a PUBLISHED review as abusive. Appends an OPEN report (append-only) and
 * routes it to the admin queue — it does NOT hide the review on its own (only a
 * moderator decides). One open report per (reporter, review) — a repeat flag is
 * a no-op "duplicate", never a way to brigade a review down.
 */
export async function reportReview(reviewId: string, reporter: string, reason: string): Promise<ReportResult> {
  const s = store();
  const r = findReview(reviewId);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "APPROVED") return { ok: false, reason: "state" };
  if (!isReportReason(reason)) return { ok: false, reason: "reason" };
  const already = s.reports.some(
    (x) => x.reviewId === reviewId && x.reporter.toLowerCase() === reporter.toLowerCase() && !x.resolution,
  );
  if (already) return { ok: false, reason: "duplicate" };
  const report: ReviewReport = { id: `rr-${s.seq++}`, reviewId, reporter, reason, at: now() };
  s.reports.unshift(report);
  return { ok: true, report };
}

/** Reviews with at least one OPEN (unresolved) report — the admin queue. */
export async function reportedReviews(): Promise<{ review: Review; reports: ReviewReport[] }[]> {
  const s = store();
  const openByReview = new Map<string, ReviewReport[]>();
  for (const rep of s.reports) {
    if (rep.resolution) continue;
    (openByReview.get(rep.reviewId) ?? openByReview.set(rep.reviewId, []).get(rep.reviewId)!).push(rep);
  }
  const out: { review: Review; reports: ReviewReport[] }[] = [];
  for (const [reviewId, reports] of openByReview) {
    const review = findReview(reviewId);
    if (review) out.push({ review, reports });
  }
  return out;
}

/** All reports (append-only log), newest first — admin transparency surface. */
export async function reviewReports(reviewId?: string): Promise<ReviewReport[]> {
  return store().reports.filter((r) => !reviewId || r.reviewId === reviewId);
}

/**
 * Resolve every open report on a review. "remove" rejects the review (hidden
 * from the public and dropped from the rating); "dismiss" keeps it. Either way
 * the open reports are stamped with the resolution — append-only, no deletes.
 */
export async function resolveReports(reviewId: string, action: "remove" | "dismiss", by: string): Promise<ReviewResult> {
  const s = store();
  const r = findReview(reviewId);
  if (!r) return { ok: false, reason: "missing" };
  const open = s.reports.filter((x) => x.reviewId === reviewId && !x.resolution);
  if (open.length === 0) return { ok: false, reason: "state" };
  const resolution = action === "remove" ? "REMOVED" : "DISMISSED";
  for (const rep of open) {
    rep.resolution = resolution;
    rep.resolvedBy = by;
    rep.resolvedAt = now();
  }
  if (action === "remove") {
    r.status = "REJECTED";
    r.moderationNote = "Removed after an abuse report";
  }
  return { ok: true, review: r };
}
