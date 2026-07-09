/**
 * VEDIC HEMP — USER MANAGEMENT (§3.3-adjacent)
 *
 * Buyer/account administration. The console never renders a full identifier —
 * emails and phones are masked, and there is no PAN, bank account or password
 * hash on this screen (CLAUDE.md §4). Anything more sensitive than "masked
 * contact" requires the SensitiveViewer reason flow (A4) and is logged.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, Banner } from "@/components/ui";

export const metadata: Metadata = { title: "Users · Admin" };

interface SampleUser {
  id: string; handle: string; maskedEmail: string; maskedPhone: string;
  status: string; tier: string; ordersLifetime: number; joinedAt: string; sessions: number;
}

const USERS: SampleUser[] = [
  { id: "u1", handle: "ananya.s", maskedEmail: "an***@gmail.com", maskedPhone: "+91 9•••••234", status: "ACTIVE", tier: "Leaf", ordersLifetime: 14, joinedAt: "2025-02-11", sessions: 2 },
  { id: "u2", handle: "rakesh.p", maskedEmail: "ra***@yahoo.com", maskedPhone: "+91 8•••••901", status: "ACTIVE", tier: "Sprout", ordersLifetime: 3, joinedAt: "2025-11-02", sessions: 1 },
  { id: "u3", handle: "meera.k", maskedEmail: "me***@outlook.com", maskedPhone: "+91 7•••••556", status: "RESTRICTED", tier: "Bloom", ordersLifetime: 41, joinedAt: "2024-06-19", sessions: 0 },
  { id: "u4", handle: "vikram.n", maskedEmail: "vi***@gmail.com", maskedPhone: "+91 9•••••112", status: "SUSPENDED", tier: "Sprout", ordersLifetime: 1, joinedAt: "2026-01-30", sessions: 0 },
];

export default function AdminUsersPage() {
  return (
    <Shell active="/admin/users" breadcrumb={["Admin", "Users"]} title="User management">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Banner severity="info" title="What this screen shows">
          Identifiers are pseudonymised handles and masked contacts. There is no route that returns a full email,
          full phone number, password hash or 2FA secret — that data never leaves the auth service in plaintext form.
        </Banner>

        <Card title="Search users">
          <p className="small muted" style={{ marginTop: 0, marginBottom: 10 }}>
            Search matches a <strong>hashed identifier</strong> (email/phone are HMAC-indexed, not stored searchable
            in plaintext) or an order reference. A raw-text lookup against contact fields is not a route this console
            exposes.
          </p>
          <div className="vh-row">
            <input
              className="vh-btn-ghost"
              placeholder="Search by handle, order reference, or hashed identifier…"
              style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--vh-line)" }}
              disabled
              aria-label="Search users"
            />
            <button className="vh-btn vh-btn-primary" disabled>Search</button>
          </div>
        </Card>

        <Card title="All users" pad0>
          <table className="vh-table">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Contact (masked)</th>
                <th>Status</th>
                <th>Tier</th>
                <th style={{ textAlign: "right" }}>Orders</th>
                <th>Sessions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.handle}</td>
                  <td className="small">
                    <div>{u.maskedEmail}</div>
                    <div className="muted">{u.maskedPhone}</div>
                  </td>
                  <td><StatusPill tone={toneForStatus(u.status)}>{u.status}</StatusPill></td>
                  <td>{u.tier}</td>
                  <td style={{ textAlign: "right" }}>{u.ordersLifetime}</td>
                  <td>{u.sessions > 0 ? <StatusPill tone="ok">{u.sessions} active</StatusPill> : <span className="muted small">none</span>}</td>
                  <td>
                    <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {u.status !== "SUSPENDED" ? (
                        <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users#${u.id}-restrict`}>Restrict</a>
                      ) : (
                        <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users#${u.id}-reinstate`}>Reinstate</a>
                      )}
                      <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users#${u.id}-suspend`}>Suspend</a>
                      <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users#${u.id}-impersonate`}>Impersonate (read-only)</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="vh-grid cols-2">
          <Card title="Suspend / restrict / reinstate">
            <p className="small muted" style={{ marginTop: 0 }}>
              A <strong>restrict</strong> (e.g. checkout paused pending a fraud review) is single-admin with a
              reason code. A <strong>suspend</strong> (account-wide lockout) and any <strong>reinstate</strong> from
              suspension are maker–checker — a second admin, not the one who suspended, must approve the reversal.
              Every action, including a denied one, is written to the audit log before the response returns.
            </p>
            <StatusPill tone="info">reasonCode required · ≥20 chars for suspend</StatusPill>
          </Card>
          <Card title="Impersonation">
            <p className="small muted" style={{ marginTop: 0 }}>
              Support impersonation is <strong>read-only</strong>. Starting a session shows the buyer the fixed red
              banner ("Support session — every action is logged and attributed to …") on every screen, and write
              actions are disabled at the API, not just hidden in the UI.
            </p>
            <StatusPill tone="warn">Write actions disabled during impersonation</StatusPill>
          </Card>
        </div>

        <Card title="Reveal personal data">
          <p className="small muted" style={{ marginTop: 0 }}>
            Full contact details, addresses and payment instrument fingerprints are behind the same reason-code flow
            as health data (A4-adjacent): choose a controlled reason, write ≥20 characters of justification, and the
            subject is notified. There is no "reveal" button that returns data without that flow — clicking below
            opens the reason prompt, it does not fetch anything itself.
          </p>
          <a className="vh-btn vh-btn-sm vh-btn-primary" href="/admin/compliance">Open reveal-PII flow →</a>
        </Card>
      </div>
    </Shell>
  );
}
