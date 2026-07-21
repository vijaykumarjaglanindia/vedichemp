/**
 * POST /api/v1/safety/recalls — initiate a product recall (A3/A6).
 * Thin: authenticate the admin session, validate the body, call the service.
 * The maker is the AUTHENTICATED admin (resolved from the session), never a
 * body-supplied id — so a recall cannot be attributed to a different admin.
 * Only a compliance human may raise a recall; the service is the authority.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { initiateRecall } from "@/server/safety/recalls";
import { adminIdForEmail } from "@/server/actor";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({
  batchId: z.string().min(1),
  reason: z.string().min(10),
  buyersAffected: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  const maker = await adminIdForEmail(gate.session.email);
  if (!maker) return errorResponse(new Error("Your session is not a recognised admin."), 403);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(
      new Error("A batch id, a 10+ character reason and a non-negative buyersAffected count are required."),
      422,
    );
  }
  try {
    const r = await initiateRecall({ ...body, maker });
    return NextResponse.json({ data: r });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
