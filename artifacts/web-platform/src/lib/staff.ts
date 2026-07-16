import "server-only";
import { cookies } from "next/headers";

/**
 * VEDIC HEMP — STORE STAFF & ROLES (RBAC)
 *
 * A store isn't a single all-powerful login. The owner invites staff and gives
 * each a role; every role maps to a set of permissions, and the SERVER checks
 * the acting member's permissions before a mutation runs — a staffer without
 * the "finance" permission cannot request a payout even by crafted form data.
 *
 * "Act as" (a demo convenience) switches the acting member via a cookie so the
 * gates can be exercised; in production this is simply the signed-in staff
 * session. The owner and the "staff" permission itself are never delegable
 * beyond the owner + managers.
 */

export type Permission = "catalogue" | "orders" | "marketing" | "finance" | "support" | "staff";
export type Role = "OWNER" | "MANAGER" | "CATALOGUE" | "ORDERS" | "MARKETING" | "FINANCE" | "SUPPORT";
export type StaffStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export const ROLE_DEFS: { role: Role; label: string; perms: Permission[]; blurb: string }[] = [
  { role: "OWNER", label: "Owner", perms: ["catalogue", "orders", "marketing", "finance", "support", "staff"], blurb: "Full access, including staff and payouts." },
  { role: "MANAGER", label: "Manager", perms: ["catalogue", "orders", "marketing", "finance", "support"], blurb: "Everything except managing staff." },
  { role: "CATALOGUE", label: "Catalogue manager", perms: ["catalogue"], blurb: "Products, inventory and variants only." },
  { role: "ORDERS", label: "Order manager", perms: ["orders"], blurb: "Accept, pack, ship and handle returns." },
  { role: "MARKETING", label: "Marketing", perms: ["marketing"], blurb: "Ads, coupons and promotions." },
  { role: "FINANCE", label: "Finance", perms: ["finance"], blurb: "Earnings and payouts." },
  { role: "SUPPORT", label: "Support", perms: ["support"], blurb: "Customer questions, reviews and messages." },
];

export function permissionsFor(role: Role): Set<Permission> {
  return new Set(ROLE_DEFS.find((r) => r.role === role)?.perms ?? []);
}

export interface StaffMember {
  id: string;
  store: string;
  name: string;
  email: string;
  role: Role;
  status: StaffStatus;
  invitedAt: string;
}

interface StaffStore {
  members: StaffMember[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhStaff: StaffStore | undefined;
}

const STORE = "Vedic Botanicals";

function store(): StaffStore {
  globalThis.__vhStaff ??= {
    members: [
      { id: "owner", store: STORE, name: "Store owner", email: "seller@example.in", role: "OWNER", status: "ACTIVE", invitedAt: "2026-01-01" },
    ],
    seq: 100,
  };
  return globalThis.__vhStaff;
}

export async function listStaff(storeName = STORE): Promise<StaffMember[]> {
  return store().members.filter((m) => m.store === storeName);
}

export function findStaff(id: string): StaffMember | undefined {
  return store().members.find((m) => m.id === id);
}

export type StaffResult = { ok: true; member: StaffMember } | { ok: false; reason: string };

export async function inviteStaff(input: { store?: string; name: string; email: string; role: Role }): Promise<StaffResult> {
  const s = store();
  const storeName = input.store ?? STORE;
  if (s.members.some((m) => m.store === storeName && m.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, reason: "dupe" };
  }
  if (input.role === "OWNER") return { ok: false, reason: "owner" }; // there is exactly one owner
  const member: StaffMember = {
    id: `st${s.seq++}`,
    store: storeName,
    name: input.name,
    email: input.email,
    role: input.role,
    status: "ACTIVE", // owner-added staff are active immediately (the invite email is a courtesy)
    invitedAt: new Date().toISOString().slice(0, 10),
  };
  s.members.push(member);
  return { ok: true, member };
}

export async function setStaffRole(id: string, role: Role): Promise<StaffResult> {
  const m = findStaff(id);
  if (!m) return { ok: false, reason: "missing" };
  if (m.role === "OWNER" || role === "OWNER") return { ok: false, reason: "owner" };
  m.role = role;
  return { ok: true, member: m };
}

export async function setStaffStatus(id: string, status: StaffStatus): Promise<StaffResult> {
  const m = findStaff(id);
  if (!m) return { ok: false, reason: "missing" };
  if (m.role === "OWNER") return { ok: false, reason: "owner" };
  m.status = status;
  return { ok: true, member: m };
}

export async function removeStaff(id: string): Promise<StaffResult> {
  const s = store();
  const m = findStaff(id);
  if (!m) return { ok: false, reason: "missing" };
  if (m.role === "OWNER") return { ok: false, reason: "owner" };
  s.members = s.members.filter((x) => x.id !== id);
  return { ok: true, member: m };
}

const OWNER: StaffMember = { id: "owner", store: STORE, name: "Store owner", email: "seller@example.in", role: "OWNER", status: "ACTIVE", invitedAt: "2026-01-01" };

/** The staff member the console is currently acting as (owner by default). An
 *  INVITED or SUSPENDED member can't act — it falls back to the owner. */
export async function currentStaff(): Promise<StaffMember> {
  const id = (await cookies()).get("vh-staff-as")?.value;
  if (!id || id === "owner") return findStaff("owner") ?? OWNER;
  const m = findStaff(id);
  return m && m.status === "ACTIVE" ? m : (findStaff("owner") ?? OWNER);
}

/** Does the acting member hold a permission? */
export async function actingCan(perm: Permission): Promise<boolean> {
  const me = await currentStaff();
  return permissionsFor(me.role).has(perm);
}

export async function actAs(id: string): Promise<void> {
  const jar = await cookies();
  if (id === "owner") { jar.delete("vh-staff-as"); return; }
  const m = findStaff(id);
  if (m && m.status === "ACTIVE") jar.set("vh-staff-as", id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8 });
}
