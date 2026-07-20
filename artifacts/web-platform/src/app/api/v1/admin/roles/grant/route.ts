/**
 * POST /api/v1/admin/roles/grant — separation of duties (A6 precondition).
 * The grant is refused if it would let one identity hold both sides of a
 * maker–checker pair. Enforced at grant time, before the role ever exists.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRole } from "@prisma/client";
import { grantRole } from "@/server/rbac";
import { errorResponse, requireSession } from "@/server/http";

const Body = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(AdminRole),
  grantedBy: z.string().min(1),
});

export async function POST(req: Request) {
  const gate = await requireSession("ADMIN");
  if ("response" in gate) return gate.response;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return errorResponse(new Error("A user id, a valid role, and a granter are required."), 422);
  }
  try {
    await grantRole(body);
    return NextResponse.json({ data: { userId: body.userId, role: body.role } });
  } catch (err) {
    return errorResponse(err, 409);
  }
}
