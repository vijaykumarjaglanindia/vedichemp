/**
 * POST /api/v1/safety/recalls/:id/close — close a recall (A6 maker–checker).
 * The checker must be a *different* compliance human from the maker; the service
 * and the DB CHECK a6_recall_maker_is_not_checker enforce it. Thin handler.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { closeRecall } from "@/server/safety/recalls";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({ checker: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A checker id is required."), 422);
  }
  try {
    await closeRecall({ recallId: id, checker: body.checker });
    return NextResponse.json({ data: { id, status: "CLOSED" } });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
