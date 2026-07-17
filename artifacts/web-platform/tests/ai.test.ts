/**
 * AI listing-risk read model — the /admin/ai claims-strike queue.
 *
 * Pure: the queue is a deterministic projection of the catalogue, surfacing
 * exactly the listings that earned a claims-strike (A1). The AI ranks; the
 * strike is the real block. Runs under the shared setup like every vitest file.
 */
import { describe, it, expect } from "vitest";
import { listingRiskQueue, draftListingDescription, aiComplete } from "@/lib/ai";
import { CLAIMS_LANGUAGE } from "@/lib/claims";

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

describe("draftListingDescription — the assistant's claims-free drafter", () => {
  const TITLES = [
    "CBD Wellness Balm 30g", "Cold-Pressed Hemp Seed Oil 250ml", "Hemp Protein Powder 500g",
    "CBD Ayurvedic Tincture 10ml", "Ashwagandha Root Extract 60 caps", "CBD Muscle Relief Roll-On 50ml",
  ];
  it("never emits claims language, for any listing or variant (by construction)", () => {
    for (const title of TITLES) {
      for (const cls of ["CBD_WELLNESS", "AYURVEDA", "HEMP_FOOD"]) {
        for (const variant of [0, 1, 2, -1]) {
          const text = draftListingDescription({ title, cls }, variant);
          expect(CLAIMS_LANGUAGE.test(text), `"${text}"`).toBe(false);
        }
      }
    }
  });
  it("is deterministic and Regenerate yields a genuinely different draft", () => {
    const a0 = draftListingDescription({ title: "CBD Wellness Balm 30g", cls: "CBD_WELLNESS" }, 0);
    const a0again = draftListingDescription({ title: "CBD Wellness Balm 30g", cls: "CBD_WELLNESS" }, 0);
    const a1 = draftListingDescription({ title: "CBD Wellness Balm 30g", cls: "CBD_WELLNESS" }, 1);
    expect(a0).toBe(a0again); // pure
    expect(a1).not.toBe(a0);  // regenerate changes it
  });
  it("names the product and states no claims are made", () => {
    const text = draftListingDescription({ title: "Hemp Protein Powder 500g", cls: "HEMP_FOOD" }, 0);
    expect(text).toContain("Hemp Protein Powder 500g");
    expect(text.toLowerCase()).toContain("no disease or medical claims");
  });
});

describe("aiComplete claims gate (the seam the assistant generates through)", () => {
  it("returns the fallback with no API key, and it passes the claims check", async () => {
    const { text, provider } = await aiComplete("irrelevant with no key", () =>
      draftListingDescription({ title: "CBD Wellness Balm 30g", cls: "CBD_WELLNESS" }, 0));
    expect(provider).toBe("rules-engine");
    expect(CLAIMS_LANGUAGE.test(text)).toBe(false);
  });
  it("a claims-laden fallback is caught by the gate (throws rather than emit a claim)", async () => {
    // If the ONLY available text carries a claim, the seam must not return it.
    await expect(aiComplete("x", () => "This product cures anxiety and treats pain.")).rejects.toThrow();
  });
});
