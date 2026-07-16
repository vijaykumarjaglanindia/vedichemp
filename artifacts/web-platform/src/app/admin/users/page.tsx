/**
 * VEDIC HEMP — USER MANAGEMENT (A6 maker–checker, A3 append-only)
 *
 * Buyer/account administration. The console never renders a full identifier —
 * emails and phones are masked, and there is no PAN, bank account or password
 * hash on this screen (CLAUDE.md §4). Anything more sensitive than "masked
 * contact" requires the SensitiveViewer reason flow (A4) and is logged.
 *
 * Suspend and reinstate are MAKER–CHECKER: one admin raises the request here,
 * a DIFFERENT admin approves it from the inbox below (A6). Restrict/lift is
 * single-admin. Every status change and every impersonation is on an
 * append-only ledger.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  Search, ShieldAlert, Ban, RotateCcw, Eye, UserCog, Fingerprint, LockKeyhole, Inbox, History,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, Banner } from "@/components/ui";
import { getSession } from "@/lib/auth-lite";
import { applyUserAction, decidePendingUserAction } from "../actions";
import { listAccounts, findAccount, pendingActions, openRequestFor, impersonationLog, statusHistory } from "@/lib/users";

export const metadata: Metadata = { title: "Users · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;
const IB = { size: 14, strokeWidth: 2.2 } as const; // button-size icon

const OP_LABELS: Record<string, string> = {
  restrict: "Restrict account",
  unrestrict: "Lift restriction",
  suspend: "Request suspension",
  reinstate: "Request reinstatement",
  impersonate: "Impersonate (read-only)",
};

const DONE_MSG: Record<string, string> = {
  restrict: "Restriction applied with your reason on the audit trail. It takes effect on the user's next request.",
  unrestrict: "Restriction lifted, with your reason on the audit trail.",
  "suspend-requested": "Suspension requested. It does NOT take effect yet — a second admin must approve it from the maker–checker inbox below (A6).",
  "reinstate-requested": "Reinstatement requested. A second admin must approve it from the inbox below (A6).",
  suspended: "Suspension approved by you as checker and applied. The maker and checker are both on the audit trail.",
  reinstated: "Reinstatement approved by you as checker and applied.",
  rejected: "Request rejected. No change was made to the account; the rejection is logged.",
  impersonate: "A read-only impersonation session was issued. It is logged with your reason, and the buyer is notified (A4).",
};

const ERR_MSG: Record<string, string> = {
  reason: "A reason of at least 20 characters is required — the attempt was rejected and logged.",
  maker: "You raised this request — a different admin must approve it (A6). The self-approval was refused and logged.",
  state: "That action doesn't apply to the account's current state.",
  duplicate: "There is already an open request for this account. Clear it from the inbox first.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; act?: string; u?: string; done?: string; err?: string }>;
}) {
  const { q, act, u, done, err } = await searchParams;
  const me = (await getSession())?.email ?? "unknown-admin";

  const users = await listAccounts(q);
  const pending = await pendingActions();
  const imps = await impersonationLog(8);
  const history = await statusHistory(undefined, 8);

  const opLabel = act ? OP_LABELS[act] : undefined;
  const pendingTarget = act && u && opLabel ? findAccount(u) : undefined;
  // For each account, is there already an open maker–checker request?
  const openByUser = new Map(pending.map((p) => [p.userId, p]));

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
          <form method="GET" className="vh-row" style={{ gap: 8 }}>
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

        {done && DONE_MSG[done] && (
          <Banner severity="ok" title="Done">{DONE_MSG[done]}</Banner>
        )}
        {err && ERR_MSG[err] && !pendingTarget && (
          <Banner severity="danger" title="Not applied">{ERR_MSG[err]}</Banner>
        )}

        {pendingTarget && act && opLabel && (
          <div id="act-form" style={{ scrollMarginTop: 90 }}>
            <Card title={`${opLabel} · ${pendingTarget.handle}`}>
              {err && ERR_MSG[err] && (
                <div style={{ marginBottom: 12 }}>
                  <Banner severity="danger">{ERR_MSG[err]}</Banner>
                </div>
              )}
              {(act === "suspend" || act === "reinstate") && (
                <div style={{ marginBottom: 12 }}>
                  <Banner severity="info">
                    This raises a request only. A second admin — not you — approves it from the maker–checker inbox (A6).
                  </Banner>
                </div>
              )}
              <form action={applyUserAction} className="vh-grid" style={{ gap: 10, maxWidth: 560 }}>
                <input type="hidden" name="userId" value={pendingTarget.id} />
                <input type="hidden" name="op" value={act} />
                <div className="vh-field">
                  <label className="vh-label" htmlFor="ua-reason">Reason <span className="req">*</span></label>
                  {/* Server-validated (≥20 chars). No client minLength, so a tampered submit still fails closed and is logged. */}
                  <textarea className="vh-textarea" id="ua-reason" name="reason" rows={2} maxLength={500} required placeholder="Why? Written to the audit trail — succeeded or denied (min 20 characters)." />
                </div>
                <div className="vh-row" style={{ gap: 8 }}>
                  <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Confirm {(opLabel ?? "").toLowerCase()}</button>
                  <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/users">Cancel</Link>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Maker–checker inbox (A6) — a DIFFERENT admin approves each request */}
        <div id="inbox" style={{ scrollMarginTop: 90 }}>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Inbox {...I} aria-hidden /> Maker–checker inbox · suspend / reinstate (A6)</span>}>
            {pending.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>No open requests. A suspend or reinstate raised above lands here for a second admin to approve.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {pending.map((p) => {
                  const isMaker = p.maker === me;
                  return (
                    <div key={p.id} className="vh-card" style={{ padding: 14 }}>
                      <div className="vh-row-between" style={{ flexWrap: "wrap", gap: 8 }}>
                        <span>
                          <div style={{ fontWeight: 600 }}>
                            {p.kind === "SUSPEND" ? "Suspend" : "Reinstate"} · {p.handle}
                          </div>
                          <div className="small muted">Raised by <span className="mono">{p.maker}</span> · {p.requestedAt}</div>
                          <div className="small" style={{ marginTop: 4 }}>{p.reason}</div>
                        </span>
                        <span className="vh-row" style={{ gap: 6, alignItems: "flex-start" }}>
                          {isMaker ? (
                            <StatusPill tone="warn">You raised this — another admin must approve</StatusPill>
                          ) : (
                            <>
                              <form action={decidePendingUserAction}>
                                <input type="hidden" name="pendingId" value={p.id} />
                                <input type="hidden" name="decision" value="approve" />
                                <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Approve as checker</button>
                              </form>
                              <form action={decidePendingUserAction}>
                                <input type="hidden" name="pendingId" value={p.id} />
                                <input type="hidden" name="decision" value="reject" />
                                <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost">Reject</button>
                              </form>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

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
                {users.map((row) => {
                  const open = openByUser.get(row.id);
                  return (
                    <tr key={row.id}>
                      <td className="mono">{row.handle}</td>
                      <td className="small">
                        <div>{row.maskedEmail}</div>
                        <div className="muted">{row.maskedPhone}</div>
                      </td>
                      <td><StatusPill tone={toneForStatus(row.status)}>{row.status}</StatusPill></td>
                      <td>{row.tier}</td>
                      <td style={{ textAlign: "right" }} className="tabular">{row.ordersLifetime}</td>
                      <td>{row.sessions > 0 ? <StatusPill tone="ok">{row.sessions} active</StatusPill> : <span className="muted small">none</span>}</td>
                      <td>
                        {open ? (
                          <StatusPill tone="warn">{open.kind === "SUSPEND" ? "Suspend" : "Reinstate"} pending checker</StatusPill>
                        ) : (
                          <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                            {row.status === "ACTIVE" && (
                              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=restrict&u=${row.id}#act-form`}>
                                <ShieldAlert {...IB} aria-hidden /> Restrict
                              </Link>
                            )}
                            {row.status === "RESTRICTED" && (
                              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=unrestrict&u=${row.id}#act-form`}>
                                <RotateCcw {...IB} aria-hidden /> Lift restriction
                              </Link>
                            )}
                            {row.status !== "SUSPENDED" ? (
                              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=suspend&u=${row.id}#act-form`}>
                                <Ban {...IB} aria-hidden /> Suspend
                              </Link>
                            ) : (
                              <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=reinstate&u=${row.id}#act-form`}>
                                <RotateCcw {...IB} aria-hidden /> Reinstate
                              </Link>
                            )}
                            <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/users?act=impersonate&u=${row.id}#act-form`}>
                              <Eye {...IB} aria-hidden /> Impersonate (read-only)
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><History {...I} aria-hidden /> Recent status changes (append-only)</span>}>
            {history.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>No status changes yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {history.map((e) => (
                  <div key={e.id} className="small vh-row-between" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span><span className="mono">{e.userId}</span> {e.from} → <strong>{e.to}</strong> <span className="muted">({e.via})</span></span>
                    <span className="muted">{e.actor} · {e.at}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Eye {...I} aria-hidden /> Impersonation ledger (read-only, A4)</span>}>
            {imps.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>No impersonation sessions recorded.</p>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {imps.map((e) => (
                  <div key={e.id} className="small vh-row-between" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span><span className="mono">{e.admin}</span> → {e.handle} <StatusPill tone="warn">read-only</StatusPill></span>
                    <span className="muted">{e.buyerNotified ? "buyer notified" : "notice pending"} · {e.at}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><UserCog {...I} aria-hidden /> Suspend / restrict / reinstate</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              A <strong>restrict</strong> (e.g. checkout paused pending a fraud review) is single-admin with a
              reason code. A <strong>suspend</strong> (account-wide lockout) and any <strong>reinstate</strong> from
              suspension are maker–checker — a second admin, not the one who raised it, must approve. Every action,
              including a denied one, is written to the audit log before the response returns.
            </p>
            <StatusPill tone="info">reasonCode required · ≥20 chars · maker ≠ checker</StatusPill>
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
          <Link className="vh-btn vh-btn-sm vh-btn-primary" href="/admin/compliance">Open reveal-PII flow →</Link>
        </Card>
      </div>
    </Shell>
  );
}
