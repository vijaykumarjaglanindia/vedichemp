/**
 * POST /api/v1/safety/recalls/:id/close — close a recall (A6 maker–checker).
 * The checker is the AUTHENTICATED admin (resolved from the session), never a
 * body-supplied id, and must be a *different* compliance human from the maker;
 * the service and the DB CHECK a6_recall_maker_is_not_checker enforce it. Thin.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { closeRecall } from "@/server/safety/recalls";
import { adminIdForEmail } from "@/server/actor";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({}).passthrough();

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  const checker = await adminIdForEmail(gate.session.email);
  if (!checker) return errorResponse(new Error("Your session is not a recognised admin."), 403);
  const { id } = await ctx.params;
  try {
    Body.parse(await req.json().catch(() => ({})));
  } catch {
    return errorResponse(new Error("Malformed request body."), 422);
  }
  try {
    await closeRecall({ recallId: id, checker });
    return NextResponse.json({ data: { id, status: "CLOSED" } });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
