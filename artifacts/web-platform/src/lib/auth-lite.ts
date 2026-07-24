import "server-only";

/**
 * VEDIC HEMP — SESSION (lite)
 *
 * A signed, httpOnly session cookie: base64url(payload).hmac. Good enough to
 * make sign-in, route protection and personalisation real today; the payload
 * shape matches what the Auth.js integration will carry, so upgrading to
 * passkeys/OTP (see PRODUCTION.md) swaps the issuer, not the consumers.
 *
 * A companion non-httpOnly display cookie carries only the first name for the
 * header chip — it is cosmetic and never trusted server-side.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "vh-session";
const DISPLAY_COOKIE = "vh-user";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  email: string;
  name: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  /** How this session was established: email | phone | google | facebook. */
  provider?: string;
  iat: number;
}

const DEV_SECRET = "dev-secret-rotate-me";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  // Fail closed in production: an unset or un-rotated secret means every session
  // cookie is forgeable by anyone who reads this source. Refuse to sign with it.
  if (process.env.NODE_ENV === "production" && (!s || s === DEV_SECRET)) {
    throw new Error("AUTH_SECRET must be set to a strong, non-default value in production. Refusing to sign sessions with the dev secret.");
  }
  return s ?? DEV_SECRET;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export async function createSession(s: Omit<Session, "iat">): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ ...s, iat: Date.now() })).toString("base64url");
  const jar = await cookies();
  const opts = { path: "/", sameSite: "lax" as const, maxAge: MAX_AGE };
  jar.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, { ...opts, httpOnly: true });
  jar.set(DISPLAY_COOKIE, s.name, { ...opts, httpOnly: false });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (Date.now() - s.iat > MAX_AGE * 1000) return null;
    return s;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(DISPLAY_COOKIE);
}
