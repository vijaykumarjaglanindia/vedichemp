/**
 * VEDIC HEMP — DATA EXPORT (DPDP access request)
 *
 * Everything the platform holds about the signed-in buyer, read from the
 * AUTHORITATIVE server stores keyed on their email — not a browser's cookies,
 * which are a partial, per-device copy. Health data is deliberately excluded
 * beyond metadata: prescription images are served only through the signed-link
 * SensitiveViewer flow with access logging (A4), never a bulk export. The
 * consent history is the append-only ledger, not a current flag.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-lite";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", remediation: { label: "Sign in", href: "/signin?next=/account/profile" } },
      { status: 401 },
    );
  }
  const email = session.email;

  const { ordersForBuyer } = await import("@/lib/orders");
  const { ticketsForBuyer } = await import("@/lib/support");
  const { notificationsFor } = await import("@/lib/notify");
  const { consentHistory } = await import("@/lib/consent");
  const { myPrescriptions } = await import("@/lib/prescriptions");
  const { ledger: walletLedger } = await import("@/lib/wallet");

  const orders = await ordersForBuyer(email).catch(() => []);
  const tickets = await ticketsForBuyer(email).catch(() => []);
  const notifications = await notificationsFor("buyer", email).catch(() => []);
  const consents = await consentHistory(email).catch(() => []);
  const prescriptions = await myPrescriptions(email).catch(() => []);
  const wallet = await walletLedger(email).catch(() => []);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { email, role: session.role },
    orders: orders.map((o) => ({
      reference: o.reference, placedAt: o.placedAt, status: o.status,
      totalPaise: o.totalPaise, refundedPaise: o.refundedPaise,
      items: o.items.map((it) => ({ title: it.title, qty: it.qty, linePaise: it.linePaise })),
    })),
    wallet: wallet.map((t) => ({ at: t.at, kind: t.kind, amountPaise: t.amountPaise, status: t.status, note: t.note })),
    supportTickets: tickets.map((t) => ({ id: t.id, subject: t.subject, status: t.status })),
    notifications: notifications.map((n) => ({ at: n.createdAt, kind: n.kind, title: n.title })),
    // The append-only consent ledger — every grant/withdrawal, in order.
    consentHistory: consents.map((c) => ({ at: c.at, purpose: c.purpose, granted: c.granted, source: c.source })),
    prescriptions: {
      note: "Prescription images are not included in bulk exports — they are viewable only through the signed-link flow with access logging (A4).",
      records: prescriptions.map((p) => ({ id: p.id, status: p.status, doctor: p.doctor, validTill: p.validTill })),
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="vedic-hemp-data-export.json"',
      "Cache-Control": "no-store",
    },
  });
}
