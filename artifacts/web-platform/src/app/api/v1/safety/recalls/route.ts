/**
 * POST /api/v1/safety/recalls — initiate a product recall (A3/A6).
 * Thin: authenticate the admin session, validate the body, call the service.
 * Only a compliance human may raise a recall; the service is the authority.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { initiateRecall } from "@/server/safety/recalls";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({
  batchId: z.string().min(1),
  reason: z.string().min(10),
  buyersAffected: z.number().int().nonnegative(),
  maker: z.string().min(1),
});

export async function POST(req: Request) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(
      new Error("A batch id, a 10+ character reason, a non-negative buyersAffected count and a maker id are required."),
      422,
    );
  }
  try {
    const r = await initiateRecall(body);
    return NextResponse.json({ data: r });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
