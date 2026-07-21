"use server";

/**
 * VEDIC HEMP — SIGN-IN ACTIONS (lite)
 *
 * Issues the signed session cookie. The role decides which console the user
 * lands in. Production auth (Auth.js: email+OTP for buyers, passkeys for
 * admins — SMS OTP is not accepted for admin) replaces this issuer without
 * touching any consumer (see PRODUCTION.md).
 */

import { createHmac, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth-lite";

const HOME: Record<string, string> = { BUYER: "/account", SELLER: "/seller", ADMIN: "/admin" };

/**
 * Whether the email sign-in requires a one-time code. It activates when an email
 * provider is configured (EMAIL_API_KEY) or is forced on (EMAIL_OTP), mirroring
 * how the SMS seam becomes real with SMS_API_KEY and OAuth with provider keys.
 * The demo defaults OFF, so email sign-in is instant in the sandbox — the code
 * step is shown, exercised and testable the moment either variable is set.
 */
export async function emailOtpEnabled(): Promise<boolean> {
  return Boolean(process.env.EMAIL_OTP || process.env.EMAIL_API_KEY);
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "BUYER") as "BUYER" | "SELLER" | "ADMIN";
  const next = String(formData.get("next") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    redirect(`/signin?err=email${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  if (!["BUYER", "SELLER", "ADMIN"].includes(role)) redirect("/signin?err=role");
  // The public sign-in page has no admin option at all (WordPress-style:
  // operators use the unlisted /vh-admin door). Real protection is the
  // passkey ceremony that replaces this issuer; the gate keeps the public
  // form from ever minting an admin session.
  if (role === "ADMIN" && String(formData.get("gate")) !== "vh-admin") redirect("/signin?err=role");

  const name = (email.split("@")[0] ?? "there").replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await createSession({ email, name, role, provider: "email" });

  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : (HOME[role] ?? "/account"));
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

/* ── Email one-time code (email delivery seam) ────────────────────
 * With EMAIL_API_KEY (or EMAIL_OTP forced) the code is emailed; without it the
 * sign-in page shows it in a clearly-labelled sandbox box so the flow still
 * works end-to-end. A random single-use code is stored in an httpOnly cookie,
 * bound to this browser, and cleared on success. Admin uses the same email code
 * here (the production ceremony is passkeys — never SMS, per §3).
 */

type EmailOtp = { e: string; r: "BUYER" | "SELLER" | "ADMIN"; g?: string; b: string; n: string; code: string; exp: number };
const EMAIL_OTP_COOKIE = "vh-eotp";
const EMAIL_HOMES: Record<string, string> = HOME;

function backFor(v: string): string {
  return v === "/seller-login" ? "/seller-login" : v === "/vh-admin" ? "/vh-admin" : "/signin";
}

export async function requestEmailOtp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "BUYER") as EmailOtp["r"];
  const gate = String(formData.get("gate") ?? "");
  const back = backFor(String(formData.get("back") ?? "/signin"));
  const next = String(formData.get("next") ?? "");
  const nextQ = next ? `&next=${encodeURIComponent(next)}` : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) redirect(`${back}?err=email${nextQ}`);
  if (!["BUYER", "SELLER", "ADMIN"].includes(role)) redirect(`${back}?err=role`);
  // The public /signin door can never request an ADMIN code — admin comes only
  // through the unlisted /vh-admin door, which supplies gate=vh-admin.
  if (role === "ADMIN" && gate !== "vh-admin") redirect(`${back}?err=role`);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const jar = await cookies();
  jar.set(EMAIL_OTP_COOKIE, JSON.stringify({ e: email, r: role, g: gate || undefined, b: back, n: next, code, exp: Date.now() + 10 * 60_000 } satisfies EmailOtp), {
    path: "/", httpOnly: true, sameSite: "lax", maxAge: 600,
  });
  // Email seam: if EMAIL_API_KEY exists, send `code` to `email` via the provider here.
  redirect(`${back}?eotp=sent${nextQ}`);
}

export async function verifyEmailOtp(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const jar = await cookies();
  let pending: EmailOtp | null = null;
  try { pending = JSON.parse(jar.get(EMAIL_OTP_COOKIE)?.value ?? "null") as EmailOtp | null; } catch { pending = null; }
  const back = backFor(pending?.b ?? "/signin");
  const next = pending?.n ?? "";
  const nextQ = next ? `&next=${encodeURIComponent(next)}` : "";
  if (!pending || pending.exp < Date.now()) redirect(`${back}?err=otp-expired${nextQ}`);
  if (code !== pending!.code) redirect(`${back}?eotp=sent&err=otp-wrong${nextQ}`);
  // Admin code only completes through the admin door (defence in depth).
  if (pending!.r === "ADMIN" && pending!.g !== "vh-admin") redirect(`${back}?err=role`);

  jar.delete(EMAIL_OTP_COOKIE);
  const name = (pending!.e.split("@")[0] ?? "there").replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await createSession({ email: pending!.e, name, role: pending!.r, provider: "email" });
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : (EMAIL_HOMES[pending!.r] ?? "/account"));
}

/** Server-side helper for the page: the pending email code to show in sandbox mode. */
export async function pendingEmailOtpPreview(): Promise<{ email: string; code: string } | null> {
  if (process.env.EMAIL_API_KEY) return null; // real email goes out; nothing to preview
  const jar = await cookies();
  try {
    const pending = JSON.parse(jar.get(EMAIL_OTP_COOKIE)?.value ?? "null") as EmailOtp | null;
    if (!pending || pending.exp < Date.now()) return null;
    return { email: pending.e, code: pending.code };
  } catch {
    return null;
  }
}


/* ── Phone OTP (SMS gateway seam) ─────────────────────────────────
 * With SMS_API_KEY configured the code goes out as a real SMS; without it
 * the sign-in page displays the code in a clearly-labelled sandbox box so
 * the whole flow still works end-to-end. Admin cannot use OTP (passkeys
 * only — constitution §3), enforced here, not in the UI.
 */

function otpFor(phone: string): string {
  const h = createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret-rotate-me").update(`otp:${phone}`).digest();
  return String(((h[0]! << 16) | (h[1]! << 8) | h[2]!) % 1000000).padStart(6, "0");
}

export async function requestOtp(formData: FormData): Promise<void> {
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  const role = String(formData.get("otprole") ?? "BUYER");
  const backRaw = String(formData.get("back") ?? "/signin");
  const back = backRaw === "/seller-login" ? "/seller-login" : "/signin";
  if (role === "ADMIN") redirect(`${back}?err=admin-otp#phone`);
  if (!["BUYER", "SELLER"].includes(role)) redirect(`${back}?err=role#phone`);
  if (!/^[6-9]\d{9}$/.test(phone)) redirect(`${back}?err=phone#phone`);

  const jar = await cookies();
  jar.set("vh-otp", JSON.stringify({ p: phone, r: role, b: back, exp: Date.now() + 10 * 60_000 }), {
    path: "/", httpOnly: true, sameSite: "lax", maxAge: 600,
  });
  // SMS seam: if a provider key exists, send otpFor(phone) via the gateway here.
  redirect(`${back}?otp=sent#phone`);
}

export async function verifyOtp(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40) || "Member";
  const jar = await cookies();
  type Pending = { p: string; r: string; b?: string; exp: number };
  let pending: Pending | null = null;
  try { pending = JSON.parse(jar.get("vh-otp")?.value ?? "null") as Pending | null; } catch { pending = null; }
  const back = pending?.b === "/seller-login" ? "/seller-login" : "/signin";
  if (!pending || pending.exp < Date.now()) redirect(`${back}?err=otp-expired#phone`);
  if (code !== otpFor(pending!.p)) redirect(`${back}?otp=sent&err=otp-wrong#phone`);

  jar.delete("vh-otp");
  const role = pending!.r as "BUYER" | "SELLER";
  // A separate account per phone identity — same account on every sign-in.
  await createSession({ email: `+91${pending!.p}@phone.vedichemp.in`, name, role, provider: "phone" });
  redirect(HOME[role] ?? "/account");
}

/** Server-side helper for the page: the pending OTP to display in sandbox mode. */
export async function pendingOtpPreview(): Promise<{ phone: string; code: string } | null> {
  if (process.env.SMS_API_KEY) return null; // real SMS goes out; nothing to preview
  const jar = await cookies();
  try {
    const pending = JSON.parse(jar.get("vh-otp")?.value ?? "null") as { p: string; exp: number } | null;
    if (!pending || pending.exp < Date.now()) return null;
    return { phone: pending.p, code: otpFor(pending.p) };
  } catch {
    return null;
  }
}

/* ── OAuth sandbox completion (used when no provider keys are set) ── */

export async function oauthComplete(formData: FormData): Promise<void> {
  const provider = String(formData.get("provider") ?? "");
  const role = String(formData.get("role") ?? "BUYER") as "BUYER" | "SELLER";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40) || "Member";
  if (!["google", "facebook"].includes(provider)) redirect("/signin");
  if (!["BUYER", "SELLER"].includes(role)) redirect("/signin?err=role");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) redirect(`/signin/sandbox?provider=${provider}&err=email`);
  await createSession({ email, name, role, provider });
  redirect(HOME[role] ?? "/account");
}
