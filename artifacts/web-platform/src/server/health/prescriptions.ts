/**
 * VEDIC HEMP — PRESCRIPTIONS (A4)
 *
 * Health data is viewable only by Pharmacist/Compliance, only with a logged
 * reason, and the buyer is notified. The access log is written BEFORE a signed
 * URL is issued: if the log write fails, the read fails. Losing the log is
 * worse than failing the action.
 *
 * A pharmacist *verifies* a prescription. A model may extract fields from the
 * image, but it never approves — the DB constraint a4_verified_needs_human
 * rejects a VERIFIED row with a null verifier.
 */

import { AdminRole, PrescriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  assertSensitiveAccess,
  ProhibitionError,
  writeAudit,
  type SensitiveReason,
} from "@/lib/prohibitions";
import { resolveAdmin } from "@/server/actor";
import { signSensitiveObject, type SignedUrl } from "./storage";

export async function getPrescriptionUrl(args: {
  prescriptionId: string;
  actor: string; // AdminUser id
  reasonCode: SensitiveReason;
  reasonText: string;
}): Promise<SignedUrl> {
  const rx = await db.prescription.findUnique({ where: { id: args.prescriptionId } });
  if (!rx) throw new ProhibitionError("PRESCRIPTION_NOT_FOUND", "No such prescription.");

  const actor = await resolveAdmin(args.actor);
  const roles = actor.isHuman ? actor.roles : ([] as AdminRole[]);

  // Writes the access log (or a DENIED audit), notifies the buyer, and throws
  // FORBIDDEN_SENSITIVE_SCOPE for anyone who is not pharmacist/compliance.
  await assertSensitiveAccess({
    actorId: args.actor,
    actorRoles: roles,
    subjectUserId: rx.userId,
    entityType: "Prescription",
    entityId: rx.id,
    reasonCode: args.reasonCode,
    reasonText: args.reasonText,
  });

  // Only now — after the log exists — do we mint a short-lived URL.
  return signSensitiveObject(rx.objectKey);
}

/**
 * A human pharmacist verifies a prescription. The model does not appear here.
 */
export async function verifyPrescription(args: {
  prescriptionId: string;
  actor: string; // pharmacist AdminUser id
  reasonText: string;
}): Promise<void> {
  const actor = await resolveAdmin(args.actor);
  if (!actor.isHuman || !actor.roles.includes(AdminRole.ADMIN_PHARMACIST)) {
    await writeAudit({
      actorId: args.actor, actorRoles: [], actionCode: "RX_VERIFY",
      entityType: "Prescription", entityId: args.prescriptionId, reasonCode: "PRESCRIPTION_VERIFICATION", outcome: "DENIED",
    });
    throw new ProhibitionError("FORBIDDEN_RX_VERIFY", "Only a pharmacist verifies a prescription.");
  }
  await db.prescription.update({
    where: { id: args.prescriptionId },
    data: { status: PrescriptionStatus.VERIFIED, verifiedById: actor.id, verifiedAt: new Date() },
  });
  await writeAudit({
    actorId: actor.id, actorRoles: actor.roles, actionCode: "RX_VERIFY",
    entityType: "Prescription", entityId: args.prescriptionId,
    reasonCode: "PRESCRIPTION_VERIFICATION", reasonText: args.reasonText, outcome: "SUCCESS",
  });
}

export async function pendingPrescriptions() {
  return db.prescription.findMany({
    where: { status: PrescriptionStatus.PENDING },
    orderBy: { createdAt: "asc" },
  });
}
