/**
 * Live prohibition probes — the registry page's status is computed, not faked.
 *
 * This suite is also a second regression net over A1–A6: if a guard is deleted
 * or weakened, the matching probe flips and this test fails alongside
 * tests/prohibitions.test.ts. Runs under the shared setup like every vitest file.
 */
import { describe, it, expect } from "vitest";
import { prohibitionProbes } from "@/lib/prohibition-checks";

describe("prohibitionProbes — live A1–A6 status", () => {
  it("covers every prohibition code exactly once", async () => {
    const s = await prohibitionProbes();
    expect(s.map((x) => x.code)).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
  });

  it("every prohibition is ENFORCED (all probes green) in a healthy codebase", async () => {
    const s = await prohibitionProbes();
    for (const p of s) {
      const failing = p.probes.filter((pr) => !pr.ok).map((pr) => pr.name);
      expect(failing, `${p.code} has failing probes: ${failing.join("; ")}`).toEqual([]);
      expect(p.ok).toBe(true);
      expect(p.passed).toBe(p.total);
      expect(p.total).toBeGreaterThan(0);
    }
  });

  it("each code runs multiple independent probes (not a single point)", async () => {
    const s = await prohibitionProbes();
    // A1 and A6 exercise the real production guards and each carry several probes.
    expect(s.find((x) => x.code === "A1")!.total).toBeGreaterThanOrEqual(3);
    expect(s.find((x) => x.code === "A6")!.total).toBeGreaterThanOrEqual(3);
    const total = s.reduce((n, x) => n + x.total, 0);
    expect(total).toBeGreaterThanOrEqual(18);
  });
});
