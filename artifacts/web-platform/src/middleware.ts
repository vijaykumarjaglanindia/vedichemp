/**
 * VEDIC HEMP — ROUTE PROTECTION
 *
 * The three consoles require a session AND the right role. The middleware is
 * edge-cheap: it checks that a session cookie exists and reads the role out of
 * its payload for routing. It does NOT verify the HMAC — pages do that via
 * getSession() before trusting anything, and each console additionally resolves
 * its own subject server-side (see seller/_lib/store.ts). A forged cookie
 * therefore gets a visitor no further than an empty console.
 *
 * The role check matters: a cookie merely existing is not authorisation, so
 * without it a buyer's session renders the whole seller and admin consoles.
 */

import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/account", "/seller", "/admin"];

/** Role claim from the cookie payload, unverified — routing only. */
function roleOf(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  try {
    const json = JSON.parse(Buffer.from(raw.slice(0, dot), "base64url").toString()) as { role?: string };
    return json.role ?? null;
  } catch {
    return null;
  }
}

function areaOf(pathname: string): "BUYER" | "SELLER" | "ADMIN" | null {
  if (pathname.startsWith("/seller")) return "SELLER";
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/account")) return "BUYER";
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const raw = req.cookies.get("vh-session")?.value;
  const role = roleOf(raw);
  const area = areaOf(pathname);
  if (raw && role && area && role === area) return NextResponse.next();

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
