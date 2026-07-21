/**
 * POST /api/v1/safety/adverse-events/:id/correct — correct a prior report (A3).
 * A correction is a NEW row referencing the old one, never an edit. Any
 * authenticated session may file one — requireSession() with NO role.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { correctAdverseEvent } from "@/server/safety/adverseEvents";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({
  narrative: z.string().min(10),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A 10+ character correction is required."), 422);
  }
  try {
    // The corrector is the authenticated session, recorded on the new row.
    const r = await correctAdverseEvent({ eventId: id, reportedBy: gate.session.email, narrative: body.narrative });
    return NextResponse.json({ data: r });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
