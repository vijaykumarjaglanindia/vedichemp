"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { CLAIMS_LANGUAGE } from "@/lib/claims";
import { addGiftCard, readCoupons, writeClassDisplay, writeCommerce, writeCoupon } from "@/lib/commerce";

async function actor(): Promise<string> {
  return (await getSession())?.email ?? "unknown-admin";
}
const BACK = "/admin/settings/commerce";

/**
 * The owner's numbers. Every one of these used to be a literal somewhere in the
 * code AND a different literal in the copy beside it; they are one value now,
 * read by the guard and printed by the sentence. Nothing here is a compliance
 * gate — those are not the owner's to set.
 */
export async function saveCommerceSettings(formData: FormData): Promise<void> {
  const rupees = (k: string) => Math.round(Number(formData.get(k)) * 100);
  const whole = (k: string) => Number(formData.get(k));
  const patch = {
    loyaltyPtsPer100: whole("ptsPer100"),
    referralCreditPaise: rupees("referral"),
    referralMinSpendPaise: rupees("referralMin"),
    returnWindowDays: whole("returnDays"),
    maxSavedAddresses: whole("maxAddresses"),
    minWithdrawPaise: rupees("minWithdraw"),
    giftCardMaxPaise: rupees("giftCardMax"),
    maxCouponPct: whole("maxCouponPct"),
    maxCouponFixedPaise: rupees("maxCouponFixed"),
    defaultLowStockAt: whole("defaultLowStockAt"),
    maxProductImages: whole("maxProductImages"),
  };
  // Every field must be a whole, non-negative number, and the two that bound a
  // list must be at least 1 — a cap of zero would lock buyers and sellers out
  // of a feature by arithmetic rather than by decision.
  const bad = Object.entries(patch).some(([k, v]) =>
    !Number.isInteger(v) || v < 0 ||
    (["maxSavedAddresses", "maxProductImages", "returnWindowDays"].includes(k) && v < 1));
  if (bad || patch.maxCouponPct > 100) redirect(`${BACK}?cm=bad`);

  await writeCommerce(patch);
  await writeAudit({
    actor: await actor(), action: "COMMERCE_SETTINGS", target: "economics", outcome: "OK",
    note: `${patch.loyaltyPtsPer100}pts/₹100 · referral ₹${patch.referralCreditPaise / 100} over ₹${patch.referralMinSpendPaise / 100} · returns ${patch.returnWindowDays}d · payout floor ₹${patch.minWithdrawPaise / 100}`,
  });
  redirect(`${BACK}?cm=saved`);
}

export async function upsertCoupon(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  const pct = Number(formData.get("pct"));
  const capPaise = Math.round(Number(formData.get("cap") || 0) * 100);
  const minPaise = Math.round(Number(formData.get("min") || 0) * 100);
  const label = String(formData.get("label") ?? "").trim().slice(0, 80);
  if (!code || code.length < 4) redirect(`${BACK}?cp=code`);
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) redirect(`${BACK}?cp=pct`);
  if (!label || CLAIMS_LANGUAGE.test(label)) redirect(`${BACK}?cp=label`);
  await writeCoupon(code, { pct, capPaise, minPaise, label, enabled: true });
  await writeAudit({ actor: await actor(), action: "COUPON_UPSERT", target: code, outcome: "OK", note: `${pct}% cap ₹${capPaise / 100} min ₹${minPaise / 100}` });
  redirect(`${BACK}?cp=saved`);
}

export async function toggleCoupon(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "");
  const all = await readCoupons();
  const c = all[code];
  if (!c) redirect(BACK);
  await writeCoupon(code, { ...c, enabled: !c.enabled });
  await writeAudit({ actor: await actor(), action: "COUPON_TOGGLE", target: code, outcome: "OK", note: c.enabled ? "disabled" : "enabled" });
  redirect(`${BACK}?cp=toggled`);
}

export async function createGiftCard(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
  const paise = Math.round(Number(formData.get("value")) * 100);
  const { readCommerce } = await import("@/lib/commerce");
  const maxPaise = (await readCommerce()).giftCardMaxPaise;
  if (!code || code.length < 6 || !Number.isInteger(paise) || paise <= 0 || paise > maxPaise) redirect(`${BACK}?gc=bad`);
  await addGiftCard(code, paise);
  await writeAudit({ actor: await actor(), action: "GIFTCARD_CREATE", target: code, outcome: "OK", note: `₹${paise / 100}` });
  redirect(`${BACK}?gc=saved`);
}

export async function saveClassDisplay(formData: FormData): Promise<void> {
  const cls = String(formData.get("cls") ?? "");
  if (!["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS", "MED_CANNABIS"].includes(cls)) redirect(BACK);
  const pick = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max) || undefined;
  const label = pick("label", 40);
  const blurb = pick("blurb", 160);
  if ((label && CLAIMS_LANGUAGE.test(label)) || (blurb && CLAIMS_LANGUAGE.test(blurb))) redirect(`${BACK}?cd=claims`);
  await writeClassDisplay(cls, { label, short: pick("short", 30), blurb, emoji: pick("emoji", 4) });
  await writeAudit({ actor: await actor(), action: "CLASS_DISPLAY", target: cls, outcome: "OK" });
  redirect(`${BACK}?cd=saved`);
}
