/**
 * VEDIC HEMP — REFUNDS (A6, buyer-first)
 *
 * Buyers are never collateral: the buyer is refunded first, and recovery from
 * the seller happens afterwards in settlement. A single large refund needs a
 * checker; many small ones that add up to a large one *also* need a checker —
 * splitting a ₹15k refund into three ₹4,999 refunds does not evade the rule.
 *
 * The wallet ledger is append-only (A3). A refund is a new credit row, never an
 * edit of a prior one.
 */

import { db } from "@/lib/db";
import {
  assertCheckerPresent,
  assertNoThresholdSplitting,
  ProhibitionError,
  writeAudit,
} from "@/lib/prohibitions";

export async function issueRefund(args: {
  orderId: string;
  actor: string; // AdminUser id (maker)
  amountPaise: number;
  reasonCode: string;
  checkerId?: string | null;
}): Promise<{ walletEntryId: string; balanceAfter: number }> {
  if (args.amountPaise <= 0) throw new ProhibitionError("AMOUNT_INVALID", "A refund must be a positive amount of paise.");

  const order = await db.order.findUnique({ where: { id: args.orderId }, include: { user: { include: { wallet: true } } } });
  if (!order) throw new ProhibitionError("ORDER_NOT_FOUND", "No such order.");

  const wallet = order.user.wallet ?? (await db.wallet.create({ data: { userId: order.userId } }));

  const checkerId = args.checkerId ?? null;

  // A single movement at or above the threshold needs a second human approver.
  await assertCheckerPresent({
    makerId: args.actor,
    checkerId,
    amountPaise: args.amountPaise,
    actorIsService: false,
  });

  // Cumulative: if this maker's already-unchecked movements in 24h cross the
  // threshold, the next one needs a checker even if each was individually small.
  if (!checkerId) {
    await assertNoThresholdSplitting(args.actor, args.amountPaise);
  }

  const balanceAfter = wallet.balancePaise + args.amountPaise;
  const entry = await db.$transaction(async (tx) => {
    const created = await tx.walletEntry.create({
      data: {
        walletId: wallet.id,
        deltaPaise: args.amountPaise,
        balanceAfter,
        reason: `REFUND:${args.reasonCode}`,
        reference: order.reference,
        makerId: args.actor,
        checkerId,
      },
    });
    await tx.wallet.update({ where: { id: wallet.id }, data: { balancePaise: balanceAfter } });
    return created;
  });

  await writeAudit({
    actorId: args.actor,
    actorRoles: [],
    actionCode: "REFUND_ISSUE",
    entityType: "Order",
    entityId: order.id,
    reasonCode: args.reasonCode,
    outcome: "SUCCESS",
  });

  return { walletEntryId: entry.id, balanceAfter };
}
