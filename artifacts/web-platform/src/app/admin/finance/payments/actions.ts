"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { PAYMENT_DEFS, writeGateway, writePaymentMethod } from "@/lib/payments";

export async function savePaymentMethods(formData: FormData): Promise<void> {
  const enabledKeys: string[] = [];
  for (const d of PAYMENT_DEFS) {
    const enabled = formData.get(`on-${d.key}`) === "on";
    const label = String(formData.get(`label-${d.key}`) ?? "").trim().slice(0, 40);
    const sub = String(formData.get(`sub-${d.key}`) ?? "").trim().slice(0, 140);
    if (enabled) enabledKeys.push(d.key);
    await writePaymentMethod(d.key, { enabled, label: label || undefined, sub: sub || undefined });
  }
  // A checkout with zero methods cannot take orders — refuse the save.
  if (enabledKeys.length === 0) {
    for (const d of PAYMENT_DEFS) await writePaymentMethod(d.key, { enabled: d.defaultEnabled });
    redirect("/admin/finance/payments?pm=none");
  }
  await writeGateway(String(formData.get("gateway") ?? "razorpay"));
  const who = (await getSession())?.email ?? "unknown-admin";
  await writeAudit({ actor: who, action: "PAYMENTS_CONFIG", target: enabledKeys.join(","), outcome: "OK", note: `gateway: ${String(formData.get("gateway"))}` });
  redirect("/admin/finance/payments?pm=saved");
}
