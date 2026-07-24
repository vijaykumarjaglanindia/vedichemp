/**
 * VEDIC HEMP — IMPORT RULES ENGINE (pure)
 *
 * Applies the operator's business rules to a normalized catalogue before it is
 * imported: price transforms (markup/discount, rounding, margin floor, discount
 * cap) and filters (stock, images, active-only, category/brand allow-lists).
 * Money stays integer paise throughout — every transform rounds to paise.
 */

import type { ImportRules, NormalizedProduct } from "./types";

export interface RuleOutcome {
  kept: NormalizedProduct[];
  dropped: { product: NormalizedProduct; reason: string }[];
}

function roundPaise(paise: number, to: ImportRules["roundTo"]): number {
  if (!to) return Math.round(paise);
  return Math.round(paise / to) * to;
}

/** Transform one product's pricing per the rules (never mutates the input). */
export function applyPricing(p: NormalizedProduct, rules: ImportRules): NormalizedProduct {
  let pricePaise = p.pricing.pricePaise;

  // Markup / discount.
  if (rules.priceAdjustPct) pricePaise = pricePaise * (1 + rules.priceAdjustPct / 100);

  // Margin floor over cost.
  if (rules.minMarginPct != null && p.pricing.costPaise) {
    const floor = p.pricing.costPaise * (1 + rules.minMarginPct / 100);
    if (pricePaise < floor) pricePaise = floor;
  }

  pricePaise = roundPaise(pricePaise, rules.roundTo);

  // Cap the sale discount (relative to the adjusted price).
  let salePricePaise = p.pricing.salePricePaise;
  if (salePricePaise != null && rules.maxDiscountPct != null) {
    const minSale = pricePaise * (1 - rules.maxDiscountPct / 100);
    if (salePricePaise < minSale) salePricePaise = roundPaise(minSale, rules.roundTo);
  }
  // Sale can never exceed the (possibly raised) price.
  if (salePricePaise != null && salePricePaise > pricePaise) salePricePaise = undefined;

  return { ...p, pricing: { ...p.pricing, pricePaise: Math.round(pricePaise), salePricePaise: salePricePaise != null ? Math.round(salePricePaise) : undefined } };
}

/** Full pass: filter, then transform, then auto-tag. */
export function applyRules(products: NormalizedProduct[], rules: ImportRules, opts?: { targetCategoryOf?: (p: NormalizedProduct) => string | undefined; targetBrandOf?: (p: NormalizedProduct) => string | undefined }): RuleOutcome {
  const kept: NormalizedProduct[] = [];
  const dropped: RuleOutcome["dropped"] = [];

  for (const raw of products) {
    if (rules.onlyActive && raw.status && raw.status !== "active") { dropped.push({ product: raw, reason: "not an active product (only-active rule)" }); continue; }
    if (rules.skipDrafts && raw.status === "draft") { dropped.push({ product: raw, reason: "draft product skipped" }); continue; }
    if (rules.skipArchived && raw.status === "archived") { dropped.push({ product: raw, reason: "archived product skipped" }); continue; }
    if (rules.skipOutOfStock && raw.inventory.stockStatus === "out_of_stock") { dropped.push({ product: raw, reason: "out of stock skipped" }); continue; }
    if (rules.requireImage && raw.images.length === 0) { dropped.push({ product: raw, reason: "no image (require-image rule)" }); continue; }

    if (rules.onlyCategories.length) {
      const cat = opts?.targetCategoryOf?.(raw);
      if (!cat || !rules.onlyCategories.includes(cat)) { dropped.push({ product: raw, reason: "category not in allow-list" }); continue; }
    }
    if (rules.onlyBrands.length) {
      const brand = opts?.targetBrandOf?.(raw) ?? raw.brand;
      if (!brand || !rules.onlyBrands.includes(brand)) { dropped.push({ product: raw, reason: "brand not in allow-list" }); continue; }
    }

    let out = applyPricing(raw, rules);
    if (rules.autoTags.length) out = { ...out, tags: Array.from(new Set([...out.tags, ...rules.autoTags])) };
    kept.push(out);
  }

  return { kept, dropped };
}
