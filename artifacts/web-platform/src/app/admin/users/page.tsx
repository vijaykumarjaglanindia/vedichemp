/**
 * VEDIC HEMP — USER MANAGEMENT (§3.3-adjacent)
 *
 * Buyer/account administration. The console never renders a full identifier —
 * emails and phones are masked, and there is no PAN, bank account or password
 * hash on this screen (CLAUDE.md §4). Anything more sensitive than "masked
 * contact" requires the SensitiveViewer reason flow (A4) and is logged.
 */

import type { Metadata } from "next";
import {
  Search, ShieldAlert, Ban, RotateCcw, Eye, UserCog, Fingerprint, LockKeyhole,
} from "lucide-react";
import { cookies } from "next/headers";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, Banner } from "@/components/ui";
import { applyUserAction } from "../actions";

export const metadata: Metadata = { title: "Users · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const; // button-size icon

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

const OP_LABELS: Record<string, string> = {
  restrict: "Restrict account",
  suspend: "Suspend account",
  reinstate: "Reinstate account",
  impersonate: "Impersonate (read-only)",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; act?: string; u?: string; done?: string; err?: string }>;
}) {
  const { q, act, u, done, err } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const jar = await cookies();
  let overrides: Record<string, string> = {};
  try { overrides = JSON.parse(jar.get("vh-adm-users")?.value ?? "{}") as Record<string, string>; } catch { overrides = {}; }

  const users = USERS
    .map((x) => ({ ...x, status: overrides[x.id] ?? x.status }))
    .filter((x) => (query ? x.handle.toLowerCase().includes(query) : true));
  const opLabel = act ? OP_LABELS[act] : undefined;
  const pendingTarget = act && u && opLabel ? USERS.find((x) => x.id === u) : undefined;

  return (
    <Shell active="/admin/users" breadcrumb={["Admin", "Users"]} title="User management">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Banner severity="info" title="What this screen shows">
          Identifiers are pseudonymised handles and masked contacts. There is no route that returns a full email,
          full phone number, password hash or 2FA secret — that data never leaves the auth service in plaintext form.
        </Banner>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><Fingerprint {...I} aria-hidden /> Search users</span>}>
          <p className="small muted" style={{ marginTop: 0, marginBottom: "var(--sp-2)" }}>
            Search matches a <strong>hashed identifier</strong> (email/phone are HMAC-indexed, not stored searchable
            in plaintext) or an order reference. A raw-text lookup against contact fields is not a route this console
            exposes.
          </p>
          <form method="GET" action="/admin/users" className="vh-row" style={{ gap: 8 }}>
            <input
              className="vh-input"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by handle, order reference, or hashed identifier…"
              style={{ flex: 1 }}
              aria-label="Search users by handle, order reference, or hashed identifier"
            />
            <button className="vh-btn vh-btn-primary" type="submit">
              <Search {...IB} aria-hidden /> Search
            </button>
          </form>
        </Card>

        {done && OP_LABELS[done] && (
          <Banner severity="ok" title={`${OP_LABELS[done]} — done`}>
            {done === "impersonate"
              ? "A read-only impersonation session was issued. The access is logged with your reason, and the buyer is notified (A4)."
              : "Applied with your reason on the audit trail. The change takes effect on the user's next request."}
          </Banner>
        )}

        {pendingTarget && act && opLabel && (
          <div id="act-form" style={{ scrollMarginTop: 90 }}>
            <Card title={`${opLabel} · ${pendingTarget.handle}`}>
              {err === "reason" && (
                <div style={{ marginBottom: 12 }}>
                  <Banner severity="danger">A reason of at least 20 characters is required — the attempt was rejected and logged.</Banner>
                </div>
              )}
              <form action={applyUserAction} className="vh-grid" style={{ gap: 10, maxWidth: 560 }}>
                <input type="hidden" name="userId" value={pendingTarget.id} />
                <input type="hidden" name="op" value={act} />
                <div className="vh-field">
                  <label className="vh-label" htmlFor="ua-reason">Reason <span className="req">*</span></label>
                  <textarea className="vh-textarea" id="ua-reason" name="reason" rows={2} minLength={20} maxLength={500} required placeholder="Why? Written to the audit trail — succeeded or denied (min 20 characters)." />
                </div>
                <div className="vh-row" style={{ gap: 8 }}>
                  <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Confirm {(opLabel ?? "").toLowerCase()}</button>
                  <a className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/users">Cancel</a>
                </div>
              </form>
            </Card>
          </div>
        )}

        <Card title="All users" pad0>
          <div style={{ overflowX: "auto" }}>
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
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="mono">{u.handle}</td>
                    <td className="small">
                      <div>{u.maskedEmail}</div>
                      <div className="muted">{u.maskedPhone}</div>
                    </td>
                    <td><StatusPill tone={toneForStatus(u.status)}>{u.status}</StatusPill></td>
                    <td>{u.tier}</td>
                    <td style={{ textAlign: "right" }} className="tabular">{u.ordersLifetime}</td>
                    <td>{u.sessions > 0 ? <StatusPill tone="ok">{u.sessions} active</StatusPill> : <span className="muted small">none</span>}</td>
                    <td>
                      <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                        {u.status !== "SUSPENDED" ? (
                          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=restrict&u=${u.id}#act-form`}>
                            <ShieldAlert {...IB} aria-hidden /> Restrict
                          </a>
                        ) : (
                          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=reinstate&u=${u.id}#act-form`}>
                            <RotateCcw {...IB} aria-hidden /> Reinstate
                          </a>
                        )}
                        {u.status !== "SUSPENDED" && (
                          <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=suspend&u=${u.id}#act-form`}>
                            <Ban {...IB} aria-hidden /> Suspend
                          </a>
                        )}
                        <a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=impersonate&u=${u.id}#act-form`}>
                          <Eye {...IB} aria-hidden /> Impersonate (read-only)
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><UserCog {...I} aria-hidden /> Suspend / restrict / reinstate</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              A <strong>restrict</strong> (e.g. checkout paused pending a fraud review) is single-admin with a
              reason code. A <strong>suspend</strong> (account-wide lockout) and any <strong>reinstate</strong> from
              suspension are maker–checker — a second admin, not the one who suspended, must approve the reversal.
              Every action, including a denied one, is written to the audit log before the response returns.
            </p>
            <StatusPill tone="info">reasonCode required · ≥20 chars for suspend</StatusPill>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Eye {...I} aria-hidden /> Impersonation</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Support impersonation is <strong>read-only</strong>. Starting a session shows the buyer the fixed red
              banner (&quot;Support session — every action is logged and attributed to …&quot;) on every screen, and write
              actions are disabled at the API, not just hidden in the UI.
            </p>
            <StatusPill tone="warn">Write actions disabled during impersonation</StatusPill>
          </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><LockKeyhole {...I} aria-hidden /> Reveal personal data</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Full contact details, addresses and payment instrument fingerprints are behind the same reason-code flow
            as health data (A4-adjacent): choose a controlled reason, write ≥20 characters of justification, and the
            subject is notified. There is no &quot;reveal&quot; button that returns data without that flow — clicking below
            opens the reason prompt, it does not fetch anything itself.
          </p>
          <a className="vh-btn vh-btn-sm vh-btn-primary" href="/admin/compliance">Open reveal-PII flow →</a>
        </Card>
      </div>
    </Shell>
  );
}
