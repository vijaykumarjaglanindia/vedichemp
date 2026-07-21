/**
 * VEDIC HEMP — AD CAMPAIGNS (A1, layer 1 of 3)
 *
 * Three independent layers keep a MED_CANNABIS product out of every advertising
 * surface: HERE the API rejects the campaign at creation, the index omits the
 * class (index-filter.ts), and the auction drops it with a logged violation
 * (auction.ts). This is the first and outermost layer.
 *
 * The compliance class is resolved SERVER-SIDE from the real product — a
 * caller-supplied class is never trusted, so relabelling a MED_CANNABIS product
 * as HEMP_FOOD in the request cannot buy it a campaign. An id that resolves to
 * no product cannot be proven non-MED, so it fails closed (rejected + logged).
 *
 * The DB CHECK a1_no_med_cannabis_ads on AdCampaign is the real backstop; this
 * guard fires first so the caller sees a clean ProhibitionError, never a raw
 * constraint error, and every refusal leaves a blocked violation row behind.
 */

import { ComplianceClass } from "@prisma/client";
import { db } from "@/lib/db";
import { assertAdvertisable, ProhibitionError, writeAudit } from "@/lib/prohibitions";

export async function createCampaign(args: {
  sellerId: string;
  name: string;
  productId: string;
  dailyBudgetPaise: number;
  actor: string;
}): Promise<{ id: string }> {
  // A1 layer 1 runs FIRST — before any input-shape validation — so that a
  // prohibited advertising attempt is ALWAYS logged and audited, even if the
  // request also carries a malformed name or budget. "Denied actions are logged
  // too": a MED attempt must never slip through unrecorded by piggy-backing on
  // an unrelated validation error.
  //
  // The product's REAL compliance class is resolved server-side. Never the
  // caller's — a relabelled MED_CANNABIS body cannot buy a campaign.
  const product = await db.product.findUnique({
    where: { id: args.productId },
    select: { complianceClass: true },
  });
  const trueClass = product?.complianceClass;

  // Fail closed. A missing product cannot be proven non-MED, and a real
  // MED_CANNABIS product can never be advertised. Either way: log a blocked
  // violation (blocked=false is a SEV-1 and never written), record a DENIED
  // audit row, then throw before any campaign is created.
  if (trueClass === undefined || trueClass === ComplianceClass.MED_CANNABIS) {
    await db.adClassViolation.create({ data: { layer: "API", productId: args.productId, blocked: true } });
    await writeAudit({
      actorId: args.actor,
      actorRoles: [],
      actionCode: "CAMPAIGN_CREATE",
      entityType: "Product",
      entityId: args.productId,
      reasonCode: "ADS",
      outcome: "DENIED",
    });
    if (trueClass === undefined) {
      throw new ProhibitionError(
        "PRODUCT_NOT_FOUND",
        "No such product. A campaign cannot be created for a product that does not exist.",
        { label: "Choose a product to advertise", href: "/seller/products" }
      );
    }
    assertAdvertisable(trueClass); // throws CLASS_NOT_ADVERTISABLE for MED_CANNABIS
    // Unreachable: assertAdvertisable always throws for the only class that
    // reaches this line. Kept as a fail-closed backstop so this branch can never
    // fall through into a live campaign, and to prove to the type checker that
    // trueClass past this block is an advertisable, defined class.
    throw new ProhibitionError("CLASS_NOT_ADVERTISABLE", "This class can never be advertised.");
  }

  // Past the A1 gate. Now the ordinary input-shape validation — a short name or
  // a bad budget is a plain input error, not an advertising violation, so it
  // throws without logging (the AdClassViolation log stays reserved for real
  // class breaches, which were already caught and logged above).
  if (args.name.trim().length < 4) {
    throw new ProhibitionError("CAMPAIGN_NAME_TOO_SHORT", "Give the campaign a name of at least 4 characters.");
  }
  if (!Number.isInteger(args.dailyBudgetPaise) || args.dailyBudgetPaise <= 0) {
    throw new ProhibitionError("BUDGET_INVALID", "The daily budget must be a positive whole number of paise.");
  }

  // The product exists and is advertisable. Persist with the REAL resolved class
  // — never a caller-supplied one — so the DB CHECK a1_no_med_cannabis_ads can
  // only ever see an advertisable class from here.
  const campaign = await db.adCampaign.create({
    data: {
      sellerId: args.sellerId,
      name: args.name,
      complianceClass: trueClass,
      dailyBudgetPaise: args.dailyBudgetPaise,
      active: false,
    },
  });

  await writeAudit({
    actorId: args.actor,
    actorRoles: [],
    actionCode: "CAMPAIGN_CREATE",
    entityType: "AdCampaign",
    entityId: campaign.id,
    reasonCode: "ADS",
    outcome: "SUCCESS",
  });

  return { id: campaign.id };
}
