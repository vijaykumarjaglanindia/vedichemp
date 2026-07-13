/**
 * VEDIC HEMP — CLAIMS COPY-CHECK (single source of truth)
 *
 * Under the Drugs & Magic Remedies Act, nothing on this platform may claim to
 * cure, treat, prevent or diagnose a disease — product copy, reviews, seller
 * replies, the journal and marketing copy included. Every authored surface
 * runs this same check server-side; a failure blocks the send (fail closed).
 *
 * The word list matches EXACT inflected forms, not prefixes: "heals" is
 * blocked, "health" and "healthy" are not; "treatment" is blocked,
 * "treatable" is judged by a human moderator, not this regex.
 */
export const CLAIMS_LANGUAGE =
  /\b(cure[sd]?|curing|heals?|healed|healing|treat(?:s|ed|ing|ments?)?|prevent(?:s|ed|ing|ion)?|anti[- ]?cancer|diagnos\w+)\b/i;

export function violatesClaimsCopy(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => t != null && CLAIMS_LANGUAGE.test(t));
}
