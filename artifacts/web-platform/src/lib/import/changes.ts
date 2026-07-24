/**
 * VEDIC HEMP — IMPORT CHANGE DETECTION (pure)
 *
 * Diffs a freshly-fetched product against the last-seen snapshot so a sync can
 * report exactly what moved: price, stock, description, category, images,
 * variations, SEO — plus new/removed at the catalogue level. Feeds the sync
 * report and the change-log; carries no side effects.
 */

import type { NormalizedProduct, ProductChange } from "./types";

function money(paise: number | undefined): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Field-level diff of two versions of the same product. */
export function diffProduct(prev: NormalizedProduct, next: NormalizedProduct): ProductChange[] {
  const ref = next.sku || next.title;
  const changes: ProductChange[] = [];

  if (prev.pricing.pricePaise !== next.pricing.pricePaise) {
    changes.push({ kind: "price", productRef: ref, from: money(prev.pricing.pricePaise), to: money(next.pricing.pricePaise) });
  }
  if ((prev.inventory.quantity ?? -1) !== (next.inventory.quantity ?? -1)) {
    changes.push({ kind: "stock", productRef: ref, from: String(prev.inventory.quantity ?? "—"), to: String(next.inventory.quantity ?? "—") });
  }
  if ((prev.description ?? "") !== (next.description ?? "")) {
    changes.push({ kind: "description", productRef: ref });
  }
  if ((prev.category ?? "") !== (next.category ?? "")) {
    changes.push({ kind: "category", productRef: ref, from: prev.category, to: next.category });
  }
  if (prev.images.map((i) => i.url).join("|") !== next.images.map((i) => i.url).join("|")) {
    changes.push({ kind: "image", productRef: ref, from: `${prev.images.length} image(s)`, to: `${next.images.length} image(s)` });
  }
  const vkey = (p: NormalizedProduct) => p.variants.map((v) => Object.values(v.options).join("/")).sort().join("|");
  if (vkey(prev) !== vkey(next)) changes.push({ kind: "variation", productRef: ref });
  if ((prev.seo.metaTitle ?? "") !== (next.seo.metaTitle ?? "") || (prev.seo.metaDescription ?? "") !== (next.seo.metaDescription ?? "")) {
    changes.push({ kind: "seo", productRef: ref });
  }

  return changes;
}

/** Catalogue-level diff: new, removed, and per-product field changes. */
export function detectChanges(incoming: NormalizedProduct[], previous: NormalizedProduct[]): ProductChange[] {
  const prevById = new Map(previous.map((p) => [p.sourceId, p]));
  const nextById = new Map(incoming.map((p) => [p.sourceId, p]));
  const out: ProductChange[] = [];

  for (const p of incoming) {
    const prev = prevById.get(p.sourceId);
    if (!prev) { out.push({ kind: "new", productRef: p.sku || p.title }); continue; }
    out.push(...diffProduct(prev, p));
  }
  for (const p of previous) {
    if (!nextById.has(p.sourceId)) out.push({ kind: "removed", productRef: p.sku || p.title });
  }
  return out;
}
