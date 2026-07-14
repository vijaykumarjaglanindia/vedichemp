"use server";

/**
 * VEDIC HEMP — ADMIN NOTIFICATION ACTIONS
 *
 * The admin console is a shared operational surface, so notifications for
 * work-to-do (returns to adjudicate, withdrawals to approve, CoAs to review)
 * are addressed to the "admin" recipient every admin reads.
 */

import { redirect } from "next/navigation";
import { markAllRead, markReadOwned } from "@/lib/notify";

export async function markNotif(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await markReadOwned("admin", "admin", id);
  redirect("/admin/notifications");
}

export async function markAllNotif(): Promise<void> {
  await markAllRead("admin", "admin");
  redirect("/admin/notifications");
}
