/**
 * VEDIC HEMP — SELLER REPORT EXPORT (CSV)
 *
 * Server-generated CSV per report key, seller-session gated. Every row is read
 * from the live stores the console itself renders — orders, catalogue, ads — so
 * an export and the screen can never disagree. Money columns are integer paise
 * plus a display column: a spreadsheet never becomes the source of truth for an
 * amount. A seller only ever sees their own lines of an order.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-lite";
import { formatPaise } from "@/lib/money";
import { actingStoreOrNull } from "@/app/seller/_lib/store";
import { ordersForSeller, sellerSubtotal } from "@/lib/orders";
import { sellerListings, isLowStock } from "@/lib/catalog";
import { listCampaigns, campaignResults } from "@/lib/ads";

type Report = { name: string; rows: (string | number)[][] };

function csv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

const REPORTS: Record<string, (store: string) => Promise<Report>> = {
  sales: async (store) => {
    const orders = await ordersForSeller(store);
    return {
      name: "sales",
      rows: [
        ["reference", "placed_at", "status", "payment", "your_lines_paise", "your_lines_display"],
        ...orders.map((o) => {
          const mine = sellerSubtotal(o, store);
          return [o.reference, o.placedAt.slice(0, 10), o.status, o.paymentStatus, mine, formatPaise(mine)];
        }),
      ],
    };
  },
  product: async (store) => {
    const listings = await sellerListings("", store);
    return {
      name: "products",
      rows: [
        ["id", "title", "class", "status", "price_paise", "price_display", "mrp_paise", "hsn", "sku", "rating", "reviews"],
        ...listings.map((p) => [
          p.id, p.title, p.cls, p.status, p.pricePaise, formatPaise(p.pricePaise), p.mrpPaise,
          p.hsn, p.sku ?? "", p.ratingCount ? p.rating : "", p.ratingCount ?? 0,
        ]),
      ],
    };
  },
  inventory: async (store) => {
    const listings = await sellerListings("", store);
    return {
      name: "inventory",
      rows: [
        ["title", "sku", "batch", "on_hand", "low_stock_at", "signal", "sellable"],
        ...listings.map((p) => [
          p.title, p.sku ?? "", p.batchCode || "—", p.stockQty, p.lowStockAt,
          p.stockQty === 0 ? "OUT OF STOCK" : isLowStock(p) ? "LOW" : "ok",
          p.coaState === "APPROVED" ? "yes" : `BLOCKED (CoA ${p.coaState})`,
        ]),
      ],
    };
  },
  advertising: async (store) => {
    const mine = (await listCampaigns(undefined)).filter((c) => c.seller === store);
    return {
      name: "advertising",
      rows: [
        ["campaign", "objective", "status", "daily_budget_paise", "spent_paise", "spent_display", "times_shown", "visits", "orders", "sales_paise", "return_per_rupee"],
        ...mine.map((c) => {
          const r = campaignResults(c);
          return [
            c.name, c.objective, c.status, c.dailyBudgetPaise, r.spentPaise, formatPaise(r.spentPaise),
            r.shown, r.visits, r.orders, r.salesPaise, r.returnPerRupee,
          ];
        }),
      ],
    };
  },
  compliance: async (store) => {
    const listings = await sellerListings("", store);
    return {
      name: "compliance",
      rows: [
        ["title", "class", "batch", "coa_status", "listing_status", "sellable", "claims_strike"],
        ...listings.map((p) => [
          p.title, p.cls, p.batchCode || "—", p.coaState, p.status,
          p.coaState === "APPROVED" && p.status === "LIVE" ? "yes" : "no",
          p.claimsStrike ? "FLAGGED" : "",
        ]),
      ],
    };
  },
};

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }): Promise<NextResponse> {
  const session = await getSession();
  const store = session?.role === "SELLER" ? await actingStoreOrNull() : null;
  if (!session || session.role !== "SELLER" || !store) {
    return NextResponse.json(
      { error: "FORBIDDEN", remediation: { label: "Sign in to Seller Central", href: "/signin?next=/seller/reports" } },
      { status: session ? 403 : 401 },
    );
  }
  const { key } = await ctx.params;
  const build = REPORTS[key];
  if (!build) return NextResponse.json({ error: "UNKNOWN_REPORT" }, { status: 404 });

  const { name, rows } = await build(store);
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vedic-hemp-${name}-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
