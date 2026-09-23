/**
 * VEDIC HEMP — SESSION TOKENS ARE VERIFIED, NOT READ
 *
 * A regression suite for a real bypass: the edge middleware used to base64-decode
 * the cookie payload and route on the `role` it found there WITHOUT checking the
 * HMAC. Since the payload is attacker-supplied until the signature checks out,
 * anyone could mint `{"role":"ADMIN"}` with a garbage signature and the whole
 * admin console rendered — settlements, withdrawals and the audit trail.
 *
 * CLAUDE.md §0: the server is the only authority. A claim the server has not
 * verified is not a fact about the caller; it is the caller's own assertion.
 */

import { describe, it, expect } from "vitest";
import { encodeSession, verifySession, signPayload, SESSION_MAX_AGE } from "@/lib/session-token";

const SECRET = "test-secret-not-the-dev-one";
const OTHER = "a-different-secret";

const claims = { email: "owner@vedichemp.test", name: "Owner", role: "ADMIN" as const };

/** base64url without Buffer, the way the token module encodes. */
const b64url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("a genuine token round-trips", () => {
  it("verifies and carries its claims", async () => {
    const token = await encodeSession(claims, SECRET);
    const out = await verifySession(token, SECRET);
    expect(out).toMatchObject({ email: claims.email, role: "ADMIN" });
    expect(typeof out!.iat).toBe("number");
  });
});

describe("a forged token is refused", () => {
  it("REFUSES a payload claiming ADMIN with a garbage signature", async () => {
    const payload = b64url(JSON.stringify({ email: "mallory@evil.in", name: "M", role: "ADMIN", iat: Date.now() }));
    expect(await verifySession(`${payload}.deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdea`, SECRET)).toBeNull();
  });

  it("REFUSES a role swapped after signing (privilege escalation)", async () => {
    // Legitimately signed as a BUYER, then the payload is rewritten to ADMIN
    // while the original signature is kept.
    const buyer = await encodeSession({ email: "buyer@example.in", name: "B", role: "BUYER" }, SECRET);
    const sig = buyer.slice(buyer.lastIndexOf(".") + 1);
    const escalated = b64url(JSON.stringify({ email: "buyer@example.in", name: "B", role: "ADMIN", iat: Date.now() }));
    expect(await verifySession(`${escalated}.${sig}`, SECRET)).toBeNull();
  });

  it("REFUSES a token signed with a different secret", async () => {
    const foreign = await encodeSession(claims, OTHER);
    expect(await verifySession(foreign, SECRET)).toBeNull();
  });

  it("REFUSES a truncated, empty or malformed token", async () => {
    const token = await encodeSession(claims, SECRET);
    for (const bad of [undefined, "", ".", "no-dot-at-all", token.slice(0, -1), `${token.split(".")[0]}.`]) {
      expect(await verifySession(bad as string | undefined, SECRET)).toBeNull();
    }
  });

  it("REFUSES an unknown role even when the signature is valid", async () => {
    // A correctly-signed token is still not a licence to invent a role.
    const payload = b64url(JSON.stringify({ email: "x@y.in", name: "X", role: "SUPERADMIN", iat: Date.now() }));
    expect(await verifySession(`${payload}.${await signPayload(payload, SECRET)}`, SECRET)).toBeNull();
  });

  it("REFUSES an expired token that is otherwise perfectly signed", async () => {
    const stale = Date.now() - (SESSION_MAX_AGE * 1000 + 60_000);
    const payload = b64url(JSON.stringify({ ...claims, iat: stale }));
    expect(await verifySession(`${payload}.${await signPayload(payload, SECRET)}`, SECRET)).toBeNull();
  });
});

describe("the middleware routes on the verified role", () => {
  it("only lets a role into its own console", async () => {
    // The same decision the middleware makes, on verified claims only.
    const areaFor = async (token: string, area: "BUYER" | "SELLER" | "ADMIN") => {
      const s = await verifySession(token, SECRET);
      return !!s && s.role === area;
    };
    const buyer = await encodeSession({ email: "b@x.in", name: "B", role: "BUYER" }, SECRET);
    const seller = await encodeSession({ email: "s@x.in", name: "S", role: "SELLER" }, SECRET);
    const admin = await encodeSession(claims, SECRET);

    expect(await areaFor(buyer, "BUYER")).toBe(true);
    expect(await areaFor(buyer, "SELLER")).toBe(false);
    expect(await areaFor(buyer, "ADMIN")).toBe(false);
    expect(await areaFor(seller, "ADMIN")).toBe(false);
    expect(await areaFor(admin, "ADMIN")).toBe(true);
    expect(await areaFor(admin, "SELLER")).toBe(false);
  });
});
