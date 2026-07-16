/**
 * VEDIC HEMP — STAFF & ROLES (seller)
 *
 * The owner invites staff and gives each a role. Roles map to permissions, and
 * the SERVER enforces them — a staffer without a permission cannot run the
 * matching action even by crafted form data. "Act as" switches the acting
 * member so the gates can be seen working; production is simply the staff login.
 */

import type { Metadata } from "next";
import { Users, UserPlus, ShieldCheck, UserCog } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { ROLE_DEFS, currentStaff, listStaff, permissionsFor } from "@/lib/staff";
import { inviteStaffMember, changeStaffRole, setStaffMemberStatus, removeStaffMember, actAsStaff } from "../actions";

export const metadata: Metadata = { title: "Staff & roles" };
export const dynamic = "force-dynamic";

const STAFF_ROLE_OPTIONS = ROLE_DEFS.filter((r) => r.role !== "OWNER");

const MESSAGES: Record<string, { sev: "ok" | "danger" | "warn"; text: string }> = {
  invited: { sev: "ok", text: "Invite sent. The member can sign in with the email you entered; their role is enforced from day one." },
  role: { sev: "ok", text: "Role updated — the new permissions apply immediately." },
  status: { sev: "ok", text: "Member updated." },
  removed: { sev: "ok", text: "Member removed. Their access ends immediately." },
  actas: { sev: "ok", text: "Now acting as the selected member — try a restricted action to see the permission gate." },
  name: { sev: "danger", text: "Enter the person's name." },
  email: { sev: "danger", text: "Enter a valid email address." },
  role_err: { sev: "danger", text: "Pick a role." },
  dupe: { sev: "danger", text: "Someone with that email is already on the team." },
  owner: { sev: "danger", text: "The owner role can't be reassigned or removed." },
};

function roleLabel(role: string): string {
  return ROLE_DEFS.find((r) => r.role === role)?.label ?? role;
}

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string; denied?: string }> }) {
  const { done, err, denied } = await searchParams;
  const team = await listStaff();
  const me = await currentStaff();
  const canManage = permissionsFor(me.role).has("staff");
  const msg = (done && MESSAGES[done]) || (err && (MESSAGES[err] ?? MESSAGES[`${err}_err`])) || undefined;

  return (
    <Shell active="/seller/staff" breadcrumb={["Seller Central", "Staff & roles"]} title="Staff & roles"
      actions={<StatusPill tone={me.role === "OWNER" ? "ok" : "info"}>Acting as {me.name} · {roleLabel(me.role)}</StatusPill>}
    >
      {denied && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="You don't have permission for that">
            The member you&rsquo;re acting as ({roleLabel(me.role)}) can&rsquo;t do <strong>{denied}</strong> actions. The
            server blocked it and logged the attempt. Switch back to the owner, or give this role that permission.
          </Banner>
        </div>
      )}
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      {me.role !== "OWNER" && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <div className="vh-row-between" style={{ gap: 12, flexWrap: "wrap", border: "1px solid var(--vh-line)", borderLeft: "3px solid var(--vh-accent)", borderRadius: "var(--vh-radius-sm)", padding: "10px 14px", background: "var(--vh-green-50)" }}>
            <span className="small"><strong>Acting as {me.name}</strong> — you only see what a {roleLabel(me.role)} can do.</span>
            <form action={actAsStaff}><input type="hidden" name="staffId" value="owner" /><button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Return to owner</button></form>
          </div>
        </div>
      )}

      {/* Team list */}
      <Card title={<span className="vh-row" style={{ gap: 8 }}><Users size={16} strokeWidth={2.2} aria-hidden /> Your team</span>} action={<span className="small muted">{team.length} member{team.length === 1 ? "" : "s"}</span>} pad0>
        <div style={{ overflowX: "auto" }}>
          <table className="vh-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Member</th>
                <th style={{ textAlign: "left" }}>Role</th>
                <th style={{ textAlign: "left" }}>Can do</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const perms = [...permissionsFor(m.role)].filter((p) => p !== "staff");
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{m.name}{m.id === me.id ? " (acting)" : ""}</div>
                      <div className="small muted">{m.email}</div>
                    </td>
                    <td>
                      {m.role === "OWNER" || !canManage ? (
                        <StatusPill tone="neutral">{roleLabel(m.role)}</StatusPill>
                      ) : (
                        <form action={changeStaffRole} className="vh-row" style={{ gap: 6 }}>
                          <input type="hidden" name="staffId" value={m.id} />
                          <select className="vh-select vh-select-sm" name="role" defaultValue={m.role} aria-label={`Role for ${m.name}`}>
                            {STAFF_ROLE_OPTIONS.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                          </select>
                          <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Save</button>
                        </form>
                      )}
                    </td>
                    <td className="small muted" style={{ maxWidth: 220 }}>{m.role === "OWNER" ? "Everything" : perms.join(", ") || "—"}</td>
                    <td><StatusPill tone={m.status === "ACTIVE" ? "ok" : m.status === "INVITED" ? "info" : "warn"}>{m.status}</StatusPill></td>
                    <td style={{ textAlign: "right" }}>
                      {m.role !== "OWNER" && canManage && (
                        <span className="vh-row" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {m.status === "ACTIVE" && (
                            <form action={actAsStaff}><input type="hidden" name="staffId" value={m.id} /><button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" title="See the console as this member"><UserCog size={13} aria-hidden /> Act as</button></form>
                          )}
                          <form action={setStaffMemberStatus}>
                            <input type="hidden" name="staffId" value={m.id} />
                            <input type="hidden" name="status" value={m.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"} />
                            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">{m.status === "SUSPENDED" ? "Reactivate" : "Suspend"}</button>
                          </form>
                          <form action={removeStaffMember}><input type="hidden" name="staffId" value={m.id} /><button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Remove</button></form>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite */}
      {canManage && (
        <div style={{ marginTop: "var(--sp-4)" }}>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><UserPlus size={16} strokeWidth={2.2} aria-hidden /> Invite a team member</span>}>
            <form action={inviteStaffMember} className="vh-grid cols-4" style={{ gap: 16, alignItems: "flex-end" }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="st-name">Name <span className="req">*</span></label>
                <input className="vh-input" id="st-name" name="name" required placeholder="e.g. Neha Sharma" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="st-email">Email <span className="req">*</span></label>
                <input className="vh-input" id="st-email" name="email" type="email" required placeholder="neha@store.in" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="st-role">Role <span className="req">*</span></label>
                <select className="vh-select" id="st-role" name="role" defaultValue="ORDERS">
                  {STAFF_ROLE_OPTIONS.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                </select>
              </div>
              <button className="vh-btn vh-btn-primary" type="submit">Send invite</button>
            </form>
          </Card>
        </div>
      )}

      {/* Role reference */}
      <div style={{ marginTop: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck size={16} strokeWidth={2.2} aria-hidden /> What each role can do</span>}>
          <div className="vh-grid cols-2" style={{ gap: 12 }}>
            {ROLE_DEFS.map((r) => (
              <div key={r.role} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: "10px 12px" }}>
                <div style={{ fontWeight: 700 }}>{r.label}</div>
                <div className="small muted">{r.blurb}</div>
              </div>
            ))}
          </div>
          {team.length === 0 && <EmptyState icon="👥" headline="No team yet" sub="Invite your first team member above." />}
        </Card>
      </div>
    </Shell>
  );
}
