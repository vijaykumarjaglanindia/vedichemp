/**
 * VEDIC HEMP — RECALL SERVICE TESTS (A3 append-only + A6 maker≠checker)
 *
 * A recall is safety history. It is raised by one compliance human and closed by
 * a *different* compliance human (A6), and it can never be deleted (A3 — the DB
 * REVOKEs DELETE on "Recall"). These tests talk to the same real Postgres as the
 * prohibition suite, over the shared seed in tests/setup.ts, and assert the
 * server says no where it must.
 */

import { describe, it, expect } from "vitest";
import { PrismaClient, AdminRole } from "@prisma/client";

const db = new PrismaClient();

interface Seed {
  adminCompliance: string;
  adminOrderOps: string;
}
const seed = () => (globalThis as unknown as { seed: Seed }).seed;

const expectRejection = async (fn: () => Promise<unknown>, matcher: RegExp) => {
  await expect(fn()).rejects.toThrow(matcher);
};

const batchId = () => `batch-${crypto.randomUUID()}`;
const REASON = "Contaminant detected in this batch; quarantine and recall immediately.";

describe("A3/A6 — recalls are append-only and maker != checker", () => {
  it("(a) a compliance admin initiates a recall — it opens with no checker, not closed", async () => {
    const { initiateRecall } = await import("../src/server/safety/recalls");
    const { id } = await initiateRecall({
      batchId: batchId(),
      reason: REASON,
      buyersAffected: 42,
      maker: seed().adminCompliance,
    });
    expect(id).toBeTruthy();

    const row = await db.recall.findUnique({ where: { id } });
    expect(row).not.toBeNull();
    expect(row?.checkerId).toBeNull();
    expect(row?.closedAt).toBeNull();
    expect(row?.makerId).toBe(seed().adminCompliance);
  });

  it("(b) the same admin who raised the recall cannot close it (A6)", async () => {
    const { initiateRecall, closeRecall } = await import("../src/server/safety/recalls");
    const { id } = await initiateRecall({
      batchId: batchId(),
      reason: REASON,
      buyersAffected: 3,
      maker: seed().adminCompliance,
    });
    await expectRejection(
      () => closeRecall({ recallId: id, checker: seed().adminCompliance }),
      /MAKER_IS_CHECKER/,
    );
  });

  it("(c) a different compliance human can close it — checker and closedAt are set", async () => {
    const { initiateRecall, closeRecall } = await import("../src/server/safety/recalls");
    const { id } = await initiateRecall({
      batchId: batchId(),
      reason: REASON,
      buyersAffected: 0,
      maker: seed().adminCompliance,
    });

    // The seed holds a single ADMIN_COMPLIANCE human; create a second one inline
    // to stand in as the independent checker.
    const otherCompliance = await db.adminUser.create({
      data: {
        email: `compliance2-${crypto.randomUUID()}@vedichemp.test`,
        name: "Second Compliance",
        roles: [AdminRole.ADMIN_COMPLIANCE],
      },
    });

    await closeRecall({ recallId: id, checker: otherCompliance.id });

    const row = await db.recall.findUnique({ where: { id } });
    expect(row?.checkerId).toBe(otherCompliance.id);
    expect(row?.closedAt).not.toBeNull();
  });

  it("(d) a non-compliance human cannot initiate a recall (FORBIDDEN_RECALL)", async () => {
    const { initiateRecall } = await import("../src/server/safety/recalls");
    await expectRejection(
      () =>
        initiateRecall({
          batchId: batchId(),
          reason: REASON,
          buyersAffected: 5,
          maker: seed().adminOrderOps,
        }),
      /FORBIDDEN_RECALL/,
    );
  });

  it("(e) A3 — a recall row cannot be deleted (append-only trigger, even as superuser)", async () => {
    const { initiateRecall } = await import("../src/server/safety/recalls");
    const { id } = await initiateRecall({
      batchId: batchId(),
      reason: REASON,
      buyersAffected: 1,
      maker: seed().adminCompliance,
    });
    // Belt-and-braces: role REVOKE DELETE stops the app; the a3_recall_no_delete
    // trigger stops everyone else too, so this raises even on the superuser test
    // connection. Closing a recall is an UPDATE (allowed) — deleting one never is.
    await expectRejection(
      () => db.recall.delete({ where: { id } }),
      /append-only/,
    );
  });
});
