"use server";

/**
 * VEDIC HEMP — SELLER NOTIFICATION ACTIONS
 *
 * The recipient key is the signed-in seller's own store (actingStore()).
 * markReadOwned guards the (audience, recipient) match — a seller cannot mark
 * another store's notifications read.
 */

import { redirect } from "next/navigation";
import { markAllRead, markReadOwned } from "@/lib/notify";
import { actingStore } from "../_lib/store";


export async function markNotif(formData: FormData): Promise<void> {
  const STORE = await actingStore();
  const id = String(formData.get("id") ?? "");
  await markReadOwned("seller", STORE, id);
  redirect("/seller/notifications");
}

export async function markAllNotif(): Promise<void> {
  const STORE = await actingStore();
  await markAllRead("seller", STORE);
  redirect("/seller/notifications");
}
