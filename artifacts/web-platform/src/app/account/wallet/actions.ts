"use server";

/**
 * VEDIC HEMP — WALLET ACTIONS (gift cards & store credit)
 *
 * Redemption is server-validated against the gift-card table (DB seam) and
 * idempotent per code: a code redeems once per account. Credit lands in the
 * append-only ledger; it is never cash-out-able (RBI PPI posture) — it spends
 * at checkout like any store credit.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const GIFT_CARDS: Record<string, number> = {
  "VEDIC-GIFT-500": 50000,
  "VEDIC-GIFT-1000": 100000,
};

export async function redeemGiftCard(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const paise = GIFT_CARDS[code];
  if (!paise) redirect("/account/wallet?gift=bad#giftcard");

  const jar = await cookies();
  let redeemed: Record<string, number> = {};
  try { redeemed = JSON.parse(jar.get("vh-gift")?.value ?? "{}") as Record<string, number>; } catch { redeemed = {}; }
  if (redeemed[code]) redirect("/account/wallet?gift=used#giftcard");
  redeemed[code] = paise;
  jar.set("vh-gift", JSON.stringify(redeemed), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  redirect("/account/wallet?gift=ok#giftcard");
}

export async function readGiftCredit(): Promise<number> {
  const jar = await cookies();
  try {
    const redeemed = JSON.parse(jar.get("vh-gift")?.value ?? "{}") as Record<string, number>;
    return Object.values(redeemed).reduce((s, v) => s + v, 0);
  } catch {
    return 0;
  }
}
