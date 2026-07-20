/**
 * VEDIC HEMP — SYSTEM SETTINGS (§0.4 IA)
 *
 * Tax rules, commission rules (A5), shipping, payment gateways, notification
 * templates, the Roles & Permissions separation-of-duties matrix, audit
 * logs, API keys and feature flags. The governance surfaces here are LIVE:
 * role grants run through the roles service, which refuses an SoD conflict at
 * grant time (src/lib/roles.ts — the same SOD_PAIRS data this page renders),
 * and every platform-flag change is maker–checker (src/lib/flags.ts — a flag
 * never flips without a second, different admin confirming). There is still
 * no control to combine a mutually-exclusive pair — that absence is the point.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck, Percent, ReceiptText, Truck, CreditCard, BellRing, ScrollText, KeyRound, ToggleLeft, UserPlus,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner } from "@/components/ui";
import { API_KEYS } from "../_lib/data";
import { ADMIN_ROLES, SOD_PAIRS, listAdmins } from "@/lib/roles";
import { listFlags, listPendingFlagChanges, flagChangeLog } from "@/lib/flags";
import { grantRoleAction, revokeRoleAction, proposeFlagAction, decideFlagAction } from "./actions";

export const metadata: Metadata = { title: "Settings · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;

const MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  granted: { sev: "ok", text: "Role granted — audited with your reason." },
  revoked: { sev: "ok", text: "Role revoked and audited." },
  reason: { sev: "danger", text: "A role grant needs a justification of at least 20 characters." },
  sod: { sev: "danger", text: "Refused at grant time: that role conflicts with one the account already holds (separation of duties). The refusal is audited." },
  self: { sev: "danger", text: "Refused: you cannot grant a role to yourself — privilege must come from a different admin." },
  held: { sev: "warn", text: "That account already holds the role." },
  role: { sev: "danger", text: "Pick a valid role." },
  target: { sev: "danger", text: "Enter a valid admin email." },
  missing: { sev: "warn", text: "Nothing to change — that role isn't held (or the item no longer exists)." },
  lastowner: { sev: "danger", text: "Refused: the last ADMIN_OWNER cannot be revoked — the organisation can never be ownerless." },
  proposed: { sev: "ok", text: "Change proposed. It applies only after a SECOND admin confirms it (A6)." },
  confirmed: { sev: "ok", text: "Change confirmed by a second admin — the flag has now flipped." },
  rejected: { sev: "ok", text: "Proposal rejected — the flag is unchanged. The decision is logged." },
  maker: { sev: "danger", text: "Refused (A6): the admin who proposed a change cannot also confirm it. A different admin must decide. The attempt is audited." },
  pending: { sev: "warn", text: "That flag already has a pending proposal awaiting a checker." },
};

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ rs?: string; fs?: string; conflict?: string }> }) {
  const { rs, fs, conflict } = await searchParams;
  const admins = await listAdmins();
  const flags = await listFlags();
  const pending = await listPendingFlagChanges();
  const log = await flagChangeLog(6);
  const msg = (rs && MESSAGES[rs]) || (fs && MESSAGES[fs]) || undefined;

  return (
    <Shell active="/admin/settings" breadcrumb={["Admin", "Settings"]} title="System settings">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Banner severity="danger" title="No superadmin">
          There is no <code>PLATFORM_OWNER</code>-can-do-everything role. <code>ADMIN_OWNER</code> can appoint the
          people who read prescriptions, approve money and adjudicate disputes — the roles that do those things can
          never be <em>granted</em> to it, enforced below as SoD pairs by the same grant-time rule as every other
          pair (CLAUDE.md §7). Held roles are also consulted at <em>use</em> time where the deed is most sensitive:
          the prescription reveal derives the viewer&rsquo;s role from what they actually hold, and the audit trail
          is readable only by the auditor/security roles.
        </Banner>

        {msg && <Banner severity={msg.sev}>{msg.text}{rs === "sod" && conflict ? <> Conflicting role held: <code>{conflict}</code>.</> : null}</Banner>}

        <div id="roles" style={{ scrollMarginTop: 90 }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck {...I} aria-hidden /> Roles & permissions — separation of duties</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            These role pairs are mutually exclusive on a single account: granting one is <strong>refused at grant
            time by the roles service</strong> while the other is held — the matrix below is the same data the
            service enforces, so this table and the rule can never drift apart.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Role A</th><th>Cannot also hold</th><th>Why</th></tr></thead>
              <tbody>
                {SOD_PAIRS.map((p) => (
                  <tr key={`${p.a}-${p.b}`}>
                    <td className="mono small">{p.a}</td>
                    <td className="mono small">{p.b}</td>
                    <td className="small">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="small" style={{ margin: "var(--sp-4) 0 8px", fontWeight: 700 }}>Admin accounts &amp; held roles</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table" data-testid="admin-roles">
              <thead><tr><th>Admin</th><th>Roles</th><th></th></tr></thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.email}>
                    <td className="mono small" style={{ verticalAlign: "top" }}>{a.email}</td>
                    <td>
                      <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
                        {a.roles.map((r) => <StatusPill key={r} tone={r === "ADMIN_OWNER" ? "info" : "neutral"}>{r}</StatusPill>)}
                      </span>
                    </td>
                    <td style={{ verticalAlign: "top", textAlign: "right" }}>
                      {a.roles.map((r) => (
                        <form key={r} action={revokeRoleAction} style={{ display: "inline-block", marginLeft: 6 }}>
                          <input type="hidden" name="target" value={a.email} />
                          <input type="hidden" name="role" value={r} />
                          <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" title={`Revoke ${r}`}>Revoke {r.replace("ADMIN_", "")}</button>
                        </form>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="small" style={{ margin: "var(--sp-4) 0 8px", fontWeight: 700 }}><UserPlus size={14} strokeWidth={2.2} aria-hidden style={{ verticalAlign: "-2px" }} /> Grant a role</h3>
          <form action={grantRoleAction} className="vh-grid" style={{ gap: 12, maxWidth: 720 }}>
            <div className="vh-grid cols-2" style={{ gap: 12 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="rg-target">Admin email <span className="req">*</span></label>
                <input className="vh-input mono" id="rg-target" name="target" required placeholder="ops.mehta@vedichemp.in" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="rg-role">Role</label>
                <select className="vh-select" id="rg-role" name="role" defaultValue="ADMIN_SUPPORT">
                  {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="rg-reason">Justification (≥ 20 chars, audited) <span className="req">*</span></label>
              <textarea className="vh-input" id="rg-reason" name="reason" rows={2} required minLength={20} placeholder="e.g. New support hire, ticket queue backfill approved by ops lead on 18 Jul." />
            </div>
            <button className="vh-btn vh-btn-primary" type="submit" style={{ width: "fit-content" }}>Grant role</button>
          </form>
          <p className="small muted" style={{ margin: "10px 0 0" }}>
            You cannot grant a role to yourself; an SoD conflict is refused server-side and the refusal is audited.
          </p>
        </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><ReceiptText {...I} aria-hidden /> Tax rules</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>GST slabs by HSN code, TCS/TDS thresholds by seller turnover — computed server-side at checkout, editable here with a change log.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Percent {...I} aria-hidden /> Commission rules (A5)</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              A rate <strong>increase</strong> cannot take effect before 30 days&rsquo; notice elapses —
              <code> CHECK (effectiveFrom &gt;= noticeSentAt + interval &apos;30 days&apos;)</code>, mirrored by the
              server guard on <Link href="/admin/finance/commissions">the schedules page</Link>. A decrease only
              ever benefits the seller and may apply immediately (A5 bars retroactive <em>increases</em>).
            </p>
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Truck {...I} aria-hidden /> Shipping</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Carrier zones, SLA tiers by pincode and compliance class. The platform is prepaid-only — no COD configuration exists, anywhere.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><CreditCard {...I} aria-hidden /> Payments</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Gateway routing, settlement bank accounts (masked here — full account numbers are never returned to this console).</p>
          </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><BellRing {...I} aria-hidden /> Notification templates</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Rx-view buyer notifications, recall notices, and settlement statements are templated here. No template
            in this list is permitted to include health data in its subject line — the §6 guard at the notify()
            boundary redacts and counts any leak, and the outbox makes the stream auditable.
          </p>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/outbox">Open the outbox →</Link>
        </Card>

        <div id="flags" style={{ scrollMarginTop: 90 }}>
        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><ToggleLeft {...I} aria-hidden /> Platform feature flags</span>}
          action={pending.length > 0 ? <StatusPill tone="warn">{pending.length} awaiting checker</StatusPill> : <StatusPill tone="ok">no pending changes</StatusPill>}
          pad0
        >
          <table className="vh-table">
            <thead><tr><th>Flag</th><th>Description</th><th>State</th><th></th></tr></thead>
            <tbody>
              {flags.map((f) => {
                const p = pending.find((x) => x.key === f.key);
                return (
                  <tr key={f.key} data-flag={f.key} data-state={f.on ? "ON" : "OFF"}>
                    <td className="mono small" style={{ fontWeight: 600 }}>{f.key}</td>
                    <td className="small muted">{f.desc}</td>
                    <td><StatusPill tone={f.on ? "ok" : "neutral"}>{f.on ? "ON" : "OFF"}</StatusPill></td>
                    <td style={{ textAlign: "right" }}>
                      {p ? (
                        <span className="vh-row" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <span className="small muted">→ {p.to ? "ON" : "OFF"} by {p.maker}</span>
                          <form action={decideFlagAction} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="decision" value="approve" />
                            <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Confirm</button>
                          </form>
                          <form action={decideFlagAction} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="decision" value="reject" />
                            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Reject</button>
                          </form>
                        </span>
                      ) : (
                        <form action={proposeFlagAction} style={{ display: "inline" }}>
                          <input type="hidden" name="key" value={f.key} />
                          <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Propose {f.on ? "OFF" : "ON"}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="small muted" style={{ padding: "12px 18px 16px", display: "grid", gap: 6 }}>
            <span>
              A flag never flips directly: one admin proposes, a <strong>different</strong> admin confirms (A6). The
              maker confirming their own proposal is refused and the attempt audited.
            </span>
            <span>Feature flags never gate a prohibition (A1–A6) — those are compile-time absences, not runtime toggles.</span>
            {log.length > 0 && (
              <span data-testid="flag-log">
                Recent: {log.map((c) => `${c.key}→${c.to ? "ON" : "OFF"} ${c.approved ? "confirmed" : "rejected"} by ${c.checker}`).join(" · ")}
              </span>
            )}
          </div>
        </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><KeyRound {...I} aria-hidden /> API keys</span>} pad0>
          <table className="vh-table">
            <thead><tr><th>Key</th><th>Scope</th></tr></thead>
            <tbody>
              {API_KEYS.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{k.name}</div>
                    <div className="mono small muted">{k.masked}</div>
                  </td>
                  <td className="mono small">{k.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ margin: 0, padding: "12px 18px 16px" }}>
            Service-account API keys are scoped and rotatable, and are structurally barred from being a maker or
            checker on any money-moving action (A6). Full key material is shown once at creation, never again.
          </p>
        </Card>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><ScrollText {...I} aria-hidden /> Audit logs</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            The audit trail is readable only by <code>ADMIN_AUDITOR</code> and <code>ADMIN_SECURITY</code> —
            enforced on the page itself against held roles, not just described here; other accounts get a
            restricted notice with the next step. The table is append-only for everyone (A3).
          </p>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/audit">Open the audit trail →</Link>
        </Card>
      </div>
    </Shell>
  );
}
