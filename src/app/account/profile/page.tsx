/**
 * VEDIC HEMP — PROFILE (§1.2)
 *
 * Four sections rendered as anchored panels (Personal, Security, Preferences,
 * Privacy). Sensitive changes (email, mobile, DOB-adjacent identity fields)
 * require step-up auth server-side — this page only surfaces that requirement,
 * it never performs the check itself.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner } from "@/components/ui";
import { currentBuyer } from "@/lib/session";

export const metadata: Metadata = { title: "Profile" };

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

export default function ProfilePage() {
  const viewer = currentBuyer();

  return (
    <Shell active="/account/profile" breadcrumb={["My Account", "Profile"]} title="Profile">
      <div className="vh-grid" style={{ gap: 18 }}>
        <nav className="vh-row" style={{ gap: 8, flexWrap: "wrap" }} aria-label="Profile sections">
          {["Personal", "Security", "Preferences", "Privacy"].map((s) => (
            <a key={s} href={`#${s.toLowerCase()}`} className="vh-pill vh-pill-neutral">{s}</a>
          ))}
        </nav>

        {/* Personal */}
        <Card title={<span id="personal">Personal details</span>}>
          <div className="vh-grid cols-2">
            <div>
              <div className="small muted">Full name</div>
              <div>{viewer.firstName} Sharma</div>
            </div>
            <div>
              <div className="small muted">Mobile number</div>
              <div className="vh-row" style={{ gap: 8 }}>
                +91 98••••••21 <StatusPill tone="ok">Verified</StatusPill>
              </div>
            </div>
            <div>
              <div className="small muted">Email</div>
              <div className="vh-row" style={{ gap: 8 }}>
                ananya••@example.com <StatusPill tone="ok">Verified</StatusPill>
              </div>
            </div>
            <div>
              <div className="small muted">Date of birth</div>
              <div className="vh-row" style={{ gap: 8 }}>
                14 Mar 1994 <StatusPill tone="neutral">Write-once — set at signup</StatusPill>
              </div>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Date of birth cannot be edited after it is first set — it backs the age gate for CBD Wellness
            and Medical Cannabis products (18+) and cannot be reset from this screen.
          </p>
        </Card>

        {/* Security */}
        <Card title={<span id="security">Security</span>}>
          <div className="vh-row-between" style={{ marginBottom: 10 }}>
            <span className="small">Two-factor authentication (SMS OTP)</span>
            <StatusPill tone="ok">Enabled</StatusPill>
          </div>
          <Banner severity="info" title="Step-up authentication" icon="🔐">
            Changing your mobile number, email, or bank/payout details always re-prompts for OTP or
            passkey confirmation, even mid-session.
          </Banner>
          <div style={{ marginTop: 14 }}>
            <div className="small muted" style={{ marginBottom: 8 }}>Active sessions</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {SESSIONS.map((s) => (
                <li key={s.id} className="vh-row-between">
                  <span className="small">
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
        <Card title={<span id="preferences">Preferences</span>}>
          <div className="vh-grid cols-3">
            <div>
              <div className="small muted">Language</div>
              <div>English (India)</div>
            </div>
            <div>
              <div className="small muted">Delivery pincode</div>
              <div>560034</div>
            </div>
            <div>
              <div className="small muted">Membership tier</div>
              <div>{viewer.membershipTier}</div>
            </div>
          </div>
        </Card>

        {/* Privacy */}
        <Card title={<span id="privacy">Privacy & consent</span>}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {CONSENTS.map((c) => (
              <li key={c.key} className="vh-row-between">
                <span className="small">{c.label}</span>
                <span className="vh-row" style={{ gap: 8 }}>
                  <StatusPill tone={c.on ? "ok" : "neutral"}>{c.on ? "On" : "Off"}</StatusPill>
                  {c.locked ? (
                    <span className="small muted">Required</span>
                  ) : (
                    <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Toggle</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="vh-row" style={{ gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Download my data</span>
            <span className="vh-btn vh-btn-sm vh-btn-danger" aria-disabled>Delete account</span>
          </div>
          <Banner severity="warn" title="Account deletion is high-friction, by design" icon="⚠️">
            Deletion is blocked while any of the following are true: an order is in transit, a return or
            dispute is open, a settlement involving you is unresolved, or a regulatory hold (e.g. an
            active audit trail reference) applies. Health data (prescriptions, access logs) is retained
            per the statutory record-keeping period even after deletion is otherwise approved (A3).
          </Banner>
        </Card>
      </div>
    </Shell>
  );
}
