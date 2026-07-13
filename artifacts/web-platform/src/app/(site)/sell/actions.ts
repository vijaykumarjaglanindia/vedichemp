"use server";

/**
 * VEDIC HEMP — SELLER APPLICATION ACTION
 *
 * Validates the /sell application server-side and issues a reference. In demo
 * mode the application lands in a cookie; with DATABASE_URL attached it
 * becomes db.sellerApplication.create and feeds the admin KYC queue.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i;

export async function applyToSell(formData: FormData): Promise<void> {
  const business = String(formData.get("business") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const gstin = String(formData.get("gstin") ?? "").trim().toUpperCase();
  const classes = formData.getAll("classes").map(String);

  let err: string | null = null;
  if (business.length < 3 || business.length > 80) err = "business";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) err = "email";
  else if (!GSTIN_RE.test(gstin)) err = "gstin";
  else if (classes.length === 0) err = "classes";
  // MED_CANNABIS is not an application category on the public form — a crafted
  // value is dropped here, and NDPS licensing is handled in a manual review.
  const cleanClasses = classes.filter((c) => ["HEMP_FOOD", "AYURVEDA", "CBD_WELLNESS"].includes(c));
  if (!err && cleanClasses.length === 0) err = "classes";

  if (err) redirect(`/sell?err=${err}#apply`);

  const ref = `SA${Date.now().toString(36).toUpperCase().slice(-6)}`;
  (await cookies()).set(
    "vh-seller-app",
    JSON.stringify({ ref, business, classes: cleanClasses }),
    { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 },
  );
  redirect(`/sell?applied=${ref}#apply`);
}
