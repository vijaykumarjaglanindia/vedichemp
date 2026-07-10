/**
 * POST /api/v1/catalogue/publish — A2 publish gate.
 * Thin handler: validate, call the service, return. The CoA gate lives in the
 * service and the database, never here.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { publishProduct } from "@/server/catalogue/publish";
import { errorResponse } from "@/server/http";

const Body = z.object({ productId: z.string().uuid(), actor: z.string().min(1) });

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("Invalid request body."), 422);
  }
  try {
    const result = await publishProduct(body);
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
