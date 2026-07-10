/**
 * VEDIC HEMP — PROHIBITION TEST SEED
 *
 * These are not unit tests: they talk to a real Postgres in which migration
 * 0001_prohibitions has run. This setup builds the minimum real graph the tests
 * reason over — admins with distinct roles, a seller, a buyer with a wallet, a
 * compliant and a non-compliant product, a pending CoA, a prescription, and two
 * settlements (one draft, one posted) — then exposes their ids as `globalThis.seed`.
 *
 * Everything here is created through the same constraints the app obeys. The
 * seed does not, and cannot, bypass a prohibition to set itself up.
 */

import { beforeAll } from "vitest";
import {
  PrismaClient,
  AdminRole,
  ComplianceClass,
  ListingState,
  LabReportStatus,
  SettlementStatus,
  PrescriptionStatus,
} from "@prisma/client";

const db = new PrismaClient();

function plusDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function admin(name: string, roles: AdminRole[]): Promise<string> {
  const row = await db.adminUser.create({
    data: { email: `${name}-${crypto.randomUUID()}@vedichemp.test`, name, roles },
  });
  return row.id;
}

beforeAll(async () => {
  const adminOwner = await admin("owner", [AdminRole.ADMIN_OWNER]);
  const adminCompliance = await admin("compliance", [AdminRole.ADMIN_COMPLIANCE]);
  const adminPharmacist = await admin("pharmacist", [AdminRole.ADMIN_PHARMACIST]);
  const adminSupport = await admin("support", [AdminRole.ADMIN_SUPPORT]);
  const adminFinance = await admin("finance", [AdminRole.ADMIN_FINANCE]);
  const adminOrderOps = await admin("orderops", [AdminRole.ADMIN_ORDER_OPS]);
  // A service account is any id that is NOT a live AdminUser row.
  const serviceAccount = `svc-${crypto.randomUUID()}`;

  const seller = await db.seller.create({
    data: {
      legalName: "Prohibition Test Seller",
      gstin: `05TEST${Math.floor(Math.random() * 1e4)}M1Z9`,
      pan: "AABCT0000M",
      state: "ACTIVE",
      licences: {
        create: [
          { type: "AYUSH", number: "TEST-AYUSH", authority: "State AYUSH", validTill: plusDays(365), verified: true, unlocksClass: ComplianceClass.CBD_WELLNESS },
        ],
      },
    },
  });

  const buyer = await db.user.create({
    data: { email: `buyer-${crypto.randomUUID()}@vedichemp.test`, firstName: "Test", dob: plusDays(-365 * 30) },
  });
  await db.wallet.create({ data: { userId: buyer.id } });

  // A CBD product with a batch and a PENDING report — cannot publish (A2).
  const cbdProduct = await db.product.create({
    data: {
      sellerId: seller.id,
      title: "Test CBD Balm",
      slug: `test-cbd-${crypto.randomUUID()}`,
      complianceClass: ComplianceClass.CBD_WELLNESS,
      listingState: ListingState.DRAFT,
      mrpPaise: 199_900,
      pricePaise: 149_900,
      batches: { create: [{ batchCode: "TEST-CBD-01", mfgDate: plusDays(-10), expiryDate: plusDays(400), quantity: 50 }] },
    },
    include: { batches: true },
  });
  const cbdBatch = cbdProduct.batches[0]!;

  const pendingReport = await db.labReport.create({
    data: {
      batchId: cbdBatch.id,
      batchCode: cbdBatch.batchCode,
      labName: "Test NABL Lab",
      nablNumber: "NABL-0001",
      thcPercent: "0.100",
      cbdPercent: "5.000",
      objectKey: `coa/${crypto.randomUUID()}.pdf`,
      status: LabReportStatus.PENDING,
    },
  });

  // A second CBD product with a batch but NO report at all — the publish gate case.
  const cbdProductNoCoa = await db.product.create({
    data: {
      sellerId: seller.id,
      title: "Test CBD Oil (no CoA)",
      slug: `test-cbd-nocoa-${crypto.randomUUID()}`,
      complianceClass: ComplianceClass.CBD_WELLNESS,
      listingState: ListingState.DRAFT,
      mrpPaise: 299_900,
      pricePaise: 249_900,
      batches: { create: [{ batchCode: "TEST-CBD-NOCOA-01", mfgDate: plusDays(-10), expiryDate: plusDays(400), quantity: 20 }] },
    },
  });

  const order = await db.order.create({
    data: {
      reference: `VH${Date.now()}`,
      userId: buyer.id,
      subtotalPaise: 149_900,
      taxPaise: 26_982,
      totalPaise: 176_882,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  const prescription = await db.prescription.create({
    data: {
      userId: buyer.id,
      doctorName: "Dr Test",
      councilReg: "MCI-TEST-1",
      issuedAt: plusDays(-10),
      validTill: plusDays(80),
      objectKey: `rx/${crypto.randomUUID()}.pdf`,
      status: PrescriptionStatus.PENDING,
    },
  });

  const adverseEvent = await db.adverseEvent.create({
    data: { productId: cbdProduct.id, reportedBy: buyer.id, narrative: "Test adverse event narrative for prohibition suite." },
  });

  // A draft settlement whose maker is adminFinance — used for maker≠checker tests.
  const draftSettlement = await db.settlement.create({
    data: {
      sellerId: seller.id,
      periodStart: plusDays(-30),
      periodEnd: plusDays(-1),
      grossPaise: 1_000_000,
      deductionsPaise: 110_000,
      netPaise: 890_000,
      status: SettlementStatus.AWAITING_CHECKER,
      makerId: adminFinance,
    },
  });

  // A posted, immutable settlement — maker and checker are distinct humans.
  const postedSettlement = await db.settlement.create({
    data: {
      sellerId: seller.id,
      periodStart: plusDays(-60),
      periodEnd: plusDays(-31),
      grossPaise: 500_000,
      deductionsPaise: 55_000,
      netPaise: 445_000,
      status: SettlementStatus.POSTED,
      makerId: adminFinance,
      checkerId: adminOwner,
      postedAt: new Date(),
    },
  });

  (globalThis as Record<string, unknown>).seed = {
    sellerId: seller.id,
    buyerId: buyer.id,
    orderId: order.id,
    cbdProductId: cbdProduct.id,
    cbdProductNoCoaId: cbdProductNoCoa.id,
    pendingReportId: pendingReport.id,
    prescriptionId: prescription.id,
    adverseEventId: adverseEvent.id,
    draftSettlementId: draftSettlement.id,
    postedSettlementId: postedSettlement.id,
    adminOwner,
    adminCompliance,
    adminPharmacist,
    adminSupport,
    adminFinance,
    adminOrderOps,
    serviceAccount,
  };
});
