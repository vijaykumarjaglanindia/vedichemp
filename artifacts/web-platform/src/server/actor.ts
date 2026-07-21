/**
 * VEDIC HEMP — ACTOR RESOLUTION
 *
 * Every mutating service takes an `actor`. In this codebase an actor is the
 * *id* of an AdminUser (or a buyer). The service resolves that id to a concrete
 * identity with roles before it decides anything. A string that resolves to no
 * human is a service account, and a service account may never move money or
 * read health data — see A4 and A6.
 */

import { AdminRole } from "@prisma/client";
import { db } from "@/lib/db";

export interface AdminActor {
  id: string;
  roles: AdminRole[];
  isHuman: true;
}

export interface ServiceActor {
  id: string;
  isHuman: false;
}

export type ResolvedActor = AdminActor | ServiceActor;

/**
 * Resolve an actor id to a human admin, or mark it as a non-human (service)
 * actor. A row that exists in AdminUser and is not disabled is a human. Anything
 * else — an unknown id, a disabled account, a service credential — is not.
 */
export async function resolveAdmin(actorId: string): Promise<ResolvedActor> {
  const admin = await db.adminUser.findUnique({ where: { id: actorId } });
  if (!admin || admin.disabledAt) {
    return { id: actorId, isHuman: false };
  }
  return { id: admin.id, roles: admin.roles, isHuman: true };
}

/**
 * Resolve the AdminUser id for an authenticated admin session by its email.
 * Route handlers use this to derive the acting admin from the *session* rather
 * than a body-supplied id — closing the confused-deputy gap where any admin
 * session could name a different, more-privileged admin as the actor. Returns
 * null when no live AdminUser matches (the caller then fails closed).
 */
export async function adminIdForEmail(email: string): Promise<string | null> {
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin || admin.disabledAt) return null;
  return admin.id;
}

export function requireHuman(actor: ResolvedActor): AdminActor {
  if (!actor.isHuman) {
    throw new Error("CHECKER_MUST_BE_HUMAN");
  }
  return actor;
}
