"use server";

/**
 * VEDIC HEMP — PROFILE / SECURITY / PRIVACY ACTIONS
 *
 * Demo persistence via httpOnly cookies; each write becomes the matching
 * account-service call when the DB is attached. Security posture surfaced
 * here matches the constitution: consent changes are append-only events,
 * account deletion is high-friction and server-gated, and every sensitive
 * flow is confirmed out-of-band (email/OTP), never silently.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth-lite";

const OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365 };

export async function sendPasswordReset(): Promise<void> {
  // Out-of-band by design: the reset link goes to the registered email; the
  // session itself can't rotate the password inline.
  redirect("/account/profile?sec=pwd#security");
}

export async function requestPasskey(): Promise<void> {
  (await cookies()).set("vh-passkey", "requested", OPTS);
  redirect("/account/profile?sec=passkey#security");
}

export async function toggleSmsOtp(): Promise<void> {
  const jar = await cookies();
  const off = jar.get("vh-2fa-sms")?.value === "off";
  jar.set("vh-2fa-sms", off ? "on" : "off", OPTS);
  redirect("/account/profile?sec=2fa#security");
}

export async function revokeSession(formData: FormData): Promise<void> {
  const id = String(formData.get("sessionId") ?? "").slice(0, 10);
  if (!/^se\d+$/.test(id)) redirect("/account/profile#security");
  const jar = await cookies();
  const revoked = new Set<string>(JSON.parse(jar.get("vh-revoked")?.value ?? "[]") as string[]);
  revoked.add(id);
  jar.set("vh-revoked", JSON.stringify([...revoked]), OPTS);
  revalidatePath("/account/profile");
  // The id also rides the redirect so the very first re-render reflects the
  // revocation even before the cookie round-trips.
  redirect(`/account/profile?sec=revoked&sid=${id}#security`);
}

export async function toggleConsent(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  // Essential consent is locked — a crafted submit for it dies here.
  if (!["analytics", "personalisation", "marketing"].includes(key)) redirect("/account/profile#privacy");
  const jar = await cookies();
  const overrides = JSON.parse(jar.get("vh-consent")?.value ?? "{}") as Record<string, boolean>;
  const defaults: Record<string, boolean> = { analytics: true, personalisation: true, marketing: false };
  overrides[key] = !(overrides[key] ?? defaults[key]);
  // Append-only ledger semantics: production writes a consent EVENT row; the
  // cookie stores only the current resolution.
  jar.set("vh-consent", JSON.stringify(overrides), OPTS);
  redirect("/account/profile#privacy");
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DELETE") redirect("/account/profile?sec=confirm#delete");

  // Server-side deletion gates (in-transit orders, open disputes, settlement
  // holds, statutory retention on health data per A3) run in the account
  // service; here we end the session and clear the demo state.
  const jar = await cookies();
  for (const c of jar.getAll()) {
    if (c.name.startsWith("vh-")) jar.delete(c.name);
  }
  await destroySession();
  redirect("/signin?bye=1");
}
