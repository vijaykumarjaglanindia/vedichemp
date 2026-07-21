/**
 * POST /api/v1/money/settlements/:id/approve — A6 maker–checker.
 * The checker must be a different human from the maker; a service account is
 * barred. The service and the DB constraints enforce it. 403 if self.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { approveSettlement } from "@/server/money/settlements";
import { withIdempotency } from "@/server/idempotency";
import { errorResponse, requireIdempotencyKey, requireSession } from "@/server/http";

const Body = z.object({ checker: z.string().min(1), note: z.string().min(20) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  // Posting a settlement moves money to the seller — §4 requires an
  // Idempotency-Key so a retried POST cannot double-post.
  let idemKey: string;
  try {
    idemKey = requireIdempotencyKey(req);
  } catch (err) {
    return errorResponse(err, 428);
  }
  const { id } = await ctx.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A checker id and a 20+ character note are required."), 422);
  }
  try {
    // §4 replay window keyed per settlement: a retried POST returns the stored
    // result instead of posting the settlement twice.
    const { result } = await withIdempotency(`money.settlement.post:${id}`, idemKey, async () => {
      await approveSettlement({ settlementId: id, checker: body.checker, note: body.note });
      return { id, status: "POSTED" as const };
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
