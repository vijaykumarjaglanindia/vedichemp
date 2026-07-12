/**
 * VEDIC HEMP — COMPLIANCE CLASS METADATA (presentation)
 *
 * The compliance class drives behaviour everywhere. This module is the *display*
 * side of that: labels, badges and which classes a viewer may see. The authority
 * on eligibility is always the server (src/server, src/lib/prohibitions) — this
 * is what the UI renders once the server has decided.
 */

import { ComplianceClass } from "@prisma/client";

export interface ClassMeta {
  code: ComplianceClass;
  label: string;
  short: string;
  rxRequired: boolean;
  ageGated: boolean;
  advertisable: boolean;
  emoji: string;
  blurb: string;
}

export const CLASS_META: Record<ComplianceClass, ClassMeta> = {
  HEMP_FOOD: {
    code: "HEMP_FOOD", label: "Hemp Nutrition & Food", short: "Hemp Food",
    rxRequired: false, ageGated: false, advertisable: true, emoji: "🌾",
    blurb: "Hemp seed oil, protein and hearts. FSSAI-licensed food.",
  },
  AYURVEDA: {
    code: "AYURVEDA", label: "Ayurveda & Adjacent", short: "Ayurveda",
    rxRequired: false, ageGated: false, advertisable: true, emoji: "🪔",
    blurb: "Classical formulations and herbs under AYUSH licence.",
  },
  CBD_WELLNESS: {
    code: "CBD_WELLNESS", label: "Hemp Wellness / CBD", short: "CBD Wellness",
    rxRequired: false, ageGated: true, advertisable: true, emoji: "🌿",
    blurb: "CBD balms and tinctures. AYUSH-licensed, batch CoA, age 21+.",
  },
  MED_CANNABIS: {
    code: "MED_CANNABIS", label: "Medical Cannabis", short: "Medical Cannabis",
    rxRequired: true, ageGated: true, advertisable: false, emoji: "⚕️",
    blurb: "Prescription-only. Never advertised. Requires a verified prescription.",
  },
};

/**
 * Which classes a viewer may see. Restricted products are ABSENT, not hidden —
 * a buyer without a verified prescription simply does not receive MED_CANNABIS
 * items. Blurring would leak the catalogue.
 */
export function permittedClasses(ctx: { hasRx: boolean }): ComplianceClass[] {
  const base: ComplianceClass[] = ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"];
  return ctx.hasRx ? [...base, "MED_CANNABIS"] : base;
}

export function isRegulated(cls: ComplianceClass): boolean {
  return cls === "CBD_WELLNESS" || cls === "MED_CANNABIS";
}
