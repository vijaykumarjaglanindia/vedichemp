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
  { a: "ADMIN_ANALYST", b: "ADMIN_SUPPORT", note: "The analyst and support roles are never held together — granting either is refused while the other is held, so aggregate read access and per-record lookup stay on separate accounts." },
  // §7 "no superadmin": the owner appoints, so the roles that DO these things
  // can never be granted to the owner's account (and vice versa).
  { a: "ADMIN_OWNER", b: "ADMIN_PHARMACIST", note: "The owner appoints who reads prescriptions — the pharmacist role can never be granted to it (§7). The prescription reveal checks held roles at use time (A4)." },
  { a: "ADMIN_OWNER", b: "ADMIN_COMPLIANCE", note: "The owner appoints compliance — the compliance role can never be granted to it, so health-data access never concentrates with ownership (§7/A4)." },
  { a: "ADMIN_OWNER", b: "ADMIN_FINANCE", note: "The owner appoints who prepares money movements — the finance role can never be granted to it (§7/A6)." },
  { a: "ADMIN_OWNER", b: "ADMIN_FINANCE_APPROVER", note: "The owner appoints who approves money — the approver role can never be granted to it (§7/A6)." },
  { a: "ADMIN_OWNER", b: "ADMIN_DISPUTE", note: "The owner appoints who adjudicates disputes — the dispute role can never be granted to it (§7)." },
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
    // OWNER + SECURITY is a permitted combination: security oversight (audit
    // trail) is exactly the owner's appoint-and-watch remit, not one of the
    // §7-barred powers (prescriptions, money, disputes).
    { email: "admin@example.in", roles: ["ADMIN_OWNER", "ADMIN_SECURITY"] },
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

/* ── Use-time gates ───────────────────────────────────────────
 * The labels above are only worth anything if actions CONSULT them. These
 * helpers are the use-time side: the A4 prescription reveal derives the
 * viewer's role from what they actually HOLD (never from a hardcoded string),
 * and the audit trail is readable only by the auditor/security roles. */

/** A4: the sensitive-viewer role the actor actually holds, or null. An actor
 *  holding neither role gets null — and the reveal fails closed on it. */
export function sensitiveViewerRole(email: string): "ADMIN_PHARMACIST" | "ADMIN_COMPLIANCE" | null {
  const held = findAdmin(email)?.roles ?? [];
  if (held.includes("ADMIN_PHARMACIST")) return "ADMIN_PHARMACIST";
  if (held.includes("ADMIN_COMPLIANCE")) return "ADMIN_COMPLIANCE";
  return null;
}

/** The audit trail is for ADMIN_AUDITOR and ADMIN_SECURITY — checked on the
 *  page itself, not just described in copy. */
export function canViewAuditTrail(email: string): boolean {
  const held = findAdmin(email)?.roles ?? [];
  return held.includes("ADMIN_AUDITOR") || held.includes("ADMIN_SECURITY");
}

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
