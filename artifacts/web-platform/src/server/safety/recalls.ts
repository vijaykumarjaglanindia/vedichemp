/**
 * VEDIC HEMP — PRODUCT RECALL (A3 append-only + A6 maker–checker)
 *
 * A recall record is safety history: once written it is never deleted or
 * rewritten (A3 — the DB REVOKEs DELETE on "Recall"; a correction is a new row).
 * Initiating a recall and closing it are two acts by two *different* humans, so
 * that no single admin can both raise and quietly retire a safety signal
 * (A6 — the DB CHECK a6_recall_maker_is_not_checker is the backstop).
 *
 * A compliance officer owns recalls. This service is the audited front door to
 * those two DB rules; the guards here fire first with a clean ProhibitionError
 * so a caller never sees a raw Prisma/constraint error.
 */

import { AdminRole } from "@prisma/client";
import { db } from "@/lib/db";
import { ProhibitionError, writeAudit } from "@/lib/prohibitions";
import { resolveAdmin } from "@/server/actor";

/**
 * Initiate a recall for a batch. Only a compliance human may raise one; the
 * recall opens with no checker (checkerId null) and awaits a second human to
 * close it. The recall reason is operational (a batch/quarantine note), not
 * health data, so it is safe to carry into the audit trail.
 */
export async function initiateRecall(args: {
  batchId: string;
  reason: string;
  buyersAffected: number;
  maker: string; // AdminUser id — the human who raises the recall
}): Promise<{ id: string }> {
  const maker = await resolveAdmin(args.maker);
  if (!maker.isHuman || !maker.roles.includes(AdminRole.ADMIN_COMPLIANCE)) {
    await writeAudit({
      actorId: args.maker,
      actorRoles: [],
      actionCode: "RECALL_INITIATE",
      entityType: "Recall",
      entityId: args.batchId,
      reasonCode: "SAFETY",
      outcome: "DENIED",
    });
    throw new ProhibitionError(
      "FORBIDDEN_RECALL",
      "Only a compliance officer may initiate a product recall."
    );
  }

  if (args.reason.trim().length < 10) {
    throw new ProhibitionError("REASON_TEXT_TOO_SHORT", "State why this batch is being recalled (10+ characters).");
  }
  if (!Number.isInteger(args.buyersAffected) || args.buyersAffected < 0) {
    throw new ProhibitionError("BUYERS_AFFECTED_INVALID", "The number of affected buyers must be a non-negative whole number.");
  }

  // The DB is the real backstop (append-only, maker≠checker). If any constraint
  // fails the insert throws and nothing commits.
  const recall = await db.recall.create({
    data: {
      batchId: args.batchId,
      reason: args.reason,
      buyersAffected: args.buyersAffected,
      buyersNotified: 0,
      makerId: maker.id,
      checkerId: null,
    },
  });

  await writeAudit({
    actorId: maker.id,
    actorRoles: maker.roles,
    actionCode: "RECALL_INITIATE",
    entityType: "Recall",
    entityId: recall.id,
    reasonCode: "SAFETY",
    reasonText: args.reason,
    outcome: "SUCCESS",
  });

  return { id: recall.id };
}

/**
 * Close a recall. Must be a *different* compliance human from the one who
 * initiated it (A6). A closed recall is terminal — reopening or amending it is a
 * new recall row (A3), so a re-close is refused cleanly here before the DB.
 */
export async function closeRecall(args: {
  recallId: string;
  checker: string; // AdminUser id — the second human who signs off the closure
}): Promise<void> {
  const recall = await db.recall.findUnique({ where: { id: args.recallId } });
  if (!recall) throw new ProhibitionError("RECALL_NOT_FOUND", "No such recall.");

  // A closed recall is immutable (A3). Re-closing — a retried request, a double
  // click — must fail cleanly here, not by rewriting safety history.
  if (recall.closedAt) {
    throw new ProhibitionError("RECALL_ALREADY_CLOSED", "This recall is already closed; a change is a new recall row.");
  }

  const checker = await resolveAdmin(args.checker);
  if (!checker.isHuman || !checker.roles.includes(AdminRole.ADMIN_COMPLIANCE)) {
    await writeAudit({
      actorId: args.checker,
      actorRoles: [],
      actionCode: "RECALL_CLOSE",
      entityType: "Recall",
      entityId: recall.id,
      reasonCode: "SAFETY",
      outcome: "DENIED",
    });
    throw new ProhibitionError(
      "FORBIDDEN_RECALL",
      "Only a compliance officer may close a product recall."
    );
  }

  // A6: the admin who raised the recall cannot also close it. The DB CHECK
  // a6_recall_maker_is_not_checker backstops this on the UPDATE below.
  if (checker.id === recall.makerId) {
    throw new ProhibitionError("MAKER_IS_CHECKER", "The admin who initiated a recall cannot also close it.");
  }

  await db.recall.update({
    where: { id: recall.id },
    data: { checkerId: checker.id, closedAt: new Date() },
  });

  await writeAudit({
    actorId: checker.id,
    actorRoles: checker.roles,
    actionCode: "RECALL_CLOSE",
    entityType: "Recall",
    entityId: recall.id,
    reasonCode: "SAFETY",
    outcome: "SUCCESS",
  });
}
