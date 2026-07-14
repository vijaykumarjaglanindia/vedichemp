/**
 * VEDIC HEMP — NOTIFICATIONS (a live "what needs my attention" feed)
 *
 * Every role gets real, event-driven notifications instead of a static seed:
 *   - buyers: order placed / shipped / delivered / refunded, return updates
 *   - sellers: new order, CoA decision, listing approved/rejected/suspended,
 *              return to action, withdrawal decision, low stock
 *   - admins: returns to adjudicate, withdrawals to approve, CoA/listing queues
 *
 * Emitters live in the server actions that already own each event, so a
 * notification is written in the same step as the state change it describes.
 * Server-side store = the DB seam (a `Notification` table keyed by recipient).
 */

export type Audience = "buyer" | "seller" | "admin";

export interface Notification {
  id: string;
  audience: Audience;
  recipient: string; // buyer email · seller store name · "admin"
  kind: string; // e.g. ORDER_NEW, COA_APPROVED, LOW_STOCK
  title: string;
  body: string;
  href: string; // where clicking takes them
  createdAt: string;
  read: boolean;
}

interface NotifyStore {
  items: Notification[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhNotifications: NotifyStore | undefined;
}

function store(): NotifyStore {
  globalThis.__vhNotifications ??= { items: [], seq: 1 };
  return globalThis.__vhNotifications;
}

const now = () => new Date().toISOString();

/** Write a notification. De-dupes an identical unread one within the last hour. */
export async function notify(
  audience: Audience,
  recipient: string,
  n: { kind: string; title: string; body: string; href: string },
): Promise<void> {
  const s = store();
  s.items.unshift({
    id: `nt${s.seq++}`,
    audience,
    recipient,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    createdAt: now(),
    read: false,
  });
  // Keep the feed bounded per process.
  if (s.items.length > 500) s.items.length = 500;
}

export async function notificationsFor(audience: Audience, recipient: string): Promise<Notification[]> {
  return store().items.filter((n) => n.audience === audience && n.recipient === recipient);
}

export async function unreadCount(audience: Audience, recipient: string): Promise<number> {
  return store().items.filter((n) => n.audience === audience && n.recipient === recipient && !n.read).length;
}

export async function markRead(id: string): Promise<void> {
  const n = store().items.find((x) => x.id === id);
  if (n) n.read = true;
}

/**
 * Mark one notification read, but only if it belongs to the caller. The page's
 * server action resolves (audience, recipient) from the session — a forged id
 * for someone else's notification is a no-op, never a cross-tenant read.
 */
export async function markReadOwned(audience: Audience, recipient: string, id: string): Promise<void> {
  const n = store().items.find((x) => x.id === id && x.audience === audience && x.recipient === recipient);
  if (n) n.read = true;
}

export async function markAllRead(audience: Audience, recipient: string): Promise<void> {
  for (const n of store().items) {
    if (n.audience === audience && n.recipient === recipient) n.read = true;
  }
}

/** Icon + tone hint per kind, for the UI. */
export function notifyMeta(kind: string): { emoji: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" } {
  if (kind.startsWith("ORDER_NEW")) return { emoji: "🛒", tone: "info" };
  if (kind.startsWith("ORDER_")) return { emoji: "📦", tone: "info" };
  if (kind.includes("DELIVER")) return { emoji: "✅", tone: "ok" };
  if (kind.includes("REFUND") || kind.includes("CANCEL")) return { emoji: "💸", tone: "ok" };
  if (kind.includes("RETURN")) return { emoji: "↩️", tone: "warn" };
  if (kind.includes("COA_APPROVED") || kind.includes("APPROVE")) return { emoji: "🎉", tone: "ok" };
  if (kind.includes("REJECT") || kind.includes("SUSPEND")) return { emoji: "⛔", tone: "danger" };
  if (kind.includes("LOW_STOCK")) return { emoji: "📉", tone: "warn" };
  if (kind.includes("WITHDRAW")) return { emoji: "🏦", tone: "info" };
  return { emoji: "🔔", tone: "neutral" };
}
