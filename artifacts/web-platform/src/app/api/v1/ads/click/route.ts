/**
 * GET /api/v1/ads/click?cid=…&aid=… — sponsored click-through.
 *
 * Charges the SERVER-STORED second price for the ad (never a value from the
 * URL) and redirects to the product page resolved from the store (never an
 * arbitrary redirect target). Budgets fail closed: once total budget is
 * spent the campaign ENDs and stops entering auctions.
 */
import { NextResponse } from "next/server";
import { recordAdClick } from "@/lib/ads";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cid = url.searchParams.get("cid") ?? "";
  const aid = url.searchParams.get("aid") ?? "";
  const base = process.env.BASE_PATH ?? "";
  const product = await recordAdClick(cid, aid);
  const to = product ? `${base}/products/${product.slug}` : `${base}/catalogue`;
  return NextResponse.redirect(new URL(to, req.url), 302);
}
