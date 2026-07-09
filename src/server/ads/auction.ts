/**
 * VEDIC HEMP — AD AUCTION (A1, layer 3 of 3)
 *
 * Three independent layers keep a MED_CANNABIS product out of every advertising
 * surface: the API rejects the campaign (DB CHECK a1_no_med_cannabis_ads), the
 * index omits the class, and — here — the auction asserts the class on every
 * candidate and drops it with a logged violation. If a candidate of this class
 * ever reaches the auction, something upstream leaked, so we record it: a
 * violation with blocked=false would be a SEV-1. It is never false.
 */

import { ComplianceClass } from "@prisma/client";
import { auctionAssertClass } from "@/lib/prohibitions";

export interface AuctionCandidate {
  productId: string;
  complianceClass: ComplianceClass;
  bidPaise: number;
}

export interface AuctionResult {
  winners: AuctionCandidate[];
  dropped: string[];
}

export async function runAuction(args: { candidates: AuctionCandidate[]; slots?: number }): Promise<AuctionResult> {
  const eligible: AuctionCandidate[] = [];
  const dropped: string[] = [];

  for (const candidate of args.candidates) {
    const ok = await auctionAssertClass(candidate.productId, candidate.complianceClass);
    if (ok) eligible.push(candidate);
    else dropped.push(candidate.productId);
  }

  eligible.sort((a, b) => b.bidPaise - a.bidPaise);
  const slots = args.slots ?? eligible.length;

  return { winners: eligible.slice(0, slots), dropped };
}
