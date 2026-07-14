"use server";

/**
 * VEDIC HEMP — BUYER NOTIFICATION ACTIONS
 *
 * The recipient is resolved from the session, never the form — a buyer can
 * only ever mark their OWN notifications read (markReadOwned guards the match).
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { markAllRead, markReadOwned } from "@/lib/notify";

async function recipient(): Promise<string> {
  return (await getSession())?.email ?? "guest@vedichemp.in";
}

export async function markNotif(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await markReadOwned("buyer", await recipient(), id);
  redirect("/account/notifications");
}

export async function markAllNotif(): Promise<void> {
  await markAllRead("buyer", await recipient());
  redirect("/account/notifications");
}
