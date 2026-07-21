/**
 * VEDIC HEMP — ACCOUNT DIRECTORY & CREDENTIALS TESTS
 *
 * Real accounts with hashed passwords: sign-in verifies a credential and takes
 * the role from the ACCOUNT, so no one can type their way into a console they
 * were not provisioned for. These are pure unit tests — no DB, no request.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  hashPassword, verifyPassword, passwordProblem,
  authenticate, register, ensureAccount, findAccount, setPassword,
  SEED_CREDENTIALS,
} from "../src/lib/accounts";

// Each test starts from a fresh seeded directory.
beforeEach(() => { (globalThis as { __vhAccounts?: unknown }).__vhAccounts = undefined; });

describe("password hashing", () => {
  it("round-trips a correct password and rejects a wrong one, and never stores plaintext", () => {
    const stored = hashPassword("Sup3rSecret");
    expect(stored).not.toContain("Sup3rSecret");
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(verifyPassword("Sup3rSecret", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
    expect(verifyPassword("Sup3rSecret", null)).toBe(false);
  });

  it("salts each hash so identical passwords produce different stored values", () => {
    expect(hashPassword("samePass1")).not.toBe(hashPassword("samePass1"));
  });

  it("rejects weak passwords at the policy boundary", () => {
    expect(passwordProblem("short1A")).toBeTruthy();          // < 8
    expect(passwordProblem("alllowercase1")).toBeTruthy();    // no upper
    expect(passwordProblem("ALLUPPERCASE1")).toBeTruthy();    // no lower
    expect(passwordProblem("NoDigitsHere")).toBeTruthy();     // no number
    expect(passwordProblem("Str0ngEnough")).toBeNull();       // ok
  });
});

describe("authenticate — credential verified against the directory", () => {
  it("signs in a seeded account with the right password", () => {
    const res = authenticate(SEED_CREDENTIALS.buyer, SEED_CREDENTIALS.password);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.account.role).toBe("BUYER");
  });

  it("takes the role from the ACCOUNT — the admin account is ADMIN, the seller SELLER", () => {
    const admin = authenticate(SEED_CREDENTIALS.admin, SEED_CREDENTIALS.password);
    const seller = authenticate(SEED_CREDENTIALS.seller, SEED_CREDENTIALS.password);
    expect(admin.ok && admin.account.role).toBe("ADMIN");
    expect(seller.ok && seller.account.role).toBe("SELLER");
  });

  it("rejects a wrong password and an unknown email distinctly but safely", () => {
    const bad = authenticate(SEED_CREDENTIALS.buyer, "not-the-password");
    const none = authenticate("nobody@nowhere.in", SEED_CREDENTIALS.password);
    expect(bad.ok).toBe(false);
    expect(none.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("BAD_PASSWORD");
    if (!none.ok) expect(none.reason).toBe("NO_ACCOUNT");
  });

  it("is case-insensitive on the email", () => {
    expect(authenticate(SEED_CREDENTIALS.buyer.toUpperCase(), SEED_CREDENTIALS.password).ok).toBe(true);
  });
});

describe("register — buyer self-service", () => {
  it("creates a BUYER account and refuses a duplicate", () => {
    const first = register({ email: "new.buyer@example.in", password: "Str0ngPass", name: "New Buyer" });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.account.role).toBe("BUYER");
    const dup = register({ email: "new.buyer@example.in", password: "Str0ngPass", name: "Again" });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.reason).toBe("EXISTS");
  });

  it("refuses a weak password and an invalid email", () => {
    const weak = register({ email: "weak@example.in", password: "weak", name: "W" });
    const bad = register({ email: "not-an-email", password: "Str0ngPass", name: "B" });
    expect(weak.ok).toBe(false);
    expect(bad.ok).toBe(false);
    if (!weak.ok) expect(weak.reason).toBe("WEAK_PASSWORD");
    if (!bad.ok) expect(bad.reason).toBe("INVALID_EMAIL");
  });

  it("a freshly registered buyer can then authenticate", () => {
    register({ email: "loop@example.in", password: "Str0ngPass", name: "Loop" });
    expect(authenticate("loop@example.in", "Str0ngPass").ok).toBe(true);
  });
});

describe("ensureAccount — verified OTP/OAuth identities are real, durable accounts", () => {
  it("creates once and returns the same record on repeat, never escalating role", () => {
    const a = ensureAccount({ email: "otp@example.in", name: "OTP User", role: "BUYER", provider: "phone" });
    const b = ensureAccount({ email: "otp@example.in", name: "OTP User", role: "BUYER", provider: "phone" });
    expect(a.id).toBe(b.id);
    expect(a.passwordHash).toBeNull();
    // A second call naming a higher role does not change the existing account.
    const c = ensureAccount({ email: "otp@example.in", name: "OTP User", role: "ADMIN", provider: "phone" });
    expect(c.role).toBe("BUYER");
  });
});

describe("setPassword", () => {
  it("changes a password for a real account and enforces strength", () => {
    register({ email: "reset@example.in", password: "Str0ngPass", name: "R" });
    expect(setPassword("reset@example.in", "weak")).toBe(false);
    expect(setPassword("reset@example.in", "N3wStrongPass")).toBe(true);
    expect(authenticate("reset@example.in", "N3wStrongPass").ok).toBe(true);
    expect(authenticate("reset@example.in", "Str0ngPass").ok).toBe(false);
    expect(setPassword("ghost@example.in", "N3wStrongPass")).toBe(false);
  });
});

describe("directory", () => {
  it("finds a seeded account and returns its store for a seller", () => {
    const seller = findAccount(SEED_CREDENTIALS.seller);
    expect(seller?.role).toBe("SELLER");
    expect(seller?.sellerStore).toBeTruthy();
  });
});
