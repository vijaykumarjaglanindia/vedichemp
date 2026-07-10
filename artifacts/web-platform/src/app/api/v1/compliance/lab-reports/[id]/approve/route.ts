/**
 * POST /api/v1/compliance/lab-reports/:id/approve — A2 CoA sign-off.
 * One report, one human, having looked at it. There is no bulk approve.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { approveLabReport } from "@/server/compliance/labReports";
import { errorResponse } from "@/server/http";

const Body = z.object({ actor: z.string().min(1), reasonText: z.string().min(20) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A verifier and a 20+ character justification are required."), 422);
  }
  try {
    await approveLabReport({ reportId: id, actor: body.actor, reasonText: body.reasonText });
    return NextResponse.json({ data: { id, status: "APPROVED" } });
  } catch (err) {
    return errorResponse(err, 403);
  }
}
