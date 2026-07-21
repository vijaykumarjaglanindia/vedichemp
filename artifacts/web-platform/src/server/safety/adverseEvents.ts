/**
 * VEDIC HEMP — ADVERSE-EVENT REPORTING (A3, append-only)
 *
 * A safety signal is a fact of record. Once written it can never be edited or
 * deleted — the database enforces this with the a3_adverse_event_immutable
 * trigger and a role-level REVOKE UPDATE, DELETE. A correction is therefore not
 * an edit: it is a NEW row that references the row it supersedes via correctsId.
 * There is deliberately no update or delete function in this module; adding one
 * would be a lie, because the DB would reject it anyway.
 *
 * §6 — health data never appears in a log line. The narrative describes a
 * person's symptoms; it is health data. The audit trail references the event by
 * id only. The narrative is NEVER passed into writeAudit — not as reasonText,
 * not anywhere.
 */

import { db } from "@/lib/db";
import { ProhibitionError, writeAudit } from "@/lib/prohibitions";

export async function reportAdverseEvent(args: {
  productId: string;
  batchId?: string;
  reportedBy: string;
  narrative: string;
}): Promise<{ id: string }> {
  if (!args.reportedBy.trim()) {
    throw new ProhibitionError("INVALID_ADVERSE_REPORT", "An adverse-event report must name who is reporting it.");
  }
  if (args.narrative.trim().length < 10) {
    throw new ProhibitionError("INVALID_ADVERSE_REPORT", "Describe what happened (10+ characters).");
  }

  const row = await db.adverseEvent.create({
    data: {
      productId: args.productId,
      batchId: args.batchId,
      reportedBy: args.reportedBy,
      narrative: args.narrative,
    },
  });

  // §6: the audit references the event by id only. The narrative — which is
  // health data — is NOT logged here, in any field.
  await writeAudit({
    actorId: args.reportedBy,
    actorRoles: [],
    actionCode: "ADVERSE_EVENT_REPORT",
    entityType: "AdverseEvent",
    entityId: row.id,
    reasonCode: "SAFETY",
    outcome: "SUCCESS",
  });

  return { id: row.id };
}

/**
 * A3: a correction is a NEW row, never an update. We copy the product/batch the
 * prior report was about, point correctsId at the prior id, and record the new
 * narrative on the new row. The old row is left exactly as it was.
 */
export async function correctAdverseEvent(args: {
  eventId: string;
  reportedBy: string;
  narrative: string;
}): Promise<{ id: string }> {
  if (!args.reportedBy.trim()) {
    throw new ProhibitionError("INVALID_ADVERSE_REPORT", "A correction must name who is reporting it.");
  }
  if (args.narrative.trim().length < 10) {
    throw new ProhibitionError("INVALID_ADVERSE_REPORT", "Describe the correction (10+ characters).");
  }

  const prior = await db.adverseEvent.findUnique({ where: { id: args.eventId } });
  if (!prior) {
    throw new ProhibitionError("ADVERSE_EVENT_NOT_FOUND", "No such adverse-event report to correct.");
  }

  const newRow = await db.adverseEvent.create({
    data: {
      productId: prior.productId,
      batchId: prior.batchId,
      reportedBy: args.reportedBy,
      narrative: args.narrative,
      correctsId: prior.id,
    },
  });

  // §6: again, no narrative in the audit — the correction is referenced by id.
  await writeAudit({
    actorId: args.reportedBy,
    actorRoles: [],
    actionCode: "ADVERSE_EVENT_CORRECT",
    entityType: "AdverseEvent",
    entityId: newRow.id,
    reasonCode: "SAFETY",
    outcome: "SUCCESS",
  });

  return { id: newRow.id };
}
