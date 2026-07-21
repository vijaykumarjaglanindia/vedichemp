/**
 * VEDIC HEMP — A3 / §6: adverse events are append-only and never logged with health data.
 *
 * Two constitution rules meet on this table:
 *
 *   A3 — safety reports cannot be deleted or altered. The service offers no edit
 *   or delete path, and the database backstops it: the a3_adverse_event_immutable
 *   trigger raises on UPDATE/DELETE and the app role has UPDATE, DELETE revoked.
 *   A correction is a NEW row that references the old one via correctsId.
 *
 *   §6 — health data never appears in a log line. The narrative is a person's
 *   symptoms; it must never reach the audit trail. The audit references the event
 *   by id only.
 *
 * These talk to the same real Postgres as the prohibition suite, over the shared
 * seed in tests/setup.ts.
 */

import { describe, it, expect } from "vitest";
import { PrismaClient, ComplianceClass, ListingState } from "@prisma/client";

const db = new PrismaClient();

interface Seed {
  sellerId: string;
}
const seed = () => (globalThis as unknown as { seed: Seed }).seed;

const expectRejection = async (fn: () => Promise<unknown>, matcher: RegExp) => {
  await expect(fn()).rejects.toThrow(matcher);
};

// BigInt-safe stringify — AuditLog.id is a BigInt, which JSON.stringify cannot
// serialize on its own.
const dump = (v: unknown) =>
  JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val));

async function makeProduct(): Promise<string> {
  const p = await db.product.create({
    data: {
      sellerId: seed().sellerId,
      title: "Adverse-event test product",
      slug: `adverse-${crypto.randomUUID()}`,
      complianceClass: ComplianceClass.CBD_WELLNESS,
      listingState: ListingState.DRAFT,
      mrpPaise: 199_900,
      pricePaise: 149_900,
    },
  });
  return p.id;
}

describe("A3/§6 — adverse events are append-only and never logged with health data", () => {
  it("(a) reportAdverseEvent creates a durable row", async () => {
    const { reportAdverseEvent } = await import("../src/server/safety/adverseEvents");
    const productId = await makeProduct();
    const narrative = `Reported dizziness and nausea after use — ${crypto.randomUUID()}`;

    const { id } = await reportAdverseEvent({ productId, reportedBy: seed().sellerId, narrative });

    const row = await db.adverseEvent.findUnique({ where: { id } });
    expect(row).not.toBeNull();
    expect(row?.productId).toBe(productId);
    expect(row?.correctsId).toBeNull();
  });

  it("(b) §6 — the audit row for the report never contains the narrative", async () => {
    const { reportAdverseEvent } = await import("../src/server/safety/adverseEvents");
    const productId = await makeProduct();
    // A unique symptom string so the substring check is meaningful.
    const narrative = `Severe headache and rash, symptom-token-${crypto.randomUUID()}`;

    const { id } = await reportAdverseEvent({ productId, reportedBy: seed().sellerId, narrative });

    const audit = await db.auditLog.findFirst({
      where: { entityType: "AdverseEvent", entityId: id },
      orderBy: { at: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actionCode).toBe("ADVERSE_EVENT_REPORT");
    // The health detail must not appear anywhere in the audit row.
    expect(audit?.reasonText ?? "").not.toContain(narrative);
    expect(dump(audit)).not.toContain(narrative);
    expect(dump(audit)).not.toContain("symptom-token");
  });

  it("(c) correctAdverseEvent writes a NEW row pointing at the original — never an edit", async () => {
    const { reportAdverseEvent, correctAdverseEvent } = await import("../src/server/safety/adverseEvents");
    const productId = await makeProduct();

    const original = await reportAdverseEvent({
      productId,
      reportedBy: seed().sellerId,
      narrative: `Initial report ${crypto.randomUUID()}`,
    });
    const correction = await correctAdverseEvent({
      eventId: original.id,
      reportedBy: seed().sellerId,
      narrative: `Corrected: milder than first stated ${crypto.randomUUID()}`,
    });

    expect(correction.id).not.toBe(original.id);
    const oldRow = await db.adverseEvent.findUnique({ where: { id: original.id } });
    const newRow = await db.adverseEvent.findUnique({ where: { id: correction.id } });
    expect(oldRow).not.toBeNull();
    expect(newRow).not.toBeNull();
    expect(newRow?.correctsId).toBe(original.id);
    expect(newRow?.productId).toBe(productId);
  });

  it("(d) A3 DB backstop — a raw UPDATE on a reported event is rejected", async () => {
    const { reportAdverseEvent } = await import("../src/server/safety/adverseEvents");
    const productId = await makeProduct();
    const { id } = await reportAdverseEvent({
      productId,
      reportedBy: seed().sellerId,
      narrative: `Event to attempt to mutate ${crypto.randomUUID()}`,
    });

    await expectRejection(
      () => db.adverseEvent.update({ where: { id }, data: { acknowledgedAt: new Date() } }),
      /immutable|append|denied|permission|trigger/i,
    );
  });

  it("(d) A3 DB backstop — a raw DELETE on a reported event is rejected", async () => {
    const { reportAdverseEvent } = await import("../src/server/safety/adverseEvents");
    const productId = await makeProduct();
    const { id } = await reportAdverseEvent({
      productId,
      reportedBy: seed().sellerId,
      narrative: `Event to attempt to delete ${crypto.randomUUID()}`,
    });

    await expectRejection(
      () => db.adverseEvent.delete({ where: { id } }),
      /immutable|append|denied|permission|trigger/i,
    );
  });
});
