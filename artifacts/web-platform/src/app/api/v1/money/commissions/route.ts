/**
 * POST /api/v1/money/commissions — schedule a commission-rate change (A5).
 * Changing money terms requires an Idempotency-Key (§4) so a retried POST cannot
 * write the schedule twice. The service enforces the 30-day notice guard and the
 * finance-only role; the DB CHECK a5_thirty_day_notice is the backstop.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { scheduleCommissionChange } from "@/server/money/commissions";
import { errorResponse, requireIdempotencyKey, requireSession } from "@/server/http";

const Body = z.object({
  complianceClass: z.enum(["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"]),
  ratePpm: z.number().int().positive(),
  noticeSentAt: z.string(),
  effectiveFrom: z.string(),
  actor: z.string().min(1),
});

export async function POST(req: Request) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  try {
    requireIdempotencyKey(req);
  } catch (err) {
    return errorResponse(err, 428);
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A compliance class, a positive ppm rate, notice and effective dates, and an actor are required."), 422);
  }
  try {
    const result = await scheduleCommissionChange({
      complianceClass: body.complianceClass,
      ratePpm: body.ratePpm,
      noticeSentAt: new Date(body.noticeSentAt),
      effectiveFrom: new Date(body.effectiveFrom),
      actor: body.actor,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
