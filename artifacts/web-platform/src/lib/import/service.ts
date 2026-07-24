/**
 * VEDIC HEMP — IMPORT ORCHESTRATOR
 *
 * Turns a set of selected, normalized products into marketplace listings —
 * under the same gates as every other path onto the catalogue:
 *
 *   • A1  — MED_CANNABIS is refused at import. It is never listed via any
 *           console; the importer records the attempt as a blocked failure.
 *   • A2  — every regulated (CBD_WELLNESS) product lands as DRAFT with no CoA.
 *           Import cannot make a regulated batch sellable; only an approved,
 *           batch-matched lab report can (the catalogue's publish gate). The
 *           `autoPublish` store flag never touches regulated products.
 *   • §4  — nothing on the source is trusted for money: prices arrive as
 *           integer paise and any non-positive price is a validation failure.
 *   • claims — a source description with cure/treat/prevent wording is rejected
 *           at import, exactly as it would be on a hand-typed listing.
 *
 * Every run writes an AuditLog row (and one per A1 block) synchronously before
 * returning, and records history + logs + failures in the import store.
 */

import type {
  NormalizedProduct, ImportRules, ImportOptions, ConnectedStore,
  ImportSummary, ImportHistoryRow, FailedImportRow, FailureCode, ProductChange,
} from "./types";
import { applyRules } from "./rules";
import { detectDuplicates, type ExistingListing } from "./dedupe";
import { demoProductsFor, methodMeta } from "./connectors";
import * as db from "./store";
import { readCatalog, createListing, updateListing, setStock, findProduct, REGULATED_CLASSES } from "@/lib/catalog";
import { violatesClaimsCopy } from "@/lib/claims";
import { writeAudit } from "@/lib/audit";
import type { ComplianceClass } from "@prisma/client";

const CLASS_EMOJI: Record<string, string> = { HEMP_FOOD: "🌾", AYURVEDA: "🪔", CBD_WELLNESS: "🌿", MED_CANNABIS: "🌸" };

async function existingListings(): Promise<ExistingListing[]> {
  const cat = await readCatalog();
  return cat.map((p) => ({ id: p.id, title: p.title, slug: p.slug, sku: p.sku }));
}

/** Per-product plan the wizard shows on its Review step (no side effects). */
export type ProductDecision =
  | { action: "create"; regulated: boolean }
  | { action: "update"; matchedTitle: string }
  | { action: "skip"; reason: string }
  | { action: "block"; code: FailureCode; message: string };

export interface ImportPreview {
  total: number;
  decisions: { product: NormalizedProduct; decision: ProductDecision }[];
  counts: { create: number; update: number; skip: number; block: number; gatedRegulated: number; blockedMedical: number };
}

function classify(p: NormalizedProduct): ComplianceClass {
  // The source's guess is a hint only. Anything that reads as medical cannabis
  // is treated as MED_CANNABIS so A1 catches it even when the feed mislabels.
  if (p.guessedClass === "MED_CANNABIS") return "MED_CANNABIS";
  const t = `${p.title} ${p.category ?? ""}`.toLowerCase();
  if (/\bmedical cannabis\b|\bmarijuana\b|\bthc\b.*\b(flower|bud)\b/.test(t) && (p.marketplace.thcPercent ?? 0) > 1) return "MED_CANNABIS";
  return (p.guessedClass as ComplianceClass) ?? "HEMP_FOOD";
}

function decide(p: NormalizedProduct, dupMatchTitle: string | undefined, opts: ImportOptions): ProductDecision {
  const cls = classify(p);
  if (cls === "MED_CANNABIS") {
    return { action: "block", code: "med_cannabis_blocked", message: "Medical Cannabis is never imported (Prohibition A1)." };
  }
  if (violatesClaimsCopy(p.title, p.shortDescription, p.description)) {
    return { action: "block", code: "claims_blocked", message: "Source copy contains a disease-treatment claim." };
  }
  if (!Number.isFinite(p.pricing.pricePaise) || p.pricing.pricePaise <= 0) {
    return { action: "block", code: "invalid_price", message: "Price is missing or not a positive amount." };
  }
  if (dupMatchTitle) {
    if (opts.duplicateStrategy === "skip") return { action: "skip", reason: `duplicate of "${dupMatchTitle}" (skip)` };
    if (opts.duplicateStrategy === "create_new") return { action: "create", regulated: REGULATED_CLASSES.includes(cls) };
    return { action: "update", matchedTitle: dupMatchTitle }; // update | merge
  }
  if (opts.mode !== "everything" && opts.mode !== "new_only") {
    // Update-only modes with no existing match → nothing to update.
    return { action: "skip", reason: "no existing listing to update (update-only mode)" };
  }
  return { action: "create", regulated: REGULATED_CLASSES.includes(cls) };
}

/** Dry run: what WOULD happen. Used by the wizard's Review step. */
export async function previewImport(products: NormalizedProduct[], rules: ImportRules, opts: ImportOptions): Promise<ImportPreview> {
  const { kept, dropped } = applyRules(products, rules);
  const existing = await existingListings();
  const dupes = detectDuplicates(kept, existing);

  const decisions: ImportPreview["decisions"] = [];
  const counts = { create: 0, update: 0, skip: 0, block: 0, gatedRegulated: 0, blockedMedical: 0 };

  for (const d of dropped) { decisions.push({ product: d.product, decision: { action: "skip", reason: d.reason } }); counts.skip++; }

  for (const p of kept) {
    const dec = decide(p, dupes.get(p.sourceId)?.matchedTitle, opts);
    decisions.push({ product: p, decision: dec });
    if (dec.action === "create") { counts.create++; if (dec.regulated) counts.gatedRegulated++; }
    else if (dec.action === "update") counts.update++;
    else if (dec.action === "skip") counts.skip++;
    else { counts.block++; if (dec.code === "med_cannabis_blocked") counts.blockedMedical++; }
  }
  return { total: products.length, decisions, counts };
}

/** Execute the import for real. Creates DRAFT listings, records everything, audits. */
export async function runImport(input: {
  store: ConnectedStore;
  products: NormalizedProduct[];
  rules: ImportRules;
  options: ImportOptions;
  actor: string;
  trigger?: "manual" | "scheduled" | "webhook";
}): Promise<ImportSummary> {
  const { store, products, rules, options, actor } = input;
  const startedAt = new Date().toISOString();
  const historyId = db.nextId("ih");

  const { kept, dropped } = applyRules(products, rules);
  const existing = await existingListings();
  const dupes = detectDuplicates(kept, existing);

  let imported = 0, updated = 0, skipped = dropped.length, failed = 0, warnings = 0, deleted = 0;
  let gatedRegulated = 0, blockedMedical = 0;
  const failures: FailedImportRow[] = [];
  const changes: ProductChange[] = [];

  const log = (level: "info" | "warn" | "error", message: string, productRef?: string) =>
    db.addLog({ id: db.nextId("il"), historyId, at: new Date().toISOString(), level, message, productRef });

  const fail = async (p: NormalizedProduct, code: FailureCode, message: string, suggestedFix: string, retryable: boolean) => {
    const row: FailedImportRow = { id: db.nextId("if"), historyId, storeId: store.id, at: new Date().toISOString(), productRef: p.sku || p.title, code, message, suggestedFix, retryable };
    failures.push(row);
    await db.addFailure(row);
    await log("error", message, row.productRef);
    failed++;
  };

  for (const d of dropped) await log("info", `Skipped by rules: ${d.reason}`, d.product.sku || d.product.title);

  for (const p of kept) {
    const dec = decide(p, dupes.get(p.sourceId)?.matchedTitle, options);

    if (dec.action === "block") {
      if (dec.code === "med_cannabis_blocked") {
        blockedMedical++;
        // A1 gets its own audit row — a blocked medical import is exactly the
        // kind of attempt the log exists to make loud and attributable.
        await writeAudit({ actor, action: "IMPORT_MED_CANNABIS_BLOCKED", target: `${store.label} · ${p.title}`, outcome: "DENIED", note: "Medical Cannabis refused at import (A1)." });
      }
      await fail(p, dec.code, dec.message,
        dec.code === "med_cannabis_blocked" ? "Remove Medical Cannabis from the source feed — it is prescription-only and never imported." :
        dec.code === "claims_blocked" ? "Remove cure/treat/prevent wording from the source description, then retry." :
        "Set a valid numeric price on the source, then retry.",
        dec.code !== "med_cannabis_blocked");
      continue;
    }

    if (dec.action === "skip") { skipped++; await log("info", `Skipped: ${dec.reason}`, p.sku || p.title); continue; }

    if (dec.action === "update") {
      // Apply the source's price/stock/copy onto the matched listing for real.
      // An update never changes status: a DRAFT stays DRAFT and a regulated
      // product stays behind the CoA publish gate (A2). We only ever move
      // price, stock and descriptive fields — never eligibility.
      const listingId = dupes.get(p.sourceId)?.matchedListingId;
      const current = listingId ? await findProduct(listingId) : null;
      if (!current) {
        // The match vanished between preview and run — treat as unchanged.
        await log("info", `Matched "${dec.matchedTitle}" but it is no longer in the catalogue — skipped.`, p.sku || p.title);
        skipped++;
        continue;
      }

      const patch: Parameters<typeof updateListing>[1] = {};
      const changed: string[] = [];
      if (p.pricing.pricePaise !== current.pricePaise) {
        patch.pricePaise = p.pricing.pricePaise;
        changes.push({ kind: "price", productRef: p.sku || p.title, from: `₹${(current.pricePaise / 100).toFixed(2)}`, to: `₹${(p.pricing.pricePaise / 100).toFixed(2)}` });
        changed.push("price");
      }
      const srcMrp = p.pricing.compareAtPaise ?? p.pricing.msrpPaise;
      if (srcMrp != null && srcMrp !== current.mrpPaise) { patch.mrpPaise = srcMrp; changed.push("mrp"); }
      const srcDesc = (p.description ?? p.shortDescription ?? "").replace(/<[^>]+>/g, "").slice(0, 4000);
      if (srcDesc && srcDesc !== current.desc) { patch.desc = srcDesc; changes.push({ kind: "description", productRef: p.sku || p.title }); changed.push("description"); }

      if (Object.keys(patch).length > 0) await updateListing(current.id, patch);

      const srcQty = p.inventory.quantity;
      if (typeof srcQty === "number" && srcQty !== current.stockQty) {
        await setStock(current.id, Math.max(0, srcQty));
        changes.push({ kind: "stock", productRef: p.sku || p.title, from: String(current.stockQty), to: String(srcQty) });
        changed.push("stock");
      }

      if (changed.length === 0) {
        await log("info", `Matched "${dec.matchedTitle}" — no changes since last sync.`, p.sku || p.title);
      } else {
        updated++;
        await log("info", `Updated "${dec.matchedTitle}" from source (${changed.join(", ")}).`, p.sku || p.title);
      }
      continue;
    }

    // Create as DRAFT. Regulated stays gated behind the CoA publish check (A2).
    const cls = classify(p);
    const created = await createListing({
      title: p.title,
      desc: (p.description ?? p.shortDescription ?? p.title).replace(/<[^>]+>/g, "").slice(0, 4000),
      cls,
      pricePaise: p.pricing.pricePaise,
      mrpPaise: p.pricing.compareAtPaise ?? p.pricing.msrpPaise ?? p.pricing.pricePaise,
      hsn: "",
      emoji: CLASS_EMOJI[cls] ?? "🌿",
      seller: store.sellerName,
      sellerEmail: store.sellerEmail,
      stockQty: p.inventory.quantity,
      shortDesc: p.shortDescription,
      brand: p.brand,
      tags: p.tags,
      sku: p.sku,
      weightGrams: p.shipping.weightGrams,
      countryOfOrigin: p.marketplace.countryOfOrigin,
      ingredients: p.marketplace.ingredients,
    });

    if (!created) {
      // createListing refuses non-creatable classes (belt-and-braces on A1).
      await fail(p, "validation_error", "The marketplace refused this product (class not importable).", "Only Hemp Food, Ayurveda and CBD Wellness can be imported.", false);
      continue;
    }

    imported++;
    changes.push({ kind: "new", productRef: p.sku || p.title });
    if (REGULATED_CLASSES.includes(cls)) {
      gatedRegulated++;
      await log("info", "Regulated (CBD) product imported as DRAFT — it cannot sell until its lab report is approved.", p.sku || p.title);
    } else {
      await log("info", "Imported as DRAFT — awaiting review before it goes live.", p.sku || p.title);
    }
    if (p.images.length === 0) { warnings++; await log("warn", "Imported without an image — add one before publishing.", p.sku || p.title); }
  }

  const finishedAt = new Date().toISOString();
  const status: ImportHistoryRow["status"] = failed > 0 ? "completed_with_errors" : "completed";
  const history: ImportHistoryRow = {
    id: historyId, storeId: store.id, storeLabel: store.label, method: store.method,
    startedAt, finishedAt, durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    status, imported, updated, skipped, deleted, failed, warnings, trigger: input.trigger ?? "manual", actor,
  };
  await db.addHistory(history);
  await db.patchStore(store.id, { lastSyncAt: finishedAt, health: failed > 0 ? "degraded" : "healthy" });

  await writeAudit({
    actor, action: "IMPORT_RUN", target: store.label, outcome: "OK",
    note: `${imported} imported (DRAFT), ${updated} updated, ${skipped} skipped, ${failed} failed. ${gatedRegulated} regulated held for CoA; ${blockedMedical} medical blocked.`,
  });

  return { historyId, imported, updated, skipped, failed, warnings, gatedRegulated, blockedMedical, changes, failures };
}

/* ─────────────────────────── Synchronization ─────────────────────────── */

/**
 * Re-sync one connected store: re-fetch its catalogue, then run the same
 * gated pipeline as a first import. New products are created as DRAFT; products
 * that already exist are updated in place (price/stock/copy only — never
 * eligibility). Medical Cannabis is refused on every sync (A1) and regulated
 * products stay behind the CoA gate (A2). Returns null if the store is gone.
 *
 * The connector seam is demo-backed in this environment (no outbound network to
 * arbitrary seller stores), so the re-fetch is the store's own deterministic
 * catalogue keyed by its endpoint. Swapping in a live HTTP client changes only
 * where `products` comes from — every gate below is unchanged.
 */
export async function syncStore(input: {
  storeId: string;
  actor: string;
  trigger?: "manual" | "scheduled" | "webhook";
}): Promise<ImportSummary | null> {
  const store = await db.findStore(input.storeId);
  if (!store) return null;

  const seed = store.endpoint || `${methodMeta(store.method).name}-demo`;
  const products = demoProductsFor(seed);
  const rules = await db.getRules();
  const options: ImportOptions = { mode: "everything", duplicateStrategy: "update", deleteRemoved: false };

  return runImport({ store, products, rules, options, actor: input.actor, trigger: input.trigger ?? "scheduled" });
}

const CADENCE_MS: Record<string, number> = {
  hourly: 3_600_000,
  daily: 86_400_000,
  weekly: 604_800_000,
  monthly: 2_592_000_000, // 30 days
};

/**
 * Is a store due for an automatic re-sync now? Only the time-based cadences are
 * ever "due": `manual` never runs on its own and `realtime` is webhook-driven
 * (the store pushes to us), so neither is polled. A store that has never synced
 * on a time-based cadence is due immediately.
 */
export function isDue(store: { schedule?: string; lastSyncAt?: string }, now: number = Date.now()): boolean {
  const interval = store.schedule ? CADENCE_MS[store.schedule] : undefined;
  if (!interval) return false;
  if (!store.lastSyncAt) return true;
  return now - new Date(store.lastSyncAt).getTime() >= interval;
}

/** The connected stores that are due for an automatic re-sync right now. */
export function dueStores<T extends { schedule?: string; lastSyncAt?: string }>(stores: T[], now: number = Date.now()): T[] {
  return stores.filter((s) => isDue(s, now));
}

/** Run every store whose cadence is currently due. Returns one summary per store synced. */
export async function runDueSyncs(actor: string, now: number = Date.now()): Promise<ImportSummary[]> {
  const due = dueStores(await db.listStores(), now);
  const out: ImportSummary[] = [];
  for (const s of due) {
    const summary = await syncStore({ storeId: s.id, actor, trigger: "scheduled" });
    if (summary) out.push(summary);
  }
  return out;
}
