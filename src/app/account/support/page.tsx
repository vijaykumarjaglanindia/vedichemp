/**
 * VEDIC HEMP — SUPPORT & TICKETS
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, EmptyState, type Column } from "@/components/ui";

export const metadata: Metadata = { title: "Support" };

interface Ticket { id: string; subject: string; category: string; status: string; updatedAt: string }

const TICKETS: Ticket[] = [
  { id: "t1", subject: "Return not picked up yet", category: "Orders", status: "OPEN", updatedAt: "2026-07-08" },
  { id: "t2", subject: "Wallet refund shows pending", category: "Wallet", status: "AWAITING_REPLY", updatedAt: "2026-07-05" },
  { id: "t3", subject: "Wrong item in order VH2026063099", category: "Orders", status: "RESOLVED", updatedAt: "2026-06-29" },
];

const FAQS = [
  { q: "How do I track my order?", href: "/account/orders" },
  { q: "How long does a refund take to reach my Wallet?", href: "/account/wallet" },
  { q: "Why can't I see Medical Cannabis products?", href: "/account/medical" },
  { q: "How do I pause or skip a subscription?", href: "/account/subscriptions" },
];

export default function SupportPage() {
  const columns: Column<Ticket>[] = [
    { key: "subject", header: "Ticket", render: (t) => <span style={{ fontWeight: 600 }}>{t.subject}</span> },
    { key: "category", header: "Category", render: (t) => <span className="vh-pill vh-pill-neutral">{t.category}</span> },
    { key: "status", header: "Status", render: (t) => <StatusPill tone={toneForStatus(t.status)}>{t.status.replace(/_/g, " ")}</StatusPill> },
    { key: "updatedAt", header: "Updated", render: (t) => <span className="small muted">{t.updatedAt}</span> },
  ];

  return (
    <Shell active="/account/support" breadcrumb={["My Account", "Support"]} title="Support & tickets">
      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: 18 }}>
        <Card title="Raise a new ticket">
          <div style={{ display: "grid", gap: 12 }}>
            <label className="small muted" htmlFor="topic">Topic</label>
            <select id="topic" disabled>
              <option>Order issue</option>
              <option>Wallet / refund</option>
              <option>Prescription / Medical</option>
              <option>Account & security</option>
              <option>Something else</option>
            </select>
            <label className="small muted" htmlFor="desc">Describe the issue</label>
            <textarea id="desc" rows={4} disabled placeholder="Tell us what happened…" />
            <span className="vh-btn vh-btn-primary vh-btn-sm" aria-disabled style={{ justifySelf: "start" }}>
              Submit ticket
            </span>
            <p className="small muted" style={{ margin: 0 }}>
              Prescription-related tickets are routed to Pharmacist/Compliance only; support agents cannot
              view your Rx image without a logged reason.
            </p>
          </div>
        </Card>

        <Card title="Frequently asked">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {FAQS.map((f) => (
              <li key={f.q}>
                <a href={f.href}>{f.q} →</a>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Your tickets" pad0>
        <DataTable columns={columns} rows={TICKETS} empty={<EmptyState icon="💬" headline="No support tickets" />} />
      </Card>
    </Shell>
  );
}
