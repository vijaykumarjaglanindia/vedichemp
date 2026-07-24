/**
 * VEDIC HEMP — IMPORT STORES (server-side; DB seam → import_* tables)
 *
 * The same in-memory-with-globalThis pattern used across the platform. Every
 * export is async so the DB swap is a body change, not a signature change.
 * Seeded with a small, clearly-illustrative fixture so the console renders a
 * live-looking state on a fresh boot (it starts populated on purpose — an
 * empty import console is hard to review).
 */

import type {
  ConnectedStore, ImportHistoryRow, CategoryMapping, AttributeMapping, BrandMapping,
  ImportRules, ImportLogRow, FailedImportRow, ConnectionMethod, SyncCadence, StoreHealth,
} from "./types";
import { defaultRules } from "./types";

interface ImportDB {
  stores: ConnectedStore[];
  history: ImportHistoryRow[];
  logs: ImportLogRow[];
  failures: FailedImportRow[];
  categoryMap: CategoryMapping[];
  attributeMap: AttributeMapping[];
  brandMap: BrandMapping[];
  rules: ImportRules;
  seq: number;
  seeded: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhImportDB: ImportDB | undefined;
}

function db(): ImportDB {
  if (!globalThis.__vhImportDB) {
    globalThis.__vhImportDB = {
      stores: [], history: [], logs: [], failures: [], categoryMap: [], attributeMap: [], brandMap: [],
      rules: defaultRules(), seq: 1, seeded: false,
    };
    seed(globalThis.__vhImportDB);
  }
  return globalThis.__vhImportDB;
}

export function nextId(prefix: string): string {
  return `${prefix}${db().seq++}`;
}

/* ─────────────────────────── Seed ─────────────────────────── */

function seed(d: ImportDB) {
  if (d.seeded) return;
  d.seeded = true;
  const store = (id: string, seller: string, email: string, method: ConnectionMethod, label: string, endpoint: string, health: StoreHealth, count: number, schedule: SyncCadence, lastSyncAt?: string): ConnectedStore => ({
    id, sellerEmail: email, sellerName: seller, method, label, endpoint,
    credentialsMasked: { key: "ck_••••••••••3a2f" }, createdAt: "2026-07-10T09:00:00.000Z",
    lastSyncAt, health, productCount: count, schedule, autoPublish: false,
  });
  d.stores = [
    store("cs1", "Vedic Botanicals", "seller@vedicbotanicals.in", "woocommerce", "Vedic Botanicals — WooCommerce", "https://vedicbotanicals.in", "healthy", 42, "daily", "2026-07-24T04:00:00.000Z"),
    store("cs2", "Himalayan Hemp Co.", "seller@himalayanhemp.in", "shopify", "Himalayan Hemp — Shopify", "https://himalayanhemp.myshopify.com", "healthy", 28, "hourly", "2026-07-24T08:00:00.000Z"),
    store("cs3", "GreenLeaf Naturals", "ops@greenleaf.example", "csv", "GreenLeaf — CSV upload", "greenleaf-products.csv", "degraded", 14, "manual", "2026-07-22T11:20:00.000Z"),
  ];
  d.history = [
    { id: "ih1", storeId: "cs2", storeLabel: "Himalayan Hemp — Shopify", method: "shopify", startedAt: "2026-07-24T08:00:00.000Z", finishedAt: "2026-07-24T08:00:47.000Z", durationMs: 47000, status: "completed", imported: 4, updated: 21, skipped: 3, deleted: 0, failed: 0, warnings: 1, trigger: "scheduled", actor: "system" },
    { id: "ih2", storeId: "cs1", storeLabel: "Vedic Botanicals — WooCommerce", method: "woocommerce", startedAt: "2026-07-24T04:00:00.000Z", finishedAt: "2026-07-24T04:01:12.000Z", durationMs: 72000, status: "completed_with_errors", imported: 6, updated: 33, skipped: 2, deleted: 1, failed: 2, warnings: 4, trigger: "scheduled", actor: "system" },
    { id: "ih3", storeId: "cs3", storeLabel: "GreenLeaf — CSV upload", method: "csv", startedAt: "2026-07-22T11:19:00.000Z", finishedAt: "2026-07-22T11:20:00.000Z", durationMs: 60000, status: "completed_with_errors", imported: 12, updated: 0, skipped: 1, deleted: 0, failed: 1, warnings: 2, trigger: "manual", actor: "seller_ops.khan" },
  ];
  d.logs = [
    { id: "il1", historyId: "ih2", at: "2026-07-24T04:00:11.000Z", level: "warn", message: "Product has no image — imported without one (requireImage rule off).", productRef: "Hemp Seed Oil Cold-Pressed 500ml" },
    { id: "il2", historyId: "ih2", at: "2026-07-24T04:00:29.000Z", level: "error", message: "Price could not be parsed ('—') — product skipped.", productRef: "Bulk Sample Pack" },
    { id: "il3", historyId: "ih2", at: "2026-07-24T04:01:02.000Z", level: "info", message: "Regulated (CBD) product imported as DRAFT — awaiting lab-report approval before it can sell.", productRef: "Full-Spectrum CBD Oil 1000mg 30ml" },
  ];
  d.failures = [
    { id: "if1", historyId: "ih2", storeId: "cs1", at: "2026-07-24T04:00:29.000Z", productRef: "Bulk Sample Pack", code: "invalid_price", message: "Price field was '—' and could not be read as a number.", suggestedFix: "Set a numeric price on the source product, or add a price mapping rule, then retry.", retryable: true },
    { id: "if2", historyId: "ih2", storeId: "cs1", at: "2026-07-24T04:00:44.000Z", productRef: "CBD Vape Cartridge", code: "claims_blocked", message: "Description contained a disease-treatment claim and was rejected at import.", suggestedFix: "Edit the source description to remove cure/treat/prevent wording, then retry.", retryable: true },
    { id: "if3", historyId: "ih3", storeId: "cs3", at: "2026-07-22T11:19:40.000Z", productRef: "Medical Cannabis Flower 5g (Rx)", code: "med_cannabis_blocked", message: "Medical Cannabis cannot be imported through any console (Prohibition A1).", suggestedFix: "Medical Cannabis is prescription-only and is never listed via import. Remove it from the source feed.", retryable: false },
  ];
  d.categoryMap = [
    { id: "cm1", sourcePath: "Health > CBD > Oils", targetCategoryId: "cbd-oils", targetLabel: "CBD Wellness › Oils", auto: false },
    { id: "cm2", sourcePath: "Grocery > Oils", targetCategoryId: "hemp-oils", targetLabel: "Hemp Food › Oils", auto: true },
    { id: "cm3", sourcePath: "Ayurveda > Adaptogens", targetCategoryId: "ayurveda-adaptogens", targetLabel: "Ayurveda › Adaptogens", auto: true },
  ];
  d.attributeMap = [
    { id: "am1", sourceName: "Bottle Size", targetName: "Volume", auto: true },
    { id: "am2", sourceName: "Strength", targetName: "CBD Strength", auto: false },
    { id: "am3", sourceName: "Weight", targetName: "Net Quantity", auto: true },
  ];
  d.brandMap = [
    { id: "bm1", sourceName: "GreenLeaf Naturals", targetBrand: "GreenLeaf Naturals", merged: false, auto: true },
    { id: "bm2", sourceName: "Veda Pure", targetBrand: "VedaPure", merged: true, auto: false },
  ];
}

/* ─────────────────────────── Connected stores ─────────────────────────── */

export async function listStores(): Promise<ConnectedStore[]> {
  return [...db().stores].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export async function findStore(id: string): Promise<ConnectedStore | null> {
  return db().stores.find((s) => s.id === id) ?? null;
}
export async function addStore(s: Omit<ConnectedStore, "id" | "createdAt">): Promise<ConnectedStore> {
  const row: ConnectedStore = { ...s, id: nextId("cs"), createdAt: new Date().toISOString() };
  db().stores.unshift(row);
  return row;
}
export async function patchStore(id: string, patch: Partial<ConnectedStore>): Promise<ConnectedStore | null> {
  const s = db().stores.find((x) => x.id === id);
  if (!s) return null;
  Object.assign(s, patch);
  return s;
}
export async function removeStore(id: string): Promise<boolean> {
  const d = db();
  const n = d.stores.length;
  d.stores = d.stores.filter((s) => s.id !== id);
  return d.stores.length < n;
}

/* ─────────────────────────── History / logs / failures ─────────────────────────── */

export async function listHistory(limit = 50): Promise<ImportHistoryRow[]> {
  return [...db().history].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).slice(0, limit);
}
export async function findHistory(id: string): Promise<ImportHistoryRow | null> {
  return db().history.find((h) => h.id === id) ?? null;
}
export async function addHistory(row: ImportHistoryRow): Promise<void> { db().history.unshift(row); }

export async function listLogs(opts?: { historyId?: string; level?: string; limit?: number }): Promise<ImportLogRow[]> {
  let rows = [...db().logs].sort((a, b) => (a.at < b.at ? 1 : -1));
  if (opts?.historyId) rows = rows.filter((l) => l.historyId === opts.historyId);
  if (opts?.level && opts.level !== "all") rows = rows.filter((l) => l.level === opts.level);
  return rows.slice(0, opts?.limit ?? 200);
}
export async function addLog(row: ImportLogRow): Promise<void> { db().logs.unshift(row); }

export async function listFailures(opts?: { retryableOnly?: boolean; limit?: number }): Promise<FailedImportRow[]> {
  let rows = [...db().failures].sort((a, b) => (a.at < b.at ? 1 : -1));
  if (opts?.retryableOnly) rows = rows.filter((f) => f.retryable);
  return rows.slice(0, opts?.limit ?? 200);
}
export async function addFailure(row: FailedImportRow): Promise<void> { db().failures.unshift(row); }
export async function clearFailure(id: string): Promise<boolean> {
  const d = db();
  const n = d.failures.length;
  d.failures = d.failures.filter((f) => f.id !== id);
  return d.failures.length < n;
}

/* ─────────────────────────── Mappings ─────────────────────────── */

export async function listCategoryMap(): Promise<CategoryMapping[]> { return [...db().categoryMap]; }
export async function upsertCategoryMap(m: Omit<CategoryMapping, "id"> & { id?: string }): Promise<CategoryMapping> {
  const d = db();
  const existing = m.id ? d.categoryMap.find((x) => x.id === m.id) : d.categoryMap.find((x) => x.sourcePath === m.sourcePath);
  if (existing) { Object.assign(existing, m); return existing; }
  const row = { ...m, id: nextId("cm") } as CategoryMapping;
  d.categoryMap.push(row);
  return row;
}
export async function removeCategoryMap(id: string): Promise<void> { const d = db(); d.categoryMap = d.categoryMap.filter((x) => x.id !== id); }

export async function listAttributeMap(): Promise<AttributeMapping[]> { return [...db().attributeMap]; }
export async function upsertAttributeMap(m: Omit<AttributeMapping, "id"> & { id?: string }): Promise<AttributeMapping> {
  const d = db();
  const existing = m.id ? d.attributeMap.find((x) => x.id === m.id) : d.attributeMap.find((x) => x.sourceName === m.sourceName);
  if (existing) { Object.assign(existing, m); return existing; }
  const row = { ...m, id: nextId("am") } as AttributeMapping;
  d.attributeMap.push(row);
  return row;
}
export async function removeAttributeMap(id: string): Promise<void> { const d = db(); d.attributeMap = d.attributeMap.filter((x) => x.id !== id); }

export async function listBrandMap(): Promise<BrandMapping[]> { return [...db().brandMap]; }
export async function upsertBrandMap(m: Omit<BrandMapping, "id"> & { id?: string }): Promise<BrandMapping> {
  const d = db();
  const existing = m.id ? d.brandMap.find((x) => x.id === m.id) : d.brandMap.find((x) => x.sourceName === m.sourceName);
  if (existing) { Object.assign(existing, m); return existing; }
  const row = { ...m, id: nextId("bm") } as BrandMapping;
  d.brandMap.push(row);
  return row;
}
export async function removeBrandMap(id: string): Promise<void> { const d = db(); d.brandMap = d.brandMap.filter((x) => x.id !== id); }

/* ─────────────────────────── Rules ─────────────────────────── */

export async function getRules(): Promise<ImportRules> { return { ...db().rules }; }
export async function saveRules(rules: ImportRules): Promise<void> { db().rules = { ...rules }; }
