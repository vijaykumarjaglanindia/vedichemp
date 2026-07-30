import { describe, it, expect, beforeEach } from "vitest";
import { financeSummary, TCS_RATE_BPS, TDS_RATE_BPS } from "@/lib/finance-summary";

/**
 * financeSummary aggregates the REAL stores. Both of them start EMPTY — a
 * settlement run is money and only exists once a maker created it and a checker
 * posted it — so these tests put the runs in themselves and then pin the
 * derivations, so a regression to hand-typed constants fails the build.
 */

const ST1 = { grossPaise: 9_39_100_00, commissionPaise: 93_900_00 }; // POSTED, Vedic Botanicals
const ST2 = { grossPaise: 4_58_700_00, commissionPaise: 45_900_00 }; // AWAITING, Himalayan Hemp Co.
const ST3 = { grossPaise: 2_26_000_00, commissionPaise: 22_600_00 }; // POSTED, Ananda Foods

const g = globalThis as { __vhOrders?: unknown; __vhSettlements?: unknown };

const run = (id: string, seller: string, f: { grossPaise: number; commissionPaise: number }, status: string, createdAt: string) => ({
  id, seller, period: "test period",
  grossPaise: f.grossPaise, commissionPaise: f.commissionPaise, netPaise: f.grossPaise - f.commissionPaise,
  status, maker: "maker@vh.test", ...(status === "POSTED" ? { checker: "checker@vh.test", postedAt: createdAt } : {}),
  createdAt, orderRefs: [],
});

beforeEach(() => {
  // Empty order book; three settlement runs written straight into the store the
  // same way createRun()/postRun() would leave them.
  g.__vhOrders = undefined;
  g.__vhSettlements = {
    runs: [
      run("st1", "Vedic Botanicals", ST1, "POSTED", "2026-07-01"),
      run("st2", "Himalayan Hemp Co.", ST2, "AWAITING_CHECKER", "2026-07-01"),
      run("st3", "Ananda Foods", ST3, "POSTED", "2026-06-16"),
    ],
    seq: 4,
  };
});

describe("financeSummary", () => {
  it("reports zeros with no settlement runs — nothing has been settled yet", async () => {
    g.__vhSettlements = undefined;
    const fin = await financeSummary();
    expect(fin.settledGrossPaise).toBe(0);
    expect(fin.commissionPaise).toBe(0);
    expect(fin.tcsPaise).toBe(0);
    expect(fin.tdsPaise).toBe(0);
    expect(fin.revenueBySeller).toEqual([]);
  });

  it("recognises commission and take rate only from posted runs / all runs", async () => {
    const fin = await financeSummary();

    // Recognised revenue = POSTED runs only (st1 + st3).
    expect(fin.settledGrossPaise).toBe(ST1.grossPaise + ST3.grossPaise);
    expect(fin.commissionPaise).toBe(ST1.commissionPaise + ST3.commissionPaise);

    // Take rate = all commission ÷ all gross (schedule ≈ 10%).
    const allGross = ST1.grossPaise + ST2.grossPaise + ST3.grossPaise;
    const allComm = ST1.commissionPaise + ST2.commissionPaise + ST3.commissionPaise;
    expect(fin.takeRateBps).toBe(Math.round((allComm * 10000) / allGross));
    expect(fin.takeRateBps).toBeGreaterThan(0);
  });

  it("derives TCS/TDS from posted settlement gross at the named statutory rates", async () => {
    const fin = await financeSummary();
    const base = ST1.grossPaise + ST3.grossPaise;
    expect(fin.tcsPaise).toBe(Math.round((base * TCS_RATE_BPS) / 10000));
    expect(fin.tdsPaise).toBe(Math.round((base * TDS_RATE_BPS) / 10000));
  });

  it("reports zero GMV/GST with an empty order book, then reflects placed orders", async () => {
    let fin = await financeSummary();
    expect(fin.gmvPaise).toBe(0);
    expect(fin.gstCollectedPaise).toBe(0);
    expect(fin.orderCount).toBe(0);

    // Seed one order directly into the store the same way createOrder would.
    g.__vhOrders = {
      orders: [{ reference: "VH1", totalPaise: 1_499_00, gstPaise: 228_66, subtotalPaise: 1_499_00, status: "PLACED" }],
      byKey: {},
      seq: 2,
    };
    fin = await financeSummary();
    expect(fin.gmvPaise).toBe(1_499_00);
    expect(fin.gstCollectedPaise).toBe(228_66);
    expect(fin.orderCount).toBe(1);
    // GST feeds the tax total alongside TCS/TDS.
    expect(fin.taxTotalPaise).toBe(fin.gstCollectedPaise + fin.tcsPaise + fin.tdsPaise);
  });

  it("ranks recognised commission revenue by seller, descending", async () => {
    const fin = await financeSummary();
    expect(fin.revenueBySeller.map((r) => r.seller)).toEqual(["Vedic Botanicals", "Ananda Foods"]);
    expect(fin.revenueBySeller[0]?.commissionPaise).toBe(ST1.commissionPaise);
    // The AWAITING run's seller is not recognised yet.
    expect(fin.revenueBySeller.some((r) => r.seller === "Himalayan Hemp Co.")).toBe(false);
  });
});
