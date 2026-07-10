/**
 * POST /api/v1/ads/auction — A1 layer 3.
 * The auction drops MED_CANNABIS candidates and logs a violation. A campaign of
 * that class cannot exist (DB CHECK) and the index omits it; this is the last
 * line, and it is never bypassed.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { ComplianceClass } from "@prisma/client";
import { runAuction } from "@/server/ads/auction";
import { errorResponse } from "@/server/http";

const Body = z.object({
  candidates: z.array(
    z.object({
      productId: z.string().min(1),
      complianceClass: z.nativeEnum(ComplianceClass),
      bidPaise: z.number().int().nonnegative(),
    })
  ),
  slots: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("Invalid auction body."), 422);
  }
  const result = await runAuction(body);
  return NextResponse.json({ data: result });
}
