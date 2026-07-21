/**
 * VEDIC HEMP — SIGN IN
 *
 * Issues a real signed session (auth-lite) and routes the user to their
 * console. The role picker exists because the demo has no user directory yet;
 * with Auth.js + DATABASE_URL attached, roles come from the account record
 * (buyers: email+OTP, admins: passkeys — see PRODUCTION.md).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Banner } from "@/components/ui";
import { withBase } from "@/lib/base";
import { pendingOtpPreview, requestOtp, verifyOtp } from "./actions";
import { EmailSignInForm } from "../_lib/EmailSignInForm";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  email: "That email doesn't look right — check it and try again.",
  role: "Choose which console you're signing in to.",
  phone: "Enter a 10-digit Indian mobile number.",
  "admin-otp": "Admin sign-in uses passkeys (or email here in the demo) — SMS OTP is not accepted for admin, by policy.",
  "otp-expired": "That code expired — request a new one.",
  "otp-wrong": "That code doesn't match — check the SMS and try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ err?: string; next?: string; bye?: string; otp?: string; eotp?: string }> }) {
  const { err, next, bye, otp, eotp } = await searchParams;
  const otpPreview = otp === "sent" ? await pendingOtpPreview() : null;

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-6)", paddingBottom: "var(--sp-8)", maxWidth: 480 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--sp-4)" }}>
        <h1 style={{ marginBottom: 6 }}>Sign in to shop</h1>
        <p className="muted small" style={{ margin: 0 }}>
          Buyer accounts — orders, wallet, wishlist and prescriptions.
        </p>
      </div>

      {err && ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger">{ERRORS[err]}</Banner>
        </div>
      )}
      {bye && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="ok" title="Deletion request received">
            Your session has ended. The account service checks the deletion gates (orders in
            transit, open disputes, settlement or statutory holds) and emails you the outcome —
            health records are retained for the statutory period regardless.
          </Banner>
        </div>
      )}

      <EmailSignInForm role="BUYER" back="/signin" next={next} otpSent={eotp === "sent"} />
      <p className="small muted" style={{ margin: "10px 0 0", textAlign: "center" }}>
        New here? The same form creates your buyer account.{" "}
        Selling on the marketplace? <Link href="/seller-login" style={{ fontWeight: 700 }}>Seller sign in →</Link>
      </p>

      {/* ── Or continue with a provider ─────────────────── */}
      <div className="vh-row" style={{ gap: 10, margin: "var(--sp-3) 0", alignItems: "center" }}>
        <span style={{ flex: 1, height: 1, background: "var(--vh-line)" }} aria-hidden />
        <span className="small muted">or continue with</span>
        <span style={{ flex: 1, height: 1, background: "var(--vh-line)" }} aria-hidden />
      </div>
      <div className="vh-grid cols-2" style={{ gap: 10 }}>
        <a className="vh-btn vh-btn-outline" href={withBase("/api/v1/auth/google?role=BUYER")} style={{ justifyContent: "center" }}>
          <span aria-hidden style={{ fontWeight: 800 }}>G</span> Google
        </a>
        <a className="vh-btn vh-btn-outline" href={withBase("/api/v1/auth/facebook?role=BUYER")} style={{ justifyContent: "center" }}>
          <span aria-hidden style={{ fontWeight: 800 }}>f</span> Facebook
        </a>
      </div>
      <p className="small muted" style={{ margin: "8px 0 0", textAlign: "center" }}>
        Every identity — email, phone, Google or Facebook — is its own account.
        Admins sign in with passkeys only; social and SMS sign-in never reach the admin console.
      </p>

      {/* ── Phone OTP ────────────────────────────────────── */}
      <div id="phone" style={{ scrollMarginTop: 90, marginTop: "var(--sp-3)" }}>
        {otp !== "sent" || err === "otp-expired" ? (
          <form action={requestOtp} className="vh-card" style={{ display: "grid", gap: 12 }}>
            <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Sign in with phone</h2>
            <div className="vh-field">
              <label className="vh-label" htmlFor="si-phone">Mobile number <span className="req">*</span></label>
              <div className="vh-row" style={{ gap: 8 }}>
                <span className="vh-input" style={{ width: 64, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden>+91</span>
                <input className="vh-input" id="si-phone" name="phone" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="98765 43210" required style={{ flex: 1 }} />
              </div>
            </div>
            <input type="hidden" name="otprole" value="BUYER" />
            <input type="hidden" name="back" value="/signin" />
            <button className="vh-btn vh-btn-outline" type="submit">Send one-time code</button>
          </form>
        ) : (
          <form action={verifyOtp} className="vh-card" style={{ display: "grid", gap: 12 }}>
            <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Enter the code we sent</h2>
            {otpPreview && (
              <div className="small" style={{ background: "var(--vh-warn-bg, #fff7e6)", border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "10px 12px" }}>
                <strong>SMS gateway sandbox</strong> — no SMS key configured, so the code for
                +91&nbsp;{otpPreview.phone.slice(0, 5)}&nbsp;{otpPreview.phone.slice(5)} is{" "}
                <span className="mono" style={{ fontWeight: 800 }}>{otpPreview.code}</span>.
                With SMS_API_KEY set, this box disappears and the code arrives by SMS.
              </div>
            )}
            <div className="vh-field">
              <label className="vh-label" htmlFor="si-otp">6-digit code <span className="req">*</span></label>
              <input className="vh-input mono" id="si-otp" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus />
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="si-name">Your name</label>
              <input className="vh-input" id="si-name" name="name" maxLength={40} placeholder="How should we greet you?" />
            </div>
            <button className="vh-btn vh-btn-primary" type="submit">Verify & sign in</button>
            <p className="small muted" style={{ margin: 0 }}><Link href="/signin#phone">Use a different number</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
