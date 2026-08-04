/**
 * VEDIC HEMP — SETTLEMENT STATEMENT DOWNLOAD (CSV)
 *
 * A statement can be downloaded only once POSTED — and a posted statement is
 * immutable (A3): this endpoint renders it, it can never rewrite it.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-lite";
import { formatPaise } from "@/lib/money";
import { findRun } from "@/lib/settlements";
import { actingStore } from "@/app/seller/_lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await getSession();
  if (!session || session.role !== "SELLER") {
    return NextResponse.json(
      { error: "FORBIDDEN", remediation: { label: "Sign in to Seller Central", href: "/signin?next=/seller/finance" } },
      { status: session ? 403 : 401 },
    );
  }
  const { id } = await ctx.params;
  const store = await actingStore();
  // The settlement store is the only authority: a statement exists because a
  // maker gathered real earnings lines and a checker posted them. Another
  // seller's run is a 404, not a 403 — a reference must not be probeable.
  const s = findRun(id);
  if (!s || s.seller !== store) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (s.status !== "POSTED") {
    return NextResponse.json(
      { error: "NOT_POSTED", remediation: { label: "Awaiting checker sign-off (A6)", href: "/seller/finance" } },
      { status: 409 },
    );
  }

  const body = [
    ["statement_id", "seller", "period", "net_paise", "net_display", "maker", "checker", "status"],
    [s.id, s.seller, s.period, s.netPaise, formatPaise(s.netPaise), s.maker, s.checker ?? "", s.status],
  ]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statement-${s.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
