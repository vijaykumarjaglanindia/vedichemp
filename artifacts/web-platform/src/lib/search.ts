/**
 * VEDIC HEMP — CATALOGUE SEARCH (server-side)
 *
 * Synonym expansion (Hindi/Hinglish and category terms) plus light typo
 * tolerance. Runs entirely on the server over the permitted-class universe —
 * MED_CANNABIS is filtered out of the corpus before this code ever sees it,
 * so no query can surface it (A1: absent, not hidden).
 */

const SYNONYMS: Record<string, string[]> = {
  bhang: ["hemp"],
  vijaya: ["hemp"],
  beej: ["seed", "hearts"],
  tel: ["oil"],
  churna: ["triphala", "powder"],
  neend: ["ashwagandha", "sleep"],
  protein: ["protein"],
  massage: ["balm", "roll-on"],
  workout: ["balm", "roll-on", "protein"],
};

/** Levenshtein distance capped at 3 — enough for common typos, cheap to run. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j] ?? 0;
      prev[j] = Math.min((prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length] ?? 3;
}

/** Expand a raw query into search terms: original words + synonym mappings. */
export function expandQuery(q: string): string[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set<string>(words);
  for (const w of words) for (const syn of SYNONYMS[w] ?? []) out.add(syn);
  return [...out];
}

/** True if any expanded term matches the haystack — exact, or fuzzily for longer words. */
export function matchesQuery(hay: string, q: string): boolean {
  const h = hay.toLowerCase();
  const hayWords = h.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  return expandQuery(q).some((term) => {
    if (h.includes(term)) return true;
    if (term.length < 5) return false;
    return hayWords.some((w) => editDistance(term, w) <= (term.length >= 8 ? 2 : 1));
  });
}
