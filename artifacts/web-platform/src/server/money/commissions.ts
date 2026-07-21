/**
 * VEDIC HEMP — COMMISSION SCHEDULE (A5)
 *
 * No retroactive fee increase. A change to what a seller pays takes effect only
 * after at least 30 days' notice — you cannot raise a fee today and have it bite
 * yesterday, and you cannot raise it tomorrow either.
 *
 * The notice clock is anchored SERVER-SIDE. `noticeSentAt` is stamped to the
 * moment the change is scheduled — it is never accepted from the caller, because
 * a caller-supplied notice date can be back-dated ("notice was sent 40 days ago")
 * to collapse the 30-day window to nothing. Scheduling the change *is* the act of
 * sending notice; from that instant the seller has at least 30 days. The DB CHECK
 * a5_thirty_day_notice (effectiveFrom >= noticeSentAt + 30 days) still backstops
 * the row, but now both operands are trustworthy: the server set noticeSentAt.
 *
 * The maker is a finance admin (never the owner: ADMIN_OWNER can never hold
 * ADMIN_FINANCE under separation-of-duties, so the owner simply lacks the role
 * and is refused — §7 "no superadmin" realised, not a special case).
 */

import { AdminRole, ComplianceClass } from "@prisma/client";
import { db } from "@/lib/db";
import { ProhibitionError, writeAudit } from "@/lib/prohibitions";
import { resolveAdmin } from "@/server/actor";

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

export async function scheduleCommissionChange(args: {
  complianceClass: ComplianceClass;
  ratePpm: number;
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

  // Fail closed on the compliance gate: an unparseable effectiveFrom yields an
  // Invalid Date, and `NaN < earliest` is false — which would SKIP the 30-day
  // guard rather than enforce it. Reject it with a clean ProhibitionError before
  // the comparison, so the guard can never be silently bypassed by a bad date.
  if (Number.isNaN(args.effectiveFrom.getTime())) {
    throw new ProhibitionError("INVALID_EFFECTIVE_DATE", "effectiveFrom is not a valid date.");
  }

  // A5, anchored server-side: notice is sent NOW; the change cannot take effect
  // for at least 30 days. A caller cannot back-date the notice to shorten this.
  const now = new Date();
  const earliest = new Date(now.getTime() + THIRTY_DAYS_MS);
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
      "A fee change needs at least 30 days notice; effectiveFrom is sooner than 30 days from now.",
      { label: "Fee-change policy", href: "/seller/help/fees" }
    );
  }

  // noticeSentAt = now (server-stamped, not caller-supplied). The DB CHECK
  // a5_thirty_day_notice backstops this write.
  const row = await db.commissionSchedule.create({
    data: {
      complianceClass: args.complianceClass,
      ratePpm: args.ratePpm,
      noticeSentAt: now,
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
