/**
 * AI listing-risk read model — the /admin/ai claims-strike queue.
 *
 * Pure: the queue is a deterministic projection of the catalogue, surfacing
 * exactly the listings that earned a claims-strike (A1). The AI ranks; the
 * strike is the real block. Runs under the shared setup like every vitest file.
 */
import { describe, it, expect } from "vitest";
import { listingRiskQueue } from "@/lib/ai";

const P = (over: Partial<{ id: string; title: string; seller: string; claimsStrike: boolean }>) => ({
  id: "p1", title: "Hemp Protein 500g", seller: "Himalayan Hemp Co.", ...over,
});

describe("listingRiskQueue", () => {
  it("is empty when no listing carries a strike", () => {
    expect(listingRiskQueue([P({}), P({ id: "p2", claimsStrike: false })])).toEqual([]);
  });

  it("surfaces ONLY the struck listings, with the A1 finding", () => {
    const rows = listingRiskQueue([
      P({ id: "clean", claimsStrike: false }),
      P({ id: "struck", title: "Sleep Drops 15ml", seller: "Ananda Foods", claimsStrike: true }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "struck", listing: "Sleep Drops 15ml", seller: "Ananda Foods", score: 88 });
    expect(rows[0]!.finding).toMatch(/barred from advertising/i);
  });

  it("ranks by score then title (stable, deterministic)", () => {
    const rows = listingRiskQueue([
      P({ id: "b", title: "Zeta Balm", claimsStrike: true }),
      P({ id: "a", title: "Alpha Oil", claimsStrike: true }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]); // same score → alphabetical
  });

  it("treats a missing claimsStrike as not-struck (fail closed to 'no risk shown')", () => {
    expect(listingRiskQueue([P({ id: "x" })])).toEqual([]); // undefined strike → excluded
  });
});
