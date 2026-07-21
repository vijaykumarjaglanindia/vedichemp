/**
 * VEDIC HEMP — PROHIBITION TESTS
 *
 * These tests assert that A1–A6 hold even when the application lies.
 * They talk to a real Postgres. They are the reason the prohibitions are
 * enforcement rather than intention.
 *
 * CODEOWNERS protects this file. A pull request that deletes, skips, or
 * weakens a test here fails review by policy and by CI.
 *
 *   pnpm test:prohibitions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, ComplianceClass, LabReportStatus, SettlementStatus } from "@prisma/client";

const db = new PrismaClient();

/** Every prohibition test asserts a *rejection*. Success is the DB saying no. */
const expectRejection = async (fn: () => Promise<unknown>, matcher: RegExp) => {
  await expect(fn()).rejects.toThrow(matcher);
};

beforeAll(async () => {
  const status = await db.$queryRaw<{ code: string; enforced: boolean }[]>`
    SELECT * FROM prohibition_status
  `;
  const unenforced = status.filter((s) => !s.enforced).map((s) => s.code);
  if (unenforced.length) {
    throw new Error(
      `Prohibitions not enforced in this database: ${unenforced.join(", ")}. ` +
        `Run migration 0001_prohibitions before testing.`
    );
  }
});

afterAll(async () => { await db.$disconnect(); });

// ─────────────────────────── A1 ───────────────────────────

describe("A1 — no MED_CANNABIS may be advertised", () => {
  it("test_a1_no_advertisable_path: the database rejects a MED_CANNABIS campaign", async () => {
    await expectRejection(
      () =>
        db.adCampaign.create({
          data: {
            sellerId: seed.sellerId,
            name: "Should never exist",
            complianceClass: ComplianceClass.MED_CANNABIS,
            dailyBudgetPaise: 100_00,
          },
        }),
      /a1_no_med_cannabis_ads/
    );
  });

  it("test_a1_no_override_column: no column named force_/override_/allow_ exists on AdCampaign", async () => {
    const cols = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'AdCampaign'
    `;
    const suspicious = cols.filter((c) => /^(force|override|allow|bypass)/i.test(c.column_name));
    expect(suspicious).toEqual([]);
  });

  it("test_a1_auction_drops_class: the auction rejects the class even if the index leaks it", async () => {
    const { runAuction } = await import("../src/server/ads/auction");
    const result = await runAuction({
      candidates: [{ productId: "leaked", complianceClass: ComplianceClass.MED_CANNABIS, bidPaise: 999_00 }],
    });
    expect(result.winners).toHaveLength(0);
    const violation = await db.adClassViolation.findFirst({ where: { productId: "leaked" } });
    expect(violation?.blocked).toBe(true); // blocked=false would be a SEV-1
  });
});

// ─────────────────────────── A2 ───────────────────────────

describe("A2 — no sellable batch without an approved, batch-matched CoA", () => {
  it("test_a2_no_force_sellable: no such column exists anywhere", async () => {
    const cols = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE column_name ILIKE '%force%sellable%' OR column_name ILIKE '%override%coa%'
    `;
    expect(cols).toEqual([]);
  });

  it("test_a2_publish_gate: a regulated product cannot go LIVE without an APPROVED report", async () => {
    const { publishProduct } = await import("../src/server/catalogue/publish");
    await expectRejection(
      () => publishProduct({ productId: seed.cbdProductNoCoaId, actor: seed.adminCompliance }),
      /COA_REQUIRED/
    );
  });

  it("test_a2_approved_needs_human_verifier: status APPROVED with a null verifier is rejected", async () => {
    await expectRejection(
      () =>
        db.labReport.update({
          where: { id: seed.pendingReportId },
          data: { status: LabReportStatus.APPROVED, verifiedById: null },
        }),
      /a2_approved_needs_human_verifier/
    );
  });

  it("test_a2_thc_ceiling: an approved report above 0.300% THC is rejected", async () => {
    await expectRejection(
      () =>
        db.labReport.update({
          where: { id: seed.pendingReportId },
          data: { status: LabReportStatus.APPROVED, verifiedById: seed.adminCompliance, thcPercent: 0.31 },
        }),
      /a2_approved_thc_within_limit/
    );
  });

  it("test_a2_batch_match: a CoA for a different batch is rejected", async () => {
    await expectRejection(
      () => db.labReport.update({ where: { id: seed.pendingReportId }, data: { batchCode: "SOME-OTHER-BATCH" } }),
      /does not match batch/
    );
  });

  it("test_a2_no_bulk_approve: no service exposes a bulk CoA approval", async () => {
    const mod = await import("../src/server/compliance/labReports");
    expect(Object.keys(mod)).not.toContain("bulkApprove");
    expect(Object.keys(mod)).not.toContain("approveAll");
  });
});

// ─────────────────────────── A3 ───────────────────────────

describe("A3 — safety and audit records are append-only", () => {
  const tables = ["AuditLog", "SensitiveAccessLog", "AdverseEvent", "WalletEntry"];

  it.each(tables)("test_a3_no_delete_grants: app role cannot UPDATE or DELETE %s", async (table) => {
    const grants = await db.$queryRawUnsafe<{ privilege_type: string }[]>(
      `SELECT privilege_type FROM information_schema.role_table_grants
       WHERE table_name = $1 AND grantee = 'vedichemp_app'`,
      table
    );
    const privs = grants.map((g) => g.privilege_type);
    expect(privs).not.toContain("UPDATE");
    expect(privs).not.toContain("DELETE");
  });

  it("test_a3_worm_objects: deleting an adverse event raises, even as owner", async () => {
    await expectRejection(
      () => db.adverseEvent.delete({ where: { id: seed.adverseEventId } }),
      /append-only/
    );
  });

  it("test_a3_recall_delete_grant: app role cannot DELETE Recall", async () => {
    // A Recall is legitimately UPDATEd once (the checker closes it), so unlike
    // the fully-immutable tables above only DELETE is revoked from the app role.
    const grants = await db.$queryRawUnsafe<{ privilege_type: string }[]>(
      `SELECT privilege_type FROM information_schema.role_table_grants
       WHERE table_name = 'Recall' AND grantee = 'vedichemp_app'`
    );
    expect(grants.map((g) => g.privilege_type)).not.toContain("DELETE");
  });

  it("test_a3_worm_recall: deleting a recall raises, even as owner", async () => {
    // The a3_recall_no_delete trigger (migration 0002) is belt-and-braces beyond
    // the role REVOKE: a recall record cannot be erased by anyone, superuser
    // included. A correction is a new recall row, never a delete.
    const recall = await db.recall.create({
      data: { batchId: `batch-${crypto.randomUUID()}`, reason: "WORM check", buyersAffected: 0, makerId: seed.adminOwner },
    });
    await expectRejection(
      () => db.recall.delete({ where: { id: recall.id } }),
      /append-only/
    );
  });

  it("test_a3_correction_is_a_new_row: corrections reference the original", async () => {
    const correction = await db.adverseEvent.create({
      data: {
        productId: seed.cbdProductId,
        reportedBy: "compliance",
        narrative: "Correcting batch code in report " + seed.adverseEventId,
        correctsId: seed.adverseEventId,
      },
    });
    expect(correction.correctsId).toBe(seed.adverseEventId);
    const original = await db.adverseEvent.findUnique({ where: { id: seed.adverseEventId } });
    expect(original).not.toBeNull(); // the original still stands
  });
});

// ─────────────────────────── A4 ───────────────────────────

describe("A4 — health data needs a role, a reason, and a notice", () => {
  it("test_a4_route_scopes: a non-pharmacist, non-compliance admin gets 403", async () => {
    const { getPrescriptionUrl } = await import("../src/server/health/prescriptions");
    await expectRejection(
      () => getPrescriptionUrl({ prescriptionId: seed.prescriptionId, actor: seed.adminSupport, reasonCode: "DISPUTE_EVIDENCE", reasonText: "x".repeat(25) }),
      /FORBIDDEN_SENSITIVE_SCOPE/
    );
  });

  it("test_a4_reason_required: a short reason is rejected by the database", async () => {
    await expectRejection(
      () =>
        db.sensitiveAccessLog.create({
          data: {
            actorId: seed.adminCompliance, actorRoles: ["ADMIN_COMPLIANCE"],
            subjectUserId: seed.buyerId, entityType: "Prescription", entityId: seed.prescriptionId,
            reasonCode: "PRESCRIPTION_VERIFICATION", reasonText: "curious",
          },
        }),
      /a4_reason_text_substantive/
    );
  });

  it("test_a4_reason_code_controlled: an invented reason code is rejected", async () => {
    await expectRejection(
      () =>
        db.sensitiveAccessLog.create({
          data: {
            actorId: seed.adminCompliance, actorRoles: ["ADMIN_COMPLIANCE"],
            subjectUserId: seed.buyerId, entityType: "Prescription", entityId: seed.prescriptionId,
            reasonCode: "JUST_LOOKING", reasonText: "x".repeat(25),
          },
        }),
      /a4_reason_code_controlled/
    );
  });

  it("test_a4_log_precedes_url: no signed URL is issued without a log row", async () => {
    const { getPrescriptionUrl } = await import("../src/server/health/prescriptions");
    const before = await db.sensitiveAccessLog.count();
    await getPrescriptionUrl({
      prescriptionId: seed.prescriptionId, actor: seed.adminPharmacist,
      reasonCode: "PRESCRIPTION_VERIFICATION", reasonText: "Verifying prescription for order VH2026071234",
    });
    const after = await db.sensitiveAccessLog.count();
    expect(after).toBe(before + 1);
  });

  it("test_a4_buyer_notification: the buyer is notified that their record was viewed", async () => {
    const log = await db.sensitiveAccessLog.findFirst({
      where: { subjectUserId: seed.buyerId }, orderBy: { at: "desc" },
    });
    expect(log?.buyerNotifiedAt).not.toBeNull();
  });

  it("test_a4_verified_needs_human: a prescription cannot be VERIFIED by a null actor", async () => {
    await expectRejection(
      () => db.prescription.update({ where: { id: seed.prescriptionId }, data: { status: "VERIFIED", verifiedById: null } }),
      /a4_verified_needs_human/
    );
  });
});

// ─────────────────────────── A5 ───────────────────────────

describe("A5 — no retroactive fee increase", () => {
  it("test_a5_notice_constraint: effective_from < notice + 30d is rejected", async () => {
    const now = new Date();
    await expectRejection(
      () =>
        db.commissionSchedule.create({
          data: {
            complianceClass: ComplianceClass.HEMP_FOOD, ratePpm: 120_000,
            noticeSentAt: now, effectiveFrom: new Date(now.getTime() + 5 * 864e5), createdById: seed.adminOwner,
          },
        }),
      /a5_thirty_day_notice/
    );
  });

  it("test_a5_historic_statement_stability: a posted settlement is immutable", async () => {
    await expectRejection(
      () => db.settlement.update({ where: { id: seed.postedSettlementId }, data: { netPaise: 1 } }),
      /immutable|POSTED/
    );
  });
});

// ─────────────────────────── A6 ───────────────────────────

describe("A6 — no single admin moves money", () => {
  it("test_a6_maker_checker: maker cannot be checker", async () => {
    await expectRejection(
      () =>
        db.settlement.update({
          where: { id: seed.draftSettlementId },
          data: { checkerId: seed.adminFinance, status: SettlementStatus.POSTED }, // same as makerId
        }),
      /a6_maker_is_not_checker/
    );
  });

  it("test_a6_posted_needs_checker: posting without a checker is rejected", async () => {
    await expectRejection(
      () => db.settlement.update({ where: { id: seed.draftSettlementId }, data: { status: SettlementStatus.POSTED } }),
      /a6_posted_needs_checker/
    );
  });

  it("test_a6_service_account_cannot_check: a non-human checker is rejected", async () => {
    const { approveSettlement } = await import("../src/server/money/settlements");
    await expectRejection(
      () => approveSettlement({ settlementId: seed.draftSettlementId, checker: seed.serviceAccount, note: "x".repeat(25) }),
      /CHECKER_MUST_BE_HUMAN/
    );
  });

  it("test_a6_threshold_splitting: three ₹4,999 refunds in 24h trip the checker requirement", async () => {
    const { issueRefund } = await import("../src/server/money/refunds");
    const args = { orderId: seed.orderId, actor: seed.adminOrderOps, amountPaise: 499_900, reasonCode: "QUALITY" };
    await issueRefund(args);
    await issueRefund(args);
    await expectRejection(() => issueRefund(args), /CHECKER_REQUIRED_CUMULATIVE/);
  });

  it("test_a6_roles_mutually_exclusive: one user cannot hold FINANCE and FINANCE_APPROVER", async () => {
    const { grantRole } = await import("../src/server/rbac");
    await expectRejection(
      () => grantRole({ userId: seed.adminFinance, role: "ADMIN_FINANCE_APPROVER", grantedBy: seed.adminOwner }),
      /SEPARATION_OF_DUTIES/
    );
  });
});

/** Seed handles created in tests/setup.ts against a throwaway database. */
declare const seed: {
  sellerId: string; buyerId: string; orderId: string;
  cbdProductId: string; cbdProductNoCoaId: string;
  pendingReportId: string; prescriptionId: string; adverseEventId: string;
  draftSettlementId: string; postedSettlementId: string;
  adminOwner: string; adminCompliance: string; adminPharmacist: string;
  adminSupport: string; adminFinance: string; adminOrderOps: string;
  serviceAccount: string;
};
