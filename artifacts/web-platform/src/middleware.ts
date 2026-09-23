/**
 * VEDIC HEMP — ROUTE PROTECTION
 *
 * The three consoles require a session that is SIGNATURE-VERIFIED and carries
 * the right role. Both halves matter, and the second is worthless without the
 * first: the payload is attacker-supplied until the HMAC over it checks out,
 * so reading `role` from an unverified cookie is reading the attacker's own
 * claim about who they are.
 *
 * This is a gate, not the only gate. Each console re-resolves its subject
 * server-side from the same verified session (admin/Shell.tsx,
 * seller/_lib/store.ts, and the buyer pages' own redirects), so a matcher gap
 * here still fails closed rather than serving a console to a stranger.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const PROTECTED = ["/account", "/seller", "/admin"];

function areaOf(pathname: string): "BUYER" | "SELLER" | "ADMIN" | null {
  if (pathname.startsWith("/seller")) return "SELLER";
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/account")) return "BUYER";
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const area = areaOf(pathname);
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session && area && session.role === area) return NextResponse.next();

  const signin = req.nextUrl.clone();
  // Each audience has its own door. /admin deliberately redirects to the
  // BUYER page — the operator door stays unlisted (wp-admin style).
  signin.pathname = area === "SELLER" ? "/seller-login" : "/signin";
  signin.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: ["/account/:path*", "/seller/:path*", "/admin/:path*"],
};
