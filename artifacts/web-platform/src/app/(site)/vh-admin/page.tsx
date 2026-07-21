/**
 * VEDIC HEMP — OPERATOR SIGN-IN (unlisted, WordPress-style /wp-admin door)
 *
 * Not linked from anywhere public, noindexed, absent from the sitemap and
 * menus — operators know the address, the public doesn't. Obscurity is the
 * courtesy, not the protection: production admin auth is a passkey ceremony
 * (SMS OTP is never accepted for admin), and the server action refuses to
 * mint an ADMIN session from the public sign-in form regardless.
 */

import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Banner } from "@/components/ui";
import { EmailSignInForm } from "../_lib/EmailSignInForm";

export const metadata: Metadata = { title: "Operator sign-in", robots: { index: false, follow: false } };

const ADMIN_ERRORS: Record<string, string> = {
  email: "That email doesn't look right.",
  role: "This door is for operators only.",
  creds: "Incorrect operator email or password.",
  wrongdoor: "That account is not an operator account.",
  "otp-expired": "That code expired — request a new one.",
  "otp-wrong": "That code doesn't match — check your email and try again.",
};

export default async function AdminDoorPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; next?: string; eotp?: string }>;
}) {
  const { err, next, eotp } = await searchParams;
  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-7)", paddingBottom: "var(--sp-8)", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--sp-4)" }}>
        <span aria-hidden style={{ display: "inline-flex", padding: 12, borderRadius: 14, background: "var(--vh-green-100)", color: "var(--vh-accent)", marginBottom: 10 }}>
          <ShieldCheck size={22} strokeWidth={2.2} />
        </span>
        <h1 style={{ marginBottom: 6, fontSize: "1.3rem" }}>Operator sign-in</h1>
        <p className="muted small" style={{ margin: 0 }}>Marketplace operations console. Passkey-gated in production.</p>
      </div>

      {err && ADMIN_ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger">{ADMIN_ERRORS[err]}</Banner>
        </div>
      )}

      <EmailSignInForm
        role="ADMIN"
        back="/vh-admin"
        gate="vh-admin"
        next={next}
        otpSent={eotp === "sent"}
        emailLabel="Operator email"
        emailPlaceholder="you@vedichemp.com"
        help="In production this step is a passkey ceremony — SMS OTP is never accepted for admin."
      />
      <p className="small muted" style={{ margin: "10px 0 0", textAlign: "center" }}>
        Every sign-in and every admin action is logged. Not an operator? Close this page.
      </p>
    </div>
  );
}
