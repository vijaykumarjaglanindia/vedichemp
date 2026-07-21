/**
 * POST /api/v1/safety/adverse-events — file an adverse-event report (A3).
 * Any authenticated session may file: buyers, sellers and staff all report
 * safety signals, so this is requireSession() with NO role. The report is
 * append-only; there is no PATCH or DELETE here.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { reportAdverseEvent } from "@/server/safety/adverseEvents";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({
  productId: z.string().min(1),
  batchId: z.string().optional(),
  narrative: z.string().min(10),
});

export async function POST(req: Request) {
  const gate = await requireSession();
  if ("response" in gate) return gate.response;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A product and a 10+ character description are required."), 422);
  }
  try {
    // The reporter is the authenticated session — who filed the report is a fact
    // of record, not something the caller may forge onto another person.
    const r = await reportAdverseEvent({ ...body, reportedBy: gate.session.email });
    return NextResponse.json({ data: r });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
