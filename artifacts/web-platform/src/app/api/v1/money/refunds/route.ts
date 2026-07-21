/**
 * POST /api/v1/money/refunds — buyer-first refund (A6).
 * Requires an Idempotency-Key (§0.6). A single large refund needs a checker;
 * accumulated small ones do too (threshold splitting is caught in the service).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { issueRefund } from "@/server/money/refunds";
import { withIdempotency } from "@/server/idempotency";
import { errorResponse, requireIdempotencyKey, requireSession } from "@/server/http";

const Body = z.object({
  orderId: z.string().min(1),
  actor: z.string().min(1),
  amountPaise: z.number().int().positive(),
  reasonCode: z.string().min(1),
  checkerId: z.string().min(1).optional(),
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
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("Invalid refund body."), 422);
  }
  try {
    // §4 replay window: a retried POST with the same key returns the stored
    // result instead of issuing the refund a second time.
    const { result } = await withIdempotency("money.refund", idemKey, () => issueRefund(body));
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
