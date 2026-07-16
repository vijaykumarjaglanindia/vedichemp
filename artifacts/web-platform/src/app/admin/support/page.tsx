/**
 * VEDIC HEMP — SUPPORT (admin / platform)
 *
 * Every ticket the platform owns: general tickets, medical/prescription
 * tickets (routed here, never to a seller — A4), and seller-escalated ones.
 * The admin replies, resolves or closes; replies are copy-checked and audited.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { allTickets, TICKET_TONE } from "@/lib/support";
import { adminReplyTicket, adminSetTicketStatus } from "../actions";

export const metadata: Metadata = { title: "Support · Admin" };
export const dynamic = "force-dynamic";

const PARTY_LABEL: Record<string, string> = { buyer: "Buyer", seller: "Seller", admin: "You (platform)" };

const MESSAGES: Record<string, { sev: "ok" | "danger"; text: string }> = {
  replied: { sev: "ok", text: "Reply sent to the buyer." },
  status: { sev: "ok", text: "Ticket updated." },
  reply: { sev: "danger", text: "Type a reply first." },
  claims: { sev: "danger", text: "Replies can't carry medical claims. It was not sent." },
};

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string; replied?: string }> }) {
  const { done, err, replied } = await searchParams;
  const tickets = await allTickets();
  const open = tickets.filter((t) => t.status === "OPEN" || t.status === "PENDING").length;
  const msg = (replied && MESSAGES.replied) || (done && MESSAGES[done]) || (err && MESSAGES[err]) || undefined;

  return (
    <Shell active="/admin/support" breadcrumb={["Admin", "Trust", "Support"]} title="Support tickets"
      actions={<StatusPill tone={open ? "warn" : "ok"}>{open} open</StatusPill>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      <Card title={<span className="vh-row" style={{ gap: 8 }}><LifeBuoy size={16} strokeWidth={2.2} aria-hidden /> All tickets</span>}>
        {tickets.length === 0 ? (
          <EmptyState icon="💬" headline="No tickets" sub="Buyer tickets and seller escalations appear here." />
        ) : (
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            {tickets.map((t) => (
              <div key={t.id} id={t.id} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius)", overflow: "hidden", scrollMarginTop: 90 }}>
                <div className="vh-row-between" style={{ gap: 10, flexWrap: "wrap", padding: "10px 14px", background: "var(--vh-bg-subtle)", borderBottom: "1px solid var(--vh-line)" }}>
                  <span className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700 }}>{t.subject}</span>
                    <span className="vh-pill vh-pill-neutral">{t.category}</span>
                    <span className="small muted mono">{t.id}</span>
                    <span className="small muted">{t.buyerEmail}{t.sellerStore ? ` · ${t.sellerStore}` : " · platform"}</span>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    {t.escalated && <StatusPill tone="danger">Escalated</StatusPill>}
                    <StatusPill tone={TICKET_TONE[t.status]}>{t.status}</StatusPill>
                  </span>
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
                  {t.messages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.from === "admin" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", borderRadius: "var(--vh-radius-sm)", padding: "8px 12px", background: m.from === "admin" ? "var(--vh-green-100)" : "var(--vh-surface)", border: "1px solid var(--vh-line)" }}>
                        <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{PARTY_LABEL[m.from]} <span className="muted" style={{ fontWeight: 400 }}>· {m.author} · {m.at}</span></div>
                        <div className="small" style={{ marginTop: 2 }}>{m.body}</div>
                      </div>
                    </div>
                  ))}
                  {t.orderRef && <Link className="small" href={`/admin/orders`} style={{ fontWeight: 700 }}>Order {t.orderRef} →</Link>}
                  {t.status !== "CLOSED" ? (
                    <>
                      <form action={adminReplyTicket} className="vh-row" style={{ gap: 8, alignItems: "flex-end", marginTop: 4 }}>
                        <input type="hidden" name="ticketId" value={t.id} />
                        <input className="vh-input" name="body" placeholder="Reply to the buyer…" style={{ flex: 1 }} aria-label={`Reply to ${t.id}`} />
                        <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Send</button>
                      </form>
                      <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <form action={adminSetTicketStatus}><input type="hidden" name="ticketId" value={t.id} /><input type="hidden" name="status" value="RESOLVED" /><button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Resolve</button></form>
                        <form action={adminSetTicketStatus}><input type="hidden" name="ticketId" value={t.id} /><input type="hidden" name="status" value="CLOSED" /><button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Close</button></form>
                      </div>
                    </>
                  ) : (
                    <p className="small muted" style={{ margin: 0 }}>Closed.</p>
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
