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
import { resolveAdmin } from "@/server/actor";

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

  // Resolve both parties against the DB — a made-up id is a non-human service
  // actor, and a service account may neither move money nor stand in as checker
  // (mirrors approveSettlement). This closes two gaps: a service-account maker
  // issuing refunds, and a caller inventing a bogus `checkerId` string to both
  // satisfy maker≠checker and — because that id is non-null — skip the
  // cumulative-split guard below. A bogus checker now fails as non-human.
  const maker = await resolveAdmin(args.actor);
  const checker = args.checkerId ? await resolveAdmin(args.checkerId) : null;
  const checkerId = checker?.id ?? null;

  // A single movement at or above the threshold needs a second human approver;
  // a non-human maker or checker is rejected outright.
  await assertCheckerPresent({
    makerId: maker.id,
    checkerId,
    amountPaise: args.amountPaise,
    actorIsService: !maker.isHuman || (checker ? !checker.isHuman : false),
  });

  // Cumulative: if this maker's already-unchecked movements in 24h cross the
  // threshold, the next one needs a checker even if each was individually small.
  // Reached only when there is no (real, human) checker on this movement.
  if (!checkerId) {
    await assertNoThresholdSplitting(maker.id, args.amountPaise);
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
    actorId: maker.id,
    actorRoles: maker.isHuman ? maker.roles : [],
    actionCode: "REFUND_ISSUE",
    entityType: "Order",
    entityId: order.id,
    reasonCode: args.reasonCode,
    outcome: "SUCCESS",
  });

  return { walletEntryId: entry.id, balanceAfter };
}
