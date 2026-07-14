/**
 * VEDIC HEMP — LIVE CATALOGUE STORE (single source of truth for products)
 *
 * Every product surface — public catalogue, PDP, search, cart pricing,
 * sitemap, consoles — reads THIS store, so a listing a seller creates is
 * genuinely sellable and a listing that's archived is genuinely absent.
 * Server-side store over the launch fixtures (the DB seam — swap for the
 * Prisma `Product` table; the API shape is already row-oriented).
 *
 * The lifecycle is a server-enforced state machine, not UI decoration:
 *
 *   DRAFT → UNDER_REVIEW → LIVE ⇄ SUSPENDED
 *     ↑______________________|
 *   ARCHIVED (out of every public surface; restorable to DRAFT)
 *
 * A2 lives here: approveListing()/restoreListing() REFUSE a regulated class
 * without an APPROVED, batch-matched CoA. There is no force_sellable and no
 * bulk approve — by design (CLAUDE.md §7). MED_CANNABIS is not creatable
 * through any console path (A1: nothing here may produce a promotable
 * medical listing).
 */

import { ComplianceClass } from "@prisma/client";
import { PRODUCTS, type SampleProduct } from "@/lib/sample";

export type ListingStatus = "DRAFT" | "UNDER_REVIEW" | "LIVE" | "SUSPENDED" | "ARCHIVED";
export type CoaState = "NONE" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

/** Classes whose batches need an approved CoA before they may sell (A2). */
export const REGULATED_CLASSES: ComplianceClass[] = ["CBD_WELLNESS", "MED_CANNABIS"];
/** Classes a seller can create listings in. MED_CANNABIS is absent on purpose. */
export const CREATABLE_CLASSES: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];

export interface CatalogProduct extends SampleProduct {
  desc: string;
  hsn: string;
  status: ListingStatus;
  coaState: CoaState;
  batchCode: string; // batch the CoA state refers to ("" = no batch yet)
  sellerEmail?: string; // creator, when created from Seller Central
  custom: boolean; // true = created at runtime (hard-deletable as a draft)
  reviewNote?: string; // reviewer note on reject/suspend — shown to the seller
  /**
   * Set when someone ATTEMPTS to save medical-claims copy on this listing.
   * A flagged listing cannot be advertised (the rule every seller sees on
   * the form) until compliance clears the flag — the attempt is audited.
   */
  claimsStrike?: boolean;
  /** On-hand sellable units. The server is the authority on stock: an order
   *  decrements it, a return that restocks adds it back, and a listing with
   *  zero stock cannot be added to a cart or bought (fail closed).
   *  For a variant product this is the DERIVED sum across variants. */
  stockQty: number;
  lowStockAt: number; // seller-set threshold for the low-stock signal
  /**
   * Optional variants (size / pack / strength). When present, each variant
   * carries its own price and stock; the product's pricePaise becomes the
   * "from" (lowest) price and stockQty the total, both derived on read so
   * every existing consumer keeps working. A simple product has none.
   */
  optionName?: string; // e.g. "Size", "Pack", "Strength"
  variants?: Variant[];
}

export interface Variant {
  id: string;
  label: string; // e.g. "500g", "1000mg"
  sku: string;
  pricePaise: number;
  mrpPaise: number;
  stockQty: number;
}

/* Launch fixtures → store defaults. CBD items launched with approved batches. */
const DEFAULT_BATCH: Record<string, string> = { p4: "VB-2405", p5: "VB-2408", p8: "VB-2401" };
const DEFAULT_STOCK: Record<string, number> = { p1: 120, p2: 64, p3: 8, p4: 96, p5: 40, p6: 210, p7: 150, p8: 3 };
/**
 * Seeded variants so a public product page demonstrates options out of the
 * box. The first variant matches the fixture price so listing cards are
 * unchanged. Hemp Protein comes in two pack sizes.
 */
const DEFAULT_VARIANTS: Record<string, { optionName: string; variants: Variant[] }> = {
  p2: {
    optionName: "Pack size",
    variants: [
      { id: "p2-500g", label: "500 g", sku: "HP-500", pricePaise: 89900, mrpPaise: 109900, stockQty: 40 },
      { id: "p2-1kg", label: "1 kg", sku: "HP-1000", pricePaise: 159900, mrpPaise: 189900, stockQty: 24 },
    ],
  },
};
const DEFAULTS: CatalogProduct[] = PRODUCTS.map((p) => ({
  ...p,
  desc: "",
  hsn: p.cls === "CBD_WELLNESS" ? "33049910" : p.cls === "AYURVEDA" ? "30049011" : "12079990",
  status: "LIVE",
  coaState: p.labVerified ? "APPROVED" : "NONE",
  batchCode: DEFAULT_BATCH[p.id] ?? "",
  custom: false,
  stockQty: DEFAULT_STOCK[p.id] ?? 50,
  lowStockAt: 10,
  ...(DEFAULT_VARIANTS[p.id] ? DEFAULT_VARIANTS[p.id] : {}),
}));

/** Derive the "from" price and total stock for a variant product on read, so
 *  every consumer (cards, search, cart-gating) keeps working unchanged. */
function withDerivedVariantFields(p: CatalogProduct): CatalogProduct {
  if (!p.variants || p.variants.length === 0) return p;
  const prices = p.variants.map((v) => v.pricePaise);
  const mrps = p.variants.map((v) => v.mrpPaise);
  return {
    ...p,
    pricePaise: Math.min(...prices),
    mrpPaise: Math.min(...mrps),
    stockQty: p.variants.reduce((n, v) => n + v.stockQty, 0),
  };
}

interface CatalogStore {
  created: CatalogProduct[];
  patches: Record<string, Partial<CatalogProduct>>;
  deleted: string[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhCatalogStore: CatalogStore | undefined;
}

function store(): CatalogStore {
  globalThis.__vhCatalogStore ??= { created: [], patches: {}, deleted: [], seq: 1 };
  return globalThis.__vhCatalogStore;
}

/* ── Reads ────────────────────────────────────────────────── */

export async function readCatalog(): Promise<CatalogProduct[]> {
  const s = store();
  return [...DEFAULTS, ...s.created]
    .filter((p) => !s.deleted.includes(p.id))
    .map((p) => withDerivedVariantFields({ ...p, ...s.patches[p.id] }));
}

/** Public, sellable catalogue: LIVE only. Callers still apply A1 class filters. */
export async function readLiveProducts(): Promise<CatalogProduct[]> {
  return (await readCatalog()).filter((p) => p.status === "LIVE");
}

/** LIVE products in the viewer's permitted classes (drop-in for classProducts). */
export async function liveByClasses(permitted: ComplianceClass[]): Promise<CatalogProduct[]> {
  return (await readLiveProducts()).filter((p) => permitted.includes(p.cls));
}

export async function findProduct(id: string): Promise<CatalogProduct | null> {
  return (await readCatalog()).find((p) => p.id === id) ?? null;
}

export async function findLiveBySlug(slug: string): Promise<CatalogProduct | null> {
  return (await readLiveProducts()).find((p) => p.slug === slug) ?? null;
}

/** Listings a seller manages: their own creations + their storefront's fixtures. */
export async function sellerListings(sellerEmail: string, storeName: string): Promise<CatalogProduct[]> {
  return (await readCatalog()).filter((p) => p.sellerEmail === sellerEmail || p.seller === storeName);
}

/* ── Writes ───────────────────────────────────────────────── */

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export interface CreateListingInput {
  title: string;
  desc: string;
  cls: ComplianceClass;
  pricePaise: number;
  mrpPaise: number;
  hsn: string;
  emoji: string;
  seller: string;
  sellerEmail: string;
  stockQty?: number;
}

/** Create as DRAFT. Validation (claims, ranges) happens in the calling action. */
export async function createListing(input: CreateListingInput): Promise<CatalogProduct | null> {
  if (!CREATABLE_CLASSES.includes(input.cls)) return null; // A1: no medical listing from any console
  const s = store();
  const existing = await readCatalog();
  let slug = slugify(input.title) || `listing-${s.seq}`;
  if (existing.some((p) => p.slug === slug)) slug = `${slug}-${s.seq}`;
  const product: CatalogProduct = {
    id: `cp${s.seq++}`,
    slug,
    title: input.title,
    cls: input.cls,
    pricePaise: input.pricePaise,
    mrpPaise: input.mrpPaise,
    seller: input.seller,
    rating: 0,
    emoji: input.emoji || "🌿",
    labVerified: false,
    state: "DRAFT",
    desc: input.desc,
    hsn: input.hsn,
    status: "DRAFT",
    coaState: "NONE",
    batchCode: "",
    sellerEmail: input.sellerEmail,
    custom: true,
    // Opening stock: the form value when given, else a sellable starter the
    // seller can adjust in Inventory. A brand-new listing should be buyable
    // the moment it's approved, not silently stuck at zero.
    stockQty: Number.isInteger(input.stockQty) && input.stockQty! >= 0 ? input.stockQty! : 25,
    lowStockAt: 10,
  };
  s.created.push(product);
  return product;
}

function apply(id: string, patch: Partial<CatalogProduct>): void {
  const s = store();
  s.patches[id] = { ...s.patches[id], ...patch };
}

/** Edit copy/price. Compliance class is immutable after creation — no patch here. */
export async function updateListing(
  id: string,
  patch: Partial<Pick<CatalogProduct, "title" | "desc" | "pricePaise" | "mrpPaise" | "hsn" | "emoji">>,
): Promise<boolean> {
  const p = await findProduct(id);
  if (!p) return false;
  apply(id, patch);
  return true;
}

export type TransitionResult = { ok: true } | { ok: false; reason: string };

/** Seller: DRAFT → UNDER_REVIEW (a human reviews every new/returning listing). */
export async function submitForReview(id: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "DRAFT") return { ok: false, reason: "state" };
  apply(id, { status: "UNDER_REVIEW", state: "UNDER_REVIEW", reviewNote: undefined });
  return { ok: true };
}

/**
 * Admin: UNDER_REVIEW → LIVE. THE A2 GATE — a regulated class without an
 * APPROVED, batch-matched CoA cannot pass, no matter who asks. The denial
 * reason is returned so the caller can audit the attempt.
 */
export async function approveListing(id: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "UNDER_REVIEW") return { ok: false, reason: "state" };
  if (REGULATED_CLASSES.includes(p.cls) && p.coaState !== "APPROVED")
    return { ok: false, reason: "coa" };
  apply(id, { status: "LIVE", state: "LIVE" });
  return { ok: true };
}

/** Admin: UNDER_REVIEW → DRAFT with a note the seller sees. */
export async function rejectListing(id: string, note: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "UNDER_REVIEW") return { ok: false, reason: "state" };
  apply(id, { status: "DRAFT", state: "DRAFT", reviewNote: note });
  return { ok: true };
}

/** Seller: LIVE → DRAFT (take my own listing down; no approval needed). */
export async function unpublishListing(id: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "LIVE") return { ok: false, reason: "state" };
  apply(id, { status: "DRAFT", state: "DRAFT" });
  return { ok: true };
}

/** Admin: LIVE → SUSPENDED (takedown with a reason the seller sees). */
export async function suspendListing(id: string, note: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "LIVE") return { ok: false, reason: "state" };
  apply(id, { status: "SUSPENDED", state: "SUSPENDED", reviewNote: note });
  return { ok: true };
}

/** Admin: SUSPENDED → LIVE. A2 re-checked — suspension may have been the CoA. */
export async function restoreListing(id: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "SUSPENDED") return { ok: false, reason: "state" };
  if (REGULATED_CLASSES.includes(p.cls) && p.coaState !== "APPROVED")
    return { ok: false, reason: "coa" };
  apply(id, { status: "LIVE", state: "LIVE", reviewNote: undefined });
  return { ok: true };
}

/** Seller: any state → ARCHIVED (absent from every public surface). */
export async function archiveListing(id: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status === "ARCHIVED") return { ok: false, reason: "state" };
  apply(id, { status: "ARCHIVED", state: "ARCHIVED" });
  return { ok: true };
}

/** Seller: ARCHIVED → DRAFT (edits + re-review before it can sell again). */
export async function restoreArchived(id: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.status !== "ARCHIVED") return { ok: false, reason: "state" };
  apply(id, { status: "DRAFT", state: "DRAFT" });
  return { ok: true };
}

/**
 * Hard delete — only a runtime-created listing that never needs an order
 * history (DRAFT/ARCHIVED). Anything that has been LIVE stays recoverable
 * as ARCHIVED; order rows must never dangle.
 */
export async function deleteListing(id: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (!p.custom) return { ok: false, reason: "fixture" };
  if (p.status !== "DRAFT" && p.status !== "ARCHIVED") return { ok: false, reason: "state" };
  const s = store();
  s.deleted.push(id);
  return { ok: true };
}

/* ── Variants (size / pack / strength options) ────────────── */

export function hasVariants(p: CatalogProduct): boolean {
  return Array.isArray(p.variants) && p.variants.length > 0;
}

/** The variant to show/price by default: the selected one, else first in stock. */
export function selectVariant(p: CatalogProduct, variantId?: string | null): Variant | null {
  if (!hasVariants(p)) return null;
  const vs = p.variants!;
  return (variantId && vs.find((v) => v.id === variantId)) || vs.find((v) => v.stockQty > 0) || vs[0]!;
}

/** Price/stock/label a caller should use for a (product, variant) pair. */
export function resolvePriceStock(p: CatalogProduct, variantId?: string | null): { pricePaise: number; mrpPaise: number; stockQty: number; variant: Variant | null } {
  const v = selectVariant(p, variantId);
  if (v) return { pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, stockQty: v.stockQty, variant: v };
  return { pricePaise: p.pricePaise, mrpPaise: p.mrpPaise, stockQty: p.stockQty, variant: null };
}

/* ── Variant CRUD (seller/admin) ──────────────────────────── */

function rawProduct(id: string): CatalogProduct | null {
  const s = store();
  const base = [...DEFAULTS, ...s.created].find((p) => p.id === id && !s.deleted.includes(p.id));
  return base ? { ...base, ...s.patches[id] } : null;
}

export type VariantResult = { ok: true; variant?: Variant } | { ok: false; reason: string };

export async function setOptionName(id: string, name: string): Promise<boolean> {
  const p = rawProduct(id);
  if (!p) return false;
  apply(id, { optionName: name.slice(0, 30) });
  return true;
}

export async function addVariant(id: string, input: { label: string; sku: string; pricePaise: number; mrpPaise: number; stockQty: number }): Promise<VariantResult> {
  const p = rawProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (input.label.trim().length < 1 || input.label.length > 30) return { ok: false, reason: "label" };
  if (!Number.isInteger(input.pricePaise) || input.pricePaise <= 0) return { ok: false, reason: "price" };
  if (!Number.isInteger(input.mrpPaise) || input.mrpPaise < input.pricePaise) return { ok: false, reason: "mrp" };
  if (!Number.isInteger(input.stockQty) || input.stockQty < 0) return { ok: false, reason: "stock" };
  const s = store();
  const variants = [...(p.variants ?? [])];
  if (variants.some((v) => v.label.toLowerCase() === input.label.trim().toLowerCase())) return { ok: false, reason: "dupe" };
  const variant: Variant = {
    id: `${id}-v${s.seq++}`,
    label: input.label.trim(),
    sku: input.sku.trim() || `${id}-${variants.length + 1}`,
    pricePaise: input.pricePaise,
    mrpPaise: input.mrpPaise,
    stockQty: input.stockQty,
  };
  apply(id, { variants: [...variants, variant], optionName: p.optionName ?? "Option" });
  return { ok: true, variant };
}

export async function updateVariant(id: string, variantId: string, patch: Partial<Pick<Variant, "label" | "sku" | "pricePaise" | "mrpPaise" | "stockQty">>): Promise<VariantResult> {
  const p = rawProduct(id);
  if (!p || !p.variants) return { ok: false, reason: "missing" };
  const variants = p.variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v));
  apply(id, { variants });
  return { ok: true };
}

export async function removeVariant(id: string, variantId: string): Promise<VariantResult> {
  const p = rawProduct(id);
  if (!p || !p.variants) return { ok: false, reason: "missing" };
  apply(id, { variants: p.variants.filter((v) => v.id !== variantId) });
  return { ok: true };
}

/* ── Inventory (server is the authority on stock) ─────────── */

export function inStock(p: CatalogProduct): boolean {
  return p.stockQty > 0;
}
export function isLowStock(p: CatalogProduct): boolean {
  return p.stockQty > 0 && p.stockQty <= p.lowStockAt;
}

/** Set an absolute on-hand quantity (seller/admin restock). */
export async function setStock(id: string, qty: number): Promise<boolean> {
  const p = await findProduct(id);
  if (!p || !Number.isInteger(qty) || qty < 0) return false;
  apply(id, { stockQty: Math.min(qty, 1_000_000) });
  return true;
}
/** Set the low-stock threshold. */
export async function setLowStockAt(id: string, at: number): Promise<boolean> {
  const p = await findProduct(id);
  if (!p || !Number.isInteger(at) || at < 0) return false;
  apply(id, { lowStockAt: Math.min(at, 100_000) });
  return true;
}

/**
 * Atomically decrement stock for a sale. When a variant is given, its own
 * stock moves (and the product's derived total follows); otherwise the
 * simple product's stock moves. Returns false and changes nothing if there
 * isn't enough on hand — an order can never oversell (fail closed).
 */
export async function decrementStock(id: string, qty: number, variantId?: string | null): Promise<boolean> {
  const p = rawProduct(id);
  if (!p || qty <= 0) return false;
  if (variantId && p.variants) {
    const v = p.variants.find((x) => x.id === variantId);
    if (!v || v.stockQty < qty) return false;
    apply(id, { variants: p.variants.map((x) => (x.id === variantId ? { ...x, stockQty: x.stockQty - qty } : x)) });
    return true;
  }
  if (p.stockQty < qty) return false;
  apply(id, { stockQty: p.stockQty - qty });
  return true;
}

/** Return units to stock (a restocking return/cancel), variant-aware. */
export async function restock(id: string, qty: number, variantId?: string | null): Promise<void> {
  const p = rawProduct(id);
  if (!p || qty <= 0) return;
  if (variantId && p.variants) {
    apply(id, { variants: p.variants.map((x) => (x.id === variantId ? { ...x, stockQty: Math.min(x.stockQty + qty, 1_000_000) } : x)) });
    return;
  }
  apply(id, { stockQty: Math.min(p.stockQty + qty, 1_000_000) });
}

/** Flag / clear the medical-claims strike (clearing is an audited admin act). */
export async function setClaimsStrike(id: string, on: boolean): Promise<boolean> {
  const p = await findProduct(id);
  if (!p) return false;
  apply(id, { claimsStrike: on });
  return true;
}

/* ── CoA (A2) ─────────────────────────────────────────────── */

/** Seller: register a batch + lab report → compliance queue. */
export async function submitCoa(id: string, batchCode: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (!REGULATED_CLASSES.includes(p.cls)) return { ok: false, reason: "class" };
  apply(id, { batchCode, coaState: "PENDING_REVIEW" });
  return { ok: true };
}

/**
 * Admin (pharmacist/compliance): decide ONE batch's CoA. Rejecting the CoA of
 * a LIVE regulated listing suspends it — an unverified batch cannot stay
 * sellable (A2 fails closed).
 */
export async function decideCoa(id: string, approve: boolean, note: string): Promise<TransitionResult> {
  const p = await findProduct(id);
  if (!p) return { ok: false, reason: "missing" };
  if (p.coaState !== "PENDING_REVIEW") return { ok: false, reason: "state" };
  if (approve) {
    apply(id, { coaState: "APPROVED", labVerified: true });
  } else {
    apply(id, {
      coaState: "REJECTED",
      labVerified: false,
      reviewNote: note,
      ...(p.status === "LIVE" ? { status: "SUSPENDED" as ListingStatus, state: "SUSPENDED" } : {}),
    });
  }
  return { ok: true };
}
