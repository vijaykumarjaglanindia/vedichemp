/**
 * VEDIC HEMP — SUPPORT & TICKETS
 *
 * Prescription-related tickets route to Pharmacist/Compliance only; a support
 * agent cannot open an Rx image without a logged reason (A4) — the note under
 * the form keeps that visible to the buyer.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChevronRight, HelpCircle, MessageSquarePlus, Ticket } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, EmptyState, type Column } from "@/components/ui";
import { TICKETS, FAQS, type Ticket as TicketRow } from "../_lib/data";

export const metadata: Metadata = { title: "Support" };

const I = { size: 16, strokeWidth: 2.2 } as const;

function title(icon: ReactNode, text: string) {
  return (
    <span className="vh-row" style={{ gap: 8 }}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {text}
    </span>
  );
}

export default function SupportPage() {
  const columns: Column<TicketRow>[] = [
    { key: "subject", header: "Ticket", render: (t) => <span style={{ fontWeight: 600 }}>{t.subject}</span> },
    { key: "category", header: "Category", render: (t) => <span className="vh-pill vh-pill-neutral">{t.category}</span> },
    { key: "status", header: "Status", render: (t) => <StatusPill tone={toneForStatus(t.status)}>{t.status.replace(/_/g, " ")}</StatusPill> },
    { key: "updatedAt", header: "Updated", render: (t) => <span className="small muted tabular">{t.updatedAt}</span> },
  ];

  return (
    <Shell active="/account/support" breadcrumb={["My Account", "Support"]} title="Support & tickets">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
          <Card title={title(<MessageSquarePlus {...I} />, "Raise a new ticket")}>
            <div style={{ display: "grid", gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="topic">
                  Topic <span className="req">*</span>
                </label>
                <select className="vh-select" id="topic" disabled defaultValue="Order issue">
                  <option>Order issue</option>
                  <option>Wallet / refund</option>
                  <option>Prescription / Medical</option>
                  <option>Account & security</option>
                  <option>Something else</option>
                </select>
              </div>

              <div className="vh-field">
                <label className="vh-label" htmlFor="orderref">Order reference (optional)</label>
                <input className="vh-input" id="orderref" placeholder="e.g. VH2026070912" disabled />
                <span className="vh-help">Including it routes your ticket to the right seller faster.</span>
              </div>

              <div className="vh-field">
                <label className="vh-label" htmlFor="desc">
                  Describe the issue <span className="req">*</span>
                </label>
                <textarea className="vh-textarea" id="desc" rows={4} disabled placeholder="Tell us what happened…" />
                <span className="vh-help vh-row-between">
                  <span>Minimum 20 characters — the more detail, the faster the fix.</span>
                  <span className="tabular">0 / 1,000</span>
                </span>
              </div>

              <span className="vh-btn vh-btn-primary vh-btn-sm" aria-disabled style={{ justifySelf: "start" }}>
                Submit ticket
              </span>
              <p className="small muted" style={{ margin: 0 }}>
                Prescription-related tickets are routed to Pharmacist/Compliance only; support agents cannot
                view your Rx image without a logged reason.
              </p>
            </div>
          </Card>

          <Card title={title(<HelpCircle {...I} />, "Frequently asked")}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {FAQS.map((f) => (
                <li key={f.q}>
                  <a href={f.href} className="vh-row" style={{ gap: 8, padding: "8px 0", borderBottom: "1px solid var(--vh-line)" }}>
                    <span style={{ flex: 1 }}>{f.q}</span>
                    <ChevronRight size={16} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-muted)", flexShrink: 0 }} />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title={title(<Ticket {...I} />, "Your tickets")} pad0>
          <DataTable columns={columns} rows={TICKETS} empty={<EmptyState icon="💬" headline="No support tickets" />} />
        </Card>
      </div>
    </Shell>
  );
}
