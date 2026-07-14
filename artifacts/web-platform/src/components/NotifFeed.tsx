/**
 * VEDIC HEMP — NOTIFICATIONS FEED (shared, presentational)
 *
 * Renders a live notification list for any console. The mark-read server
 * actions are passed in by each role's page (buyer / seller / admin), so
 * this component stays presentational and identity-agnostic.
 */

import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { notifyMeta, type Notification } from "@/lib/notify";

export function NotifFeed({
  items,
  markRead,
  markAll,
}: {
  items: Notification[];
  markRead: (formData: FormData) => void | Promise<void>;
  markAll: (formData: FormData) => void | Promise<void>;
}) {
  const unread = items.filter((n) => !n.read).length;

  return (
    <Card
      pad0
      title={<span className="vh-row" style={{ gap: 8 }}>🔔 Notifications{unread ? ` · ${unread} unread` : ""}</span>}
      action={
        unread ? (
          <form action={markAll}>
            <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit">Mark all read</button>
          </form>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div style={{ padding: 8 }}>
          <EmptyState icon="🔔" headline="You're all caught up" sub="New order, compliance and money updates will appear here as they happen." />
        </div>
      ) : (
        <div>
          {items.slice(0, 40).map((n) => {
            const meta = notifyMeta(n.kind);
            return (
              <div key={n.id} className={`vh-notif-row${n.read ? "" : " unread"}`}>
                <span aria-hidden style={{ fontSize: "1.05rem" }}>{meta.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, color: "var(--vh-ink)" }}>
                    <Link href={n.href}>{n.title}</Link>
                  </div>
                  <div className="small muted">{n.body}</div>
                  <div className="small muted" style={{ marginTop: 2 }}>{n.createdAt.slice(0, 16).replace("T", " ")}</div>
                </div>
                <div className="vh-row" style={{ gap: 6 }}>
                  <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={n.href}>Open</Link>
                  {!n.read && (
                    <form action={markRead}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="vh-btn vh-btn-sm vh-btn-ghost" type="submit" aria-label="Mark read">✓</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
