"use server";

/**
 * VEDIC HEMP — SELLER NOTIFICATION ACTIONS
 *
 * This session's storefront is always "Vedic Botanicals" (per CONTRACT), so
 * that is the recipient key. markReadOwned guards the (audience, recipient)
 * match — a seller cannot mark another store's notifications read.
 */

import { redirect } from "next/navigation";
import { markAllRead, markReadOwned } from "@/lib/notify";

const STORE = "Vedic Botanicals";

export async function markNotif(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await markReadOwned("seller", STORE, id);
  redirect("/seller/notifications");
}

export async function markAllNotif(): Promise<void> {
  await markAllRead("seller", STORE);
  redirect("/seller/notifications");
}
