/**
 * VEDIC HEMP — AD INDEX FILTER (A1, layer 2 of 3)
 *
 * The advertising index simply does not contain MED_CANNABIS. This is the
 * middle layer: even if a campaign somehow existed and the auction were bypassed,
 * the class is absent from what the index will ever return.
 */

import { ComplianceClass } from "@prisma/client";

export function indexableForAds<T extends { complianceClass: ComplianceClass }>(items: T[]): T[] {
  return items.filter((i) => i.complianceClass !== ComplianceClass.MED_CANNABIS);
}
