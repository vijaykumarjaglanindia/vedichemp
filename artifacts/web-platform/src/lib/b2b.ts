/**
 * VEDIC HEMP — BUSINESS (B2B) ACCOUNTS
 *
 * A buyer can apply to become a business account (clinic, reseller, wellness
 * studio). Once the platform approves it, that buyer sees wholesale price
 * breaks at the cart — server-side, keyed to the verified account, never a
 * client flag. Approval is an admin act with a GSTIN on file; the discount is
 * only ever the seller's own tier price, so B2B pricing can't undercut a
 * regulated floor.
 *
 * Store = the DB seam (a `BusinessAccount` table keyed by buyer email).
 */

export type B2BStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface BusinessAccount {
  email: string;
  company: string;
  gstin: string;
  status: B2BStatus;
  note?: string; // reviewer note on rejection
  requestedAt: string;
  decidedAt?: string;
}

interface B2BStore {
  accounts: BusinessAccount[];
}

declare global {
  // eslint-disable-next-line no-var
  var __vhB2B: B2BStore | undefined;
}

function store(): B2BStore {
  globalThis.__vhB2B ??= { accounts: [] };
  return globalThis.__vhB2B;
}

const today = () => new Date().toISOString().slice(0, 10);

export function accountFor(email: string): BusinessAccount | undefined {
  return store().accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export async function statusFor(email: string): Promise<B2BStatus> {
  return accountFor(email)?.status ?? "NONE";
}

export async function isBusinessBuyer(email: string): Promise<boolean> {
  return accountFor(email)?.status === "APPROVED";
}

export type B2BResult = { ok: true; account: BusinessAccount } | { ok: false; reason: string };

/** Buyer applies (or re-applies after a rejection). */
export async function requestBusiness(input: { email: string; company: string; gstin: string }): Promise<B2BResult> {
  const s = store();
  const existing = accountFor(input.email);
  if (existing && (existing.status === "APPROVED" || existing.status === "PENDING")) {
    return { ok: false, reason: existing.status === "APPROVED" ? "already" : "pending" };
  }
  const account: BusinessAccount = {
    email: input.email,
    company: input.company,
    gstin: input.gstin,
    status: "PENDING",
    requestedAt: today(),
  };
  if (existing) Object.assign(existing, account);
  else s.accounts.push(account);
  return { ok: true, account };
}

export async function pendingBusiness(): Promise<BusinessAccount[]> {
  return store().accounts.filter((a) => a.status === "PENDING");
}
export async function allBusiness(): Promise<BusinessAccount[]> {
  return [...store().accounts].sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}

export async function decideBusiness(email: string, approve: boolean, note?: string): Promise<B2BResult> {
  const a = accountFor(email);
  if (!a) return { ok: false, reason: "missing" };
  if (a.status !== "PENDING") return { ok: false, reason: "state" };
  a.status = approve ? "APPROVED" : "REJECTED";
  a.decidedAt = today();
  if (note) a.note = note;
  return { ok: true, account: a };
}
