/**
 * VEDIC HEMP — SETTLEMENTS (A6)
 *
 * No single admin moves money. A settlement run is created by a maker and
 * posted by a *different human* checker. A service account may be neither.
 * Once posted, a settlement is immutable — corrections are new adjustment rows,
 * never edits (A3). All three rules are DB constraints; this service is the
 * audited path to them.
 */

import { SettlementStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { assertCheckerPresent, ProhibitionError, writeAudit } from "@/lib/prohibitions";
import { resolveAdmin } from "@/server/actor";

export async function createSettlementRun(args: {
  sellerId: string;
  periodStart: Date;
  periodEnd: Date;
  grossPaise: number;
  deductionsPaise: number;
  maker: string; // AdminUser id
}): Promise<{ id: string }> {
  const maker = await resolveAdmin(args.maker);
  if (!maker.isHuman) throw new ProhibitionError("CHECKER_MUST_BE_HUMAN", "A service account cannot create a settlement run.");

  const netPaise = args.grossPaise - args.deductionsPaise;
  const run = await db.settlement.create({
    data: {
      sellerId: args.sellerId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      grossPaise: args.grossPaise,
      deductionsPaise: args.deductionsPaise,
      netPaise,
      status: SettlementStatus.AWAITING_CHECKER,
      makerId: maker.id,
    },
  });
  await writeAudit({
    actorId: maker.id, actorRoles: maker.roles, actionCode: "SETTLEMENT_CREATE",
    entityType: "Settlement", entityId: run.id, reasonCode: "FINANCE", outcome: "SUCCESS",
  });
  return { id: run.id };
}

/**
 * The checker posts the run. Must be a *different human* from the maker.
 * The DB constraints a6_maker_is_not_checker and a6_posted_needs_checker are the
 * backstop; we fail early with a clear code and a DENIED audit row.
 */
export async function approveSettlement(args: {
  settlementId: string;
  checker: string; // AdminUser id
  note: string;
}): Promise<void> {
  const run = await db.settlement.findUnique({ where: { id: args.settlementId } });
  if (!run) throw new ProhibitionError("SETTLEMENT_NOT_FOUND", "No such settlement run.");

  // A posted statement is immutable (A3). Re-posting — a retried request, a
  // double click — must fail cleanly here, not by tripping the DB immutability
  // trigger on the UPDATE below. A correction is a new adjustment row.
  if (run.status === SettlementStatus.POSTED) {
    throw new ProhibitionError("SETTLEMENT_ALREADY_POSTED", "This settlement is already posted and is immutable; record a correcting adjustment instead.");
  }

  const checker = await resolveAdmin(args.checker);

  // A service account may be neither maker nor checker.
  await assertCheckerPresent({
    makerId: run.makerId,
    checkerId: checker.id,
    amountPaise: run.netPaise,
    actorIsService: !checker.isHuman,
  });

  if (args.note.trim().length < 20) {
    throw new ProhibitionError("REASON_TEXT_TOO_SHORT", "Record why this settlement is approved (20+ characters).");
  }

  await db.settlement.update({
    where: { id: run.id },
    data: { checkerId: checker.id, status: SettlementStatus.POSTED, postedAt: new Date() },
  });

  await writeAudit({
    actorId: checker.id,
    actorRoles: checker.isHuman ? checker.roles : [],
    actionCode: "SETTLEMENT_POST",
    entityType: "Settlement",
    entityId: run.id,
    reasonCode: "FINANCE",
    reasonText: args.note,
    outcome: "SUCCESS",
  });
}

export async function awaitingChecker() {
  return db.settlement.findMany({
    where: { status: SettlementStatus.AWAITING_CHECKER },
    include: { seller: true },
    orderBy: { periodEnd: "asc" },
  });
}
