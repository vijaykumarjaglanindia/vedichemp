/**
 * VEDIC HEMP — CATALOGUE PUBLISH GATE (A2)
 *
 * A product does not go LIVE because someone clicked "publish". It goes LIVE
 * because every batch that would be sold under it is backed by an APPROVED,
 * batch-matched Certificate of Analysis. The gate reads LabReport.status; there
 * is no force_sellable, no senior override, no bulk approve.
 */

import { ListingState } from "@prisma/client";
import { db } from "@/lib/db";
import { assertBatchSellable, ProhibitionError, writeAudit } from "@/lib/prohibitions";

export async function publishProduct(args: { productId: string; actor: string }): Promise<{ listingState: ListingState }> {
  const product = await db.product.findUnique({
    where: { id: args.productId },
    include: { batches: true },
  });
  if (!product) throw new ProhibitionError("PRODUCT_NOT_FOUND", "No such product.");

  if (product.batches.length === 0) {
    throw new ProhibitionError(
      "NO_BATCH",
      "A product cannot be published without at least one batch to sell.",
      { label: "Add a batch", href: `/seller/products/${product.id}/batches` }
    );
  }

  // Every batch must be sellable. For a regulated class this reads the CoA gate;
  // for HEMP_FOOD / AYURVEDA it is a no-op. One unbacked batch blocks the listing.
  for (const batch of product.batches) {
    await assertBatchSellable(batch.id); // throws COA_REQUIRED / THC_LIMIT_EXCEEDED / COA_BATCH_MISMATCH
  }

  const updated = await db.product.update({
    where: { id: product.id },
    data: { listingState: ListingState.LIVE },
  });

  await writeAudit({
    actorId: args.actor,
    actorRoles: [],
    actionCode: "PRODUCT_PUBLISH",
    entityType: "Product",
    entityId: product.id,
    reasonCode: "CATALOGUE",
    outcome: "SUCCESS",
  });

  return { listingState: updated.listingState };
}

export async function unpublishProduct(args: { productId: string; actor: string; reasonText: string }): Promise<void> {
  await db.product.update({ where: { id: args.productId }, data: { listingState: ListingState.PAUSED } });
  await writeAudit({
    actorId: args.actor, actorRoles: [], actionCode: "PRODUCT_UNPUBLISH",
    entityType: "Product", entityId: args.productId, reasonCode: "CATALOGUE", reasonText: args.reasonText, outcome: "SUCCESS",
  });
}
