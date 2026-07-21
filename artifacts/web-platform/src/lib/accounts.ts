import "server-only";

/**
 * VEDIC HEMP — ACCOUNT DIRECTORY & CREDENTIALS
 *
 * Real accounts, not a role picker. Every sign-in resolves an actual account
 * record and verifies a credential; the role comes from the ACCOUNT, never from
 * a hidden form field, so a buyer can never type their way into the admin
 * console. Passwords are salted + scrypt-hashed (node crypto, no plaintext ever
 * stored, constant-time compare). Buyers self-register; sellers are provisioned
 * through onboarding; admins are provisioned (never self-service — §7), and
 * their granular capabilities live in src/lib/roles.ts keyed by the same email.
 *
 * Store = the DB seam (a `User` / `Seller` / `AdminUser` table keyed by email).
 * Swapping this for the Prisma-backed directory changes nothing for callers.
 */

import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export type AccountRole = "BUYER" | "SELLER" | "ADMIN";

export interface Account {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  passwordHash: string | null; // null = credential set by OTP/OAuth only (no password)
  sellerStore?: string; // for SELLER accounts: the storefront they own
  provider: "password" | "email" | "phone" | "google" | "facebook";
  createdAt: string;
}

interface AccountStore {
  byEmail: Record<string, Account>;
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhAccounts: AccountStore | undefined;
}

/* ── Password hashing (scrypt, salted, constant-time) ─────────────── */

const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), KEYLEN);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

/** Minimum credential strength enforced at registration and password change. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return "Mix upper- and lower-case letters.";
  if (!/[0-9]/.test(password)) return "Include a number.";
  return null;
}

/* ── The seeded directory ─────────────────────────────────────────── */

// A single well-known password for the seeded demo accounts, documented in
// SEED_CREDENTIALS below. Production seeds one bootstrap owner and forces a
// reset on first sign-in; here every seeded account shares it so the platform
// is immediately explorable with real, credential-checked logins.
const SEED_PASSWORD = "Vedic@Hemp1";

interface Seed { email: string; name: string; role: AccountRole; store?: string }

const SEED_ACCOUNTS: Seed[] = [
  // Buyers
  { email: "asha.verma@vedichemp.in", name: "Asha Verma", role: "BUYER" },
  { email: "buyer@example.in", name: "Asha Verma", role: "BUYER" },
  // Sellers (each owns one storefront)
  { email: "rao@vedicbotanicals.in", name: "Rao Kulkarni", role: "SELLER", store: "Vedic Botanicals" },
  { email: "seller@example.in", name: "Rao Kulkarni", role: "SELLER", store: "Vedic Botanicals" },
  { email: "owner@himalayanhemp.in", name: "Meera Thapa", role: "SELLER", store: "Himalayan Hemp Co." },
  { email: "owner@anandafoods.in", name: "Anil Nanda", role: "SELLER", store: "Ananda Foods" },
  // Admins (granular capabilities resolved in roles.ts by the same email)
  { email: "admin@example.in", name: "Platform Owner", role: "ADMIN" },
  { email: "finance.rao@vedichemp.in", name: "Rao (Finance)", role: "ADMIN" },
  { email: "finance.approver.iyer@vedichemp.in", name: "Iyer (Finance Approver)", role: "ADMIN" },
  { email: "pharmacist.nair@vedichemp.in", name: "Nair (Pharmacist)", role: "ADMIN" },
  { email: "compliance2@example.in", name: "Compliance Officer", role: "ADMIN" },
  { email: "support.dsouza@vedichemp.in", name: "D'Souza (Support)", role: "ADMIN" },
];

/** Human-readable seed credentials for the sign-in page's demo hint + docs. */
export const SEED_CREDENTIALS = {
  password: SEED_PASSWORD,
  buyer: "buyer@example.in",
  seller: "seller@example.in",
  admin: "admin@example.in",
};

function seedStore(): AccountStore {
  const s: AccountStore = { byEmail: {}, seq: 1 };
  for (const a of SEED_ACCOUNTS) {
    const email = a.email.toLowerCase();
    s.byEmail[email] = {
      id: `acc-${s.seq++}`,
      email,
      name: a.name,
      role: a.role,
      passwordHash: hashPassword(SEED_PASSWORD),
      ...(a.store ? { sellerStore: a.store } : {}),
      provider: "password",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
  }
  return s;
}

function store(): AccountStore {
  globalThis.__vhAccounts ??= seedStore();
  return globalThis.__vhAccounts;
}

/* ── Directory operations ─────────────────────────────────────────── */

export function findAccount(email: string): Account | null {
  return store().byEmail[email.trim().toLowerCase()] ?? null;
}

export type AuthResult =
  | { ok: true; account: Account }
  | { ok: false; reason: "NO_ACCOUNT" | "BAD_PASSWORD" | "NO_PASSWORD" };

/** Verify an email + password against the directory. Constant-time on the hash. */
export function authenticate(email: string, password: string): AuthResult {
  const account = findAccount(email);
  if (!account) return { ok: false, reason: "NO_ACCOUNT" };
  if (!account.passwordHash) return { ok: false, reason: "NO_PASSWORD" };
  if (!verifyPassword(password, account.passwordHash)) return { ok: false, reason: "BAD_PASSWORD" };
  return { ok: true, account };
}

export type RegisterResult =
  | { ok: true; account: Account }
  | { ok: false; reason: "EXISTS" | "WEAK_PASSWORD" | "INVALID_EMAIL" };

/**
 * Self-service registration. Buyers only — a seller account is created through
 * licence onboarding, and an admin is provisioned by an owner (never here, §7).
 */
export function register(input: { email: string; password: string; name: string }): RegisterResult {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return { ok: false, reason: "INVALID_EMAIL" };
  if (passwordProblem(input.password)) return { ok: false, reason: "WEAK_PASSWORD" };
  const s = store();
  if (s.byEmail[email]) return { ok: false, reason: "EXISTS" };
  const account: Account = {
    id: `acc-${s.seq++}`,
    email,
    name: input.name.trim().slice(0, 60) || (email.split("@")[0] ?? "Member"),
    role: "BUYER",
    passwordHash: hashPassword(input.password),
    provider: "password",
    createdAt: new Date().toISOString(),
  };
  s.byEmail[email] = account;
  return { ok: true, account };
}

/**
 * Ensure a passwordless account exists for a verified OTP/OAuth identity, so an
 * email- or phone-verified sign-in is still a real, durable account. The role is
 * decided by the caller's door (a buyer door can only ever make a buyer), never
 * escalating an existing account.
 */
export function ensureAccount(input: { email: string; name: string; role: AccountRole; provider: Account["provider"]; store?: string }): Account {
  const email = input.email.trim().toLowerCase();
  const s = store();
  const existing = s.byEmail[email];
  if (existing) return existing;
  const account: Account = {
    id: `acc-${s.seq++}`,
    email,
    name: input.name.trim().slice(0, 60) || (email.split("@")[0] ?? "Member"),
    role: input.role,
    passwordHash: null,
    ...(input.store ? { sellerStore: input.store } : {}),
    provider: input.provider,
    createdAt: new Date().toISOString(),
  };
  s.byEmail[email] = account;
  return account;
}

/** Set or change an account's password (registration completion, reset). */
export function setPassword(email: string, password: string): boolean {
  if (passwordProblem(password)) return false;
  const account = findAccount(email);
  if (!account) return false;
  account.passwordHash = hashPassword(password);
  return true;
}
