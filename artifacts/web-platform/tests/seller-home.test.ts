/**
 * Seller-home read model — pure projections of the live stores.
 *
 * The load-bearing one is blockersFrom: it IS the A2 gate (coaBlocksPublish),
 * so a regulated listing without an APPROVED CoA surfaces as a blocker and an
 * approved one never does. Runs under the shared setup like every vitest file.
 */
import { describe, it, expect } from "vitest";
import { blockersFrom, lowStockFrom, kpisFrom, SELLER_STORE } from "@/lib/seller-home";

const listing = (over: Record<string, unknown>) => ({
  id: "p1", title: "CBD Balm", cls: "CBD_WELLNESS", coaState: "APPROVED", batchCode: "VB-1",
  status: "LIVE", stockQty: 100, lowStockAt: 10,
  ...over,
}) as never;

describe("blockersFrom — the A2 gate as a dashboard read", () => {
  it("surfaces a regulated listing with no approved CoA", () => {
    const b = blockersFrom([
      listing({ id: "ok", coaState: "APPROVED" }),
      listing({ id: "missing", coaState: "NONE", status: "DRAFT" }),
      listing({ id: "pending", coaState: "PENDING_REVIEW", status: "UNDER_REVIEW" }),
      listing({ id: "rejected", coaState: "REJECTED", status: "DRAFT" }),
    ]);
    expect(b.map((x) => x.productId).sort()).toEqual(["missing", "pending", "rejected"]);
  });
  it("never blocks a non-regulated class, whatever its CoA state", () => {
    expect(blockersFrom([listing({ id: "food", cls: "HEMP_FOOD", coaState: "NONE", status: "DRAFT" })])).toEqual([]);
  });
  it("excludes archived listings (not an OPEN blocker)", () => {
    expect(blockersFrom([listing({ id: "arch", coaState: "NONE", status: "ARCHIVED" })])).toEqual([]);
  });
  it("an APPROVED regulated listing is never a blocker", () => {
    expect(blockersFrom([listing({ coaState: "APPROVED" })])).toEqual([]);
  });
});

describe("lowStockFrom", () => {
  it("flags LIVE listings at or below their own threshold, excluding stockouts", () => {
    const rows = lowStockFrom([
      listing({ id: "low", stockQty: 5, lowStockAt: 10 }),
      listing({ id: "ok", stockQty: 50, lowStockAt: 10 }),
      listing({ id: "out", stockQty: 0, lowStockAt: 10 }),
      listing({ id: "draft", stockQty: 2, lowStockAt: 10, status: "DRAFT" }),
    ]);
    expect(rows.map((r) => r.productId)).toEqual(["low"]);
  });
});

describe("kpisFrom — GMV is the seller's SHARE of each order", () => {
  const order = (ref: string, placedAt: string, lines: { seller: string; linePaise: number }[]) => ({
    reference: ref, placedAt, items: lines.map((l) => ({ ...l, productId: "x", title: "t", emoji: "•", qty: 1, unitPaise: l.linePaise })),
  }) as never;

  it("sums only this seller's line items", () => {
    const k = kpisFrom([
      order("A", "2026-07-19T10:00:00Z", [{ seller: SELLER_STORE, linePaise: 10000 }, { seller: "Other Co.", linePaise: 99999 }]),
      order("B", "2026-07-19T11:00:00Z", [{ seller: SELLER_STORE, linePaise: 20000 }]),
    ], "2026-07-19");
    expect(k.gmvPaise).toBe(30000); // 10000 + 20000, the other seller's 99999 excluded
    expect(k.orders).toBe(2);
    expect(k.aovPaise).toBe(15000);
  });
  it("buckets the daily series by placedAt and covers exactly `days` days", () => {
    const k = kpisFrom([order("A", "2026-07-19T09:00:00Z", [{ seller: SELLER_STORE, linePaise: 5000 }])], "2026-07-19", 7);
    expect(k.series).toHaveLength(7);
    expect(k.series[k.series.length - 1]).toEqual({ label: "07-19", paise: 5000 }); // today's bucket
    expect(k.series.slice(0, 6).every((d) => d.paise === 0)).toBe(true); // earlier days empty
  });
  it("empty orders → zero KPIs, no divide-by-zero", () => {
    const k = kpisFrom([], "2026-07-19");
    expect(k).toMatchObject({ gmvPaise: 0, orders: 0, aovPaise: 0 });
  });

  it("scopes GMV/orders/series to the selected window (the period selector is real)", () => {
    const recent = order("R", "2026-07-18T09:00:00Z", [{ seller: SELLER_STORE, linePaise: 10000 }]); // 1 day ago
    const old = order("O", "2026-06-25T09:00:00Z", [{ seller: SELLER_STORE, linePaise: 90000 }]); // ~24 days ago
    const week = kpisFrom([recent, old], "2026-07-19", 7);
    expect(week.gmvPaise).toBe(10000); // the 24-day-old order is outside the 7-day window
    expect(week.orders).toBe(1);
    expect(week.series).toHaveLength(7);
    const quarter = kpisFrom([recent, old], "2026-07-19", 90);
    expect(quarter.gmvPaise).toBe(100000); // both orders inside a 90-day window
    expect(quarter.orders).toBe(2);
    expect(quarter.series).toHaveLength(90);
  });
});
