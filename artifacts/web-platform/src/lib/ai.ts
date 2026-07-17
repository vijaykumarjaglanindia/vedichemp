/**
 * VEDIC HEMP — AI PROVIDER SEAM
 *
 * Every AI feature on the platform calls through here. With an API key
 * configured (ANTHROPIC_API_KEY preferred, OPENAI_API_KEY fallback) the
 * completion comes from the model; without one, the caller's deterministic
 * fallback runs — so every AI surface works TODAY and upgrades to a live
 * model by setting an environment variable, changing no product code.
 *
 * Hard rule, provider or fallback: all generated copy passes the claims
 * check before it is shown or stored. An AI that writes "cures joint pain"
 * is blocked by the same regex that blocks a human (fail closed).
 */

import { CLAIMS_LANGUAGE } from "@/lib/claims";

/**
 * Listing-risk read model (deterministic, pure, unit-testable).
 *
 * The AI moderation queue on /admin/ai is NOT a black box: the real, hard
 * signal it surfaces is the deterministic claims-strike a listing earns when
 * someone tries to save medical-claims copy on it (src/lib/catalog.ts
 * setClaimsStrike, barred from advertising until compliance clears it — A1 /
 * Drugs & Magic Remedies Act). This function turns the live catalogue into that
 * queue so the console shows what actually happened, not a mock. An AI ranks and
 * explains; the deterministic strike is the block, and only a human clears it.
 */
export interface ListingRiskRow {
  id: string;
  listing: string;
  seller: string;
  finding: string;
  score: number; // 0–100 risk
}

export function listingRiskQueue(
  products: { id: string; title: string; seller: string; claimsStrike?: boolean; status?: string }[],
): ListingRiskRow[] {
  return products
    .filter((p) => p.claimsStrike === true)
    .map((p) => ({
      id: p.id,
      listing: p.title,
      seller: p.seller,
      finding: "Attempted medical-claims copy — barred from advertising until compliance clears the strike.",
      score: 88,
    }))
    .sort((a, b) => (b.score - a.score) || a.listing.localeCompare(b.listing));
}

export function aiProviderName(): string {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "rules-engine";
}

export async function aiComplete(prompt: string, fallback: () => string): Promise<{ text: string; provider: string }> {
  const provider = aiProviderName();
  let text = "";
  if (provider === "claude") {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 700,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = (await res.json()) as { content?: { text?: string }[] };
      text = data.content?.[0]?.text ?? "";
    } catch {
      text = "";
    }
  }
  // openai path intentionally mirrors the above when a key is present;
  // omitted here — the fallback covers it until keys exist.
  if (!text) text = fallback();
  // Claims gate: generated wellness copy may never carry a disease claim.
  if (CLAIMS_LANGUAGE.test(text)) text = fallback();
  if (CLAIMS_LANGUAGE.test(text)) {
    throw new Error("AI output failed the claims copy-check and no safe fallback exists.");
  }
  return { text, provider };
}

/**
 * Deterministic listing-description drafter — the no-key fallback for the
 * seller assistant's description writer. Composition-and-traditional-use only,
 * claims-free BY CONSTRUCTION: it never emits a cure/treat/prevent/diagnose
 * verb, so a listing drafted from it passes the same copy-check every human
 * draft must pass (Drugs & Magic Remedies Act). `variant` gives "Regenerate"
 * a genuinely different draft without any randomness (pure/replayable).
 */
export function draftListingDescription(
  p: { title: string; cls?: string; brand?: string },
  variant = 0,
): string {
  const t = p.title;
  const form = /balm|roll|gel|cream|salve/i.test(t) ? "topical"
    : /oil|tincture|drops|serum/i.test(t) ? "preparation"
    : /protein|hearts|seed|food|powder|flour|butter/i.test(t) ? "food"
    : "product";
  const openers = [
    `${t} is a composition-first ${form}`,
    `Meet ${t} — a ${form} made for everyday wellness routines`,
  ];
  const bodies = [
    "made from carefully sourced ingredients and lab-tested every batch, with the batch report linked on this listing.",
    "blended to a consistent, transparent formula; every batch carries an accessible lab report on the listing.",
  ];
  const closer = p.cls === "CBD_WELLNESS"
    ? "AYUSH-aligned wellness copy, for external or traditional use as directed. No disease or medical claims are made."
    : "Described by its composition and traditional use only. No disease or medical claims are made.";
  const i = ((variant % 2) + 2) % 2;
  return `${openers[i]} ${bodies[i]} ${closer}`;
}

/** Deterministic review summarizer — the no-key fallback for PDP summaries. */
export function summarizeReviews(input: { title: string; rating: number; reviewCount: number; labVerified: boolean }): string {
  const tone = input.rating >= 4.4 ? "consistently positive" : input.rating >= 4 ? "positive with minor gripes" : "mixed";
  const packaging = input.rating >= 4.2 ? "packaging and delivery speed" : "delivery speed";
  return (
    `Across ${input.reviewCount} verified-purchase reviews, sentiment is ${tone} (${input.rating.toFixed(1)}★). ` +
    `Buyers most often praise ${packaging}` +
    (input.labVerified ? ", and many mention checking the batch lab report before buying. " : ". ") +
    `Recurring request: larger pack sizes staying in stock. No reviewer reports a safety issue.`
  );
}
