/**
 * VEDIC HEMP — ROLE-BASED ACCESS CONTROL & SEPARATION OF DUTIES
 *
 * Roles are granted here, and the separation-of-duties matrix is enforced at
 * *grant time*, not at use time. If a single human could hold both FINANCE and
 * FINANCE_APPROVER, maker–checker (A6) would be theatre. So the grant is
 * refused before it ever exists.
 *
 * There is deliberately no PLATFORM_OWNER/superadmin that can move money, read
 * prescriptions, or adjudicate disputes. It can appoint the people who do.
 */

import { AdminRole } from "@prisma/client";
import { db } from "@/lib/db";
import { ProhibitionError, writeAudit } from "@/lib/prohibitions";

/**
 * Pairs of roles that no single identity may hold at once. Each pair is a
 * separation of duty: the maker and the checker of the same class of action.
 */
export const SEPARATION_OF_DUTIES: ReadonlyArray<readonly [AdminRole, AdminRole]> = [
  [AdminRole.ADMIN_FINANCE, AdminRole.ADMIN_FINANCE_APPROVER],
  [AdminRole.ADMIN_DISPUTE, AdminRole.ADMIN_GRIEVANCE],
  [AdminRole.ADMIN_ANALYST, AdminRole.ADMIN_SUPPORT],
  // §7 — no superadmin. ADMIN_OWNER appoints the people who read prescriptions,
  // move money and adjudicate disputes; it can never hold any of those roles
  // itself. Same mechanism as any other SoD pair — no special case.
  [AdminRole.ADMIN_OWNER, AdminRole.ADMIN_PHARMACIST],
  [AdminRole.ADMIN_OWNER, AdminRole.ADMIN_COMPLIANCE],
  [AdminRole.ADMIN_OWNER, AdminRole.ADMIN_FINANCE],
  [AdminRole.ADMIN_OWNER, AdminRole.ADMIN_FINANCE_APPROVER],
  [AdminRole.ADMIN_OWNER, AdminRole.ADMIN_DISPUTE],
] as const;

export function conflictingRole(existing: AdminRole[], candidate: AdminRole): AdminRole | null {
  for (const [a, b] of SEPARATION_OF_DUTIES) {
    if (candidate === a && existing.includes(b)) return b;
    if (candidate === b && existing.includes(a)) return a;
  }
  return null;
}

export async function grantRole(args: {
  userId: string; // AdminUser id
  role: AdminRole | string;
  grantedBy: string;
}): Promise<void> {
  const role = args.role as AdminRole;
  const admin = await db.adminUser.findUnique({ where: { id: args.userId } });
  if (!admin) throw new ProhibitionError("ADMIN_NOT_FOUND", "No such admin user.");

  // No self-grant: privilege must come from a DIFFERENT admin. A single actor
  // handing themselves a role is the whole failure mode SoD exists to prevent,
  // so it is refused before the conflict check even runs (and logged as DENIED).
  if (args.grantedBy === args.userId) {
    await writeAudit({
      actorId: args.grantedBy,
      actorRoles: [],
      actionCode: "ROLE_GRANT",
      entityType: "AdminUser",
      entityId: args.userId,
      reasonCode: "SELF_GRANT",
      outcome: "DENIED",
    });
    throw new ProhibitionError("SELF_GRANT", "You cannot grant a role to yourself — privilege must be granted by a different admin.");
  }

  const clash = conflictingRole(admin.roles, role);
  if (clash) {
    await writeAudit({
      actorId: args.grantedBy,
      actorRoles: [],
      actionCode: "ROLE_GRANT",
      entityType: "AdminUser",
      entityId: args.userId,
      reasonCode: "SEPARATION_OF_DUTIES",
      outcome: "DENIED",
    });
    throw new ProhibitionError(
      "SEPARATION_OF_DUTIES",
      `Cannot grant ${role}: this identity already holds ${clash}, and the two must be held by different people.`
    );
  }

  if (admin.roles.includes(role)) return; // idempotent

  await db.adminUser.update({
    where: { id: args.userId },
    data: { roles: { set: [...admin.roles, role] } },
  });
  await writeAudit({
    actorId: args.grantedBy,
    actorRoles: [],
    actionCode: "ROLE_GRANT",
    entityType: "AdminUser",
    entityId: args.userId,
    reasonCode: "RBAC_ADMIN",
    outcome: "SUCCESS",
  });
}

export async function revokeRole(args: { userId: string; role: AdminRole; grantedBy: string }): Promise<void> {
  const admin = await db.adminUser.findUnique({ where: { id: args.userId } });
  if (!admin) throw new ProhibitionError("ADMIN_NOT_FOUND", "No such admin user.");
  await db.adminUser.update({
    where: { id: args.userId },
    data: { roles: { set: admin.roles.filter((r) => r !== args.role) } },
  });
  await writeAudit({
    actorId: args.grantedBy, actorRoles: [], actionCode: "ROLE_REVOKE",
    entityType: "AdminUser", entityId: args.userId, reasonCode: "RBAC_ADMIN", outcome: "SUCCESS",
  });
}
