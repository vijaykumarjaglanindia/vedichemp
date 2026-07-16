/**
 * VEDIC HEMP — SUPPORT & TICKETS
 *
 * The ticket form posts to a server action that validates and issues the
 * reference. Prescription-related tickets route to Pharmacist/Compliance
 * only; a support agent cannot open an Rx image without a logged reason
 * (A4) — the note under the form keeps that visible to the buyer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, HelpCircle, MessageSquarePlus, Ticket } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { getSession } from "@/lib/auth-lite";
import { ticketsForBuyer, TICKET_TONE } from "@/lib/support";
import { FAQS } from "../_lib/data";
import { createTicket, replyTicket } from "./actions";

export const metadata: Metadata = { title: "Support" };
export const dynamic = "force-dynamic";

const I = { size: 16, strokeWidth: 2.2 } as const;

const ERRORS: Record<string, string> = {
  topic: "Pick a topic so the ticket routes to the right team.",
  desc: "Describe the issue in at least 20 characters (max 1,000).",
  orderref: "That order reference doesn't look right — it starts with VH followed by digits.",
  reply: "Type a reply first.",
  claims: "Support messages can't carry medical claims — describe what's happening instead.",
  closed: "This ticket is closed. Raise a new one if you still need help.",
};

const PARTY_LABEL: Record<string, string> = { buyer: "You", seller: "Seller", admin: "Vedic Hemp support" };

function title(icon: ReactNode, text: string) {
  return (
    <span className="vh-row" style={{ gap: 8 }}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {text}
    </span>
  );
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; replied?: string }>;
}) {
  const { ok, err, replied } = await searchParams;
  const email = (await getSession())?.email ?? "guest@vedichemp.in";
  const tickets = await ticketsForBuyer(email);

  return (
    <Shell active="/account/support" breadcrumb={["My Account", "Support"]} title="Support & tickets">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {ok && (
          <Banner severity="ok" title={`Ticket ${ok} created`}>
            We&rsquo;ve emailed a copy to your registered address. Replies land here and in your inbox —
            most order issues get a first response within a few hours.
          </Banner>
        )}
        {replied && <Banner severity="ok" title="Reply sent">The team will get back to you here.</Banner>}
        {err && ERRORS[err] && <Banner severity="danger">{ERRORS[err]}</Banner>}

        <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
          <Card title={title(<MessageSquarePlus {...I} />, "Raise a new ticket")}>
            <form action={createTicket} style={{ display: "grid", gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="topic">
                  Topic <span className="req">*</span>
                </label>
                <select className="vh-select" id="topic" name="topic" defaultValue="Order issue" required>
                  <option>Order issue</option>
                  <option>Wallet / refund</option>
                  <option>Prescription / Medical</option>
                  <option>Account &amp; security</option>
                  <option>Something else</option>
                </select>
              </div>

              <div className="vh-field">
                <label className="vh-label" htmlFor="orderref">Order reference (optional)</label>
                <input className="vh-input" id="orderref" name="orderref" placeholder="e.g. VH2026070912" />
                <span className="vh-help">Including it routes your ticket to the right seller faster.</span>
              </div>

              <div className="vh-field">
                <label className="vh-label" htmlFor="desc">
                  Describe the issue <span className="req">*</span>
                </label>
                <RichTextEditor
                  compact
                  name="desc"
                  id="desc"
                  maxLength={1000}
                  minHeight={110}
                  placeholder="Tell us what happened…"
                  help="Minimum 20 characters — the more detail, the faster the fix."
                />
              </div>

              <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm" style={{ justifySelf: "start" }}>
                Submit ticket
              </button>
              <p className="small muted" style={{ margin: 0 }}>
                Prescription-related tickets are routed to Pharmacist/Compliance only; support agents cannot
                view your Rx image without a logged reason.
              </p>
            </form>
          </Card>

          <Card title={title(<HelpCircle {...I} />, "Frequently asked")}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {FAQS.map((f) => (
                <li key={f.q}>
                  <Link href={f.href} className="vh-row" style={{ gap: 8, padding: "8px 0", borderBottom: "1px solid var(--vh-line)" }}>
                    <span style={{ flex: 1 }}>{f.q}</span>
                    <ChevronRight size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)", flexShrink: 0 }} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title={title(<Ticket {...I} />, "Your tickets")}>
          {tickets.length === 0 ? (
            <EmptyState icon="💬" headline="No support tickets" sub="Raise one above and the conversation appears here." />
          ) : (
            <div style={{ display: "grid", gap: "var(--sp-3)" }}>
              {tickets.map((t) => (
                <div key={t.id} id={t.id} style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius)", overflow: "hidden", scrollMarginTop: 90 }}>
                  <div className="vh-row-between" style={{ gap: 10, flexWrap: "wrap", padding: "10px 14px", background: "var(--vh-bg-subtle)", borderBottom: "1px solid var(--vh-line)" }}>
                    <span className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700 }}>{t.subject}</span>
                      <span className="vh-pill vh-pill-neutral">{t.category}</span>
                      <span className="small muted mono">{t.id}</span>
                    </span>
                    <span className="vh-row" style={{ gap: 8 }}>
                      <span className="small muted">{t.sellerStore ? `with ${t.sellerStore}` : "with Vedic Hemp"}</span>
                      <StatusPill tone={TICKET_TONE[t.status]}>{t.status}</StatusPill>
                    </span>
                  </div>
                  <div style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
                    {t.messages.map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: m.from === "buyer" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "80%", borderRadius: "var(--vh-radius-sm)", padding: "8px 12px", background: m.from === "buyer" ? "var(--vh-green-100)" : "var(--vh-surface)", border: "1px solid var(--vh-line)" }}>
                          <div className="small" style={{ fontWeight: 700, color: "var(--vh-ink)" }}>{PARTY_LABEL[m.from]} <span className="muted" style={{ fontWeight: 400 }}>· {m.at}</span></div>
                          <div className="small" style={{ marginTop: 2 }}>{m.body}</div>
                        </div>
                      </div>
                    ))}
                    {t.status !== "CLOSED" ? (
                      <form action={replyTicket} className="vh-row" style={{ gap: 8, alignItems: "flex-end", marginTop: 4 }}>
                        <input type="hidden" name="ticketId" value={t.id} />
                        <input className="vh-input" name="body" placeholder="Type a reply…" style={{ flex: 1 }} aria-label={`Reply to ${t.id}`} />
                        <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Send</button>
                      </form>
                    ) : (
                      <p className="small muted" style={{ margin: 0 }}>This ticket is closed.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
