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

import { cookies } from "next/headers";
import {
  DISPLAY_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE as MAX_AGE,
  encodeSession, verifySession, type SessionClaims,
} from "@/lib/session-token";

/** The claims a verified cookie carries. Shaped by lib/session-token. */
export type Session = SessionClaims;


export async function createSession(s: Omit<Session, "iat">): Promise<void> {
  const token = await encodeSession(s);
  const jar = await cookies();
  const opts = { path: "/", sameSite: "lax" as const, maxAge: MAX_AGE };
  jar.set(SESSION_COOKIE, token, { ...opts, httpOnly: true });
  jar.set(DISPLAY_COOKIE, s.name, { ...opts, httpOnly: false });
}

export async function getSession(): Promise<Session | null> {
  // Signature-verified. Null means "not signed in" for every failure mode —
  // missing, malformed, forged or expired — and callers must never substitute
  // a default identity for it.
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(DISPLAY_COOKIE);
}
