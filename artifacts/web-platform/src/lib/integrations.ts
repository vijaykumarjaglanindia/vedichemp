/**
 * VEDIC HEMP — SERVICE PROVIDER INTEGRATIONS (the "connect a provider" registry)
 *
 * One place that describes every external service the platform can plug into —
 * payment gateways, SMS, email, OAuth, object storage, AI — and reports whether
 * each is CONFIGURED, purely from environment variables. Nothing here holds a
 * secret value; it only reports which variable NAMES are set, so the admin
 * Integrations page can show "connected / not connected" without ever echoing a
 * key.
 *
 * The contract for the whole platform: a provider is a drop-in. Set its env
 * vars and it activates; leave them unset and the feature runs in a safe
 * sandbox/stub. No application code changes to switch a provider on.
 */

export type IntegrationCategory = "payments" | "sms" | "email" | "oauth" | "storage" | "ai";

export interface EnvVarDef {
  name: string;
  secret?: boolean;
  required?: boolean; // required for this provider to count as configured (default true)
  note?: string;
}

export interface IntegrationDef {
  key: string;
  name: string;
  category: IntegrationCategory;
  blurb: string;
  env: EnvVarDef[];
  docsHref?: string;
}

/** True when an env var is present and non-empty. */
export function envSet(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

export const INTEGRATIONS: IntegrationDef[] = [
  // ── Payments ──────────────────────────────────────────────────────────
  {
    key: "razorpay", name: "Razorpay", category: "payments",
    blurb: "Cards, UPI, netbanking and wallets for India. PSP-hosted checkout (PCI-DSS SAQ-A).",
    env: [
      { name: "RAZORPAY_KEY_ID", required: true },
      { name: "RAZORPAY_KEY_SECRET", secret: true, required: true },
      { name: "RAZORPAY_WEBHOOK_SECRET", secret: true, required: true, note: "verifies the payment webhook signature" },
    ],
    docsHref: "https://razorpay.com/docs/",
  },
  {
    key: "cashfree", name: "Cashfree", category: "payments",
    blurb: "Alternative Indian PSP — cards, UPI, netbanking.",
    env: [
      { name: "CASHFREE_APP_ID", required: true },
      { name: "CASHFREE_SECRET_KEY", secret: true, required: true },
      { name: "CASHFREE_WEBHOOK_SECRET", secret: true, required: true },
    ],
    docsHref: "https://docs.cashfree.com/",
  },
  {
    key: "stripe", name: "Stripe", category: "payments",
    blurb: "International cards. Use where Indian PSPs are not required.",
    env: [
      { name: "STRIPE_SECRET_KEY", secret: true, required: true },
      { name: "STRIPE_WEBHOOK_SECRET", secret: true, required: true },
    ],
    docsHref: "https://stripe.com/docs",
  },

  // ── SMS (OTP + transactional) ────────────────────────────────────────
  {
    key: "sms", name: "SMS gateway", category: "sms",
    blurb: "Delivers phone OTPs and order SMS. Any HTTP SMS API (MSG91, Twilio, Gupshup…).",
    env: [
      { name: "SMS_API_KEY", secret: true, required: true },
      { name: "SMS_API_URL", required: false, note: "provider send endpoint (defaults to a generic POST)" },
      { name: "SMS_SENDER_ID", required: false, note: "DLT-registered sender/header for India" },
    ],
  },

  // ── Email (transactional) ────────────────────────────────────────────
  {
    key: "email", name: "Email (SMTP)", category: "email",
    blurb: "Order, sign-in and notification email. Any SMTP provider.",
    env: [
      { name: "SMTP_HOST", required: true },
      { name: "SMTP_PORT", required: false },
      { name: "SMTP_USER", required: true },
      { name: "SMTP_PASSWORD", secret: true, required: true },
      { name: "EMAIL_FROM", required: false, note: "e.g. 'Vedic Hemp <no-reply@yourdomain.in>'" },
    ],
  },

  // ── OAuth (social sign-in) ───────────────────────────────────────────
  {
    key: "oauth_google", name: "Google sign-in", category: "oauth",
    blurb: "Lets buyers sign in with Google.",
    env: [
      { name: "GOOGLE_CLIENT_ID", required: true },
      { name: "GOOGLE_CLIENT_SECRET", secret: true, required: true },
      { name: "OAUTH_REDIRECT_BASE", required: false, note: "e.g. https://yourdomain.in — falls back to the request host" },
    ],
  },
  {
    key: "oauth_facebook", name: "Facebook sign-in", category: "oauth",
    blurb: "Lets buyers sign in with Facebook.",
    env: [
      { name: "FACEBOOK_CLIENT_ID", required: true },
      { name: "FACEBOOK_CLIENT_SECRET", secret: true, required: true },
    ],
  },

  // ── Object storage (prescriptions / CoAs) ────────────────────────────
  {
    key: "storage", name: "Sensitive object storage (S3)", category: "storage",
    blurb: "Prescriptions and lab reports in an object-locked, KMS-encrypted bucket. Any S3-compatible store.",
    env: [
      { name: "S3_REGION", required: true, note: "ap-south-1 / ap-south-2 for data residency" },
      { name: "S3_ACCESS_KEY_ID", required: true },
      { name: "S3_SECRET_ACCESS_KEY", secret: true, required: true },
      { name: "SENSITIVE_BUCKET", required: true },
      { name: "S3_ENDPOINT", required: false, note: "for non-AWS S3 (MinIO, Wasabi…)" },
      { name: "SENSITIVE_KMS_KEY_ID", required: false, note: "separate CMK for health data" },
    ],
  },

  // ── AI ───────────────────────────────────────────────────────────────
  {
    key: "ai", name: "AI (Anthropic)", category: "ai",
    blurb: "Live model calls for the assistant surfaces. Unset = deterministic fallbacks. Output is always claims-checked.",
    env: [
      { name: "ANTHROPIC_API_KEY", secret: true, required: true },
    ],
    docsHref: "https://docs.anthropic.com/",
  },
];

export interface IntegrationStatus extends IntegrationDef {
  configured: boolean;
  present: string[];
  missingRequired: string[];
}

export function statusOf(def: IntegrationDef): IntegrationStatus {
  const present: string[] = [];
  const missingRequired: string[] = [];
  for (const v of def.env) {
    const isSet = envSet(v.name);
    if (isSet) present.push(v.name);
    if ((v.required ?? true) && !isSet) missingRequired.push(v.name);
  }
  return { ...def, configured: missingRequired.length === 0, present, missingRequired };
}

export function allStatuses(): IntegrationStatus[] {
  return INTEGRATIONS.map(statusOf);
}

export function byKey(key: string): IntegrationStatus | undefined {
  const def = INTEGRATIONS.find((d) => d.key === key);
  return def ? statusOf(def) : undefined;
}

/** Is at least one provider in a category fully configured? */
export function categoryLive(category: IntegrationCategory): boolean {
  return INTEGRATIONS.filter((d) => d.category === category).some((d) => statusOf(d).configured);
}
