/**
 * Product Import & Synchronization — the gates that make a bulk importer safe.
 *
 * A mass importer is exactly the kind of tool that could smuggle an untested
 * cannabinoid product live or list prescription cannabis. These tests prove it
 * can't: MED_CANNABIS is refused (A1), every regulated product lands DRAFT with
 * no CoA and therefore cannot sell (A2), claims copy and bad prices are
 * rejected, and the pure rules/dedupe/change logic behaves.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { NormalizedProduct, ImportRules, ImportOptions } from "@/lib/import/types";
import { defaultRules } from "@/lib/import/types";
import { applyRules } from "@/lib/import/rules";
import { matchOne, detectDuplicates } from "@/lib/import/dedupe";
import { diffProduct } from "@/lib/import/changes";
import { previewImport, runImport, syncStore, isDue, dueStores } from "@/lib/import/service";
import { readCatalog, coaBlocksPublish, updateListing, setStock, findProduct } from "@/lib/catalog";
import { addStore } from "@/lib/import/store";
import type { ConnectedStore } from "@/lib/import/types";

// Reset every in-memory store touched by an import.
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  g.__vhCatalogStore = undefined;
  g.__vhImportDB = undefined;
  g.__vhAuditLog = undefined;
});

function mk(over: Partial<NormalizedProduct> & { title: string }): NormalizedProduct {
  return {
    tags: [], status: "active", guessedClass: "HEMP_FOOD",
    videos: [], documents: [], shipping: {}, seo: {}, identifiers: {}, attributes: [], variants: [],
    ...over,
    sourceId: over.sourceId ?? over.title,
    pricing: { pricePaise: 100000, currency: "INR", ...(over.pricing ?? {}) },
    inventory: { quantity: 10, stockStatus: "in_stock", ...(over.inventory ?? {}) },
    images: over.images ?? [{ url: "https://x/y.jpg" }],
    marketplace: over.marketplace ?? {},
  };
}

const STORE: ConnectedStore = {
  id: "csX", sellerEmail: "seller@t.in", sellerName: "Test Seller", method: "woocommerce",
  label: "Test — Woo", credentialsMasked: {}, createdAt: new Date().toISOString(), health: "healthy", autoPublish: false,
};
const OPTS: ImportOptions = { mode: "everything", duplicateStrategy: "create_new", deleteRemoved: false };

/* ─────────────────────────── Rules engine ─────────────────────────── */

describe("import rules engine", () => {
  const rules: ImportRules = { ...defaultRules(), priceAdjustPct: 10, roundTo: 100 };

  it("marks up price and keeps integer paise", () => {
    const { kept } = applyRules([mk({ title: "A", pricing: { pricePaise: 100000, currency: "INR" } })], rules);
    expect(kept[0]!.pricing.pricePaise).toBe(110000);
    expect(Number.isInteger(kept[0]!.pricing.pricePaise)).toBe(true);
  });

  it("drops out-of-stock when skipOutOfStock is on", () => {
    const r = { ...rules, skipOutOfStock: true };
    const out = applyRules([mk({ title: "OOS", inventory: { quantity: 0, stockStatus: "out_of_stock" } })], r);
    expect(out.kept).toHaveLength(0);
    expect(out.dropped[0]!.reason).toMatch(/out of stock/);
  });

  it("drops imageless products when requireImage is on", () => {
    const out = applyRules([mk({ title: "NoImg", images: [] })], { ...rules, requireImage: true });
    expect(out.kept).toHaveLength(0);
  });

  it("caps the sale discount to maxDiscountPct", () => {
    const out = applyRules([mk({ title: "Sale", pricing: { pricePaise: 100000, salePricePaise: 10000, currency: "INR" } })], { ...defaultRules(), maxDiscountPct: 20, roundTo: 100 });
    // 20% off 100000 = 80000 floor; a 10000 sale is raised to at least 80000.
    expect(out.kept[0]!.pricing.salePricePaise!).toBeGreaterThanOrEqual(80000);
  });
});

/* ─────────────────────────── Dedupe ─────────────────────────── */

describe("duplicate detection", () => {
  const existing = [{ id: "cp1", title: "Hemp Oil 250ml", slug: "hemp-oil-250ml", sku: "HO-250" }];

  it("matches by SKU first with full confidence", () => {
    const m = matchOne(mk({ title: "Anything", sku: "HO-250" }), existing);
    expect(m?.signal).toBe("sku");
    expect(m?.confidence).toBe(1);
  });
  it("falls back to a title match", () => {
    const m = matchOne(mk({ title: "Hemp Oil 250ml" }), existing);
    expect(m?.signal).toBe("title");
  });
  it("returns nothing for a genuinely new product", () => {
    expect(matchOne(mk({ title: "Brand New", sku: "ZZ-9" }), existing)).toBeNull();
  });
  it("detectDuplicates keys by sourceId", () => {
    const map = detectDuplicates([mk({ title: "Hemp Oil 250ml", sourceId: "s1" })], existing);
    expect(map.get("s1")?.matchedListingId).toBe("cp1");
  });
});

/* ─────────────────────────── Change detection ─────────────────────────── */

describe("change detection", () => {
  it("flags price and stock changes", () => {
    const a = mk({ title: "P", pricing: { pricePaise: 100000, currency: "INR" }, inventory: { quantity: 5 } });
    const b = mk({ title: "P", pricing: { pricePaise: 120000, currency: "INR" }, inventory: { quantity: 2 } });
    const kinds = diffProduct(a, b).map((c) => c.kind);
    expect(kinds).toContain("price");
    expect(kinds).toContain("stock");
  });
});

/* ─────────────────────────── A1 — MED_CANNABIS blocked ─────────────────────────── */

describe("A1 — Medical Cannabis is never imported", () => {
  const med = mk({ title: "Medical Cannabis Flower 5g", guessedClass: "MED_CANNABIS", marketplace: { thcPercent: 18 }, pricing: { pricePaise: 300000, currency: "INR" } });

  it("preview marks it blocked, never create", async () => {
    const p = await previewImport([med], defaultRules(), OPTS);
    expect(p.counts.blockedMedical).toBe(1);
    expect(p.counts.create).toBe(0);
  });

  it("run blocks it, records a non-retryable failure, and creates no listing", async () => {
    const before = (await readCatalog()).length;
    const summary = await runImport({ store: STORE, products: [med], rules: defaultRules(), options: OPTS, actor: "admin@t.in" });
    expect(summary.blockedMedical).toBe(1);
    expect(summary.imported).toBe(0);
    const fail = summary.failures.find((f) => f.code === "med_cannabis_blocked");
    expect(fail).toBeTruthy();
    expect(fail!.retryable).toBe(false);
    expect((await readCatalog()).length).toBe(before); // nothing created
    // No MED_CANNABIS ever reached the catalogue.
    expect((await readCatalog()).some((p) => p.cls === "MED_CANNABIS")).toBe(false);
  });
});

/* ─────────────────────────── A2 — regulated lands gated ─────────────────────────── */

describe("A2 — imported regulated products cannot sell without a lab report", () => {
  const cbd = mk({ title: "Imported CBD Oil 1000mg", guessedClass: "CBD_WELLNESS", pricing: { pricePaise: 250000, currency: "INR" }, marketplace: { cbdPercent: 10 } });

  it("creates the CBD product as DRAFT with no CoA, and the publish gate blocks it", async () => {
    const summary = await runImport({ store: STORE, products: [cbd], rules: defaultRules(), options: OPTS, actor: "admin@t.in" });
    expect(summary.imported).toBe(1);
    expect(summary.gatedRegulated).toBe(1);

    const created = (await readCatalog()).find((p) => p.title === "Imported CBD Oil 1000mg");
    expect(created).toBeTruthy();
    expect(created!.status).toBe("DRAFT");
    expect(created!.coaState).toBe("NONE");
    // The catalogue's own publish gate agrees it cannot go live.
    expect(coaBlocksPublish({ cls: created!.cls, coaState: created!.coaState })).toBe(true);
  });
});

/* ─────────────────────────── Claims + price validation ─────────────────────────── */

describe("import validation gates", () => {
  it("blocks a product whose copy makes a disease-treatment claim", async () => {
    const p = await previewImport([mk({ title: "Miracle Balm", description: "Clinically proven to cure anxiety and treat pain." })], defaultRules(), OPTS);
    expect(p.counts.block).toBeGreaterThanOrEqual(1);
    expect(p.decisions.some((d) => d.decision.action === "block" && d.decision.code === "claims_blocked")).toBe(true);
  });

  it("blocks a product with a non-positive price", async () => {
    const p = await previewImport([mk({ title: "Freebie", pricing: { pricePaise: 0, currency: "INR" } })], defaultRules(), OPTS);
    expect(p.decisions.some((d) => d.decision.action === "block" && d.decision.code === "invalid_price")).toBe(true);
  });
});

/* ─────────────────────────── Synchronization ─────────────────────────── */

describe("store synchronization", () => {
  async function connect(): Promise<ConnectedStore> {
    return addStore({
      sellerEmail: "sync@t.in", sellerName: "Sync Test Store", method: "woocommerce",
      label: "Sync — Woo", endpoint: "https://sync-test.example", credentialsMasked: {},
      health: "healthy", autoPublish: false, schedule: "daily",
    });
  }
  const mine = async () => (await readCatalog()).filter((p) => p.sellerEmail === "sync@t.in");

  it("first sync imports demo products as DRAFT and refuses Medical Cannabis (A1)", async () => {
    const store = await connect();
    const s = await syncStore({ storeId: store.id, actor: "admin@t.in", trigger: "manual" });
    expect(s).toBeTruthy();
    expect(s!.imported).toBeGreaterThan(0);
    expect(s!.blockedMedical).toBeGreaterThanOrEqual(1);
    expect((await readCatalog()).some((p) => p.cls === "MED_CANNABIS")).toBe(false);
    const listings = await mine();
    expect(listings.length).toBe(s!.imported);
    expect(listings.every((p) => p.status === "DRAFT")).toBe(true);
  });

  it("re-syncing does not create duplicates and reports no changes", async () => {
    const store = await connect();
    await syncStore({ storeId: store.id, actor: "a@t.in" });
    const before = (await readCatalog()).length;
    const s2 = await syncStore({ storeId: store.id, actor: "a@t.in" });
    expect(s2!.imported).toBe(0);     // everything matched an existing listing
    expect(s2!.updated).toBe(0);      // deterministic re-fetch → nothing moved
    expect((await readCatalog()).length).toBe(before); // no duplicates created
  });

  it("applies a real price/stock update when the source differs", async () => {
    const store = await connect();
    await syncStore({ storeId: store.id, actor: "a@t.in" });
    const target = (await mine())[0]!;
    await updateListing(target.id, { pricePaise: target.pricePaise + 50000 });
    await setStock(target.id, target.stockQty + 7);

    const s = await syncStore({ storeId: store.id, actor: "a@t.in" });
    expect(s!.updated).toBeGreaterThanOrEqual(1);
    const after = await findProduct(target.id);
    expect(after!.pricePaise).toBe(target.pricePaise);          // source value restored
    expect(Number.isInteger(after!.pricePaise)).toBe(true);      // still integer paise
    expect(s!.changes.some((c) => c.kind === "price")).toBe(true);
    expect(s!.changes.some((c) => c.kind === "stock")).toBe(true);
  });

  it("returns null for an unknown store", async () => {
    expect(await syncStore({ storeId: "no-such-store", actor: "a@t.in" })).toBeNull();
  });
});

/* ─────────────────────────── Sync cadence ─────────────────────────── */

describe("sync cadence (isDue / dueStores)", () => {
  const now = Date.UTC(2026, 6, 24, 12, 0, 0);
  const overHourAgo = new Date(now - 3_600_000 - 1000).toISOString();

  it("manual and realtime cadences are never due", () => {
    expect(isDue({ schedule: "manual", lastSyncAt: overHourAgo }, now)).toBe(false);
    expect(isDue({ schedule: "realtime", lastSyncAt: overHourAgo }, now)).toBe(false);
  });
  it("a time-based cadence never synced is due immediately", () => {
    expect(isDue({ schedule: "daily" }, now)).toBe(true);
  });
  it("hourly is due after an hour, not before", () => {
    expect(isDue({ schedule: "hourly", lastSyncAt: overHourAgo }, now)).toBe(true);
    expect(isDue({ schedule: "hourly", lastSyncAt: new Date(now - 60_000).toISOString() }, now)).toBe(false);
  });
  it("dueStores selects only the due stores", () => {
    const list = [
      { schedule: "daily" },                                   // never synced → due
      { schedule: "manual", lastSyncAt: overHourAgo },         // manual → never
      { schedule: "hourly", lastSyncAt: overHourAgo },         // elapsed → due
    ];
    expect(dueStores(list, now).length).toBe(2);
  });
});
