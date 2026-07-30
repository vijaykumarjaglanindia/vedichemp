import "server-only";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth-lite";
import { findAccount, demoSeedEnabled } from "@/lib/accounts";

/**
 * VEDIC HEMP — STORE STAFF & ROLES (RBAC)
 *
 * A store isn't a single all-powerful login. The owner invites staff and gives
 * each a role; every role maps to a set of permissions, and the SERVER checks
 * the acting member's permissions before a mutation runs — a staffer without
 * the "finance" permission cannot request a payout even by crafted form data.
 *
 * A roster belongs to ONE store. Every read and every write here is keyed by
 * store name, resolved from the signed-in account when a caller does not name
 * one — never a default store, which would hand one seller another seller's
 * roster to read and to write into.
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

const DEMO_STORE = "Vedic Botanicals";

function store(): StaffStore {
  globalThis.__vhStaff ??= {
    members: demoSeedEnabled()
      ? [{ id: "owner", store: DEMO_STORE, name: "Store owner", email: "seller@example.in", role: "OWNER", status: "ACTIVE", invitedAt: "2026-01-01" }]
      : [],
    seq: 100,
  };
  return globalThis.__vhStaff;
}

/** The store the signed-in account owns, or null. The one answer to "whose
 *  roster is this?" when a caller does not name a store. */
async function sessionStore(): Promise<string | null> {
  const email = (await getSession())?.email;
  return (email && findAccount(email)?.sellerStore) || null;
}

/** One store's roster. With no store named, the signed-in account's own — and
 *  an account that owns no store has no roster to read. */
export async function listStaff(storeName?: string): Promise<StaffMember[]> {
  const name = storeName ?? (await sessionStore());
  if (!name) return [];
  return store().members.filter((m) => m.store === name);
}

export function findStaff(id: string): StaffMember | undefined {
  return store().members.find((m) => m.id === id);
}

export type StaffResult = { ok: true; member: StaffMember } | { ok: false; reason: string };

export async function inviteStaff(input: { store?: string; name: string; email: string; role: Role }): Promise<StaffResult> {
  const s = store();
  const storeName = input.store ?? (await sessionStore());
  // Fail closed: an invite with no resolvable store would land in whichever
  // roster the default happened to name.
  if (!storeName) return { ok: false, reason: "store" };
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

/** A member id is a bare string on the wire, so every mutation re-checks that
 *  the row belongs to the caller's own store before touching it. */
async function ownRow(id: string, storeName?: string): Promise<StaffMember | null> {
  const m = findStaff(id);
  const name = storeName ?? (await sessionStore());
  return m && name && m.store === name ? m : null;
}

export async function setStaffRole(id: string, role: Role, storeName?: string): Promise<StaffResult> {
  const m = await ownRow(id, storeName);
  if (!m) return { ok: false, reason: "missing" };
  if (m.role === "OWNER" || role === "OWNER") return { ok: false, reason: "owner" };
  m.role = role;
  return { ok: true, member: m };
}

export async function setStaffStatus(id: string, status: StaffStatus, storeName?: string): Promise<StaffResult> {
  const m = await ownRow(id, storeName);
  if (!m) return { ok: false, reason: "missing" };
  if (m.role === "OWNER") return { ok: false, reason: "owner" };
  m.status = status;
  return { ok: true, member: m };
}

export async function removeStaff(id: string, storeName?: string): Promise<StaffResult> {
  const s = store();
  const m = await ownRow(id, storeName);
  if (!m) return { ok: false, reason: "missing" };
  if (m.role === "OWNER") return { ok: false, reason: "owner" };
  s.members = s.members.filter((x) => x.id !== id);
  return { ok: true, member: m };
}

/** The owner row of a store, or — before one has been invited — a record taken
 *  from the SIGNED-IN account. Never a hardcoded person: a permission gate that
 *  answers for someone who does not exist is not a gate. */
async function ownerOf(storeName: string | null): Promise<StaffMember> {
  const existing = storeName ? store().members.find((m) => m.store === storeName && m.role === "OWNER") : undefined;
  if (existing) return existing;
  const session = await getSession();
  return {
    id: "owner",
    store: storeName ?? "",
    name: session?.name?.trim() || "Store owner",
    email: session?.email ?? "",
    role: "OWNER",
    status: "ACTIVE",
    invitedAt: new Date().toISOString().slice(0, 10),
  };
}

/** The staff member the console is currently acting as (the store's owner by
 *  default). The "act as" cookie carries a bare member id, so it is checked
 *  against the SIGNED-IN account's store — a member of another store's roster
 *  can never become the actor here. An INVITED or SUSPENDED member can't act. */
export async function currentStaff(): Promise<StaffMember> {
  const storeName = await sessionStore();
  const id = (await cookies()).get("vh-staff-as")?.value;
  if (id && id !== "owner") {
    const m = findStaff(id);
    if (m && m.status === "ACTIVE" && m.store === storeName) return m;
  }
  return ownerOf(storeName);
}

/** Does the acting member hold a permission? Fail closed for an account that
 *  belongs to no store — it is not staff anywhere. */
export async function actingCan(perm: Permission): Promise<boolean> {
  const me = await currentStaff();
  if (!me.store) return false;
  return permissionsFor(me.role).has(perm);
}

export async function actAs(id: string): Promise<void> {
  const jar = await cookies();
  if (id === "owner") { jar.delete("vh-staff-as"); return; }
  const m = findStaff(id);
  if (m && m.status === "ACTIVE" && m.store === (await sessionStore())) {
    jar.set("vh-staff-as", id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8 });
  }
}
