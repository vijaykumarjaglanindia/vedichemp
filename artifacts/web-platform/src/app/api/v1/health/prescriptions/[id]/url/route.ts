/**
 * POST /api/v1/health/prescriptions/:id/url — A4 sensitive read.
 * A signed 5-minute URL is issued only after an access-log row exists and the
 * buyer is notified. The service enforces role + reason; this handler only
 * shapes the request and response.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrescriptionUrl } from "@/server/health/prescriptions";
import { SENSITIVE_REASONS } from "@/lib/prohibitions";
import { errorResponse } from "@/server/http";

const Body = z.object({
  actor: z.string().min(1),
  reasonCode: z.enum(SENSITIVE_REASONS),
  reasonText: z.string().min(20, "State why this record must be viewed now (20+ characters)."),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A controlled reason code and a 20+ character justification are required."), 422);
  }
  try {
    const signed = await getPrescriptionUrl({ prescriptionId: id, ...body });
    return NextResponse.json({ data: signed });
  } catch (err) {
    return errorResponse(err, 403);
  }
}
