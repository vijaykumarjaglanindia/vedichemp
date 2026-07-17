"use server";

/**
 * VEDIC HEMP — MARKETING LIFECYCLE ACTIONS
 *
 * Thin route handlers over src/lib/marketing.ts. They validate input, call the
 * service, write the audit row (OK or DENIED) synchronously, and redirect with
 * a status. Every gate lives in the service; nothing here decides eligibility.
 *
 *  - Creating a campaign runs the claims + §6 screen; a blocked attempt is
 *    stored AND audited as DENIED (what someone tried is informative).
 *  - Approving is reason-gated (≥20 chars) and re-screens — fail closed.
 *  - Sending refuses anything not APPROVED, and the refusal is logged.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-lite";
import { writeAudit } from "@/lib/audit";
import { approveCampaign, createCampaign, findCampaign, sendCampaign, redactHealthData } from "@/lib/marketing";

async function actor(): Promise<string> {
  return (await getSession())?.email ?? "unknown-admin";
}

export async function createCampaignAction(formData: FormData): Promise<void> {
  const who = await actor();
  const input = {
    channel: String(formData.get("channel") ?? ""),
    name: String(formData.get("name") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    audience: String(formData.get("audience") ?? ""),
  };
  const result = await createCampaign(who, input);
  if (!result.ok) {
    // A health-data audience is a §6 catch, not a mere typo — log the DENIED
    // attempt (machine reason only, never the label itself).
    if (result.reason === "audience") {
      await writeAudit({ actor: who, action: "CAMPAIGN_CREATE", target: "(rejected)", outcome: "DENIED", note: "rejected: audience carries health data" });
    }
    redirect(`/admin/marketing?mk=${result.reason}#new`);
  }
  const c = result.campaign;
  if (c.status === "BLOCKED") {
    // The screen caught a claim / health-data leak. Log the DENIED attempt —
    // the audit note carries only the machine reason, never the copy.
    await writeAudit({ actor: who, action: "CAMPAIGN_CREATE", target: c.id, outcome: "DENIED", note: `blocked: ${c.reason}` });
    redirect(`/admin/marketing?mk=blocked&r=${c.reason}#campaigns`);
  }
  await writeAudit({ actor: who, action: "CAMPAIGN_CREATE", target: c.id, outcome: "OK", note: c.status === "PENDING_COPY_CHECK" ? "held: copy-check" : "auto-approved" });
  redirect(`/admin/marketing?mk=${c.status === "PENDING_COPY_CHECK" ? "pending" : "approved"}#campaigns`);
}

export async function approveCampaignAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const who = await actor();

  // Approving a marketing send is a compliance sign-off — ≥20 chars, as with
  // every high-impact admin action (CLAUDE.md §2).
  if (reason.length < 20) {
    await writeAudit({ actor: who, action: "CAMPAIGN_APPROVE", target: id, outcome: "DENIED", note: "reason under 20 chars" });
    redirect(`/admin/marketing?mk=reason&id=${encodeURIComponent(id)}#campaigns`);
  }
  const result = await approveCampaign(id, who);
  if (!result.ok) {
    // A re-screen at approve time flipped it to BLOCKED, or the state was wrong.
    const note = result.reason === "claims" || result.reason === "health" ? `re-screen blocked: ${result.reason}` : result.reason;
    await writeAudit({ actor: who, action: "CAMPAIGN_APPROVE", target: id, outcome: "DENIED", note });
    redirect(`/admin/marketing?mk=${result.reason}#campaigns`);
  }
  await writeAudit({ actor: who, action: "CAMPAIGN_APPROVE", target: id, outcome: "OK", note: reason.slice(0, 80) });
  redirect(`/admin/marketing?mk=cleared#campaigns`);
}

export async function sendCampaignAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const who = await actor();
  const before = findCampaign(id);
  const result = await sendCampaign(id);
  if (!result.ok) {
    // Fail closed: a non-approved campaign is refused at the send gate. Log it
    // with the state it was in — an attempt to send an unapproved campaign is
    // exactly the kind of thing the audit trail exists to record.
    await writeAudit({ actor: who, action: "CAMPAIGN_SEND", target: id, outcome: "DENIED", note: `refused: ${result.reason} (was ${before?.status ?? "?"})` });
    redirect(`/admin/marketing?mk=send_${result.reason}#campaigns`);
  }
  // Audience is already guaranteed health-data-free at create; redact anyway as
  // a backstop — nothing health-descriptive ever lands in the immutable log.
  await writeAudit({ actor: who, action: "CAMPAIGN_SEND", target: id, outcome: "OK", note: `${result.campaign.channel} · ${redactHealthData(result.campaign.audience).text}` });
  redirect(`/admin/marketing?mk=sent#campaigns`);
}
