/**
 * Roles service (SoD at grant time) + platform flags (A6 maker–checker).
 *
 * Proves the two governance gates hold when the client lies: an SoD conflict
 * or a self-grant is refused server-side, the last owner can't be revoked,
 * and a flag never flips without a second, different admin confirming.
 * Runs under the shared setup like every vitest file.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { grantRole, revokeRole, conflictOf, listAdmins, SOD_PAIRS, ADMIN_ROLES, sensitiveViewerRole, canViewAuditTrail } from "@/lib/roles";
import { proposeFlagChange, decideFlagChange, listFlags, listPendingFlagChanges } from "@/lib/flags";

beforeEach(() => {
  (globalThis as { __vhAdminRoles?: unknown }).__vhAdminRoles = undefined;
  (globalThis as { __vhPlatformFlags?: unknown }).__vhPlatformFlags = undefined;
});

describe("SoD matrix (pure)", () => {
  it("conflictOf finds the held role that bars a grant, both directions", () => {
    expect(conflictOf(["ADMIN_FINANCE"], "ADMIN_FINANCE_APPROVER")).toBe("ADMIN_FINANCE");
    expect(conflictOf(["ADMIN_FINANCE_APPROVER"], "ADMIN_FINANCE")).toBe("ADMIN_FINANCE_APPROVER");
    expect(conflictOf(["ADMIN_SUPPORT"], "ADMIN_ANALYST")).toBe("ADMIN_SUPPORT");
    expect(conflictOf(["ADMIN_CMS"], "ADMIN_MARKETING")).toBeNull();
  });
  it("§7: ADMIN_OWNER is barred from prescriptions, money and disputes", () => {
    for (const barred of ["ADMIN_PHARMACIST", "ADMIN_COMPLIANCE", "ADMIN_FINANCE", "ADMIN_FINANCE_APPROVER", "ADMIN_DISPUTE"] as const) {
      expect(conflictOf(["ADMIN_OWNER"], barred)).toBe("ADMIN_OWNER");
      expect(conflictOf([barred], "ADMIN_OWNER")).toBe(barred);
    }
  });
  it("every SoD pair references real roles", () => {
    for (const p of SOD_PAIRS) {
      expect(ADMIN_ROLES).toContain(p.a);
      expect(ADMIN_ROLES).toContain(p.b);
    }
  });
});

describe("grantRole — refused at grant time, not click time", () => {
  it("grants a clean role and lists it", async () => {
    const r = await grantRole({ target: "ops.mehta@vedichemp.in", role: "ADMIN_SUPPORT", actor: "admin@example.in" });
    expect(r.ok).toBe(true);
    const admins = await listAdmins();
    expect(admins.find((a) => a.email === "ops.mehta@vedichemp.in")?.roles).toEqual(["ADMIN_SUPPORT"]);
  });

  it("REFUSES an SoD conflict (maker cannot also be checker at grant time)", async () => {
    const r = await grantRole({ target: "finance.rao@vedichemp.in", role: "ADMIN_FINANCE_APPROVER", actor: "admin@example.in" });
    expect(r).toMatchObject({ ok: false, reason: "sod", conflict: "ADMIN_FINANCE" });
    // Nothing changed on the account.
    expect((await listAdmins()).find((a) => a.email === "finance.rao@vedichemp.in")?.roles).toEqual(["ADMIN_FINANCE"]);
  });

  it("REFUSES §7: the owner cannot be granted pharmacist/finance/dispute powers", async () => {
    for (const role of ["ADMIN_PHARMACIST", "ADMIN_FINANCE", "ADMIN_DISPUTE"]) {
      const r = await grantRole({ target: "admin@example.in", role, actor: "compliance2@example.in" });
      expect(r).toMatchObject({ ok: false, reason: "sod", conflict: "ADMIN_OWNER" });
    }
  });

  it("REFUSES a self-grant — privilege must come from a different admin", async () => {
    const r = await grantRole({ target: "compliance2@example.in", role: "ADMIN_AUDITOR", actor: "Compliance2@Example.in" });
    expect(r).toMatchObject({ ok: false, reason: "self" });
  });

  it("rejects an unknown role and a bad email; refuses a duplicate grant", async () => {
    expect((await grantRole({ target: "a@b.in", role: "ADMIN_GOD", actor: "x@y.in" })).ok).toBe(false);
    expect((await grantRole({ target: "not-an-email", role: "ADMIN_SUPPORT", actor: "x@y.in" })).ok).toBe(false);
    expect((await grantRole({ target: "compliance2@example.in", role: "ADMIN_COMPLIANCE", actor: "admin@example.in" })).ok).toBe(false);
  });
});

describe("revokeRole", () => {
  it("revokes a held role", async () => {
    const r = await revokeRole({ target: "support.dsouza@vedichemp.in", role: "ADMIN_ORDER_OPS" });
    expect(r.ok).toBe(true);
    expect((await listAdmins()).find((a) => a.email === "support.dsouza@vedichemp.in")?.roles).toEqual(["ADMIN_SUPPORT"]);
  });
  it("REFUSES revoking the last ADMIN_OWNER (no ownerless org)", async () => {
    const r = await revokeRole({ target: "admin@example.in", role: "ADMIN_OWNER" });
    expect(r).toMatchObject({ ok: false, reason: "lastowner" });
  });
  it("allows revoking a non-last owner", async () => {
    await grantRole({ target: "second.owner@vedichemp.in", role: "ADMIN_OWNER", actor: "admin@example.in" });
    expect((await revokeRole({ target: "admin@example.in", role: "ADMIN_OWNER" })).ok).toBe(true);
  });
});

describe("use-time gates — labels are consulted where the deed happens", () => {
  it("A4: only actually-held pharmacist/compliance roles yield a viewer role", () => {
    expect(sensitiveViewerRole("compliance2@example.in")).toBe("ADMIN_COMPLIANCE");
    expect(sensitiveViewerRole("pharmacist.nair@vedichemp.in")).toBe("ADMIN_PHARMACIST");
    // §7: the owner holds no sensitive role — the reveal fails closed on null.
    expect(sensitiveViewerRole("admin@example.in")).toBeNull();
    expect(sensitiveViewerRole("nobody@nowhere.in")).toBeNull();
  });
  it("audit trail is readable only via ADMIN_AUDITOR / ADMIN_SECURITY", () => {
    expect(canViewAuditTrail("admin@example.in")).toBe(true); // holds ADMIN_SECURITY
    expect(canViewAuditTrail("compliance2@example.in")).toBe(false);
    expect(canViewAuditTrail("nobody@nowhere.in")).toBe(false);
  });
  it("granting AUDITOR flips audit access on — the gate reads live state", async () => {
    expect(canViewAuditTrail("compliance2@example.in")).toBe(false);
    await grantRole({ target: "compliance2@example.in", role: "ADMIN_AUDITOR", actor: "admin@example.in" });
    expect(canViewAuditTrail("compliance2@example.in")).toBe(true);
  });
});

describe("platform flags — a flag never flips without a second admin (A6)", () => {
  it("propose does NOT flip the flag", async () => {
    const before = (await listFlags()).find((f) => f.key === "seller_analytics_beta")!.on;
    const p = await proposeFlagChange("seller_analytics_beta", "admin@example.in");
    expect(p.ok).toBe(true);
    expect((await listFlags()).find((f) => f.key === "seller_analytics_beta")!.on).toBe(before); // unchanged
    expect(await listPendingFlagChanges()).toHaveLength(1);
  });

  it("REFUSES the maker confirming their own change; a different admin applies it", async () => {
    const p = await proposeFlagChange("seller_analytics_beta", "admin@example.in");
    const id = (p as { proposal: { id: string } }).proposal.id;
    // Maker as checker → refused, still pending, flag unchanged.
    const own = await decideFlagChange(id, "ADMIN@example.in", true);
    expect(own).toMatchObject({ ok: false, reason: "maker" });
    expect(await listPendingFlagChanges()).toHaveLength(1);
    expect((await listFlags()).find((f) => f.key === "seller_analytics_beta")!.on).toBe(false);
    // A different admin confirms → applied.
    const other = await decideFlagChange(id, "compliance2@example.in", true);
    expect(other.ok).toBe(true);
    expect((await listFlags()).find((f) => f.key === "seller_analytics_beta")!.on).toBe(true);
    expect(await listPendingFlagChanges()).toHaveLength(0);
  });

  it("a rejection discards the proposal and leaves the flag unchanged", async () => {
    const p = await proposeFlagChange("buyer_reviews_v2", "admin@example.in");
    const id = (p as { proposal: { id: string } }).proposal.id;
    const r = await decideFlagChange(id, "compliance2@example.in", false);
    expect(r.ok).toBe(true);
    expect((await listFlags()).find((f) => f.key === "buyer_reviews_v2")!.on).toBe(true); // unchanged
  });

  it("one open proposal per flag; unknown flag/id refused", async () => {
    await proposeFlagChange("upi_intent_checkout", "a@x.in");
    expect((await proposeFlagChange("upi_intent_checkout", "b@x.in")).ok).toBe(false);
    expect((await proposeFlagChange("no_such_flag", "a@x.in")).ok).toBe(false);
    expect((await decideFlagChange("fc-999", "b@x.in", true)).ok).toBe(false);
  });

  it("no flag ever gates a prohibition — the registry has no A1–A6 key", async () => {
    for (const f of await listFlags()) {
      expect(/^a[1-6]_|prohibition|med_cannabis_ads|coa_gate|maker_checker/i.test(f.key), f.key).toBe(false);
    }
  });
});
