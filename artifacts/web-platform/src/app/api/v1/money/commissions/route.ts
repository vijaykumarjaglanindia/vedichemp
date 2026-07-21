/**
 * POST /api/v1/money/commissions — schedule a commission-rate change (A5).
 * Changing money terms requires an Idempotency-Key (§4) so a retried POST cannot
 * write the schedule twice. The acting admin is the AUTHENTICATED session, not a
 * body-supplied id (no confused deputy). The service anchors the 30-day notice
 * clock server-side and enforces the finance-only role; the DB CHECK
 * a5_thirty_day_notice is the backstop. noticeSentAt is never client-supplied.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { scheduleCommissionChange } from "@/server/money/commissions";
import { adminIdForEmail } from "@/server/actor";
import { withIdempotency } from "@/server/idempotency";
import { errorResponse, requireIdempotencyKey, requireSession } from "@/server/http";

const Body = z.object({
  complianceClass: z.enum(["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"]),
  ratePpm: z.number().int().positive(),
  effectiveFrom: z.string(),
});

export async function POST(req: Request) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  let idemKey: string;
  try {
    idemKey = requireIdempotencyKey(req);
  } catch (err) {
    return errorResponse(err, 428);
  }
  // The actor is the signed-in admin, resolved from the session — never trusted
  // from the request body. Fail closed if the session maps to no live admin.
  const actor = await adminIdForEmail(gate.session.email);
  if (!actor) return errorResponse(new Error("Your session is not a recognised admin."), 403);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A compliance class, a positive ppm rate, and an effective date are required."), 422);
  }
  try {
    // §4 replay window: a retried POST with the same key returns the stored
    // result instead of scheduling a second fee change.
    const { result } = await withIdempotency("money.commission", idemKey, () =>
      scheduleCommissionChange({
        complianceClass: body.complianceClass,
        ratePpm: body.ratePpm,
        effectiveFrom: new Date(body.effectiveFrom),
        actor,
      }),
    );
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
