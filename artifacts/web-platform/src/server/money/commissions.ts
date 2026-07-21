/**
 * VEDIC HEMP — COMMISSION SCHEDULE (A5)
 *
 * No retroactive fee increase. A change to what a seller pays takes effect only
 * after at least 30 days' written notice — you cannot raise a fee today and have
 * it bite yesterday, and you cannot raise it tomorrow either. The maker is a
 * finance admin (never the owner: ADMIN_OWNER can never hold ADMIN_FINANCE under
 * separation-of-duties, so the owner simply lacks the role and is refused — this
 * is §7 "no superadmin" realised, not a special case).
 *
 * The DB CHECK a5_thirty_day_notice (effectiveFrom >= noticeSentAt + 30 days) is
 * the real backstop. This service is the audited front door: the app-layer guard
 * fires first with a clean ProhibitionError so a short-notice increase never
 * reaches — let alone trips — the constraint.
 */

import { AdminRole, ComplianceClass } from "@prisma/client";
import { db } from "@/lib/db";
import { ProhibitionError, writeAudit } from "@/lib/prohibitions";
import { resolveAdmin } from "@/server/actor";

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

export async function scheduleCommissionChange(args: {
  complianceClass: ComplianceClass;
  ratePpm: number;
  noticeSentAt: Date;
  effectiveFrom: Date;
  actor: string; // AdminUser id — the finance admin who signs the change
}): Promise<{ id: string }> {
  const actor = await resolveAdmin(args.actor);

  // Only a human finance admin may change money terms. The owner is barred by
  // construction: it can never hold ADMIN_FINANCE, so it falls here too.
  if (!actor.isHuman || !actor.roles.includes(AdminRole.ADMIN_FINANCE)) {
    await writeAudit({
      actorId: actor.id,
      actorRoles: actor.isHuman ? actor.roles : [],
      actionCode: "COMMISSION_SCHEDULE",
      entityType: "CommissionSchedule",
      reasonCode: "FINANCE",
      outcome: "DENIED",
    });
    throw new ProhibitionError(
      "FORBIDDEN_FEE_CHANGE",
      "Only a finance admin may change a commission schedule."
    );
  }

  if (!Number.isInteger(args.ratePpm) || args.ratePpm <= 0 || args.ratePpm > 1_000_000) {
    throw new ProhibitionError(
      "INVALID_RATE",
      "A commission rate must be a positive integer in parts-per-million, at most 1,000,000 (100%)."
    );
  }

  // A5 app-layer guard — fires before the DB CHECK. A fee change needs at least
  // 30 days' written notice; anything sooner is a retroactive/short-notice
  // increase and must never persist.
  const earliest = new Date(args.noticeSentAt.getTime() + THIRTY_DAYS_MS);
  if (args.effectiveFrom < earliest) {
    await writeAudit({
      actorId: actor.id,
      actorRoles: actor.roles,
      actionCode: "COMMISSION_SCHEDULE",
      entityType: "CommissionSchedule",
      reasonCode: "FINANCE",
      outcome: "DENIED",
    });
    throw new ProhibitionError(
      "A5_NOTICE_TOO_SHORT",
      "A fee change needs at least 30 days written notice; effectiveFrom is too soon.",
      { label: "Fee-change policy", href: "/seller/help/fees" }
    );
  }

  // The DB CHECK a5_thirty_day_notice backstops this write. If it ever fails the
  // create throws and nothing commits.
  const row = await db.commissionSchedule.create({
    data: {
      complianceClass: args.complianceClass,
      ratePpm: args.ratePpm,
      noticeSentAt: args.noticeSentAt,
      effectiveFrom: args.effectiveFrom,
      createdById: actor.id,
    },
  });

  await writeAudit({
    actorId: actor.id,
    actorRoles: actor.roles,
    actionCode: "COMMISSION_SCHEDULE",
    entityType: "CommissionSchedule",
    entityId: row.id,
    reasonCode: "FINANCE",
    outcome: "SUCCESS",
  });

  return { id: row.id };
}
