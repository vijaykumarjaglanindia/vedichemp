/**
 * VEDIC HEMP — ADMIN ROLES SERVICE (separation of duties, enforced at GRANT time)
 *
 * The settings page promises: "granting one revokes eligibility for the other,
 * enforced at grant time by the roles service, not by a checkbox in this UI."
 * This is that service. The SoD matrix is data here — the single source of
 * truth the page renders AND the grant path enforces, so the table an admin
 * reads and the rule that binds them can never drift apart.
 *
 * Structural rules (CLAUDE.md §7 — "no superadmin"):
 *  - ADMIN_OWNER appoints the people who read prescriptions, approve money and
 *    adjudicate disputes — it cannot hold any of those roles itself. That is
 *    expressed as SoD pairs with ADMIN_OWNER, same mechanism, no special case.
 *  - No self-grant: privilege must come from a DIFFERENT admin (loud,
 *    attributable, slow). Self-REVOKE is allowed — shrinking your own access
 *    never needs a second person.
 *  - The last ADMIN_OWNER cannot be revoked (no lockout, no ownerless org).
 *
 * Server-side store = the DB seam (AdminRoleGrant table + a grant-time trigger
 * in production; PRODUCTION.md). Every refusal returns a machine reason the
 * action layer audits as DENIED.
 */

export const ADMIN_ROLES = [
  "ADMIN_OWNER", "ADMIN_SECURITY", "ADMIN_COMPLIANCE", "ADMIN_PHARMACIST", "ADMIN_SELLER_OPS",
  "ADMIN_CATALOGUE", "ADMIN_ORDER_OPS", "ADMIN_DISPUTE", "ADMIN_GRIEVANCE", "ADMIN_FINANCE",
  "ADMIN_FINANCE_APPROVER", "ADMIN_ADS", "ADMIN_CMS", "ADMIN_MARKETING", "ADMIN_SUPPORT",
  "ADMIN_ANALYST", "ADMIN_AUDITOR",
] as const;
export type AdminRoleName = (typeof ADMIN_ROLES)[number];

export interface SodPair {
  a: AdminRoleName;
  b: AdminRoleName;
  note: string;
}

/** Mutually-exclusive role pairs. Symmetric: holding either bars the other. */
export const SOD_PAIRS: SodPair[] = [
  { a: "ADMIN_FINANCE", b: "ADMIN_FINANCE_APPROVER", note: "The admin who prepares a settlement or refund (maker) cannot also hold the approver (checker) role — A6 at grant time, not just at click time." },
  { a: "ADMIN_DISPUTE", b: "ADMIN_GRIEVANCE", note: "The admin adjudicating a buyer–seller dispute is not the same admin who handles the buyer's escalated grievance about that dispute." },
  { a: "ADMIN_ANALYST", b: "ADMIN_SUPPORT", note: "Analysts with broad read access to aggregate data do not also hold support's per-record lookup powers, and vice versa." },
  // §7 "no superadmin": the owner appoints, and can therefore do none of these.
  { a: "ADMIN_OWNER", b: "ADMIN_PHARMACIST", note: "The owner appoints who reads prescriptions — it cannot read them itself (§7)." },
  { a: "ADMIN_OWNER", b: "ADMIN_COMPLIANCE", note: "The owner appoints compliance — health-data access never concentrates with ownership (§7/A4)." },
  { a: "ADMIN_OWNER", b: "ADMIN_FINANCE", note: "The owner appoints who moves money — it cannot be a money maker itself (§7/A6)." },
  { a: "ADMIN_OWNER", b: "ADMIN_FINANCE_APPROVER", note: "The owner appoints who approves money — it cannot be the checker itself (§7/A6)." },
  { a: "ADMIN_OWNER", b: "ADMIN_DISPUTE", note: "The owner appoints who adjudicates disputes — it cannot adjudicate itself (§7)." },
];

/** Pure: the first held role that bars `role`, or null if none. */
export function conflictOf(held: readonly string[], role: AdminRoleName): AdminRoleName | null {
  for (const p of SOD_PAIRS) {
    if (p.a === role && held.includes(p.b)) return p.b;
    if (p.b === role && held.includes(p.a)) return p.a;
  }
  return null;
}

export interface AdminAccount {
  email: string;
  roles: AdminRoleName[];
}

declare global {
  // eslint-disable-next-line no-var
  var __vhAdminRoles: AdminAccount[] | undefined;
}

function seed(): AdminAccount[] {
  return [
    { email: "admin@example.in", roles: ["ADMIN_OWNER"] },
    { email: "compliance2@example.in", roles: ["ADMIN_COMPLIANCE"] },
    { email: "pharmacist.nair@vedichemp.in", roles: ["ADMIN_PHARMACIST"] },
    { email: "finance.rao@vedichemp.in", roles: ["ADMIN_FINANCE"] },
    { email: "finance.approver.iyer@vedichemp.in", roles: ["ADMIN_FINANCE_APPROVER"] },
    { email: "support.dsouza@vedichemp.in", roles: ["ADMIN_SUPPORT", "ADMIN_ORDER_OPS"] },
  ];
}

function store(): AdminAccount[] {
  globalThis.__vhAdminRoles ??= seed();
  return globalThis.__vhAdminRoles;
}

export async function listAdmins(): Promise<AdminAccount[]> {
  return store().map((a) => ({ ...a, roles: [...a.roles] }));
}

export function findAdmin(email: string): AdminAccount | undefined {
  return store().find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export type GrantResult =
  | { ok: true }
  | { ok: false; reason: "role" | "target" | "self" | "held"; conflict?: undefined }
  | { ok: false; reason: "sod"; conflict: AdminRoleName };

/**
 * Grant `role` to `target`. Fail closed: an SoD conflict (including the §7
 * owner bars) or a self-grant is refused with a machine reason the caller
 * audits. An unknown target becomes a new admin account on first grant.
 */
export async function grantRole(args: { target: string; role: string; actor: string }): Promise<GrantResult> {
  const role = args.role as AdminRoleName;
  const target = args.target.trim().toLowerCase();
  if (!ADMIN_ROLES.includes(role)) return { ok: false, reason: "role" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) return { ok: false, reason: "target" };
  // Privilege comes from someone else — never from your own hand.
  if (target === args.actor.trim().toLowerCase()) return { ok: false, reason: "self" };

  const existing = findAdmin(target);
  const held = existing?.roles ?? [];
  if (held.includes(role)) return { ok: false, reason: "held" };
  const conflict = conflictOf(held, role);
  if (conflict) return { ok: false, reason: "sod", conflict };

  if (existing) existing.roles.push(role);
  else store().push({ email: target, roles: [role] });
  return { ok: true };
}

export type RevokeResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "lastowner" };

/** Revoke a held role. The LAST ADMIN_OWNER can never be revoked (lockout). */
export async function revokeRole(args: { target: string; role: string }): Promise<RevokeResult> {
  const target = findAdmin(args.target);
  if (!target || !target.roles.includes(args.role as AdminRoleName)) return { ok: false, reason: "missing" };
  if (args.role === "ADMIN_OWNER") {
    const owners = store().filter((a) => a.roles.includes("ADMIN_OWNER")).length;
    if (owners <= 1) return { ok: false, reason: "lastowner" };
  }
  target.roles = target.roles.filter((r) => r !== args.role);
  return { ok: true };
}
