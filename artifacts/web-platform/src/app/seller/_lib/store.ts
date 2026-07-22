/**
 * VEDIC HEMP — ACTING STORE RESOLVER (seller console)
 *
 * The one place the seller sub-consoles ask "whose storefront is this?". It
 * reads the signed-in seller's account and returns the store they own, so every
 * page and action renders and mutates THAT store — never a fixed demo store.
 * An email with no seller account falls back to the seed store so the demo is
 * still explorable, and the E2E battery (seller@example.in → Vedic Botanicals)
 * is unchanged.
 */

import { getSession } from "@/lib/auth-lite";
import { storeForEmail } from "@/lib/seller-home";

/** The store the currently signed-in seller owns. */
export async function actingStore(): Promise<string> {
  const session = await getSession();
  return storeForEmail(session?.email ?? "seller@example.in");
}
