/**
 * VEDIC HEMP — NOTIFICATION CENTRE (§0.9)
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Notifications" };

interface NotificationRow { id: string; category: string; kind: "Transactional" | "Promotional"; title: string; body: string; at: string; unread: boolean }

const NOTIFICATIONS: NotificationRow[] = [
  { id: "n1", category: "Orders", kind: "Transactional", title: "Your order is out for delivery", body: "VH2026070912 arrives today by 7 PM.", at: "2h ago", unread: true },
  { id: "n2", category: "Medical", kind: "Transactional", title: "Your prescription was viewed", body: "pharmacist.das viewed your Rx for verification.", at: "Yesterday", unread: true },
  { id: "n3", category: "Wallet", kind: "Transactional", title: "Refund credited", body: "₹2,499.00 credited to your Wallet.", at: "3 days ago", unread: false },
  { id: "n4", category: "Offers", kind: "Promotional", title: "15% off Ayurveda essentials", body: "Picked for you based on your recent browsing.", at: "5 days ago", unread: false },
];

const SUPPRESSION_MATRIX: { category: string; kind: "Transactional" | "Promotional"; suppressible: boolean; note: string }[] = [
  { category: "Order status", kind: "Transactional", suppressible: false, note: "Always delivered — required for delivery coordination." },
  { category: "Prescription access (A4)", kind: "Transactional", suppressible: false, note: "Buyer notice on sensitive reads is mandatory, not a preference." },
  { category: "Payment / wallet", kind: "Transactional", suppressible: false, note: "Money movement must always be confirmed to the buyer." },
  { category: "Subscription reminders", kind: "Transactional", suppressible: true, note: "Can be muted; skip/pause still applies silently." },
  { category: "Offers & recommendations", kind: "Promotional", suppressible: true, note: "Gated on the personalisation/marketing consent toggle." },
  { category: "Newsletters", kind: "Promotional", suppressible: true, note: "Opt-in only; off by default." },
];

export default function NotificationsPage() {
  return (
    <Shell active="/account/notifications" breadcrumb={["My Account", "Notifications"]} title="Notifications">
      <div className="vh-grid" style={{ gap: 18 }}>
        <Card title="Recent">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {NOTIFICATIONS.map((n) => (
              <li key={n.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 12 }}>
                <span>
                  <span className="vh-row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="vh-pill vh-pill-neutral">{n.category}</span>
                    <StatusPill tone={n.kind === "Transactional" ? "info" : "neutral"}>{n.kind}</StatusPill>
                    {n.unread && <StatusPill tone="warn">Unread</StatusPill>}
                  </span>
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  <div className="small muted">{n.body}</div>
                </span>
                <span className="small muted">{n.at}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="What can be turned off" action={<span className="small muted">§0.9 suppression matrix</span>}>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <th style={{ textAlign: "left" }}>Kind</th>
                  <th style={{ textAlign: "left" }}>Suppressible?</th>
                  <th style={{ textAlign: "left" }}>Why</th>
                </tr>
              </thead>
              <tbody>
                {SUPPRESSION_MATRIX.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td><StatusPill tone={row.kind === "Transactional" ? "info" : "neutral"}>{row.kind}</StatusPill></td>
                    <td><StatusPill tone={row.suppressible ? "ok" : "danger"}>{row.suppressible ? "Yes" : "No — always sent"}</StatusPill></td>
                    <td className="small muted">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
