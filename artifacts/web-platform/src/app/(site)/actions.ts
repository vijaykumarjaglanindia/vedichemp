"use server";

/**
 * VEDIC HEMP — SITE ENGAGEMENT ACTIONS
 *
 * Wishlist, newsletter and store-follow. Same rule as the cart actions: the
 * server is the only writer. The wishlist enforces A1 at the boundary — a
 * MED_CANNABIS id submitted via crafted form data is rejected, because the
 * permitted-class check runs here, not in the UI.
 */

import { cookies, headers } from "next/headers";
import { CLAIMS_LANGUAGE } from "@/lib/claims";
import { redirect } from "next/navigation";
import { permittedClasses } from "@/lib/compliance";
import { PRODUCTS } from "@/lib/sample";
import {
  readFollows,
  readMyQuestions,
  readMyReviews,
  readOrderHistory,
  readWishlist,
  writeFollows,
  writeMyQuestions,
  writeMyReviews,
  writeWishlist,
} from "@/lib/engage";
import { readCartLines, writeCartLines } from "@/lib/cart";

/** Safe same-site path from the Referer header, so actions return the visitor
 *  to the page they acted on (fallback: home). */
async function backPath(fallback = "/"): Promise<string> {
  const ref = (await headers()).get("referer") ?? "";
  try {
    const url = new URL(ref);
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

function isWishable(productId: string): boolean {
  const permitted = permittedClasses({ hasRx: false });
  return PRODUCTS.some((p) => p.id === productId && permitted.includes(p.cls));
}

export async function toggleWishlist(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const back = await backPath();
  if (!isWishable(id)) redirect(back); // A1: medical ids never enter the list
  const list = await readWishlist();
  await writeWishlist(list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]);
  redirect(back);
}

export async function removeFromWishlist(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  await writeWishlist((await readWishlist()).filter((x) => x !== id));
  redirect("/account/wishlist");
}

/** Move a wishlist line into the cart (adds 1, drops it from the wishlist). */
export async function moveWishlistItemToCart(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  if (!isWishable(id)) redirect("/account/wishlist");
  const lines = await readCartLines();
  const existing = lines.find((l) => l.id === id);
  if (existing) existing.qty = Math.min(existing.qty + 1, 10);
  else lines.push({ id, qty: 1 });
  await writeCartLines(lines);
  await writeWishlist((await readWishlist()).filter((x) => x !== id));
  redirect("/cart");
}

/* ── Newsletter ───────────────────────────────────────────── */

export interface NewsletterState {
  ok: boolean;
  message: string;
}

export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "That email doesn't look right — check it and try again." };
  }
  // Demo persistence; with a DB attached this becomes db.newsletterSubscriber.upsert.
  (await cookies()).set("vh-news", "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true, message: "Subscribed — the next wellness note lands in your inbox." };
}

/* ── Reviews & questions on the PDP ───────────────────────── */

/** Same disease-claim vocabulary the seller copy-check uses — buyer
 *  testimonials with cure claims are equally non-publishable. */
const CLAIM_WORDS = CLAIMS_LANGUAGE;

export async function submitReview(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const rating = parseInt(String(formData.get("rating") ?? ""), 10);
  const text = String(formData.get("text") ?? "").trim();
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) redirect("/catalogue");

  const back = `/products/${product!.slug}#reviews`;
  // Verified-purchase rule enforced server-side: the review form may render,
  // but a review only lands if this session actually ordered the product.
  const bought = (await readOrderHistory()).some((o) => o.items.some((it) => it.title === product!.title));
  if (!bought) redirect(`/products/${product!.slug}?review=unverified#reviews`);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) redirect(`/products/${product!.slug}?review=rating#reviews`);
  if (text.length < 10 || text.length > 600) redirect(`/products/${product!.slug}?review=short#reviews`);
  if (CLAIM_WORDS.test(text)) redirect(`/products/${product!.slug}?review=claims#reviews`);

  const map = await readMyReviews();
  map[product!.slug] = { rating, text };
  await writeMyReviews(map);
  redirect(back);
}

export async function askQuestion(formData: FormData): Promise<void> {
  const id = String(formData.get("productId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) redirect("/catalogue");
  if (text.length < 10 || text.length > 300) redirect(`/products/${product!.slug}?q=short#qa`);

  const map = await readMyQuestions();
  map[product!.slug] = text;
  await writeMyQuestions(map);
  redirect(`/products/${product!.slug}#qa`);
}

/* ── Follow a storefront ──────────────────────────────────── */

export async function toggleFollowStore(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").slice(0, 60);
  const back = await backPath(`/store/${slug}`);
  if (!/^[a-z0-9-]+$/.test(slug)) redirect(back);
  const follows = await readFollows();
  await writeFollows(follows.includes(slug) ? follows.filter((s) => s !== slug) : [slug, ...follows]);
  redirect(back);
}
