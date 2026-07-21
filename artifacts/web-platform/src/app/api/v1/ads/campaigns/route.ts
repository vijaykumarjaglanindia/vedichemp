/**
 * POST /api/v1/ads/campaigns — A1 layer 1.
 *
 * Any authenticated session may create a campaign (sellers advertise their own
 * products). The handler is thin: it validates shape and calls the service. The
 * compliance class is resolved SERVER-SIDE from the real product inside the
 * service — a `complianceClass` in the body is deliberately ignored, so a caller
 * cannot relabel a MED_CANNABIS product into an advertisable one.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCampaign } from "@/server/ads/campaigns";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({
  sellerId: z.string().min(1),
  name: z.string().min(4),
  productId: z.string().min(1),
  dailyBudgetPaise: z.number().int().positive(),
  actor: z.string().min(1),
});

export async function POST(req: Request) {
  const gate = await requireSession();
  if ("response" in gate) return gate.response;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(
      new Error("A seller id, a 4+ character name, a product id, a positive daily budget and an actor are required."),
      422
    );
  }

  try {
    // Only the fields the service trusts are forwarded. Any complianceClass the
    // body may carry is not read here and never reaches the service.
    const r = await createCampaign({
      sellerId: body.sellerId,
      name: body.name,
      productId: body.productId,
      dailyBudgetPaise: body.dailyBudgetPaise,
      actor: body.actor,
    });
    return NextResponse.json({ data: r });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
