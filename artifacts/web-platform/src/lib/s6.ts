/**
 * VEDIC HEMP — §6 HEALTH-DATA GUARD (pure, no side effects)
 *
 * Constitution §6: "No health data appears in a log line, an analytics event, a
 * push body, or an email subject."
 *
 * IMPORTANT — what this is and is NOT. The PRIMARY §6 guarantee is that emitters
 * send only templated, health-data-free copy: no notification interpolates a
 * prescription note, a diagnosis, or any clinical free text (the outbox makes
 * that auditable). This module is a DEFENSIVE BACKSTOP over a curated deny-list
 * of clinical/diagnostic vocabulary — it catches the common cases if an emitter
 * is careless, but a name-based deny-list can never be exhaustive, so it is not
 * a substitute for keeping health data out of the message in the first place.
 * The outbox surfaces both: the (redaction) count AND the full stream, so a leak
 * a match misses is still visible for review rather than hidden behind a green
 * "all clear".
 *
 * The list is clinical vocabulary, NOT process words: "order", "prescription"
 * (the process), "refund", "batch", "recall", "delivery" describe what happened,
 * not a person's health. Product names on Vedic Hemp never contain a condition
 * (a listing named for one is a medical claim, already barred by the claims
 * check). A permissive suffix tail absorbs ordinary inflections (plural /
 * adjectival / gerund) of every stem.
 *
 * Fail closed on the LEAK (the term is redacted before anything is sent); fail
 * open on DELIVERY (the sanitised message still goes out — buyers are never
 * collateral for an emitter's mistake). A redaction is counted so it's loud.
 */

/** Clinical / diagnostic vocabulary. Each stem carries its own explicit
 *  inflection group (irregular endings like epileP-SY or diagnoS-IS can't ride a
 *  single generic tail), so ordinary plural / adjectival / gerund forms are all
 *  caught. Bigram pain terms are listed literally so bare "pain" never trips. */
const HEALTH_ALTERNATIVES = [
  "diagnos(?:is|es|ed|e|ing|tic)", "symptoms?",
  "epilep(?:sy|tic)s?", "seizures?",
  "cancer(?:ous)?s?", "carcinomas?", "tumou?rs?", "chemo(?:therapy)?", "oncolog(?:y|ist|ists)",
  "arthrit(?:is|ic)", "migraines?", "glaucomas?", "insomnia",
  "anxiet(?:y|ies)", "anxious", "depress(?:ion|ed|ive)", "schizophreni\\w*", "bipolar", "ptsd", "adhd",
  "dementia", "parkinson\\w*", "alzheimer\\w*",
  "hypertension", "diabet(?:es|ic)s?", "asthma(?:tic)?s?", "eczema", "psoriasis",
  "multiple sclerosis", "spasticity", "nause(?:a|ous|ated)", "vomit(?:ing|s)?", "palliative",
  "neuropath(?:y|ic)", "fibromyalgia", "crohn\\w*", "colitis", "copd", "hiv",
  "pregnan(?:t|cy)", "menopaus(?:e|al)",
  "chronic pain", "nerve pain", "back pain", "neuropathic pain",
  "mental illness", "blood pressure",
];

export const HEALTH_TERMS = new RegExp("\\b(?:" + HEALTH_ALTERNATIVES.join("|") + ")\\b", "gi");

export const REDACTION_MARK = "[health detail removed]";

export interface RedactResult {
  text: string;
  redacted: boolean;
}

/** Replace any clinical term with a neutral marker. Idempotent and pure. */
export function redactHealthData(input: string): RedactResult {
  if (!input) return { text: input ?? "", redacted: false };
  let redacted = false;
  const text = input.replace(HEALTH_TERMS, () => {
    redacted = true;
    return REDACTION_MARK;
  });
  return { text, redacted };
}

/** True if the text carries any clinical term the guard recognises. NOTE: this
 *  reuses HEALTH_TERMS, so it proves "the guard's matches were removed", not
 *  "no health data of any kind remains" — the deny-list's coverage is the limit. */
export function hasHealthData(input: string): boolean {
  HEALTH_TERMS.lastIndex = 0;
  return HEALTH_TERMS.test(input ?? "");
}

/** Mask any email address embedded in free text (for ops surfaces, §4): the
 *  local part is reduced to one leading char and the domain is masked to its
 *  TLD, so a full buyer identifier never renders. Pure. */
export function maskEmails(input: string): string {
  return (input ?? "").replace(/\b([A-Z0-9._%+-])[A-Z0-9._%+-]*@[A-Z0-9.-]+\.([A-Z]{2,})\b/gi, "$1•••@•••.$2");
}
