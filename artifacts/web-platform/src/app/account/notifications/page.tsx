/**
 * VEDIC HEMP — NOTIFICATION CENTRE (§0.9)
 *
 * The category filter is a server-driven searchParam — plain links, so it
 * works without JavaScript. The suppression matrix below is the §0.9
 * contract: A4 access notices and money movement can never be muted.
 */

import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, EmptyState } from "@/components/ui";
import { SUPPRESSION_MATRIX } from "../_lib/data";
import { NotifFeed } from "@/components/NotifFeed";
import { getSession } from "@/lib/auth-lite";
import { notificationsFor } from "@/lib/notify";
import { markNotif, markAllNotif } from "./actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const email = (await getSession())?.email ?? "guest@vedichemp.in";
  const liveItems = await notificationsFor("buyer", email);

  return (
    <Shell active="/account/notifications" breadcrumb={["My Account", "Notifications"]} title="Notifications">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* Live feed — real events on this account (order, refund, return). The
            static list below is the §0.9 illustration of categories + the
            suppression contract, which are policy, not per-event. */}
        {liveItems.length > 0 && (
          <NotifFeed items={liveItems} markRead={markNotif} markAll={markAllNotif} />
        )}

        {/* No fabricated "recent" list — when there's no live activity yet, an
            honest empty state. The suppression matrix below is policy, not
            per-user activity, so it stays. */}
        {liveItems.length === 0 && (
          <Card>
            <EmptyState icon="🔔" headline="No notifications yet" sub="Order, refund and prescription updates for your account will appear here." />
          </Card>
        )}

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
