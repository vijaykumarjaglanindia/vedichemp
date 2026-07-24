/**
 * VEDIC HEMP — PAYMENT GATEWAY SEAM
 *
 * The one place a real PSP attaches. The rest of the platform talks to a small
 * PaymentProvider interface; setting a provider's env vars (see lib/integrations)
 * makes it live, and with none set the platform stays in sandbox mode (orders
 * are placed and marked pending, no real charge). Switching PSP is an env change,
 * never a code change.
 *
 * Two operations matter for a hosted marketplace:
 *   • createOrder — open a PSP order/intent for an amount in integer paise and
 *     hand the browser what it needs to complete a PSP-hosted checkout.
 *   • verifyWebhook — authenticate the PSP's server-to-server callback by HMAC
 *     before we ever trust it to mark an order paid. A forged webhook is rejected.
 *
 * Money stays integer paise throughout; no float ever touches a charge.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { envSet } from "@/lib/integrations";

export type PaymentProviderKey = "razorpay" | "cashfree" | "stripe" | "sandbox";

export interface CreatedPayment {
  provider: PaymentProviderKey;
  providerRef: string;        // the PSP's order/intent id
  amountPaise: number;
  currency: string;
  /** What the client needs to launch PSP-hosted checkout (keys are publishable only). */
  checkout: Record<string, string>;
}

export interface WebhookVerification {
  ok: boolean;
  provider: PaymentProviderKey;
  reason?: string;
}

export interface PaymentProvider {
  key: PaymentProviderKey;
  createOrder(input: { amountPaise: number; orderId: string; currency?: string }): Promise<CreatedPayment>;
  /** Authenticate a raw webhook body + headers. Never trust an unverified webhook. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): WebhookVerification;
}

/* ─────────────────────── signature helpers (pure, testable) ─────────────────────── */

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Razorpay: HMAC-SHA256(rawBody, webhookSecret) as hex, compared to X-Razorpay-Signature. */
export function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Cashfree: base64(HMAC-SHA256(timestamp + rawBody, secret)), compared to x-webhook-signature. */
export function verifyCashfreeSignature(rawBody: string, timestamp: string, signature: string, secret: string): boolean {
  if (!signature || !secret || !timestamp) return false;
  const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
  return safeEqualHex(expected, signature);
}

/** Stripe: t=<ts>,v1=<hex>; v1 = HMAC-SHA256(`${t}.${rawBody}`, secret). */
export function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): boolean {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=").map((s) => s.trim())).filter((kv) => kv.length === 2));
  const t = parts["t"]; const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return safeEqualHex(expected, v1);
}

/* ─────────────────────────────── providers ─────────────────────────────── */

const razorpay: PaymentProvider = {
  key: "razorpay",
  async createOrder({ amountPaise, orderId, currency = "INR" }) {
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency, receipt: orderId, notes: { orderId } }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed (${res.status})`);
    const data = (await res.json()) as { id: string };
    return {
      provider: "razorpay", providerRef: data.id, amountPaise, currency,
      // Only the publishable key id reaches the browser; the secret never does.
      checkout: { key: keyId, orderId: data.id, amount: String(amountPaise), currency },
    };
  },
  verifyWebhook(rawBody, headers) {
    const sig = headers["x-razorpay-signature"] ?? "";
    const ok = verifyRazorpaySignature(rawBody, sig, process.env.RAZORPAY_WEBHOOK_SECRET ?? "");
    return { ok, provider: "razorpay", reason: ok ? undefined : "signature mismatch" };
  },
};

const cashfree: PaymentProvider = {
  key: "cashfree",
  async createOrder({ amountPaise, orderId, currency = "INR" }) {
    const res = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "x-client-id": process.env.CASHFREE_APP_ID!,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
        "x-api-version": "2023-08-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ order_id: orderId, order_amount: amountPaise / 100, order_currency: currency }),
    });
    if (!res.ok) throw new Error(`Cashfree order failed (${res.status})`);
    const data = (await res.json()) as { payment_session_id?: string; cf_order_id?: string };
    return {
      provider: "cashfree", providerRef: data.cf_order_id ?? orderId, amountPaise, currency,
      checkout: { paymentSessionId: data.payment_session_id ?? "", orderId },
    };
  },
  verifyWebhook(rawBody, headers) {
    const sig = headers["x-webhook-signature"] ?? "";
    const ts = headers["x-webhook-timestamp"] ?? "";
    const ok = verifyCashfreeSignature(rawBody, ts, sig, process.env.CASHFREE_WEBHOOK_SECRET ?? "");
    return { ok, provider: "cashfree", reason: ok ? undefined : "signature mismatch" };
  },
};

const stripe: PaymentProvider = {
  key: "stripe",
  async createOrder({ amountPaise, orderId, currency = "INR" }) {
    const body = new URLSearchParams({ amount: String(amountPaise), currency: currency.toLowerCase(), "metadata[orderId]": orderId });
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Stripe intent failed (${res.status})`);
    const data = (await res.json()) as { id: string; client_secret: string };
    return { provider: "stripe", providerRef: data.id, amountPaise, currency, checkout: { clientSecret: data.client_secret } };
  },
  verifyWebhook(rawBody, headers) {
    const ok = verifyStripeSignature(rawBody, headers["stripe-signature"] ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
    return { ok, provider: "stripe", reason: ok ? undefined : "signature mismatch" };
  },
};

/** Sandbox: no real charge. Orders are placed and left pending for manual settlement. */
const sandbox: PaymentProvider = {
  key: "sandbox",
  async createOrder({ amountPaise, orderId, currency = "INR" }) {
    return { provider: "sandbox", providerRef: `sbx_${orderId}`, amountPaise, currency, checkout: { sandbox: "true", orderId } };
  },
  verifyWebhook() {
    // No real PSP → no real webhook. Refuse to authenticate one.
    return { ok: false, provider: "sandbox", reason: "no payment provider configured" };
  },
};

/** Which PSP is live, by configured env (first match wins). */
export function activeProviderKey(): PaymentProviderKey {
  if (envSet("RAZORPAY_KEY_ID") && envSet("RAZORPAY_KEY_SECRET")) return "razorpay";
  if (envSet("CASHFREE_APP_ID") && envSet("CASHFREE_SECRET_KEY")) return "cashfree";
  if (envSet("STRIPE_SECRET_KEY")) return "stripe";
  return "sandbox";
}

export function activeProvider(): PaymentProvider {
  switch (activeProviderKey()) {
    case "razorpay": return razorpay;
    case "cashfree": return cashfree;
    case "stripe": return stripe;
    default: return sandbox;
  }
}

/** True when a real PSP is attached (not sandbox). */
export function paymentsLive(): boolean {
  return activeProviderKey() !== "sandbox";
}
