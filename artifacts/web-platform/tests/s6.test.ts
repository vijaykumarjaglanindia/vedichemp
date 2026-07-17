/**
 * §6 health-data guard — unit + notify-boundary wiring.
 *
 * Pure (no DB), but runs under the shared setup like every vitest file. Proves
 * the redactor's behaviour AND that notify() actually applies it before storing,
 * so a clinical term can never ride out in a push/email even if an emitter is
 * careless.
 */
import { describe, it, expect } from "vitest";
import { redactHealthData, hasHealthData, maskEmails, REDACTION_MARK } from "@/lib/s6";
import { notify, allNotifications, s6RedactionCount } from "@/lib/notify";

describe("§6 redactHealthData", () => {
  it("leaves process/marketing copy untouched", () => {
    for (const clean of [
      "Order VH2026070912 shipped",
      "Your prescription was viewed by the pharmacist — you were notified",
      "₹2,499.00 refunded to your Wallet",
      "CBD Wellness Balm 30g · batch VB-2405 dispatched",
      "A review is now live on your product",
    ]) {
      const r = redactHealthData(clean);
      expect(r.redacted).toBe(false);
      expect(r.text).toBe(clean);
    }
  });

  it("redacts a diagnosis / symptom / named condition", () => {
    for (const term of ["anxiety", "your diagnosis", "epilepsy", "chronic pain", "diabetes", "seizures", "depression"]) {
      const r = redactHealthData(`Reminder about your ${term} medication`);
      expect(r.redacted).toBe(true);
      expect(r.text).toContain(REDACTION_MARK);
      expect(hasHealthData(r.text)).toBe(false); // fully scrubbed
    }
  });

  it("is idempotent and case-insensitive", () => {
    const once = redactHealthData("ANXIETY and Seizures");
    expect(once.redacted).toBe(true);
    const twice = redactHealthData(once.text);
    expect(twice.redacted).toBe(false); // already clean
  });

  it("redacts to an EXACT expected string (not just self-consistent with hasHealthData)", () => {
    // A hardcoded expectation can surface a coverage gap that hasHealthData can't.
    expect(redactHealthData("Follow-up for your cancer").text).toBe(`Follow-up for your ${REDACTION_MARK}`);
    expect(redactHealthData("epilepsy and glaucoma").text).toBe(`${REDACTION_MARK} and ${REDACTION_MARK}`);
  });

  it("absorbs inflected forms of a listed stem (plural / adjectival / gerund)", () => {
    for (const t of ["cancers", "cancerous", "diabetics", "epileptics", "diagnosing", "asthmatic", "glaucomas", "arthritic"]) {
      expect(redactHealthData(`note about ${t}`).redacted).toBe(true);
    }
  });

  it("covers the flagship medical-cannabis indications and comorbidities", () => {
    for (const t of [
      "multiple sclerosis", "spasticity", "nausea", "neuropathic pain", "nerve pain",
      "HIV", "Crohn's", "fibromyalgia", "COPD", "palliative care", "chronic pain", "blood pressure",
    ]) {
      expect(redactHealthData(`re: ${t}`).redacted).toBe(true);
    }
  });
});

describe("§6 maskEmails (§4 — never a full identifier on an ops surface)", () => {
  it("masks a full email to one leading char + masked domain", () => {
    expect(maskEmails("Acme Clinics · buyer@example.in")).toBe("Acme Clinics · b•••@•••.in");
    expect(maskEmails("from jo@gmail.com today")).toBe("from j•••@•••.com today"); // short local part still fully masked
  });
  it("leaves text without an email untouched", () => {
    expect(maskEmails("Business account to review")).toBe("Business account to review");
  });
});

describe("§6 guard at the notify() boundary", () => {
  it("a clean notification passes through unredacted", async () => {
    const before = await s6RedactionCount();
    await notify("buyer", "s6-clean@example.in", {
      kind: "ORDER_SHIPPED",
      title: "Order VH123 shipped",
      body: "Your order is on its way.",
      href: "/account/orders",
    });
    const items = await allNotifications();
    const mine = items.find((n) => n.recipient === "s6-clean@example.in");
    expect(mine).toBeTruthy();
    expect(mine!.s6Redacted).toBeUndefined();
    expect(mine!.body).toBe("Your order is on its way.");
    expect(await s6RedactionCount()).toBe(before); // no redaction counted
  });

  it("redacts a clinical term from title AND body before storing, and counts it", async () => {
    const before = await s6RedactionCount();
    await notify("buyer", "s6-leak@example.in", {
      kind: "TEST_LEAK",
      title: "Your anxiety plan",
      body: "Refill for your chronic pain and seizures is ready.",
      href: "/account",
    });
    const items = await allNotifications();
    const mine = items.find((n) => n.recipient === "s6-leak@example.in");
    expect(mine).toBeTruthy();
    expect(mine!.s6Redacted).toBe(true);
    // No clinical term survives in what was stored/sent.
    expect(hasHealthData(mine!.title)).toBe(false);
    expect(hasHealthData(mine!.body)).toBe(false);
    expect(mine!.title).toContain(REDACTION_MARK);
    expect(await s6RedactionCount()).toBe(before + 1); // exactly one redaction event
  });
});
