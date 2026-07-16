"use server";

/**
 * VEDIC HEMP — BUSINESS (B2B) ACCOUNT REQUEST (buyer)
 *
 * A buyer applies with a company name and GSTIN. Approval is an admin act;
 * once approved, wholesale price breaks apply automatically at the cart.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { requestBusiness } from "@/lib/b2b";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;

export async function requestBusinessAccount(formData: FormData): Promise<void> {
  const company = String(formData.get("company") ?? "").trim().slice(0, 80);
  const gstin = String(formData.get("gstin") ?? "").trim().toUpperCase();
  const session = await getSession();
  const email = session?.email ?? "guest@vedichemp.in";

  if (company.length < 3) redirect("/account/business?err=company");
  if (!GSTIN.test(gstin)) redirect("/account/business?err=gstin");

  const result = await requestBusiness({ email, company, gstin });
  if (!result.ok) redirect(`/account/business?err=${result.reason}`);

  const { notify } = await import("@/lib/notify");
  await notify("admin", "admin", { kind: "B2B_REQUEST", title: "Business account to review", body: `${company} · ${email}`, href: "/admin/business" });
  redirect("/account/business?ok=1");
}
