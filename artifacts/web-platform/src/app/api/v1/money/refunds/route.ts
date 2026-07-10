/**
 * POST /api/v1/money/refunds — buyer-first refund (A6).
 * Requires an Idempotency-Key (§0.6). A single large refund needs a checker;
 * accumulated small ones do too (threshold splitting is caught in the service).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { issueRefund } from "@/server/money/refunds";
import { errorResponse, requireIdempotencyKey } from "@/server/http";

const Body = z.object({
  orderId: z.string().min(1),
  actor: z.string().min(1),
  amountPaise: z.number().int().positive(),
  reasonCode: z.string().min(1),
  checkerId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    requireIdempotencyKey(req);
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
    const result = await issueRefund(body);
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
