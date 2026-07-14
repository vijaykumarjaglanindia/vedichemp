/**
 * VEDIC HEMP — ADMIN NOTIFICATION CENTRE
 *
 * The operations queue as a feed: returns to adjudicate, withdrawals to
 * approve, CoAs and listings awaiting review. Each row is written by the
 * server action that raised the work, so the feed is the live worklist —
 * click through and the action is one step away.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { NotifFeed } from "@/components/NotifFeed";
import { notificationsFor } from "@/lib/notify";
import { markNotif, markAllNotif } from "./actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const items = await notificationsFor("admin", "admin");
  return (
    <Shell active="/admin/notifications" breadcrumb={["Admin Console", "Notifications"]} title="Notifications">
      <NotifFeed items={items} markRead={markNotif} markAll={markAllNotif} />
    </Shell>
  );
}
