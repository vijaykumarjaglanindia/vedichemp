/**
 * VEDIC HEMP — DATA EXPORT (DPDP access request)
 *
 * Returns everything the platform holds about this browser session as a
 * downloadable JSON file. Requires a signed session. Deliberately excludes
 * anything health-related beyond counts: prescription content is served only
 * through the SensitiveViewer reason flow, never a bulk export (A4), and the
 * consent history notes it is an append-only ledger server-side.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth-lite";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", remediation: { label: "Sign in", href: "/signin?next=/account/profile" } },
      { status: 401 },
    );
  }

  const jar = await cookies();
  const read = (name: string): unknown => {
    try { return JSON.parse(jar.get(name)?.value ?? "null"); } catch { return null; }
  };

  const rxUploads = (read("vh-rx") as unknown[] | null) ?? [];
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { email: session.email, role: session.role },
    cart: read("vh-cart"),
    coupon: jar.get("vh-coupon")?.value ?? null,
    wishlist: read("vh-wish"),
    followedStores: read("vh-follow"),
    orders: read("vh-orders"),
    supportTickets: read("vh-tickets"),
    consents: read("vh-consent") ?? "defaults (no changes recorded)",
    newsletter: jar.get("vh-news")?.value === "1",
    prescriptions: {
      note: "Prescription images are not included in bulk exports — they are viewable only through the signed-link flow with access logging (A4).",
      uploadedCount: Array.isArray(rxUploads) ? rxUploads.length : 0,
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="vedic-hemp-data-export.json"',
      "Cache-Control": "no-store",
    },
  });
}
