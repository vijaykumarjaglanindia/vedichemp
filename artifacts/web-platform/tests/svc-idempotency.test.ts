/**
 * VEDIC HEMP — §4 IDEMPOTENCY REPLAY WINDOW TESTS
 *
 * A money/order mutation runs at most once per (scope, key) within 24h. A repeat
 * inside the window returns the stored result and does NOT run the op again; a
 * repeat before the first has finished is refused; a key past the window is
 * reclaimable. These talk to the same real Postgres as the prohibition suite.
 */

import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const expectRejection = async (fn: () => Promise<unknown>, matcher: RegExp) => {
  await expect(fn()).rejects.toThrow(matcher);
};

const uuid = () => crypto.randomUUID();

describe("§4 — idempotency replay window", () => {
  it("runs the operation exactly once for a repeated key and replays the stored result", async () => {
    const { withIdempotency } = await import("../src/server/idempotency");
    const key = uuid();
    let runs = 0;
    const op = async () => {
      runs += 1;
      return { id: `settlement-${runs}`, amountPaise: 100 };
    };

    const first = await withIdempotency("test.money", key, op);
    expect(first.replayed).toBe(false);
    expect(runs).toBe(1);

    const second = await withIdempotency("test.money", key, op);
    expect(second.replayed).toBe(true);
    expect(runs).toBe(1); // the money-moving op did NOT run a second time
    expect(second.result).toEqual(first.result); // same stored payload
  });

  it("keys are scoped — the same key under a different scope runs independently", async () => {
    const { withIdempotency } = await import("../src/server/idempotency");
    const key = uuid();
    let a = 0;
    let b = 0;
    await withIdempotency("scope.a", key, async () => { a += 1; return { a }; });
    await withIdempotency("scope.b", key, async () => { b += 1; return { b }; });
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it("refuses a duplicate while the first is still in flight (no double-execute)", async () => {
    const { withIdempotency } = await import("../src/server/idempotency");
    const key = uuid();
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));

    // Start a slow op that holds the claim (row exists, result not yet stored).
    const slow = withIdempotency("test.money", key, async () => {
      await gate;
      return { done: true };
    });
    // Give the claim insert a moment to land.
    await new Promise((r) => setTimeout(r, 50));
    // A concurrent duplicate must be refused, not run.
    await expectRejection(
      () => withIdempotency("test.money", key, async () => ({ shouldNotRun: true })),
      /IDEMPOTENCY_IN_PROGRESS/,
    );
    release();
    const done = await slow;
    expect(done.result).toEqual({ done: true });
  });

  it("releases the claim when the operation throws, so a retry can succeed", async () => {
    const { withIdempotency } = await import("../src/server/idempotency");
    const key = uuid();
    await expectRejection(
      () => withIdempotency("test.money", key, async () => { throw new Error("bank timeout"); }),
      /bank timeout/,
    );
    // The failed op left no claim behind — a retry with the same key runs cleanly.
    const retry = await withIdempotency("test.money", key, async () => ({ ok: true }));
    expect(retry.replayed).toBe(false);
    expect(retry.result).toEqual({ ok: true });
  });

  it("reclaims a key whose window has elapsed (a genuinely new op reusing a UUID)", async () => {
    const { withIdempotency } = await import("../src/server/idempotency");
    const key = uuid();
    const first = await withIdempotency("test.money", key, async () => ({ n: 1 }));
    expect(first.replayed).toBe(false);
    // Age the stored key past the 24h window.
    await db.idempotencyKey.update({
      where: { scope_key: { scope: "test.money", key } },
      data: { createdAt: new Date(Date.now() - 25 * 3600 * 1000) },
    });
    // Now the same key is stale and reclaimable — the op runs again.
    const second = await withIdempotency("test.money", key, async () => ({ n: 2 }));
    expect(second.replayed).toBe(false);
    expect(second.result).toEqual({ n: 2 });
  });
});
