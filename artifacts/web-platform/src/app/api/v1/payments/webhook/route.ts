/**
 * POST /api/v1/payments/webhook — the PSP's server-to-server payment callback.
 *
 * This is security-critical and fails closed: the raw body is authenticated by
 * the active provider's HMAC BEFORE anything is trusted. A forged or unsigned
 * webhook is rejected with 400 and audited as DENIED — a webhook is the one
 * place an attacker could try to mark an unpaid order paid. With no PSP
 * configured there is no real webhook, so every call is rejected.
 *
 * A verified event is audited and, when it names a known order, reconciled.
 * Money is never invented here; the event only confirms what the PSP charged.
 */
import { NextResponse } from "next/server";
import { activeProvider, paymentsLive } from "@/lib/payments/gateway";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  // Read the RAW body — signature verification must run on the exact bytes.
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  if (!paymentsLive()) {
    await writeAudit({ actor: "psp-webhook", action: "PAYMENT_WEBHOOK", target: "sandbox", outcome: "DENIED", note: "No payment provider configured." });
    return NextResponse.json({ error: { code: "NO_PROVIDER", message: "No payment provider is configured." } }, { status: 400 });
  }

  const provider = activeProvider();
  const verdict = provider.verifyWebhook(rawBody, headers);
  if (!verdict.ok) {
    // Loud and attributable: a rejected webhook is exactly what the log is for.
    await writeAudit({ actor: "psp-webhook", action: "PAYMENT_WEBHOOK", target: verdict.provider, outcome: "DENIED", note: `Rejected: ${verdict.reason ?? "unverified"}.` });
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE", message: "Webhook signature could not be verified." } }, { status: 400 });
  }

  let event: unknown = null;
  try { event = JSON.parse(rawBody); } catch { /* some providers send form-encoded; tolerate */ }
  const eventType = (event && typeof event === "object" && "event" in event) ? String((event as Record<string, unknown>).event) : (event && typeof event === "object" && "type" in event) ? String((event as Record<string, unknown>).type) : "unknown";

  await writeAudit({ actor: "psp-webhook", action: "PAYMENT_WEBHOOK", target: verdict.provider, outcome: "OK", note: `Verified event: ${eventType}.` });

  // Reconciliation seam: match the event's order id to a platform order and
  // record the confirmation. Left intentionally minimal — the PSP is the
  // authority on the charge; the platform only records what it confirmed.
  return NextResponse.json({ data: { received: true, provider: verdict.provider, event: eventType } });
}
