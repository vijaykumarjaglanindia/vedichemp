/**
 * VEDIC HEMP — NOTIFICATION CENTRE (§0.9)
 *
 * The category filter is a server-driven searchParam — plain links, so it
 * works without JavaScript. The suppression matrix below is the §0.9
 * contract: A4 access notices and money movement can never be muted.
 */

import type { Metadata } from "next";
import { Inbox, SlidersHorizontal } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, EmptyState } from "@/components/ui";
import { NOTIFICATIONS, SUPPRESSION_MATRIX } from "../_lib/data";

export const metadata: Metadata = { title: "Notifications" };

const FILTERS = [
  { key: "all", label: "All", categories: null },
  { key: "orders", label: "Orders", categories: ["Orders"] },
  { key: "rx", label: "Rx", categories: ["Medical"] },
  { key: "offers", label: "Offers", categories: ["Offers"] },
] as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? "all";
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];

  const rows = NOTIFICATIONS.filter(
    (n) => active.categories === null || (active.categories as readonly string[]).includes(n.category),
  );
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <Shell active="/account/notifications" breadcrumb={["My Account", "Notifications"]} title="Notifications">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* Filter toolbar */}
        <div className="vh-row-between" style={{ flexWrap: "wrap", gap: 8 }}>
          <nav className="vh-seg" aria-label="Filter notifications">
            {FILTERS.map((f) => (
              <a
                key={f.key}
                href={f.key === "all" ? "/account/notifications" : `/account/notifications?filter=${f.key}`}
                className={f.key === active.key ? "on" : undefined}
                aria-current={f.key === active.key ? "true" : undefined}
              >
                {f.label}
              </a>
            ))}
          </nav>
          <span className="small muted tabular">{unreadCount} unread</span>
        </div>

        <Card
          title={
            <span className="vh-row" style={{ gap: 8 }}>
              <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>
                <Inbox size={16} strokeWidth={2.2} />
              </span>
              Recent
            </span>
          }
        >
          {rows.length === 0 ? (
            <EmptyState icon="🔔" headline="Nothing in this category" sub="Try another filter." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {rows.map((n) => (
                <li key={n.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 8, alignItems: "flex-start" }}>
                  <span className="vh-row" style={{ gap: 12, alignItems: "flex-start" }}>
                    {/* Unread dot — paired with the "New" pill so colour never carries meaning alone */}
                    <span
                      aria-hidden
                      style={{
                        width: 8, height: 8, borderRadius: 999, marginTop: 8, flexShrink: 0,
                        background: n.unread ? "var(--vh-accent)" : "transparent",
                        border: n.unread ? "none" : "1px solid var(--vh-line)",
                      }}
                    />
                    <span>
                      <span className="vh-row" style={{ gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span className="vh-pill vh-pill-neutral">{n.category}</span>
                        <StatusPill tone={n.kind === "Transactional" ? "info" : "neutral"}>{n.kind}</StatusPill>
                        {n.unread && <StatusPill tone="warn">New</StatusPill>}
                      </span>
                      <div style={{ fontWeight: n.unread ? 700 : 600 }}>{n.title}</div>
                      <div className="small muted">{n.body}</div>
                    </span>
                  </span>
                  <span className="small muted" style={{ whiteSpace: "nowrap" }}>{n.at}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={
            <span className="vh-row" style={{ gap: 8 }}>
              <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>
                <SlidersHorizontal size={16} strokeWidth={2.2} />
              </span>
              What can be turned off
            </span>
          }
          action={<span className="small muted">§0.9 suppression matrix</span>}
        >
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
