/**
 * VEDIC HEMP — LIFECYCLE MARKETING CAMPAIGNS (server-side store; DB seam)
 *
 * The admin marketing surface promises a real gate: no lifecycle send
 * (email / SMS / WhatsApp / push) may go out until its copy has cleared two
 * checks, both enforced HERE on the server, never in the console:
 *
 *   1. Claims copy-check (Drugs & Magic Remedies Act) — a campaign whose
 *      subject or body claims to cure / treat / prevent / diagnose a disease
 *      is BLOCKED. It can never be approved and can never be sent. Fail closed.
 *   2. §6 health-data guard — a campaign that carries a diagnosis, symptom or
 *      named condition in a push body or email subject is BLOCKED. Health data
 *      does not ride out in a marketing send, ever.
 *
 * A campaign that is clean but MENTIONS a CBD Wellness product is held at
 * PENDING_COPY_CHECK: a human reviewer must confirm it makes no medical-benefit
 * claim before it can send. Everything else clears to APPROVED automatically.
 *
 * The send gate (sendCampaign) refuses anything not APPROVED — that is the one
 * authority on whether a message goes out. The console renders the state; it
 * never decides it. Every screen verdict is deterministic and pure
 * (screenCampaign), so it is unit-testable without the store or the DB.
 *
 * Server-side store = the DB seam. Resets on restart; a Prisma-backed
 * MarketingCampaign table takes over in production (PRODUCTION.md), the call
 * sites unchanged.
 */

import { violatesClaimsCopy } from "@/lib/claims";
import { hasHealthData } from "@/lib/s6";

// Re-exported so callers building an audit line can scrub the audience label as
// a backstop, even though createCampaign already refuses a health-data segment.
export { redactHealthData } from "@/lib/s6";

/* ── Vocabulary ───────────────────────────────────────────── */

export type Channel = "Email" | "SMS" | "WhatsApp" | "Push";
export const CHANNELS: Channel[] = ["Email", "SMS", "WhatsApp", "Push"];

/**
 * PENDING_COPY_CHECK — clean but mentions CBD; awaits a human reviewer.
 * APPROVED         — cleared; the ONLY state sendCampaign will send.
 * BLOCKED          — tripped the claims or §6 guard; a terminal dead end.
 * SENT             — dispatched (demo: recorded, no real send).
 */
export type CampaignStatus = "PENDING_COPY_CHECK" | "APPROVED" | "BLOCKED" | "SENT";

/** Why a campaign is in its current state (machine code, never health text). */
export type ScreenReason = "claims" | "health" | "cbd" | "clean";

export interface ScreenResult {
  verdict: Exclude<CampaignStatus, "SENT">;
  reason: ScreenReason;
}

export interface Campaign {
  id: string;
  channel: Channel;
  name: string;
  subject: string;
  body: string;
  audience: string;
  status: CampaignStatus;
  reason: ScreenReason; // the last screen verdict's cause
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  sentAt?: string;
}

/* ── The screen (pure, deterministic, unit-testable) ──────── */

// A campaign that names a CBD/hemp cannabinoid product needs a human eye even
// when it trips no hard rule: "supports calm" is fine, "for anxiety" is not,
// and only a person can judge the greyer copy. Product/process words like
// "hemp seed oil" in a recipe are caught by the reviewer, not auto-blocked.
const CBD_MENTION = /\b(cbd|cannabidiol|wellness\s+balm|tincture|cbd\s+wellness)\b/i;

/**
 * Deterministic verdict for a campaign's copy. Order matters: the two hard
 * blocks (claims, then health data) are checked before the softer "needs a
 * human" CBD hold, so a disease claim is BLOCKED even if it also mentions CBD.
 */
export function screenCampaign(subject: string, body: string): ScreenResult {
  if (violatesClaimsCopy(subject, body)) return { verdict: "BLOCKED", reason: "claims" };
  if (hasHealthData(subject) || hasHealthData(body)) return { verdict: "BLOCKED", reason: "health" };
  if (CBD_MENTION.test(subject) || CBD_MENTION.test(body)) return { verdict: "PENDING_COPY_CHECK", reason: "cbd" };
  return { verdict: "APPROVED", reason: "clean" };
}

/* ── Store ────────────────────────────────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __vhCampaigns: Campaign[] | undefined;
}

function seed(): Campaign[] {
  const at = "2026-07-01T09:00:00.000Z";
  return [
    { id: "m1", channel: "Email", name: "Weekly wellness digest", subject: "This week on Vedic Hemp", body: "New arrivals in hemp foods and Ayurveda, plus a recipe for hemp-seed chutney.", audience: "Digest subscribers (184k)", status: "APPROVED", reason: "clean", createdBy: "seed", createdAt: at, approvedBy: "seed" },
    { id: "m2", channel: "WhatsApp", name: "Order delivered follow-up", subject: "Your order arrived", body: "How did it go? Reply here or rate your items in the app.", audience: "Transactional", status: "APPROVED", reason: "clean", createdBy: "seed", createdAt: at, approvedBy: "seed" },
    { id: "m3", channel: "Push", name: "Cart abandonment nudge", subject: "Still deciding?", body: "The items in your cart are waiting. Free delivery over ₹999.", audience: "Cart abandoners (12k)", status: "APPROVED", reason: "clean", createdBy: "seed", createdAt: at, approvedBy: "seed" },
    { id: "m4", channel: "SMS", name: "Festival sale — CBD Wellness range", subject: "Festival offers", body: "Up to 20% off our AYUSH-licensed CBD wellness balm and tincture range this week.", audience: "Wellness buyers (96k)", status: "PENDING_COPY_CHECK", reason: "cbd", createdBy: "seed", createdAt: at },
  ];
}

function store(): Campaign[] {
  globalThis.__vhCampaigns ??= seed();
  return globalThis.__vhCampaigns;
}

export async function listCampaigns(): Promise<Campaign[]> {
  return [...store()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function findCampaign(id: string): Campaign | undefined {
  return store().find((c) => c.id === id);
}

/* ── Mutations ────────────────────────────────────────────── */

export interface CampaignInput {
  channel: string;
  name: string;
  subject: string;
  body: string;
  audience: string;
}

export type CreateResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: "channel" | "name" | "subject" | "body" | "audience" };

/**
 * Create + screen a campaign in one step. The resulting status is whatever the
 * screen decided — a caller cannot pass a status in, so no client ever seeds an
 * APPROVED (sendable) row by lying. A BLOCKED campaign is still stored: the
 * caught attempt is evidence, and the console shows it flagged.
 */
export async function createCampaign(actor: string, input: CampaignInput): Promise<CreateResult> {
  const channel = input.channel as Channel;
  const name = input.name.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  const audience = input.audience.trim() || "All contacts";

  if (!CHANNELS.includes(channel)) return { ok: false, reason: "channel" };
  if (name.length < 4 || name.length > 80) return { ok: false, reason: "name" };
  if (subject.length < 3 || subject.length > 120) return { ok: false, reason: "subject" };
  if (body.length < 8 || body.length > 600) return { ok: false, reason: "body" };
  // §6 + the platform's own promise ("no audience is ever built from health
  // data"): a segment named for a condition is refused outright. Otherwise the
  // label would ride into an audit line — an append-only (A3) log — on send.
  if (hasHealthData(audience) || violatesClaimsCopy(audience)) return { ok: false, reason: "audience" };

  const screen = screenCampaign(subject, body);
  const campaign: Campaign = {
    id: `mc-${store().length + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}`,
    channel, name, subject, body, audience,
    status: screen.verdict,
    reason: screen.reason,
    createdBy: actor,
    createdAt: new Date().toISOString(),
  };
  store().unshift(campaign);
  return { ok: true, campaign };
}

export type ApproveResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: "missing" | "state" | "claims" | "health" };

/**
 * Reviewer confirms a PENDING_COPY_CHECK campaign is claim-free. Fail closed:
 * the copy is RE-SCREENED at approve time, so a campaign that would now trip the
 * claims or §6 guard is flipped to BLOCKED rather than approved — the reviewer
 * cannot approve a leak, even by mistake.
 */
export async function approveCampaign(id: string, approver: string): Promise<ApproveResult> {
  const c = findCampaign(id);
  if (!c) return { ok: false, reason: "missing" };
  if (c.status !== "PENDING_COPY_CHECK") return { ok: false, reason: "state" };

  const screen = screenCampaign(c.subject, c.body);
  if (screen.verdict === "BLOCKED") {
    c.status = "BLOCKED";
    c.reason = screen.reason;
    return { ok: false, reason: screen.reason as "claims" | "health" };
  }
  c.status = "APPROVED";
  c.reason = "clean";
  c.approvedBy = approver;
  return { ok: true, campaign: c };
}

export type SendResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: "missing" | "not_approved" | "already_sent" };

/**
 * THE send gate. Only an APPROVED campaign goes out. A PENDING_COPY_CHECK or
 * BLOCKED campaign is refused here regardless of what the console shows — the
 * server is the only authority on whether a message is sent. Belt-and-braces:
 * the copy is screened one last time, so even an APPROVED row that was somehow
 * mutated to carry a claim is stopped at the wire.
 */
export async function sendCampaign(id: string): Promise<SendResult> {
  const c = findCampaign(id);
  if (!c) return { ok: false, reason: "missing" };
  if (c.status === "SENT") return { ok: false, reason: "already_sent" };
  if (c.status !== "APPROVED") return { ok: false, reason: "not_approved" };
  // Last-line re-screen for the HARD blocks only (claims / §6 health data): an
  // APPROVED row mutated to carry a claim never sends. A CBD mention does NOT
  // re-block here — a human already cleared that hold when they approved it.
  if (screenCampaign(c.subject, c.body).verdict === "BLOCKED") {
    c.status = "BLOCKED";
    return { ok: false, reason: "not_approved" };
  }
  c.status = "SENT";
  c.sentAt = new Date().toISOString();
  return { ok: true, campaign: c };
}
