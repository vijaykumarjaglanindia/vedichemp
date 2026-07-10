/**
 * VEDIC HEMP — LAB REPORT (CoA) VERIFICATION (A2)
 *
 * A pharmacist/compliance admin approves *one* lab report at a time, against
 * *one* batch, having looked at it. There is deliberately no `bulkApprove` and
 * no `approveAll`: a bulk CoA approval is a licence to sell an untested
 * cannabinoid product at scale. The prohibition test asserts these names are
 * absent from this module — do not add them.
 *
 * The database is the real gate (human verifier, THC ≤ 0.300, batch match,
 * freshness). This service is the audited front door to it.
 */

import { AdminRole, LabReportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ProhibitionError, writeAudit } from "@/lib/prohibitions";
import { resolveAdmin } from "@/server/actor";

const CAN_APPROVE: AdminRole[] = [AdminRole.ADMIN_COMPLIANCE, AdminRole.ADMIN_PHARMACIST];

export async function approveLabReport(args: {
  reportId: string;
  actor: string; // AdminUser id — the human who signs
  reasonText: string;
}): Promise<void> {
  const actor = await resolveAdmin(args.actor);
  if (!actor.isHuman || !actor.roles.some((r) => CAN_APPROVE.includes(r))) {
    await writeAudit({
      actorId: args.actor, actorRoles: [], actionCode: "COA_APPROVE",
      entityType: "LabReport", entityId: args.reportId, reasonCode: "COMPLIANCE", outcome: "DENIED",
    });
    throw new ProhibitionError("FORBIDDEN_COA_APPROVE", "Only a pharmacist or compliance officer approves a lab report.");
  }
  if (args.reasonText.trim().length < 20) {
    throw new ProhibitionError("REASON_TEXT_TOO_SHORT", "Record why this CoA is approved (20+ characters).");
  }

  // status/verifiedById/thc/batch-match are enforced by DB constraints in
  // migration 0001. If any fail, the update throws and nothing is approved.
  await db.labReport.update({
    where: { id: args.reportId },
    data: { status: LabReportStatus.APPROVED, verifiedById: actor.id, verifiedAt: new Date() },
  });

  await writeAudit({
    actorId: actor.id, actorRoles: actor.roles, actionCode: "COA_APPROVE",
    entityType: "LabReport", entityId: args.reportId, reasonCode: "COMPLIANCE", reasonText: args.reasonText, outcome: "SUCCESS",
  });
}

export async function rejectLabReport(args: { reportId: string; actor: string; reasonText: string }): Promise<void> {
  const actor = await resolveAdmin(args.actor);
  if (!actor.isHuman || !actor.roles.some((r) => CAN_APPROVE.includes(r))) {
    throw new ProhibitionError("FORBIDDEN_COA_APPROVE", "Only a pharmacist or compliance officer decides a lab report.");
  }
  await db.labReport.update({ where: { id: args.reportId }, data: { status: LabReportStatus.REJECTED } });
  await writeAudit({
    actorId: actor.id, actorRoles: actor.roles, actionCode: "COA_REJECT",
    entityType: "LabReport", entityId: args.reportId, reasonCode: "COMPLIANCE", reasonText: args.reasonText, outcome: "SUCCESS",
  });
}

/** Read-only queue for the compliance console. */
export async function pendingLabReports() {
  return db.labReport.findMany({
    where: { status: LabReportStatus.PENDING },
    include: { batch: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
}
