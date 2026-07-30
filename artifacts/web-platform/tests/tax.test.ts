/**
 * GST rate table — the slabs are the operator's to change, and a change must not
 * restate history. These prove the resolution order (longest HSN prefix, then the
 * compliance class, then the fallback), that the as-of date picks the slab that
 * was in force then, and that the store refuses a row it could not apply.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  gstRateBps, readTaxRates, writeTaxRates, splitInclusiveGst,
  GST_FALLBACK_BPS, GST_RATE_DEFAULTS, type GstRate,
} from "@/lib/tax";

beforeEach(() => { (globalThis as Record<string, unknown>).__vhTaxRates = undefined; });

describe("GST rate resolution", () => {
  it("prefers the longest matching HSN prefix over the class fallback", async () => {
    await writeTaxRates([
      { hsnPrefix: "30", bps: 500, effectiveFrom: "2020-01-01" },
      { hsnPrefix: "3004", bps: 1200, effectiveFrom: "2020-01-01" },
      { cls: "AYURVEDA", bps: 1800, effectiveFrom: "2020-01-01" },
    ]);
    expect(gstRateBps("30049011", "AYURVEDA", "2026-01-01")).toBe(1200); // longest prefix
    expect(gstRateBps("3006", "AYURVEDA", "2026-01-01")).toBe(500);      // shorter prefix
    expect(gstRateBps(undefined, "AYURVEDA", "2026-01-01")).toBe(1800);  // class fallback
  });

  it("falls back when neither an HSN nor a class row covers the line", async () => {
    await writeTaxRates([{ cls: "HEMP_FOOD", bps: 500, effectiveFrom: "2020-01-01" }]);
    expect(gstRateBps(undefined, "CBD_WELLNESS", "2026-01-01")).toBe(GST_FALLBACK_BPS);
  });

  it("ships a usable default table", async () => {
    expect(GST_RATE_DEFAULTS.length).toBeGreaterThan(0);
    // With no admin edit, a hemp food line still resolves to a real slab.
    expect(gstRateBps(undefined, "HEMP_FOOD", "2026-01-01")).toBeLessThan(GST_FALLBACK_BPS);
  });
});

describe("a rate change does not restate history", () => {
  const table: GstRate[] = [
    { cls: "CBD_WELLNESS", bps: 1200, effectiveFrom: "2020-01-01" },
    { cls: "CBD_WELLNESS", bps: 1800, effectiveFrom: "2026-04-01" },
  ];

  it("an invoice keeps the slab in force on its own order date", async () => {
    await writeTaxRates(table);
    // Raised before the change — reprinting it must still yield 12%.
    expect(gstRateBps(undefined, "CBD_WELLNESS", "2026-03-31")).toBe(1200);
    // Raised on/after the change — 18%.
    expect(gstRateBps(undefined, "CBD_WELLNESS", "2026-04-01")).toBe(1800);
    expect(gstRateBps(undefined, "CBD_WELLNESS", "2026-09-09")).toBe(1800);
  });

  it("a slab scheduled for the future does not apply yet", async () => {
    await writeTaxRates([
      { cls: "HEMP_FOOD", bps: 500, effectiveFrom: "2020-01-01" },
      { cls: "HEMP_FOOD", bps: 900, effectiveFrom: "2099-01-01" },
    ]);
    expect(gstRateBps(undefined, "HEMP_FOOD", "2026-07-30")).toBe(500);
  });
});

describe("the store refuses rows it could not apply", () => {
  it("drops a row with no date of effect, no target, or a bad rate", async () => {
    await writeTaxRates([
      { cls: "HEMP_FOOD", bps: 500, effectiveFrom: "2020-01-01" },     // keep
      { cls: "AYURVEDA", bps: 1200, effectiveFrom: "not-a-date" },      // drop
      { bps: 1800, effectiveFrom: "2020-01-01" },                       // drop: no target
      { cls: "CBD_WELLNESS", bps: -5, effectiveFrom: "2020-01-01" },    // drop: negative
    ]);
    const rows = await readTaxRates();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.cls).toBe("HEMP_FOOD");
  });

  it("readTaxRates hands back copies, so a caller cannot mutate the table", async () => {
    await writeTaxRates([{ cls: "HEMP_FOOD", bps: 500, effectiveFrom: "2020-01-01" }]);
    const rows = await readTaxRates();
    rows[0]!.bps = 9999;
    expect((await readTaxRates())[0]!.bps).toBe(500);
  });
});

describe("inclusive split stays integer paise", () => {
  it("tax + taxable always reconstitutes the inclusive total", () => {
    for (const total of [100000, 249900, 39900, 1, 7777]) {
      for (const bps of [500, 1200, 1800]) {
        const b = splitInclusiveGst(total, bps, false);
        expect(Number.isInteger(b.gstPaise)).toBe(true);
        expect(Number.isInteger(b.taxablePaise)).toBe(true);
        expect(b.taxablePaise + b.gstPaise).toBe(total);
      }
    }
  });

  it("splits into CGST/SGST intra-state and IGST inter-state", () => {
    const intra = splitInclusiveGst(118000, 1800, false);
    expect(intra.cgstPaise + intra.sgstPaise).toBe(intra.gstPaise);
    expect(intra.igstPaise).toBe(0);
    const inter = splitInclusiveGst(118000, 1800, true);
    expect(inter.igstPaise).toBe(inter.gstPaise);
    expect(inter.cgstPaise).toBe(0);
  });
});
