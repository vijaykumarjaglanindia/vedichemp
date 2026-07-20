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
import { destroySession, getSession } from "@/lib/auth-lite";

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

export async function toggleConsent(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  const { isPurpose, currentConsent, appendConsent } = await import("@/lib/consent");
  // Essential consent is locked — a crafted submit for it dies here.
  if (!isPurpose(key)) redirect("/account/profile#privacy");
  const email = (await getSession())?.email ?? "buyer@example.in";
  // The ledger is the source of truth: read the current resolution, then APPEND
  // the flipped value as a new immutable event (never edit a prior row).
  const current = await currentConsent(email);
  await appendConsent(email, key, !current[key], email, "profile");
  revalidatePath("/account/profile");
  redirect("/account/profile#privacy");
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DELETE") redirect("/account/profile?sec=confirm#delete");

  const email = (await getSession())?.email ?? "buyer@example.in";
  // Server-side deletion gate: an account with an order still in flight (or a
  // return being settled) can't be erased — fulfilment and buyer-first refunds
  // must complete first. The denied attempt is audited.
  const { ordersForBuyer } = await import("@/lib/orders");
  const IN_FLIGHT = ["PLACED", "ACCEPTED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "RETURN_REQUESTED", "RETURN_APPROVED"];
  const inFlight = (await ordersForBuyer(email)).filter((o) => IN_FLIGHT.includes(o.status));
  if (inFlight.length > 0) {
    const { writeAudit } = await import("@/lib/audit");
    await writeAudit({ actor: email, action: "ACCOUNT_DELETE", target: email, outcome: "DENIED", note: `${inFlight.length} order(s) in flight` });
    redirect("/account/profile?sec=deleteblocked#delete");
  }

  // Statutory retention on safety/health records (A3) means we anonymise the
  // account rather than shred those rows; here we record the erasure request
  // and end the session.
  const { writeAudit } = await import("@/lib/audit");
  await writeAudit({ actor: email, action: "ACCOUNT_DELETE", target: email, outcome: "OK", note: "erasure requested; safety records retained per A3" });
  const jar = await cookies();
  for (const c of jar.getAll()) {
    if (c.name.startsWith("vh-")) jar.delete(c.name);
  }
  await destroySession();
  redirect("/signin?bye=1");
}
