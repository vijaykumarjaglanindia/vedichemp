/**
 * VEDIC HEMP — SELLER NOTIFICATION CENTRE
 *
 * A live "what needs my attention" feed, written by the same server actions
 * that own each event: a new order, a CoA decision, a listing approval, a
 * return to action, a withdrawal decision, a low-stock signal. Nothing here
 * is seeded — every row is a real state change on this storefront.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { NotifFeed } from "@/components/NotifFeed";
import { notificationsFor } from "@/lib/notify";
import { markNotif, markAllNotif } from "./actions";
import { actingStore } from "../_lib/store";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";


export default async function SellerNotificationsPage() {
  const STORE = await actingStore();
  const items = await notificationsFor("seller", STORE);
  return (
    <Shell active="/seller/notifications" breadcrumb={["Seller Central", "Notifications"]} title="Notifications">
      <NotifFeed items={items} markRead={markNotif} markAll={markAllNotif} />
    </Shell>
  );
}
