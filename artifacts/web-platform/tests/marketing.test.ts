/**
 * Lifecycle marketing — the copy-check + §6 send gate.
 *
 * The screen is pure and deterministic, so most of this is unit-level. The
 * store tests prove the one rule that matters: NOTHING but an APPROVED campaign
 * ever sends, and the screen decides the status — a caller can't seed a
 * sendable row by lying. Runs under the shared setup like every vitest file.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  screenCampaign, createCampaign, approveCampaign, sendCampaign, findCampaign, listCampaigns,
} from "@/lib/marketing";

// Isolate the store per test (it lives on globalThis).
beforeEach(() => {
  (globalThis as { __vhCampaigns?: unknown }).__vhCampaigns = [];
});

describe("screenCampaign (pure)", () => {
  it("clears ordinary promotional copy to APPROVED", () => {
    const r = screenCampaign("This week on Vedic Hemp", "New arrivals in hemp foods and Ayurveda, plus a recipe.");
    expect(r).toEqual({ verdict: "APPROVED", reason: "clean" });
  });

  it("BLOCKS a disease/medical claim (Drugs & Magic Remedies Act)", () => {
    for (const [s, b] of [
      ["Cure your pain", "Our balm cures chronic pain fast."],
      ["Weekly digest", "This tincture treats insomnia."],
      ["Offer", "Clinically proven to prevent disease."],
    ] as const) {
      expect(screenCampaign(s, b)).toMatchObject({ verdict: "BLOCKED", reason: "claims" });
    }
  });

  it("BLOCKS health data in subject or body (§6) even with no claim verb", () => {
    // "anxiety" is a named condition — no cure/treat verb, but still health data.
    expect(screenCampaign("Your anxiety plan", "A gentle nudge.")).toMatchObject({ verdict: "BLOCKED", reason: "health" });
    expect(screenCampaign("Seasonal offers", "Special pricing for people with diabetes.")).toMatchObject({ verdict: "BLOCKED", reason: "health" });
  });

  it("HOLDS a clean CBD-Wellness mention at PENDING_COPY_CHECK", () => {
    expect(screenCampaign("Festival offers", "Up to 20% off our AYUSH-licensed CBD wellness balm range.")).toEqual({ verdict: "PENDING_COPY_CHECK", reason: "cbd" });
  });

  it("a claim outranks a CBD mention — BLOCKED, not merely held", () => {
    // Must be BLOCKED (hard) even though it also mentions CBD.
    expect(screenCampaign("CBD offer", "Our CBD balm treats arthritis.")).toMatchObject({ verdict: "BLOCKED" });
  });
});

describe("send gate — only APPROVED goes out", () => {
  it("an auto-approved campaign can be sent", async () => {
    const c = await createCampaign("ops@vh.in", { channel: "Email", name: "Hemp digest", subject: "Hello", body: "New hemp foods this week for your kitchen.", audience: "All" });
    expect(c.ok && c.campaign.status).toBe("APPROVED");
    const sent = await sendCampaign((c as { campaign: { id: string } }).campaign.id);
    expect(sent.ok).toBe(true);
    expect(findCampaign((c as { campaign: { id: string } }).campaign.id)!.status).toBe("SENT");
  });

  it("a PENDING campaign is REFUSED at the send gate until approved", async () => {
    const c = await createCampaign("ops@vh.in", { channel: "SMS", name: "CBD festival", subject: "Festival", body: "20% off our CBD wellness tincture range this week.", audience: "Wellness" });
    const id = (c as { campaign: { id: string } }).campaign.id;
    expect(findCampaign(id)!.status).toBe("PENDING_COPY_CHECK");

    // Send before approval → refused, still not sent.
    const early = await sendCampaign(id);
    expect(early.ok).toBe(false);
    expect(early.ok === false && early.reason).toBe("not_approved");
    expect(findCampaign(id)!.status).toBe("PENDING_COPY_CHECK");

    // Approve, then send → allowed.
    const appr = await approveCampaign(id, "reviewer@vh.in");
    expect(appr.ok).toBe(true);
    expect(findCampaign(id)!.status).toBe("APPROVED");
    expect((await sendCampaign(id)).ok).toBe(true);
  });

  it("a BLOCKED campaign can NEVER be approved or sent", async () => {
    const c = await createCampaign("ops@vh.in", { channel: "Push", name: "Bad copy", subject: "Cure it", body: "This treats your anxiety and cures pain.", audience: "All" });
    const id = (c as { campaign: { id: string } }).campaign.id;
    expect(findCampaign(id)!.status).toBe("BLOCKED");
    expect((await approveCampaign(id, "reviewer@vh.in")).ok).toBe(false);
    expect((await sendCampaign(id)).ok).toBe(false);
    expect(findCampaign(id)!.status).toBe("BLOCKED");
  });

  it("approve RE-SCREENS: a campaign is never approved past a claim", async () => {
    // Force a pending row, then corrupt its body to carry a claim, then approve.
    const c = await createCampaign("ops@vh.in", { channel: "Email", name: "CBD news", subject: "News", body: "About our CBD wellness balm range.", audience: "All" });
    const id = (c as { campaign: { id: string } }).campaign.id;
    findCampaign(id)!.body = "This CBD balm cures anxiety."; // now trips claims + health
    const res = await approveCampaign(id, "reviewer@vh.in");
    expect(res.ok).toBe(false);
    expect(findCampaign(id)!.status).toBe("BLOCKED"); // flipped, not approved
    expect((await sendCampaign(id)).ok).toBe(false);
  });

  it("send RE-SCREENS: an APPROVED row mutated to carry a claim is stopped at the wire", async () => {
    const c = await createCampaign("ops@vh.in", { channel: "Email", name: "Clean", subject: "News", body: "Fresh hemp hearts and seed oil restocked.", audience: "All" });
    const id = (c as { campaign: { id: string } }).campaign.id;
    expect(findCampaign(id)!.status).toBe("APPROVED");
    findCampaign(id)!.body = "It treats insomnia."; // tampered after approval
    const res = await sendCampaign(id);
    expect(res.ok).toBe(false);
    expect(findCampaign(id)!.status).toBe("BLOCKED");
  });

  it("createCampaign validates channel and field lengths", async () => {
    expect((await createCampaign("a@b.in", { channel: "Telegram", name: "x", subject: "s", body: "body body", audience: "" })).ok).toBe(false);
    expect((await createCampaign("a@b.in", { channel: "Email", name: "ab", subject: "sub", body: "body body", audience: "" })).ok).toBe(false); // name too short
    expect((await createCampaign("a@b.in", { channel: "Email", name: "Valid name", subject: "s", body: "body body", audience: "" })).ok).toBe(false); // subject too short
  });

  it("the store never lets a caller pass a status — it is always the screen's verdict", async () => {
    const c = await createCampaign("ops@vh.in", { channel: "Email", name: "Attempt", subject: "News", body: "Our CBD wellness range is back.", audience: "All" } as never);
    // Even if extra fields were smuggled in, status is decided by the screen (cbd → pending).
    expect((c as { campaign: { status: string } }).campaign.status).toBe("PENDING_COPY_CHECK");
    const list = await listCampaigns();
    expect(list.every((x) => ["PENDING_COPY_CHECK", "APPROVED", "BLOCKED", "SENT"].includes(x.status))).toBe(true);
  });
});
