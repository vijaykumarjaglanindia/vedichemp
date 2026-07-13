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
import { signIn } from "../signin/actions";

export const metadata: Metadata = { title: "Operator sign-in", robots: { index: false, follow: false } };

export default async function AdminDoorPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; next?: string }>;
}) {
  const { err, next } = await searchParams;
  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-7)", paddingBottom: "var(--sp-8)", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--sp-4)" }}>
        <span aria-hidden style={{ display: "inline-flex", padding: 12, borderRadius: 14, background: "var(--vh-green-100)", color: "var(--vh-accent)", marginBottom: 10 }}>
          <ShieldCheck size={22} strokeWidth={2.2} />
        </span>
        <h1 style={{ marginBottom: 6, fontSize: "1.3rem" }}>Operator sign-in</h1>
        <p className="muted small" style={{ margin: 0 }}>Marketplace operations console. Passkey-gated in production.</p>
      </div>

      {err === "email" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger">That email doesn&rsquo;t look right.</Banner>
        </div>
      )}

      <form action={signIn} className="vh-card" style={{ display: "grid", gap: 14 }}>
        <input type="hidden" name="role" value="ADMIN" />
        <input type="hidden" name="gate" value="vh-admin" />
        {next && <input type="hidden" name="next" value={next} />}
        <div className="vh-field">
          <label htmlFor="si-email" className="vh-label">Operator email <span className="req">*</span></label>
          <input id="si-email" name="email" type="email" className="vh-input" placeholder="you@vedichemp.com" autoComplete="email" required autoFocus />
          <span className="vh-help">In production this step is a passkey ceremony — SMS OTP is never accepted for admin.</span>
        </div>
        <button type="submit" className="vh-btn vh-btn-primary vh-btn-lg" style={{ width: "100%" }}>
          Continue
        </button>
        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          Every sign-in and every admin action is logged. Not an operator? Close this page.
        </p>
      </form>
    </div>
  );
}
