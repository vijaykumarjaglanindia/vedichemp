/**
 * VEDIC HEMP — ACTING STORE RESOLVER (seller console)
 *
 * The one place the seller sub-consoles ask "whose storefront is this?". It
 * reads the signed-in seller's account and returns the store they own, so every
 * page and action renders and mutates THAT store.
 *
 * It fails closed. A visitor who is not signed in, is signed in as a buyer or
 * an admin, or holds a seller session with no storefront of their own does not
 * get somebody else's store to look at — they are sent to the seller door.
 * Middleware makes the same decision for routing, but this is the server-side
 * check that actually governs what is rendered and mutated.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { storeForEmailOrNull } from "@/lib/seller-home";

/** The store the currently signed-in seller owns; redirects if there isn't one. */
export async function actingStore(): Promise<string> {
  const session = await getSession();
  const store = session?.email ? storeForEmailOrNull(session.email) : null;
  if (!store) redirect("/seller-login?next=/seller");
  return store;
}

/** The acting store, or null — for callers that render their own empty state. */
export async function actingStoreOrNull(): Promise<string | null> {
  const session = await getSession();
  return session?.email ? storeForEmailOrNull(session.email) : null;
}
