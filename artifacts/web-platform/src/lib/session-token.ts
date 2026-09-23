/**
 * VEDIC HEMP — SESSION TOKEN (one signing rule, both runtimes)
 *
 * The token is `base64url(payload).hmac-sha256(payload)`. This module is the
 * ONLY place that rule lives, so the edge middleware and the Node server agree
 * by construction rather than by two implementations staying in step — the
 * previous split let the middleware route on a role it had never verified.
 *
 * Web Crypto rather than node:crypto because the middleware runs on the Edge
 * runtime, which has no node:crypto. `crypto.subtle.verify` is constant-time,
 * which is the property the signature comparison needs.
 *
 * No `server-only` here on purpose: the middleware must import it. It reads a
 * secret and verifies bytes; it touches no request state and no cookie jar.
 */

export const SESSION_COOKIE = "vh-session";
export const DISPLAY_COOKIE = "vh-user";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionRole = "BUYER" | "SELLER" | "ADMIN";

export interface SessionClaims {
  email: string;
  name: string;
  role: SessionRole;
  /** How this session was established: email | phone | google | facebook. */
  provider?: string;
  iat: number;
}

const DEV_SECRET = "dev-secret-rotate-me";

/** Fail closed in production: an unset or un-rotated secret means every session
 *  cookie is forgeable by anyone who can read this source. */
export function sessionSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s === DEV_SECRET)) {
    throw new Error(
      "AUTH_SECRET must be set to a strong, non-default value in production. Refusing to sign sessions with the dev secret.",
    );
  }
  return s ?? DEV_SECRET;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(std + "=".repeat((4 - (std.length % 4)) % 4));
  // Explicit ArrayBuffer so the result is a BufferSource crypto.subtle accepts.
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

/** Sign one payload segment. Exported for tests that assert tampering fails. */
export async function signPayload(payload: string, secret: string = sessionSecret()): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(payload));
  return bytesToB64url(new Uint8Array(sig));
}

/** Mint a token. `iat` is stamped here — a caller never supplies its own age. */
export async function encodeSession(
  claims: Omit<SessionClaims, "iat">,
  secret: string = sessionSecret(),
): Promise<string> {
  const payload = bytesToB64url(enc.encode(JSON.stringify({ ...claims, iat: Date.now() })));
  return `${payload}.${await signPayload(payload, secret)}`;
}

/**
 * The claims, or null. Null covers every failure identically: no cookie, a
 * malformed one, a BAD SIGNATURE, an unknown role, or one past its life. A
 * caller must treat null as "not signed in" and must never substitute a
 * default identity for it.
 */
export async function verifySession(
  raw: string | undefined,
  secret: string = sessionSecret(),
): Promise<SessionClaims | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1 || dot === raw.length - 1) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), b64urlToBytes(sig), enc.encode(payload));
  } catch {
    return null; // unparseable signature bytes are just an invalid signature
  }
  if (!ok) return null;

  try {
    const claims = JSON.parse(dec.decode(b64urlToBytes(payload))) as SessionClaims;
    if (!claims || typeof claims.iat !== "number") return null;
    if (Date.now() - claims.iat > SESSION_MAX_AGE * 1000) return null;
    if (claims.role !== "BUYER" && claims.role !== "SELLER" && claims.role !== "ADMIN") return null;
    if (typeof claims.email !== "string" || !claims.email) return null;
    return claims;
  } catch {
    return null;
  }
}
