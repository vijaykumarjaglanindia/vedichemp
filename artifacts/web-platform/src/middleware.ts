/**
 * VEDIC HEMP — ROUTE PROTECTION
 *
 * The three consoles require a session. The middleware checks only that a
 * session cookie exists (edge-cheap); pages verify its HMAC signature via
 * getSession() before trusting anything in it. No console renders for an
 * anonymous visitor — they are redirected to sign-in with a return path.
 */

import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/account", "/seller", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (req.cookies.get("vh-session")?.value) {
    return NextResponse.next();
  }
  const signin = req.nextUrl.clone();
  // Each audience has its own door. /admin deliberately redirects to the
  // BUYER page — the operator door stays unlisted (wp-admin style).
  signin.pathname = pathname.startsWith("/seller") ? "/seller-login" : "/signin";
  signin.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: ["/account/:path*", "/seller/:path*", "/admin/:path*"],
};
