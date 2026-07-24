/**
 * Durable snapshot persistence — the pilot bridge that lets the in-process
 * stores survive a restart on a hosted single instance.
 *
 * These prove the round-trip: a store flushed to Postgres comes back byte-for-
 * byte after the in-memory copy is wiped (a "restart"), an untouched store
 * writes nothing, and a store with no snapshot is left to self-seed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { flushAll, hydrateAll, persistenceEnabled } from "@/lib/persist";

type Bag = Record<string, unknown>;
const g = globalThis as unknown as Bag;

beforeEach(async () => {
  await db.appSnapshot.deleteMany({});
  g.__vhCatalogStore = undefined;
  g.__vhOrders = undefined;
});

describe("durable snapshot persistence", () => {
  it("is enabled when a database is configured", () => {
    expect(persistenceEnabled()).toBe(true); // DATABASE_URL is set for the suite
  });

  it("flushes a store and hydrates it back after a simulated restart", async () => {
    g.__vhCatalogStore = { created: [{ id: "cp-x", title: "Persisted Product" }], patches: { a: 1 }, deleted: [], seq: 7 };
    await flushAll();

    // Simulate a process restart: the in-memory copy is gone.
    g.__vhCatalogStore = undefined;

    await hydrateAll();
    const restored = g.__vhCatalogStore as { created: { id: string }[]; seq: number };
    expect(restored).toBeTruthy();
    expect(restored.seq).toBe(7);
    expect(restored.created[0]!.id).toBe("cp-x");
  });

  it("writes one snapshot row per touched store, and none for untouched stores", async () => {
    g.__vhCatalogStore = { created: [], patches: {}, deleted: [], seq: 1 };
    // __vhOrders is left undefined → must not be written.
    await flushAll();
    const rows = await db.appSnapshot.findMany();
    const keys = rows.map((r) => r.key);
    expect(keys).toContain("__vhCatalogStore");
    expect(keys).not.toContain("__vhOrders");
  });

  it("leaves a store with no snapshot untouched, so it can self-seed", async () => {
    // Nothing saved for __vhOrders; hydrate must not clobber/define it.
    await hydrateAll();
    expect(g.__vhOrders).toBeUndefined();
  });

  it("round-trips nested state without corruption", async () => {
    g.__vhOrders = { orders: [{ id: "o1", items: [{ sku: "A", qty: 2 }], totalPaise: 250000 }], seq: 3 };
    await flushAll();
    g.__vhOrders = undefined;
    await hydrateAll();
    const o = g.__vhOrders as { orders: { totalPaise: number; items: unknown[] }[] };
    expect(o.orders[0]!.totalPaise).toBe(250000);
    expect(o.orders[0]!.items).toHaveLength(1);
  });
});
