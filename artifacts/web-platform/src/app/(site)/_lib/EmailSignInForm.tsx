/**
 * VEDIC HEMP — EMAIL SIGN-IN (shared)
 *
 * One component drives email sign-in for the buyer (/signin), seller
 * (/seller-login) and admin (/vh-admin) doors, so the three stay identical.
 *
 * Two honest modes, chosen by emailOtpEnabled():
 *  • OTP mode (EMAIL_API_KEY or EMAIL_OTP set): step 1 emails a one-time code;
 *    step 2 verifies it, then a session is issued. Real verification.
 *  • Sandbox mode (demo default): a single Continue issues the session directly,
 *    and the copy says so — the code step activates the moment email delivery is
 *    configured. This keeps the demo (and its E2E fixtures) one-step while the
 *    OTP path is fully built and exercised under EMAIL_OTP=1.
 *
 * In sandbox mode the form is exactly { #si-email, hidden role/gate/next,
 * Continue → signIn } so nothing that drives the instant form has to change.
 */

import Link from "next/link";
import { emailOtpEnabled, requestEmailOtp, signIn, verifyEmailOtp, pendingEmailOtpPreview } from "../signin/actions";

export async function EmailSignInForm({
  role,
  back,
  gate,
  next,
  otpSent,
  emailLabel = "Email",
  emailPlaceholder = "you@example.com",
  help,
}: {
  role: "BUYER" | "SELLER" | "ADMIN";
  back: string;
  gate?: string;
  next?: string;
  otpSent?: boolean;
  emailLabel?: string;
  emailPlaceholder?: string;
  help?: string;
}) {
  const otp = await emailOtpEnabled();

  // ── Sandbox (demo default): one step, issues the session directly. ──
  if (!otp) {
    return (
      <form action={signIn} className="vh-card" style={{ display: "grid", gap: 14 }}>
        {next && <input type="hidden" name="next" value={next} />}
        <input type="hidden" name="role" value={role} />
        {gate && <input type="hidden" name="gate" value={gate} />}
        <div className="vh-field">
          <label htmlFor="si-email" className="vh-label">{emailLabel} <span className="req">*</span></label>
          <input id="si-email" name="email" type="email" className="vh-input" placeholder={emailPlaceholder} autoComplete="email" required autoFocus />
          <span className="vh-help">{help ?? "Demo sign-in — a one-time email code step activates when EMAIL_API_KEY is set."}</span>
        </div>
        <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>Continue</button>
      </form>
    );
  }

  // ── OTP mode, step 2: enter the code we emailed. ──
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
            With EMAIL_API_KEY set, this box disappears and the code arrives by email.
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

  // ── OTP mode, step 1: request a code. ──
  return (
    <form action={requestEmailOtp} className="vh-card" style={{ display: "grid", gap: 14 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="role" value={role} />
      {gate && <input type="hidden" name="gate" value={gate} />}
      <input type="hidden" name="back" value={back} />
      <div className="vh-field">
        <label htmlFor="si-email" className="vh-label">{emailLabel} <span className="req">*</span></label>
        <input id="si-email" name="email" type="email" className="vh-input" placeholder={emailPlaceholder} autoComplete="email" required autoFocus />
        <span className="vh-help">{help ?? "We'll email you a one-time code to sign in."}</span>
      </div>
      <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>Email me a code</button>
    </form>
  );
}
