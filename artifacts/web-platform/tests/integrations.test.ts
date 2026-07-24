/**
 * Service-provider seams — the plumbing that lets an operator "just connect a
 * provider" with env vars. These prove the security-critical and selection
 * logic without any network: webhook signatures verify (and reject forgeries),
 * the active PSP is chosen from env, the S3 presigner is a deterministic SigV4
 * URL, and every seam reports connected/sandbox purely from env.
 */

import { describe, it, expect, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyRazorpaySignature, verifyCashfreeSignature, verifyStripeSignature,
  activeProviderKey, paymentsLive,
} from "@/lib/payments/gateway";
import { statusOf, byKey, categoryLive, INTEGRATIONS } from "@/lib/integrations";
import { presignS3Get, sensitiveStorageLive } from "@/server/health/storage";
import { smsLive } from "@/lib/sms";
import { authorizeUrl, oauthConfigured } from "@/lib/oauth";

const SAVED = { ...process.env };
afterEach(() => {
  // Restore env after each test so provider-selection cases don't leak.
  for (const k of Object.keys(process.env)) if (!(k in SAVED)) delete process.env[k];
  Object.assign(process.env, SAVED);
});

/* ─────────────────────── Webhook signatures ─────────────────────── */

describe("payment webhook signatures", () => {
  const body = '{"event":"payment.captured","payload":{"amount":250000}}';

  it("Razorpay: accepts a correct HMAC and rejects a forgery", () => {
    const secret = "whsec_test";
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyRazorpaySignature(body, sig, secret)).toBe(true);
    expect(verifyRazorpaySignature(body, sig.replace(/.$/, "0"), secret)).toBe(false);
    expect(verifyRazorpaySignature(body, sig, "wrong")).toBe(false);
    expect(verifyRazorpaySignature(body, "", secret)).toBe(false);
  });

  it("Cashfree: HMAC over timestamp+body, base64", () => {
    const secret = "cf_secret"; const ts = "1700000000";
    const sig = createHmac("sha256", secret).update(ts + body).digest("base64");
    expect(verifyCashfreeSignature(body, ts, sig, secret)).toBe(true);
    expect(verifyCashfreeSignature(body, "1700000001", sig, secret)).toBe(false); // wrong ts
  });

  it("Stripe: t/v1 scheme", () => {
    const secret = "whsec_stripe"; const t = "1700000000";
    const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    expect(verifyStripeSignature(body, `t=${t},v1=${v1}`, secret)).toBe(true);
    expect(verifyStripeSignature(body, `t=${t},v1=deadbeef`, secret)).toBe(false);
  });
});

/* ─────────────────────── Provider selection ─────────────────────── */

describe("active payment provider (from env)", () => {
  it("is sandbox with nothing configured", () => {
    delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.CASHFREE_APP_ID; delete process.env.CASHFREE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    expect(activeProviderKey()).toBe("sandbox");
    expect(paymentsLive()).toBe(false);
  });
  it("picks Razorpay first, then Cashfree, then Stripe", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    expect(activeProviderKey()).toBe("stripe");
    process.env.CASHFREE_APP_ID = "app"; process.env.CASHFREE_SECRET_KEY = "sec";
    expect(activeProviderKey()).toBe("cashfree");
    process.env.RAZORPAY_KEY_ID = "rzp_id"; process.env.RAZORPAY_KEY_SECRET = "rzp_sec";
    expect(activeProviderKey()).toBe("razorpay");
    expect(paymentsLive()).toBe(true);
  });
});

/* ─────────────────────── Integration status ─────────────────────── */

describe("integration status from env", () => {
  it("reports missing required vars and never leaks values", () => {
    delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET; delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const s = byKey("razorpay")!;
    expect(s.configured).toBe(false);
    expect(s.missingRequired).toContain("RAZORPAY_KEY_ID");
    // status carries only names, never values
    expect(JSON.stringify(s)).not.toContain("rzp_");
  });
  it("flips to configured once all required vars are present", () => {
    process.env.SMS_API_KEY = "abc123";
    expect(byKey("sms")!.configured).toBe(true);
    expect(categoryLive("sms")).toBe(true);
  });
  it("every integration has at least one required var", () => {
    for (const def of INTEGRATIONS) {
      expect(statusOf(def).env.some((v) => v.required ?? true)).toBe(true);
    }
  });
});

/* ─────────────────────── S3 presigner (SigV4) ─────────────────────── */

describe("sensitive storage presigner", () => {
  function configure() {
    process.env.S3_REGION = "ap-south-1";
    process.env.S3_ACCESS_KEY_ID = "AKIAEXAMPLE";
    process.env.S3_SECRET_ACCESS_KEY = "secretexamplekey";
    process.env.SENSITIVE_BUCKET = "vh-sensitive";
    delete process.env.S3_ENDPOINT;
  }

  it("is not live without config", () => {
    delete process.env.S3_REGION; delete process.env.S3_ACCESS_KEY_ID; delete process.env.S3_SECRET_ACCESS_KEY; delete process.env.SENSITIVE_BUCKET;
    expect(sensitiveStorageLive()).toBe(false);
  });

  it("produces a deterministic SigV4 URL for a fixed time", () => {
    configure();
    expect(sensitiveStorageLive()).toBe(true);
    const when = new Date("2026-07-24T12:00:00Z");
    const a = presignS3Get("rx/user-42/scan.pdf", when);
    const b = presignS3Get("rx/user-42/scan.pdf", when);
    expect(a.url).toBe(b.url); // deterministic for the same instant
    expect(a.url).toContain("vh-sensitive.s3.ap-south-1.amazonaws.com");
    expect(a.url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(a.url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/); // 64-hex signature
    expect(a.url).not.toContain("secretexamplekey"); // secret never in the URL
  });

  it("uses path-style against a custom endpoint", () => {
    configure();
    process.env.S3_ENDPOINT = "https://minio.internal:9000";
    const { url } = presignS3Get("coa/batch-1.pdf", new Date("2026-07-24T12:00:00Z"));
    expect(url).toContain("minio.internal:9000/vh-sensitive/coa/batch-1.pdf");
  });
});

/* ─────────────────────── SMS + OAuth ─────────────────────── */

describe("sms + oauth seams", () => {
  it("SMS is sandbox until SMS_API_KEY is set", () => {
    delete process.env.SMS_API_KEY;
    expect(smsLive()).toBe(false);
    process.env.SMS_API_KEY = "key";
    expect(smsLive()).toBe(true);
  });

  it("OAuth authorize URL is null until configured, then well-formed", () => {
    delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET;
    expect(oauthConfigured("google")).toBe(false);
    expect(authorizeUrl("google", "https://x.in/cb", "state123")).toBeNull();

    process.env.GOOGLE_CLIENT_ID = "gid"; process.env.GOOGLE_CLIENT_SECRET = "gsec";
    const url = authorizeUrl("google", "https://x.in/cb", "state123")!;
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=gid");
    expect(url).toContain("state=state123");
    expect(url).toContain("redirect_uri=https%3A%2F%2Fx.in%2Fcb");
  });
});
