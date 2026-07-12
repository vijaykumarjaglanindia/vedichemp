"use server";

/**
 * VEDIC HEMP — SIGN-IN ACTIONS (lite)
 *
 * Issues the signed session cookie. The role decides which console the user
 * lands in. Production auth (Auth.js: email+OTP for buyers, passkeys for
 * admins — SMS OTP is not accepted for admin) replaces this issuer without
 * touching any consumer (see PRODUCTION.md).
 */

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth-lite";

const HOME: Record<string, string> = { BUYER: "/account", SELLER: "/seller", ADMIN: "/admin" };

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "BUYER") as "BUYER" | "SELLER" | "ADMIN";
  const next = String(formData.get("next") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    redirect(`/signin?err=email${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  if (!["BUYER", "SELLER", "ADMIN"].includes(role)) redirect("/signin?err=role");

  const name = (email.split("@")[0] ?? "there").replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await createSession({ email, name, role });

  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : (HOME[role] ?? "/account"));
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}
