import "server-only";

/**
 * VEDIC HEMP — STORE (SELLER) REVIEWS
 *
 * A buyer can review a STORE — its packaging, dispatch speed, service — not
 * only an individual product. The store's headline rating is COMPUTED from
 * approved reviews (never a number a seller can set); a seller can reply in
 * public but can neither edit nor remove a review, and every new review lands
 * in moderation first.
 *
 * Store = the DB seam (a `StoreReview` table keyed by store slug).
 */

export type StoreReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface StoreReview {
  id: string;
  slug: string; // store slug (e.g. "vedic-botanicals")
  store: string; // store display name
  author: string;
  authorEmail: string;
  rating: number; // 1–5
  body: string;
  verified: boolean; // the buyer has an order from this store
  status: StoreReviewStatus;
  createdAt: string; // ISO date
  sellerReply?: string;
}

export interface StoreAggregate {
  avg: number;
  count: number;
  histogram: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface StoreReviewStore {
  items: StoreReview[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhStoreReviews: StoreReviewStore | undefined;
}

function seed(): StoreReviewStore {
  const items: StoreReview[] = [
    { id: "sr1", slug: "vedic-botanicals", store: "Vedic Botanicals", author: "Priya M.", authorEmail: "priya@example.in", rating: 5, body: "Order arrived in two days, sealed and neatly packed. The batch report was linked on the invoice — I trust this store.", verified: true, status: "APPROVED", createdAt: "2026-06-30", sellerReply: "Thank you Priya — we link the CoA on every dispatch." },
    { id: "sr2", slug: "vedic-botanicals", store: "Vedic Botanicals", author: "Rohit K.", authorEmail: "rohit@example.in", rating: 4, body: "Good service and quick replies to my question before ordering. Would like faster restocks.", verified: true, status: "APPROVED", createdAt: "2026-06-22" },
    { id: "sr3", slug: "vedic-botanicals", store: "Vedic Botanicals", author: "Sneha T.", authorEmail: "sneha@example.in", rating: 5, body: "Third order from this store. Consistent quality and careful packaging every time.", verified: true, status: "APPROVED", createdAt: "2026-06-14" },
    { id: "sr4", slug: "vedic-botanicals", store: "Vedic Botanicals", author: "Imran S.", authorEmail: "imran@example.in", rating: 4, body: "Reliable dispatch and clear labelling. Happy overall.", verified: true, status: "APPROVED", createdAt: "2026-06-05" },
    { id: "sr5", slug: "himalayan-hemp-co", store: "Himalayan Hemp Co.", author: "Arjun V.", authorEmail: "arjun@example.in", rating: 5, body: "Fresh cold-pressed oil, well sealed. Farm-traceable sourcing is a nice touch.", verified: true, status: "APPROVED", createdAt: "2026-06-24" },
    { id: "sr6", slug: "himalayan-hemp-co", store: "Himalayan Hemp Co.", author: "Divya M.", authorEmail: "divya@example.in", rating: 4, body: "Good store, careful packing. Delivery was a day late but kept me updated.", verified: true, status: "APPROVED", createdAt: "2026-06-16" },
    { id: "sr7", slug: "ananda-foods", store: "Ananda Foods", author: "Kavya R.", authorEmail: "kavya@example.in", rating: 5, body: "Full ingredient disclosure on every label. Ordered churnas twice, both perfect.", verified: true, status: "APPROVED", createdAt: "2026-06-19" },
  ];
  return { items, seq: items.length + 1 };
}

function store(): StoreReviewStore {
  globalThis.__vhStoreReviews ??= seed();
  return globalThis.__vhStoreReviews;
}

export interface AddStoreReviewInput {
  slug: string;
  store: string;
  author: string;
  authorEmail: string;
  rating: number;
  body: string;
  verified: boolean;
}

export async function addStoreReview(input: AddStoreReviewInput): Promise<StoreReview> {
  const s = store();
  const review: StoreReview = {
    id: `sr${s.seq++}`,
    slug: input.slug,
    store: input.store,
    author: input.author,
    authorEmail: input.authorEmail,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    body: input.body,
    verified: input.verified,
    status: "PENDING",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  s.items.unshift(review);
  return review;
}

export async function storeReviewsBySlug(slug: string, opts?: { status?: StoreReviewStatus }): Promise<StoreReview[]> {
  return store().items
    .filter((r) => r.slug === slug && (!opts?.status || r.status === opts.status))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function approvedStoreReviews(slug: string): Promise<StoreReview[]> {
  return storeReviewsBySlug(slug, { status: "APPROVED" });
}

/** Headline rating — computed from APPROVED reviews only (never seller-set). */
export async function storeAggregate(slug: string): Promise<StoreAggregate> {
  const approved = await storeReviewsBySlug(slug, { status: "APPROVED" });
  const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of approved) histogram[r.rating as 1 | 2 | 3 | 4 | 5]++;
  const count = approved.length;
  const avg = count ? approved.reduce((n, r) => n + r.rating, 0) / count : 0;
  return { avg: Math.round(avg * 10) / 10, count, histogram };
}

/** Reviews across a set of a seller's store slugs (seller reply surface). */
export async function storeReviewsForSlugs(slugs: string[], opts?: { status?: StoreReviewStatus }): Promise<StoreReview[]> {
  const set = new Set(slugs);
  return store().items
    .filter((r) => set.has(r.slug) && (!opts?.status || r.status === opts.status))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function pendingStoreQueue(): Promise<StoreReview[]> {
  return store().items.filter((r) => r.status === "PENDING").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function findStoreReview(id: string): StoreReview | undefined {
  return store().items.find((r) => r.id === id);
}

export async function moderateStoreReview(id: string, approve: boolean): Promise<StoreReview | null> {
  const r = findStoreReview(id);
  if (!r || r.status !== "PENDING") return null;
  r.status = approve ? "APPROVED" : "REJECTED";
  return r;
}

/** Seller replies in public. A reply never changes the rating. */
export async function replyStoreReview(id: string, reply: string): Promise<StoreReview | null> {
  const r = findStoreReview(id);
  if (!r || r.status !== "APPROVED") return null;
  r.sellerReply = reply;
  return r;
}
