"use server";

/**
 * VEDIC HEMP — SYSTEM SETTINGS ACTIONS (roles + platform flags)
 *
 * Thin handlers over src/lib/roles.ts and src/lib/flags.ts. The gates live in
 * the services; here we validate input, audit synchronously (OK and DENIED —
 * an SoD refusal or a maker-as-checker attempt is exactly what the audit
 * trail exists to record), and redirect with a machine status.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { grantRole, revokeRole } from "@/lib/roles";
import { proposeFlagChange, decideFlagChange } from "@/lib/flags";

async function actor(): Promise<string> {
  return (await getSession())?.email ?? "unknown-admin";
}

export async function grantRoleAction(formData: FormData): Promise<void> {
  const target = String(formData.get("target") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const who = await actor();

  // Granting privilege is high-impact: reasonCode-style justification ≥ 20 chars.
  if (reason.length < 20) {
    await writeAudit({ actor: who, action: "ROLE_GRANT", target: `${role} → ${target}`, outcome: "DENIED", note: "reason under 20 chars" });
    redirect("/admin/settings?rs=reason#roles");
  }
  const result = await grantRole({ target, role, actor: who });
  if (!result.ok) {
    const note =
      result.reason === "sod" ? `SoD: conflicts with held ${result.conflict}`
      : result.reason === "self" ? "self-grant refused: privilege must come from another admin"
      : result.reason;
    await writeAudit({ actor: who, action: "ROLE_GRANT", target: `${role} → ${target}`, outcome: "DENIED", note });
    redirect(`/admin/settings?rs=${result.reason}${result.reason === "sod" ? `&conflict=${result.conflict}` : ""}#roles`);
  }
  await writeAudit({ actor: who, action: "ROLE_GRANT", target: `${role} → ${target}`, outcome: "OK", note: reason.slice(0, 80) });
  redirect("/admin/settings?rs=granted#roles");
}

export async function revokeRoleAction(formData: FormData): Promise<void> {
  const target = String(formData.get("target") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const who = await actor();
  const result = await revokeRole({ target, role });
  if (!result.ok) {
    await writeAudit({ actor: who, action: "ROLE_REVOKE", target: `${role} → ${target}`, outcome: "DENIED", note: result.reason === "lastowner" ? "cannot revoke the last ADMIN_OWNER" : result.reason });
    redirect(`/admin/settings?rs=${result.reason}#roles`);
  }
  await writeAudit({ actor: who, action: "ROLE_REVOKE", target: `${role} → ${target}`, outcome: "OK" });
  redirect("/admin/settings?rs=revoked#roles");
}

export async function proposeFlagAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "").trim();
  const who = await actor();
  const result = await proposeFlagChange(key, who);
  if (!result.ok) redirect(`/admin/settings?fs=${result.reason}#flags`);
  await writeAudit({ actor: who, action: "FLAG_PROPOSE", target: `${key} → ${result.proposal.to ? "ON" : "OFF"}`, outcome: "OK", note: "maker — awaiting a second admin" });
  redirect("/admin/settings?fs=proposed#flags");
}

export async function decideFlagAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const who = await actor();
  if (!["approve", "reject"].includes(decision)) redirect("/admin/settings#flags");
  const result = await decideFlagChange(id, who, decision === "approve");
  if (!result.ok) {
    if (result.reason === "maker") {
      // A6: the maker confirming their own change is refused AND logged.
      await writeAudit({ actor: who, action: "FLAG_CONFIRM", target: id, outcome: "DENIED", note: "A6: maker cannot confirm their own flag change" });
      redirect("/admin/settings?fs=maker#flags");
    }
    redirect(`/admin/settings?fs=${result.reason}#flags`);
  }
  await writeAudit({
    actor: who,
    action: result.approved ? "FLAG_CONFIRM" : "FLAG_REJECT",
    target: `${result.proposal.key} → ${result.proposal.to ? "ON" : "OFF"}`,
    outcome: "OK",
    note: `checker · proposed by ${result.proposal.maker}`,
  });
  redirect(`/admin/settings?fs=${result.approved ? "confirmed" : "rejected"}#flags`);
}
