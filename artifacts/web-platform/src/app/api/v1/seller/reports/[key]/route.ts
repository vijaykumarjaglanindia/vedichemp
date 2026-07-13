/**
 * VEDIC HEMP — SELLER REPORT EXPORT (CSV)
 *
 * Server-generated CSV per report key, seller-session gated. Money columns
 * are integer paise plus a display column — a spreadsheet never becomes the
 * source of truth for an amount.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-lite";
import { formatPaise } from "@/lib/money";
import { AD_CAMPAIGNS, SELLER_ORDERS, SELLER_PRODUCTS, WAREHOUSE_STOCK } from "@/app/seller/_lib/data";

function csv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

const REPORTS: Record<string, () => { name: string; rows: (string | number)[][] }> = {
  sales: () => ({
    name: "sales",
    rows: [
      ["reference", "placed_at", "buyer", "status", "total_paise", "total_display"],
      ...SELLER_ORDERS.map((o) => [o.reference, o.placedAt, o.buyer ?? "", o.status, o.totalPaise, formatPaise(o.totalPaise)]),
    ],
  }),
  product: () => ({
    name: "products",
    rows: [
      ["id", "title", "class", "listing_state", "price_paise", "mrp_paise", "hsn", "batches"],
      ...SELLER_PRODUCTS.map((p) => [p.id, p.title, p.cls, p.listingState, p.pricePaise, p.mrpPaise, p.hsn, p.batches.length]),
    ],
  }),
  inventory: () => ({
    name: "inventory",
    rows: [
      ["product", "batch", "warehouse", "on_hand", "reserved", "sellable"],
      ...WAREHOUSE_STOCK.map((w) => [w.product, w.batch, w.warehouse, w.qty, w.reserved, w.sellable ? "yes" : "BLOCKED (CoA)"]),
    ],
  }),
  advertising: () => ({
    name: "advertising",
    rows: [
      ["campaign", "type", "class", "budget_paise", "spend_paise", "acos_pct", "roas", "status"],
      ...AD_CAMPAIGNS.map((c) => [c.name, c.type, c.cls, c.budgetPaise, c.spendPaise, c.acos, c.roas, c.status]),
    ],
  }),
  compliance: () => ({
    name: "compliance",
    rows: [
      ["product", "class", "batch", "coa_status", "note"],
      ...SELLER_PRODUCTS.flatMap((p) => p.batches.map((b) => [p.title, p.cls, b.code, b.coaStatus, b.note ?? ""])),
    ],
  }),
};

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }): Promise<NextResponse> {
  const session = await getSession();
  if (!session || session.role !== "SELLER") {
    return NextResponse.json(
      { error: "FORBIDDEN", remediation: { label: "Sign in to Seller Central", href: "/signin?next=/seller/reports" } },
      { status: session ? 403 : 401 },
    );
  }
  const { key } = await ctx.params;
  const build = REPORTS[key];
  if (!build) return NextResponse.json({ error: "UNKNOWN_REPORT" }, { status: 404 });

  const { name, rows } = build();
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vedic-hemp-${name}-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
