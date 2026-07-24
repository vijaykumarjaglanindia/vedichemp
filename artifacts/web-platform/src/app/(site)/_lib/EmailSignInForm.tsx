/**
 * VEDIC HEMP — EMAIL SIGN-IN (shared)
 *
 * One component drives sign-in for the buyer (/signin), seller (/seller-login)
 * and admin (/vh-admin) doors, so the three stay identical.
 *
 * Default: real CREDENTIAL login — email + password, verified against the
 * account directory, with the role taken from the account (never the form). A
 * buyer can register from the buyer door; sellers onboard via /sell and admins
 * are provisioned, so those doors are sign-in only.
 *
 * Alternatives on the same page: phone OTP and social sign-in (rendered by the
 * pages), and — when EMAIL_API_KEY / EMAIL_OTP is configured — an emailed
 * one-time code instead of a password (the OTP branch below), exactly mirroring
 * how the SMS and OAuth seams become real once their keys are set.
 */

import Link from "next/link";
import { emailOtpEnabled, login, registerAccount, requestEmailOtp, verifyEmailOtp, pendingEmailOtpPreview } from "../signin/actions";
import { SEED_CREDENTIALS } from "@/lib/accounts";

export async function EmailSignInForm({
  role,
  back,
  gate,
  next,
  otpSent,
  mode = "login",
  showRegister = false,
  emailLabel = "Email",
  emailPlaceholder = "you@example.com",
  help,
}: {
  role: "BUYER" | "SELLER" | "ADMIN";
  back: string;
  gate?: string;
  next?: string;
  otpSent?: boolean;
  mode?: "login" | "register";
  showRegister?: boolean;
  emailLabel?: string;
  emailPlaceholder?: string;
  help?: string;
}) {
  // ── Email one-time code mode (EMAIL_API_KEY / EMAIL_OTP set) ──
  if (await emailOtpEnabled()) {
    if (otpSent) {
      const preview = await pendingEmailOtpPreview();
      return (
        <form action={verifyEmailOtp} className="vh-card" style={{ display: "grid", gap: 14 }}>
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Enter the code we emailed</h2>
          {preview && (
            <div className="small" id="eotp-sandbox" style={{ background: "var(--vh-warn-bg, #fff7e6)", border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "10px 12px" }}>
              <strong>Email sandbox</strong> — no email key configured, so the code for{" "}
              <span className="mono">{preview.email}</span> is{" "}
              <span className="mono" id="eotp-code" style={{ fontWeight: 800 }}>{preview.code}</span>.
            </div>
          )}
          <div className="vh-field">
            <label className="vh-label" htmlFor="si-eotp">6-digit code <span className="req">*</span></label>
            <input className="vh-input mono" id="si-eotp" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus />
          </div>
          <button className="vh-btn vh-btn-primary vh-btn-lg" type="submit" style={{ width: "100%" }}>Verify &amp; sign in</button>
          <p className="small muted" style={{ margin: 0 }}><Link href={back}>Use a different email</Link></p>
        </form>
      );
    }
    return (
      <form action={requestEmailOtp} className="vh-card" style={{ display: "grid", gap: 14 }}>
        {next && <input type="hidden" name="next" value={next} />}
        <input type="hidden" name="role" value={role} />
        {gate && <input type="hidden" name="gate" value={gate} />}
        <input type="hidden" name="back" value={back} />
        <div className="vh-field">
          <label htmlFor="si-email" className="vh-label">{emailLabel} <span className="req">*</span></label>
          <input id="si-email" name="email" type="email" className="vh-input" placeholder={emailPlaceholder} autoComplete="email" required autoFocus />
          <span className="vh-help">{help ?? "We'll email you an OTP to sign in."}</span>
        </div>
        <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>Email me a code</button>
      </form>
    );
  }

  // ── Register mode (buyer self-service only) ──
  if (mode === "register" && showRegister) {
    return (
      <form action={registerAccount} className="vh-card" style={{ display: "grid", gap: 14 }}>
        {next && <input type="hidden" name="next" value={next} />}
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Create your buyer account</h2>
        <div className="vh-field">
          <label htmlFor="rg-name" className="vh-label">Your name <span className="req">*</span></label>
          <input id="rg-name" name="name" className="vh-input" maxLength={60} placeholder="Asha Verma" required autoFocus />
        </div>
        <div className="vh-field">
          <label htmlFor="rg-email" className="vh-label">Email <span className="req">*</span></label>
          <input id="rg-email" name="email" type="email" className="vh-input" placeholder={emailPlaceholder} autoComplete="email" required />
        </div>
        <div className="vh-field">
          <label htmlFor="rg-password" className="vh-label">Password <span className="req">*</span></label>
          <input id="rg-password" name="password" type="password" className="vh-input" autoComplete="new-password" minLength={8} required />
          <span className="vh-help">At least 8 characters, with upper- and lower-case letters and a number.</span>
        </div>
        <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>Create account</button>
        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          Already have an account? <Link href={back}>Sign in</Link>
        </p>
      </form>
    );
  }

  // ── Default: credential (email + password) login ──
  return (
    <form action={login} className="vh-card" style={{ display: "grid", gap: 14 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="role" value={role} />
      {gate && <input type="hidden" name="gate" value={gate} />}
      <input type="hidden" name="back" value={back} />
      <div className="vh-field">
        <label htmlFor="si-email" className="vh-label">{emailLabel} <span className="req">*</span></label>
        <input id="si-email" name="email" type="email" className="vh-input" placeholder={emailPlaceholder} autoComplete="email" required autoFocus />
      </div>
      <div className="vh-field">
        <label htmlFor="si-password" className="vh-label">Password <span className="req">*</span></label>
        <input id="si-password" name="password" type="password" className="vh-input" autoComplete="current-password" required />
        {help && <span className="vh-help">{help}</span>}
      </div>
      <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>Continue</button>
      {showRegister && (
        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          New here? <Link href={`${back}?mode=register`} style={{ fontWeight: 700 }}>Create a buyer account</Link>
        </p>
      )}
      <p className="small muted" style={{ margin: 0, textAlign: "center", opacity: 0.85 }}>
        Demo login — <span className="mono">{role === "SELLER" ? SEED_CREDENTIALS.seller : role === "ADMIN" ? SEED_CREDENTIALS.admin : SEED_CREDENTIALS.buyer}</span>
        {" / "}<span className="mono">{SEED_CREDENTIALS.password}</span>
      </p>
    </form>
  );
}
