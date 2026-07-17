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

import { redactHealthData } from "@/lib/s6";

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
  /** §6: set when the health-data guard redacted a clinical term from the
   *  title/body before sending. A backstop — should be 0 in normal operation. */
  s6Redacted?: boolean;
}

interface NotifyStore {
  items: Notification[];
  seq: number;
  s6Redactions: number; // running count of §6 redactions (append-only tally)
}

declare global {
  // eslint-disable-next-line no-var
  var __vhNotifications: NotifyStore | undefined;
}

function store(): NotifyStore {
  globalThis.__vhNotifications ??= { items: [], seq: 1, s6Redactions: 0 };
  const s = globalThis.__vhNotifications;
  if (typeof s.s6Redactions !== "number") s.s6Redactions = 0; // tolerate an older store
  return s;
}

const now = () => new Date().toISOString();

/** Write a notification. §6: the title and body pass the health-data guard
 *  before anything is stored/sent — a clinical term is redacted (fail closed on
 *  the leak) but the sanitised notification is still delivered (fail open on
 *  delivery). A redaction is counted so it's loud and fixable. */
export async function notify(
  audience: Audience,
  recipient: string,
  n: { kind: string; title: string; body: string; href: string },
): Promise<void> {
  const s = store();
  const t = redactHealthData(n.title);
  const b = redactHealthData(n.body);
  const s6Redacted = t.redacted || b.redacted;
  if (s6Redacted) s.s6Redactions += 1;
  s.items.unshift({
    id: `nt${s.seq++}`,
    audience,
    recipient,
    kind: n.kind,
    title: t.text,
    body: b.text,
    href: n.href,
    createdAt: now(),
    read: false,
    ...(s6Redacted ? { s6Redacted: true } : {}),
  });
  // Keep the feed bounded per process.
  if (s.items.length > 500) s.items.length = 500;
}

/** Every notification across all audiences, newest first — the ops outbox. */
export async function allNotifications(limit = 200): Promise<Notification[]> {
  return store().items.slice(0, limit);
}

/** Running count of §6 health-data redactions caught at the notify boundary. */
export async function s6RedactionCount(): Promise<number> {
  return store().s6Redactions;
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
