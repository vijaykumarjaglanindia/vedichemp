/**
 * VEDIC HEMP — SMS SEAM (OTP + transactional).
 *
 * With SMS_API_KEY set, a message goes out over the configured HTTP SMS API;
 * without it the platform runs in sandbox (the sign-in page shows the OTP in a
 * clearly-labelled box, so the flow still works end to end). Switching provider
 * is an env change — point SMS_API_URL at any provider that takes an auth key.
 */

import { envSet } from "@/lib/integrations";

export function smsLive(): boolean {
  return envSet("SMS_API_KEY");
}

export interface SmsResult {
  sent: boolean;
  sandbox: boolean;
  error?: string;
}

/** Send an SMS. In sandbox mode this is a no-op that reports back so the caller
 *  can fall back to on-screen display (never throws — SMS is convenience). */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!smsLive()) return { sent: false, sandbox: true };
  const url = process.env.SMS_API_URL ?? "https://api.msg91.com/api/v5/flow/";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authkey: process.env.SMS_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({ to, message, sender: process.env.SMS_SENDER_ID ?? undefined }),
    });
    if (!res.ok) return { sent: false, sandbox: false, error: `SMS send failed (${res.status})` };
    return { sent: true, sandbox: false };
  } catch (e) {
    return { sent: false, sandbox: false, error: e instanceof Error ? e.message : "SMS error" };
  }
}
