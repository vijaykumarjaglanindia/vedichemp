/**
 * VEDIC HEMP — PROVIDER SANDBOX (no OAuth keys configured)
 *
 * Stands in for the Google/Facebook consent screen so the social sign-in
 * flow works end-to-end before real keys exist. Clearly labelled — this
 * page disappears the moment GOOGLE_CLIENT_ID / FACEBOOK_CLIENT_ID and
 * OAUTH_REDIRECT_BASE are set, replaced by the provider's own screen.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Banner } from "@/components/ui";
import { oauthComplete } from "../actions";

export const metadata: Metadata = { title: "Continue with provider", robots: { index: false } };

export default async function OAuthSandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; role?: string; err?: string }>;
}) {
  const { provider = "google", role = "BUYER", err } = await searchParams;
  const nice = provider === "facebook" ? "Facebook" : "Google";
  const demoEmail = provider === "facebook" ? "asha.verma@facebook.example" : "asha.verma@gmail.example";

  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-6)", paddingBottom: "var(--sp-8)", maxWidth: 440 }}>
      <div style={{ marginBottom: "var(--sp-3)" }}>
        <Banner severity="warn" title={`${nice} sandbox — no OAuth keys configured`}>
          With real provider keys in the environment this step is {nice}&rsquo;s own consent screen.
          Until then, this sandbox completes the identical flow.
        </Banner>
      </div>

      <form action={oauthComplete} className="vh-card" style={{ display: "grid", gap: 14 }}>
        <input type="hidden" name="provider" value={provider} />
        <h1 style={{ fontSize: "1.15rem", margin: 0 }}>Continue with {nice}</h1>
        <div className="vh-field">
          <label className="vh-label" htmlFor="ox-name">Name</label>
          <input className="vh-input" id="ox-name" name="name" defaultValue="Asha Verma" maxLength={40} required />
        </div>
        <div className="vh-field">
          <label className="vh-label" htmlFor="ox-email">{nice} account email</label>
          <input className="vh-input" id="ox-email" name="email" type="email" defaultValue={demoEmail} required />
          {err === "email" && <span className="vh-help" style={{ color: "var(--vh-danger)" }}>That email doesn&rsquo;t look right.</span>}
        </div>
        <div className="vh-field">
          <label className="vh-label" htmlFor="ox-role">Continue as</label>
          <select className="vh-select" id="ox-role" name="role" defaultValue={role}>
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
          </select>
          <span className="vh-help">Admins can&rsquo;t sign in through social providers — passkeys only.</span>
        </div>
        <button className="vh-btn vh-btn-primary vh-btn-lg" type="submit">Authorise & continue</button>
        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          <Link href="/signin">Back to all sign-in options</Link>
        </p>
      </form>
    </div>
  );
}
