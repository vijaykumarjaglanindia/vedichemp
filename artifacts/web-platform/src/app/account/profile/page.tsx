/**
 * VEDIC HEMP — PROFILE (§1.2)
 *
 * Four sections rendered as anchored panels (Personal, Security, Preferences,
 * Privacy). Sensitive changes (email, mobile, DOB-adjacent identity fields)
 * require step-up auth server-side — this page only surfaces that requirement,
 * it never performs the check itself. DOB is write-once: it backs the age gate
 * and cannot be reset from this screen.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Download, Fingerprint, KeyRound, ShieldCheck, Sliders, Smartphone,
  Trash2, UserRound,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner } from "@/components/ui";
import { currentBuyer } from "@/lib/session";

export const metadata: Metadata = { title: "Profile" };

const I = { size: 16, strokeWidth: 2.2 } as const;

function title(icon: ReactNode, text: string, id: string) {
  return (
    <span className="vh-row" style={{ gap: 8 }} id={id}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {text}
    </span>
  );
}

/** VerifiedChip pattern: label row with an ok StatusPill beside the field label. */
function FieldLabel({ text, verified }: { text: string; verified?: boolean }) {
  return (
    <span className="vh-label vh-row" style={{ gap: 8 }}>
      {text}
      {verified && <StatusPill tone="ok">Verified</StatusPill>}
    </span>
  );
}

const SESSIONS = [
  { id: "se1", device: "Chrome · Windows", location: "Bengaluru, IN", lastActive: "Active now", current: true },
  { id: "se2", device: "Vedic Hemp App · Android", location: "Bengaluru, IN", lastActive: "2 days ago", current: false },
];

const CONSENTS = [
  { key: "essential", label: "Essential (checkout, security, fraud prevention)", locked: true, on: true },
  { key: "analytics", label: "Product analytics", locked: false, on: true },
  { key: "personalisation", label: "Personalised recommendations & offers", locked: false, on: true },
  { key: "marketing", label: "Marketing emails & SMS", locked: false, on: false },
];

const SECTIONS = [
  { id: "personal", label: "Personal" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
  { id: "privacy", label: "Privacy" },
];

export default function ProfilePage() {
  const viewer = currentBuyer();

  return (
    <Shell active="/account/profile" breadcrumb={["My Account", "Profile"]} title="Profile">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* Anchor sub-nav */}
        <nav className="vh-seg" aria-label="Profile sections" style={{ alignSelf: "start" }}>
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className={i === 0 ? "on" : undefined}>
              {s.label}
            </a>
          ))}
        </nav>

        {/* Personal */}
        <Card title={title(<UserRound {...I} />, "Personal details", "personal")}>
          <div className="vh-grid cols-2">
            <div className="vh-field">
              <label className="vh-label" htmlFor="pf-name">Full name</label>
              <input className="vh-input" id="pf-name" defaultValue={`${viewer.firstName} Sharma`} readOnly />
            </div>
            <div className="vh-field">
              <FieldLabel text="Mobile number" verified />
              <input className="vh-input" id="pf-mobile" aria-label="Mobile number" defaultValue="+91 98••••••21" readOnly />
              <span className="vh-help">Changing this re-prompts for OTP or passkey (step-up auth).</span>
            </div>
            <div className="vh-field">
              <FieldLabel text="Email" verified />
              <input className="vh-input" id="pf-email" aria-label="Email" defaultValue="ananya••@example.com" readOnly />
              <span className="vh-help">Changing this re-prompts for OTP or passkey (step-up auth).</span>
            </div>
            <div className="vh-field">
              <span className="vh-label vh-row" style={{ gap: 8 }}>
                Date of birth
                <StatusPill tone="neutral">Write-once</StatusPill>
              </span>
              <input className="vh-input" id="pf-dob" aria-label="Date of birth" defaultValue="14 Mar 1994" readOnly />
              <span className="vh-help">
                Set once at signup and never editable — it backs the age gate for CBD Wellness and Medical
                Cannabis products (18+) and cannot be reset from this screen.
              </span>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card title={title(<ShieldCheck {...I} />, "Security", "security")}>
          <div className="vh-grid cols-3" style={{ marginBottom: 16 }}>
            <div className="vh-card" style={{ padding: 16 }}>
              <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)", marginBottom: 8 }}>
                <KeyRound size={18} strokeWidth={2.2} />
              </span>
              <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>Password</div>
              <p className="small muted" style={{ margin: "0 0 8px" }}>Last changed 4 months ago.</p>
              <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Change password</span>
            </div>
            <div className="vh-card" style={{ padding: 16 }}>
              <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)", marginBottom: 8 }}>
                <Fingerprint size={18} strokeWidth={2.2} />
              </span>
              <div className="small vh-row" style={{ fontWeight: 700, marginBottom: 4, gap: 8 }}>
                Passkey <StatusPill tone="warn">Not set up</StatusPill>
              </div>
              <p className="small muted" style={{ margin: "0 0 8px" }}>Sign in with your device — phishing-resistant.</p>
              <span className="vh-btn vh-btn-sm vh-btn-primary" aria-disabled>Add passkey</span>
            </div>
            <div className="vh-card" style={{ padding: 16 }}>
              <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)", marginBottom: 8 }}>
                <Smartphone size={18} strokeWidth={2.2} />
              </span>
              <div className="small vh-row" style={{ fontWeight: 700, marginBottom: 4, gap: 8 }}>
                Two-factor (SMS OTP) <StatusPill tone="ok">Enabled</StatusPill>
              </div>
              <p className="small muted" style={{ margin: "0 0 8px" }}>Required on sensitive changes.</p>
              <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Manage 2FA</span>
            </div>
          </div>

          <Banner severity="info" title="Step-up authentication" icon="🔐">
            Changing your mobile number, email, or bank/payout details always re-prompts for OTP or
            passkey confirmation, even mid-session.
          </Banner>

          <div style={{ marginTop: 16 }}>
            <div className="small muted" style={{ marginBottom: 8 }}>Active sessions</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {SESSIONS.map((s) => (
                <li key={s.id} className="vh-row-between">
                  <span className="small vh-row" style={{ gap: 8 }}>
                    <Smartphone size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)" }} />
                    {s.device} · {s.location} {s.current && <StatusPill tone="ok">This device</StatusPill>}
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    <span className="small muted">{s.lastActive}</span>
                    {!s.current && <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Sign out</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Preferences */}
        <Card title={title(<Sliders {...I} />, "Preferences", "preferences")}>
          <div className="vh-grid cols-3">
            <div className="vh-field">
              <label className="vh-label" htmlFor="pf-lang">Language</label>
              <select className="vh-select" id="pf-lang" disabled defaultValue="en-IN">
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">हिन्दी</option>
              </select>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="pf-pin">Delivery pincode</label>
              <input className="vh-input" id="pf-pin" defaultValue="560034" readOnly />
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="pf-tier">Membership tier</label>
              <input className="vh-input" id="pf-tier" defaultValue={viewer.membershipTier} readOnly />
              <span className="vh-help">Tier is computed by the server from your order history.</span>
            </div>
          </div>
        </Card>

        {/* Privacy */}
        <Card title={title(<ShieldCheck {...I} />, "Privacy & consent", "privacy")} pad0>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Consent</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Control</th>
                </tr>
              </thead>
              <tbody>
                {CONSENTS.map((c) => (
                  <tr key={c.key}>
                    <td className="small">{c.label}</td>
                    <td><StatusPill tone={c.on ? "ok" : "neutral"}>{c.on ? "On" : "Off"}</StatusPill></td>
                    <td style={{ textAlign: "right" }}>
                      {c.locked ? (
                        <span className="small muted">Required — cannot be turned off</span>
                      ) : (
                        <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Toggle</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <p className="small muted" style={{ margin: "0 0 8px" }}>
              Every consent change is recorded in an append-only ledger with a timestamp — you can request
              the full history with your data export.
            </p>
            <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>
              <span className="vh-row" style={{ gap: 6 }}>
                <Download size={14} strokeWidth={2.2} aria-hidden />Download my data
              </span>
            </span>
          </div>
        </Card>

        {/* Danger zone */}
        <Card title={title(<Trash2 {...I} />, "Delete account", "delete")}>
          <Banner severity="warn" title="Account deletion is high-friction, by design" icon="⚠️">
            Deletion is blocked while any of the following are true: an order is in transit, a return or
            dispute is open, a settlement involving you is unresolved, or a regulatory hold (e.g. an
            active audit trail reference) applies. Health data (prescriptions, access logs) is retained
            per the statutory record-keeping period even after deletion is otherwise approved (A3).
          </Banner>
          <div style={{ marginTop: 16 }}>
            <span className="vh-btn vh-btn-sm vh-btn-danger" aria-disabled>
              <span className="vh-row" style={{ gap: 6 }}>
                <Trash2 size={14} strokeWidth={2.2} aria-hidden />Delete account
              </span>
            </span>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
