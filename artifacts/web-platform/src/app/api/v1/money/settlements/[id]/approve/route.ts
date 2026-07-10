/**
 * POST /api/v1/money/settlements/:id/approve — A6 maker–checker.
 * The checker must be a different human from the maker; a service account is
 * barred. The service and the DB constraints enforce it. 403 if self.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { approveSettlement } from "@/server/money/settlements";
import { errorResponse } from "@/server/http";

const Body = z.object({ checker: z.string().min(1), note: z.string().min(20) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A checker id and a 20+ character note are required."), 422);
  }
  try {
    await approveSettlement({ settlementId: id, checker: body.checker, note: body.note });
    return NextResponse.json({ data: { id, status: "POSTED" } });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
