/**
 * VEDIC HEMP — PROHIBITION GUARDS
 *
 * The single source of truth for compliance checks in application code.
 * Do not re-implement these inline. If you find yourself writing
 * `if (product.complianceClass !== 'MED_CANNABIS')`, call assertAdvertisable().
 *
 * These guards are the *second* line. The first is the database (see
 * prisma/migrations/0001_prohibitions). The third, for ads, is the auction.
 * One bug should not produce an unlawful outcome.
 */

import { ComplianceClass, LabReportStatus, AdminRole } from "@prisma/client";
import { db } from "../db";

export class ProhibitionError extends Error {
  constructor(
    public code: string,
    message: string,
    public remediation?: { label: string; href: string }
  ) {
    super(message);
    this.name = "ProhibitionError";
  }
}

/* ─────────────────────────── A1 ─────────────────────────── */

/**
 * A1: no MED_CANNABIS product may be advertised or promoted, by anyone, ever.
 * There is no `force` parameter. Do not add one.
 */
export function assertAdvertisable(complianceClass: ComplianceClass): void {
  if (complianceClass === ComplianceClass.MED_CANNABIS) {
    throw new ProhibitionError(
      "CLASS_NOT_ADVERTISABLE",
      "Advertising a prescription medicine to the public is unlawful. This class can never be advertised.",
      { label: "Read the advertising rules", href: "/seller/help/advertising" }
    );
  }
}

/** Called by the auction on every candidate. A leak here is a SEV-1. */
export async function auctionAssertClass(productId: string, complianceClass: ComplianceClass) {
  const blocked = complianceClass === ComplianceClass.MED_CANNABIS;
  if (blocked) {
    await db.adClassViolation.create({ data: { layer: "AUCTION", productId, blocked: true } });
    return false;
  }
  return true;
}

/* ─────────────────────────── A2 ─────────────────────────── */

const REGULATED: ComplianceClass[] = [ComplianceClass.CBD_WELLNESS, ComplianceClass.MED_CANNABIS];

/**
 * A2: a batch of a regulated class is sellable only with an APPROVED,
 * batch-matched Certificate of Analysis. There is no override, and no admin
 * role — not even the owner — can grant one.
 */
export async function assertBatchSellable(batchId: string): Promise<void> {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: { labReport: true, product: true },
  });
  if (!batch) throw new ProhibitionError("BATCH_NOT_FOUND", "No such batch.");

  if (!REGULATED.includes(batch.product.complianceClass)) return;

  const report = batch.labReport;
  if (!report || report.status !== LabReportStatus.APPROVED) {
    throw new ProhibitionError(
      "COA_REQUIRED",
      "This batch has no approved certificate of analysis. It cannot be sold.",
      { label: "Upload a lab report", href: `/seller/products/batches/${batchId}/coa` }
    );
  }
  if (report.batchCode !== batch.batchCode) {
    throw new ProhibitionError("COA_BATCH_MISMATCH", "The lab report is for a different batch.");
  }
  if (Number(report.thcPercent) > 0.3) {
    throw new ProhibitionError("THC_LIMIT_EXCEEDED", "Δ9-THC is above the legal limit for this class.");
  }
}

/* ─────────────────────────── A4 ─────────────────────────── */

const SENSITIVE_ROLES: AdminRole[] = [AdminRole.ADMIN_PHARMACIST, AdminRole.ADMIN_COMPLIANCE];

export const SENSITIVE_REASONS = [
  "PRESCRIPTION_VERIFICATION",
  "ADVERSE_EVENT_TRIAGE",
  "REGULATORY_REQUEST",
  "DISPUTE_EVIDENCE",
] as const;
export type SensitiveReason = (typeof SENSITIVE_REASONS)[number];

/**
 * A4: health data is viewable only by Pharmacist/Compliance, only with a
 * logged reason, and the buyer is notified. Curiosity is not a reason.
 *
 * The log row is written BEFORE the object key is resolved. If the log write
 * fails, the read fails. Losing the log is worse than failing the action.
 */
export async function assertSensitiveAccess(args: {
  actorId: string;
  actorRoles: AdminRole[];
  subjectUserId: string;
  entityType: "Prescription" | "MedicalNote" | "ConsultationNote";
  entityId: string;
  reasonCode: SensitiveReason;
  reasonText: string;
}): Promise<void> {
  const permitted = args.actorRoles.some((r) => SENSITIVE_ROLES.includes(r));
  if (!permitted) {
    await writeAudit({ ...args, actionCode: "SENSITIVE_READ", outcome: "DENIED" });
    throw new ProhibitionError(
      "FORBIDDEN_SENSITIVE_SCOPE",
      "Health data is viewable only by the pharmacist and compliance roles."
    );
  }
  if (!SENSITIVE_REASONS.includes(args.reasonCode)) {
    throw new ProhibitionError("REASON_CODE_INVALID", "Choose a reason from the controlled list.");
  }
  if (args.reasonText.trim().length < 20) {
    throw new ProhibitionError("REASON_TEXT_TOO_SHORT", "State why this record must be viewed now (20+ characters).");
  }

  // Synchronous, before the caller gets a URL. Notification is queued in the same transaction.
  await db.$transaction(async (tx) => {
    await tx.sensitiveAccessLog.create({
      data: {
        actorId: args.actorId,
        actorRoles: args.actorRoles,
        subjectUserId: args.subjectUserId,
        entityType: args.entityType,
        entityId: args.entityId,
        reasonCode: args.reasonCode,
        reasonText: args.reasonText,
        buyerNotifiedAt: new Date(), // enqueue happens on commit; see notifications worker
      },
    });
  });
}

/* ─────────────────────────── A6 ─────────────────────────── */

const REFUND_CHECKER_THRESHOLD_PAISE = 500_000; // ₹5,000

/**
 * A6: no single admin moves money. Maker ≠ checker, both human.
 * Cumulative threshold: three ₹4,999 refunds are one ₹14,997 refund.
 */
export async function assertCheckerPresent(args: {
  makerId: string;
  checkerId: string | null;
  amountPaise: number;
  actorIsService: boolean;
}): Promise<void> {
  if (args.actorIsService) {
    throw new ProhibitionError("CHECKER_MUST_BE_HUMAN", "A service account may be neither maker nor checker.");
  }
  if (args.amountPaise >= REFUND_CHECKER_THRESHOLD_PAISE && !args.checkerId) {
    throw new ProhibitionError("CHECKER_REQUIRED", "This amount requires a second approver.");
  }
  if (args.checkerId && args.checkerId === args.makerId) {
    throw new ProhibitionError("MAKER_IS_CHECKER", "The maker cannot approve their own transaction.");
  }
}

export async function assertNoThresholdSplitting(actorId: string, amountPaise: number): Promise<void> {
  const since = new Date(Date.now() - 24 * 3600e3);
  const recent = await db.walletEntry.aggregate({
    where: { makerId: actorId, at: { gte: since }, checkerId: null },
    _sum: { deltaPaise: true },
  });
  const cumulative = Math.abs(recent._sum.deltaPaise ?? 0) + amountPaise;
  if (cumulative >= REFUND_CHECKER_THRESHOLD_PAISE) {
    throw new ProhibitionError(
      "CHECKER_REQUIRED_CUMULATIVE",
      "Your unchecked movements in the last 24 hours now exceed the threshold. A second approver is required."
    );
  }
}

/* ─────────────────────────── audit ─────────────────────────── */

/** Synchronous and durable before the action's response returns (NFR-A-02). */
export async function writeAudit(entry: {
  actorId: string;
  actorRoles: string[];
  actionCode: string;
  entityType?: string;
  entityId?: string;
  reasonCode?: string;
  reasonText?: string;
  outcome: "SUCCESS" | "DENIED" | "ERROR";
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorRoles: entry.actorRoles,
      actionCode: entry.actionCode,
      entityType: entry.entityType ?? "-",
      entityId: entry.entityId ?? "-",
      reasonCode: entry.reasonCode ?? "NONE",
      reasonText: entry.reasonText,
      requestId: crypto.randomUUID(),
      outcome: entry.outcome,
    },
  });
}
