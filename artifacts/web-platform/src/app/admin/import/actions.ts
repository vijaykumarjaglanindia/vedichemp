"use server";

/**
 * VEDIC HEMP — IMPORT MODULE · server actions.
 *
 * The only place the import UI reaches the server. Wizard steps (validate,
 * fetch, preview, run) and the store/mapping/rules/scheduler mutations all land
 * here. Every mutation resolves the acting admin from the session and audits;
 * the run itself audits per-run and per-A1-block inside the orchestrator.
 */

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { connectorFor, methodMeta } from "@/lib/import/connectors";
import { previewImport, runImport, syncStore, runDueSyncs } from "@/lib/import/service";
import * as db from "@/lib/import/store";
import type {
  ConnectionMethod, NormalizedProduct, ImportRules, ImportOptions, ImportSummary,
  CategoryMapping, AttributeMapping, BrandMapping, SyncCadence,
} from "@/lib/import/types";

async function actor(): Promise<string> {
  return (await getSession())?.email ?? "unknown-admin";
}

/** Mask a secret for at-rest storage / display (never store or echo the raw value). */
function mask(v: string): string {
  const t = v.trim();
  if (t.length <= 4) return "••••";
  return `${"•".repeat(Math.max(4, t.length - 4))}${t.slice(-4)}`;
}

/* ─────────────────────────── Wizard steps ─────────────────────────── */

export async function wizardValidate(method: ConnectionMethod, config: Record<string, string>) {
  return connectorFor(method).validate(config);
}

export async function wizardFetch(method: ConnectionMethod, config: Record<string, string>): Promise<NormalizedProduct[]> {
  return connectorFor(method).fetchProducts(config);
}

export async function wizardPreview(products: NormalizedProduct[], rules: ImportRules, options: ImportOptions) {
  return previewImport(products, rules, options);
}

export async function wizardRun(input: {
  sellerName: string; sellerEmail: string; method: ConnectionMethod; label: string; endpoint?: string;
  config: Record<string, string>; products: NormalizedProduct[]; rules: ImportRules; options: ImportOptions;
}): Promise<ImportSummary> {
  const who = await actor();
  // Persist the connection (masked) so the store shows up in Connected Stores.
  const meta = methodMeta(input.method);
  const credentialsMasked: Record<string, string> = {};
  for (const f of meta.fields) if (input.config[f.key] && f.secret) credentialsMasked[f.key] = mask(input.config[f.key]!);
  const store = await db.addStore({
    sellerEmail: input.sellerEmail, sellerName: input.sellerName, method: input.method,
    label: input.label, endpoint: input.endpoint, credentialsMasked,
    health: "healthy", productCount: input.products.length, schedule: "manual", autoPublish: false,
  });
  await writeAudit({ actor: who, action: "IMPORT_STORE_CONNECT", target: store.label, outcome: "OK", note: `Connected via ${meta.name}.` });

  const summary = await runImport({ store, products: input.products, rules: input.rules, options: input.options, actor: who, trigger: "manual" });
  revalidatePath("/admin/import");
  revalidatePath("/admin/import/history");
  return summary;
}

/* ─────────────────────────── Connected stores ─────────────────────────── */

export async function removeStoreAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const store = await db.findStore(id);
  if (store) {
    await db.removeStore(id);
    await writeAudit({ actor: await actor(), action: "IMPORT_STORE_DISCONNECT", target: store.label, outcome: "OK" });
  }
  revalidatePath("/admin/import/stores");
}

/** Re-sync one connected store now (button on Connected Stores / Scheduler). */
export async function syncStoreAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const store = await db.findStore(id);
  if (store) {
    await syncStore({ storeId: id, actor: await actor(), trigger: "manual" });
    // syncStore audits its own IMPORT_RUN; the store's lastSyncAt/health are patched inside.
  }
  revalidatePath("/admin/import/stores");
  revalidatePath("/admin/import/scheduler");
  revalidatePath("/admin/import/history");
  revalidatePath("/admin/import");
}

/** Run every store whose cadence is currently due (manual trigger of the scheduled path). */
export async function runDueSyncsAction(): Promise<void> {
  const summaries = await runDueSyncs(await actor());
  await writeAudit({ actor: await actor(), action: "IMPORT_DUE_SYNCS_RUN", target: "scheduler", outcome: "OK", note: `${summaries.length} store(s) synced.` });
  revalidatePath("/admin/import/scheduler");
  revalidatePath("/admin/import/history");
  revalidatePath("/admin/import");
}

/** Edit a connection's display + sync settings from the View/Edit popup. */
export async function editStoreAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const store = await db.findStore(id);
  if (store) {
    const label = String(formData.get("label") ?? "").trim() || store.label;
    const schedule = String(formData.get("schedule") ?? store.schedule ?? "manual") as SyncCadence;
    const autoPublish = formData.get("autoPublish") === "on";
    await db.patchStore(id, { label, schedule, autoPublish });
    await writeAudit({ actor: await actor(), action: "IMPORT_STORE_EDIT", target: label, outcome: "OK", note: `schedule=${schedule}, autoPublish=${autoPublish}` });
  }
  revalidatePath("/admin/import/stores");
}

export async function setScheduleAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const cadence = String(formData.get("cadence") ?? "manual") as SyncCadence;
  const store = await db.findStore(id);
  if (store) {
    await db.patchStore(id, { schedule: cadence });
    await writeAudit({ actor: await actor(), action: "IMPORT_SCHEDULE_SET", target: store.label, outcome: "OK", note: `Sync cadence → ${cadence}.` });
  }
  revalidatePath("/admin/import/scheduler");
}

/* ─────────────────────────── Mappings ─────────────────────────── */

export async function saveCategoryMapAction(formData: FormData): Promise<void> {
  const m: Omit<CategoryMapping, "id"> & { id?: string } = {
    id: String(formData.get("id") ?? "") || undefined,
    sourcePath: String(formData.get("sourcePath") ?? "").trim(),
    targetCategoryId: String(formData.get("targetCategoryId") ?? "").trim(),
    targetLabel: String(formData.get("targetLabel") ?? "").trim(),
    auto: false,
  };
  if (m.sourcePath && m.targetLabel) {
    await db.upsertCategoryMap(m);
    await writeAudit({ actor: await actor(), action: "IMPORT_CATEGORY_MAP", target: `${m.sourcePath} → ${m.targetLabel}`, outcome: "OK" });
  }
  revalidatePath("/admin/import/mapping/category");
}

export async function saveAttributeMapAction(formData: FormData): Promise<void> {
  const m: Omit<AttributeMapping, "id"> & { id?: string } = {
    id: String(formData.get("id") ?? "") || undefined,
    sourceName: String(formData.get("sourceName") ?? "").trim(),
    targetName: String(formData.get("targetName") ?? "").trim(),
    auto: false,
  };
  if (m.sourceName && m.targetName) {
    await db.upsertAttributeMap(m);
    await writeAudit({ actor: await actor(), action: "IMPORT_ATTRIBUTE_MAP", target: `${m.sourceName} → ${m.targetName}`, outcome: "OK" });
  }
  revalidatePath("/admin/import/mapping/attribute");
}

export async function saveBrandMapAction(formData: FormData): Promise<void> {
  const m: Omit<BrandMapping, "id"> & { id?: string } = {
    id: String(formData.get("id") ?? "") || undefined,
    sourceName: String(formData.get("sourceName") ?? "").trim(),
    targetBrand: String(formData.get("targetBrand") ?? "").trim(),
    merged: formData.get("merged") === "on",
    auto: false,
  };
  if (m.sourceName && m.targetBrand) {
    await db.upsertBrandMap(m);
    await writeAudit({ actor: await actor(), action: "IMPORT_BRAND_MAP", target: `${m.sourceName} → ${m.targetBrand}`, outcome: "OK" });
  }
  revalidatePath("/admin/import/mapping/brand");
}

/* ─────────────────────────── Rules ─────────────────────────── */

export async function saveRulesAction(formData: FormData): Promise<void> {
  const num = (k: string, d = 0) => { const v = Number(formData.get(k)); return Number.isFinite(v) ? v : d; };
  const rules: ImportRules = {
    priceAdjustPct: num("priceAdjustPct"),
    roundTo: (Number(formData.get("roundTo")) || 0) as ImportRules["roundTo"],
    minMarginPct: formData.get("minMarginPct") ? num("minMarginPct") : undefined,
    maxDiscountPct: formData.get("maxDiscountPct") ? num("maxDiscountPct") : undefined,
    skipOutOfStock: formData.get("skipOutOfStock") === "on",
    skipDrafts: formData.get("skipDrafts") === "on",
    skipArchived: formData.get("skipArchived") === "on",
    requireImage: formData.get("requireImage") === "on",
    onlyActive: formData.get("onlyActive") === "on",
    onlyCategories: [],
    onlyBrands: [],
    autoTags: String(formData.get("autoTags") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    autoShippingClass: String(formData.get("autoShippingClass") ?? "") || undefined,
    autoTaxClass: String(formData.get("autoTaxClass") ?? "") || undefined,
  };
  await db.saveRules(rules);
  await writeAudit({ actor: await actor(), action: "IMPORT_RULES_SAVE", target: "default import rules", outcome: "OK" });
  revalidatePath("/admin/import/rules");
}

/* ─────────────────────────── Failed imports ─────────────────────────── */

export async function resolveFailureAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await db.clearFailure(id);
  await writeAudit({ actor: await actor(), action: "IMPORT_FAILURE_RESOLVE", target: id, outcome: "OK" });
  revalidatePath("/admin/import/failed");
}
