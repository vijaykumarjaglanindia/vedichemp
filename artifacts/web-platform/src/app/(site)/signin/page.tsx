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
import { LayoutDashboard, Store, UserRound } from "lucide-react";
import { Banner } from "@/components/ui";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  email: "That email doesn't look right — check it and try again.",
  role: "Choose which console you're signing in to.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ err?: string; next?: string }> }) {
  const { err, next } = await searchParams;

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-6)", paddingBottom: "var(--sp-8)", maxWidth: 480 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--sp-4)" }}>
        <h1 style={{ marginBottom: 6 }}>Sign in</h1>
        <p className="muted small" style={{ margin: 0 }}>
          One account for shopping, selling and operations.
        </p>
      </div>

      {err && ERRORS[err] && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger">{ERRORS[err]}</Banner>
        </div>
      )}

      <form action={signIn} className="vh-card" style={{ display: "grid", gap: 14 }}>
        {next && <input type="hidden" name="next" value={next} />}
        <div className="vh-field">
          <label htmlFor="si-email" className="vh-label">Email <span className="req">*</span></label>
          <input id="si-email" name="email" type="email" className="vh-input" placeholder="you@example.com" autoComplete="email" required autoFocus />
          <span className="vh-help">We&rsquo;ll send a one-time code here once OTP delivery is connected.</span>
        </div>

        <fieldset className="vh-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="vh-label" style={{ marginBottom: 6 }}>Continue as</legend>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { value: "BUYER", icon: UserRound, label: "Buyer", sub: "Shop, track orders, manage prescriptions" },
              { value: "SELLER", icon: Store, label: "Seller", sub: "Seller Central — listings, orders, settlements" },
              { value: "ADMIN", icon: LayoutDashboard, label: "Marketplace admin", sub: "Operations console (passkey-gated in production)" },
            ].map(({ value, icon: Icon, label, sub }) => (
              <label key={value} className="vh-row" style={{ gap: 12, border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "11px 13px", cursor: "pointer", alignItems: "flex-start" }}>
                <input type="radio" name="role" value={value} defaultChecked={value === "BUYER"} style={{ marginTop: 3, accentColor: "var(--vh-accent)" }} />
                <Icon size={16} aria-hidden style={{ color: "var(--vh-accent)", marginTop: 2, flexShrink: 0 }} />
                <span>
                  <span style={{ fontWeight: 600, color: "var(--vh-ink)", display: "block" }}>{label}</span>
                  <span className="small muted">{sub}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>
          Continue
        </button>
        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          New here? The same form creates your account. Sellers complete{" "}
          <Link href="/sell">onboarding &amp; licence submission</Link> after signing in.
        </p>
      </form>
    </div>
  );
}
