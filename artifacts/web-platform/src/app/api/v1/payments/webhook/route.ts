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
import { confirmPayment } from "@/lib/orders";
import { writeAudit } from "@/lib/audit";

/** Dig the platform order reference + PSP payment id out of any provider's event. */
function extractOrder(event: unknown): { reference?: string; providerRef?: string } {
  const e = event as Record<string, any>;
  const reference =
    e?.payload?.payment?.entity?.notes?.orderId ??  // Razorpay
    e?.payload?.order?.entity?.receipt ??            // Razorpay (order)
    e?.data?.order?.order_id ??                      // Cashfree
    e?.data?.object?.metadata?.orderId ??            // Stripe
    e?.data?.object?.receipt ??
    undefined;
  const providerRef =
    e?.payload?.payment?.entity?.id ??
    e?.data?.payment?.cf_payment_id ??
    e?.data?.object?.id ??
    undefined;
  return { reference: reference ? String(reference) : undefined, providerRef: providerRef ? String(providerRef) : undefined };
}

/** Event types that mean "the buyer paid". */
function isSuccess(eventType: string): boolean {
  return /captured|succeeded|success|paid/i.test(eventType);
}

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

  // Reconcile: on a success event, mark the matching order CAPTURED. This is
  // idempotent (a replayed webhook is a no-op) and never trusts an amount from
  // the caller — the PSP is the authority on the charge; the platform records it.
  let reconciled: string | null = null;
  if (isSuccess(eventType)) {
    const { reference, providerRef } = extractOrder(event);
    if (reference) {
      const res = await confirmPayment(reference, providerRef);
      reconciled = res.ok ? reference : null;
      await writeAudit({
        actor: "psp-webhook", action: "PAYMENT_CONFIRMED", target: reference,
        outcome: res.ok ? "OK" : "DENIED", note: res.ok ? "Order marked CAPTURED." : `No matching order (${res.reason}).`,
      });
    }
  }

  return NextResponse.json({ data: { received: true, provider: verdict.provider, event: eventType, reconciled } });
}
