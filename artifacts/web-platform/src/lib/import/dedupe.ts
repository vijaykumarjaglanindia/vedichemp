/**
 * VEDIC HEMP — IMPORT DUPLICATE DETECTION (pure)
 *
 * Matches an incoming normalized product against the existing marketplace
 * catalogue by strongest-available signal: SKU → barcode → slug → title. The
 * operator decides what to do with a match (update / skip / create-new / merge)
 * per the chosen DuplicateStrategy; this module only finds and scores.
 */

import type { NormalizedProduct, DuplicateMatch, MatchSignal } from "./types";

export interface ExistingListing {
  id: string;
  title: string;
  slug: string;
  sku?: string;
  barcode?: string;
}

function norm(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

const CONFIDENCE: Record<MatchSignal, number> = { sku: 1, barcode: 0.98, slug: 0.9, title: 0.75 };

/** Best single match for one product, or null. */
export function matchOne(p: NormalizedProduct, existing: ExistingListing[]): DuplicateMatch | null {
  const bySku = p.sku ? existing.find((e) => e.sku && norm(e.sku) === norm(p.sku)) : undefined;
  if (bySku) return build(p, bySku, "sku");

  const bc = p.identifiers.barcode;
  const byBarcode = bc ? existing.find((e) => e.barcode && norm(e.barcode) === norm(bc)) : undefined;
  if (byBarcode) return build(p, byBarcode, "barcode");

  const bySlug = p.slug ? existing.find((e) => norm(e.slug) === norm(p.slug)) : undefined;
  if (bySlug) return build(p, bySlug, "slug");

  const byTitle = existing.find((e) => norm(e.title) === norm(p.title));
  if (byTitle) return build(p, byTitle, "title");

  return null;
}

function build(p: NormalizedProduct, e: ExistingListing, signal: MatchSignal): DuplicateMatch {
  return { sourceId: p.sourceId, productRef: p.sku || p.title, matchedListingId: e.id, matchedTitle: e.title, signal, confidence: CONFIDENCE[signal] };
}

export function detectDuplicates(products: NormalizedProduct[], existing: ExistingListing[]): Map<string, DuplicateMatch> {
  const out = new Map<string, DuplicateMatch>();
  for (const p of products) {
    const m = matchOne(p, existing);
    if (m) out.set(p.sourceId, m);
  }
  return out;
}
