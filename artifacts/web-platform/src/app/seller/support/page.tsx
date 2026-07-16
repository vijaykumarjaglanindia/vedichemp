/**
 * VEDIC HEMP — SUPPORT (seller)
 *
 * Buyer tickets routed to this store. The seller replies, marks a ticket
 * resolved, or escalates to the platform. Replies are copy-checked and the
 * "support" permission is required (staff without it are blocked server-side).
 * Medical/prescription tickets never reach this queue — they go to the platform.
 */

import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { ticketsForSeller, TICKET_TONE } from "@/lib/support";
import { sellerReplyTicket, sellerSetTicketStatus, sellerEscalateTicket } from "../actions";

export const metadata: Metadata = { title: "Support" };
export const dynamic = "force-dynamic";

const STORE = "Vedic Botanicals";
const PARTY_LABEL: Record<string, string> = { buyer: "Buyer", seller: "You", admin: "Vedic Hemp" };

const MESSAGES: Record<string, { sev: "ok" | "danger"; text: string }> = {
  replied: { sev: "ok", text: "Reply sent — the buyer sees it in their account and by email." },
  status: { sev: "ok", text: "Ticket updated." },
  escalated: { sev: "ok", text: "Escalated to the platform — the Vedic Hemp team now sees this ticket too." },
  reply: { sev: "danger", text: "Type a reply first." },
  claims: { sev: "danger", text: "Replies can't carry medical claims. It was not sent." },
};

export default async function SellerSupportPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string; replied?: string }> }) {
  const { done, err, replied } = await searchParams;
  const tickets = await ticketsForSeller(STORE);
  const open = tickets.filter((t) => t.status === "OPEN" || t.status === "PENDING").length;
  const msg = (replied && MESSAGES.replied) || (done && MESSAGES[done]) || (err && MESSAGES[err]) || undefined;

  return (
    <Shell active="/seller/support" breadcrumb={["Seller Central", "Support"]} title="Support"
      actions={<StatusPill tone={open ? "warn" : "ok"}>{open} open</StatusPill>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      <Card title={<span className="vh-row" style={{ gap: 8 }}><LifeBuoy size={16} strokeWidth={2.2} aria-hidden /> Buyer tickets</span>}>
        {tickets.length === 0 ? (
          <EmptyState icon="💬" headline="No tickets" sub="Buyer questions about your orders appear here." />
        ) : (
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            {tickets.map((t) => (
              <div key={t.id} id={t.id} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius)", overflow: "hidden", scrollMarginTop: 90 }}>
                <div className="vh-row-between" style={{ gap: 10, flexWrap: "wrap", padding: "10px 14px", background: "var(--vh-bg-subtle)", borderBottom: "1px solid var(--vh-line)" }}>
                  <span className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700 }}>{t.subject}</span>
                    <span className="small muted mono">{t.id}</span>
                    <span className="small muted">{t.buyerEmail}</span>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    {t.escalated && <StatusPill tone="danger">Escalated</StatusPill>}
                    <StatusPill tone={TICKET_TONE[t.status]}>{t.status}</StatusPill>
                  </span>
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
                  {t.messages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.from === "seller" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", borderRadius: "var(--vh-radius-sm)", padding: "8px 12px", background: m.from === "seller" ? "var(--vh-green-100)" : "var(--vh-surface)", border: "1px solid var(--vh-line)" }}>
                        <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{PARTY_LABEL[m.from]} <span className="muted" style={{ fontWeight: 400 }}>· {m.at}</span></div>
                        <div className="small" style={{ marginTop: 2 }}>{m.body}</div>
                      </div>
                    </div>
                  ))}
                  {t.status !== "CLOSED" && (
                    <>
                      <form action={sellerReplyTicket} className="vh-row" style={{ gap: 8, alignItems: "flex-end", marginTop: 4 }}>
                        <input type="hidden" name="ticketId" value={t.id} />
                        <input className="vh-input" name="body" placeholder="Reply to the buyer…" style={{ flex: 1 }} aria-label={`Reply to ${t.id}`} />
                        <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Send</button>
                      </form>
                      <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <form action={sellerSetTicketStatus}><input type="hidden" name="ticketId" value={t.id} /><input type="hidden" name="status" value="RESOLVED" /><button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Mark resolved</button></form>
                        {!t.escalated && <form action={sellerEscalateTicket}><input type="hidden" name="ticketId" value={t.id} /><button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Escalate to platform</button></form>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}
