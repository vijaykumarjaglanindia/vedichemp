/**
 * VEDIC HEMP — SUPPORT TICKETS
 *
 * A real, threaded support system. A buyer opens a ticket; if it's about an
 * order it routes to that seller, otherwise (and always for medical topics) it
 * routes to the platform (admin). Everyone in the thread can reply; the seller
 * can escalate to the platform; the admin can take over and close. Replies are
 * copy-checked by the calling action, like every other message on the platform.
 *
 * Medical routing note (A4): a prescription/medical ticket never lands in a
 * seller's queue — it goes straight to the platform, where the sensitive-access
 * rules apply. The store below is the DB seam.
 */

export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
export type Party = "buyer" | "seller" | "admin";

export interface TicketMessage {
  from: Party;
  author: string;
  body: string;
  at: string; // YYYY-MM-DD
}

export interface Ticket {
  id: string;
  subject: string;
  buyerEmail: string;
  sellerStore?: string; // set when the ticket is with a seller; absent = platform
  orderRef?: string;
  category: string;
  status: TicketStatus;
  escalated: boolean;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

interface SupportStore {
  tickets: Ticket[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhSupport: SupportStore | undefined;
}

function seed(): Ticket[] {
  return [
    {
      id: "TK1001", subject: "Order issue · VH2026070931", buyerEmail: "buyer@example.in", sellerStore: "Vedic Botanicals",
      orderRef: "VH2026070931", category: "Order issue", status: "OPEN", escalated: false,
      createdAt: "2026-07-10", updatedAt: "2026-07-10",
      messages: [{ from: "buyer", author: "buyer", body: "The balm arrived with a dented lid — is that expected?", at: "2026-07-10" }],
    },
    {
      id: "TK1002", subject: "Account & security · sign-in", buyerEmail: "buyer@example.in", category: "Account & security",
      status: "PENDING", escalated: false, createdAt: "2026-07-08", updatedAt: "2026-07-09",
      messages: [
        { from: "buyer", author: "buyer", body: "I'd like to add a passkey to my account.", at: "2026-07-08" },
        { from: "admin", author: "support.rao", body: "You can add one from Profile → Security. Let us know if the prompt doesn't appear.", at: "2026-07-09" },
      ],
    },
  ];
}

function store(): SupportStore {
  globalThis.__vhSupport ??= { tickets: seed(), seq: 2000 };
  return globalThis.__vhSupport;
}

const today = () => new Date().toISOString().slice(0, 10);

export interface CreateTicketInput {
  buyerEmail: string;
  subject: string;
  category: string;
  body: string;
  orderRef?: string;
  sellerStore?: string; // absent = platform ticket
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const s = store();
  const t: Ticket = {
    id: `TK${s.seq++}`,
    subject: input.subject,
    buyerEmail: input.buyerEmail,
    ...(input.sellerStore ? { sellerStore: input.sellerStore } : {}),
    ...(input.orderRef ? { orderRef: input.orderRef } : {}),
    category: input.category,
    status: "OPEN",
    escalated: false,
    createdAt: today(),
    updatedAt: today(),
    messages: [{ from: "buyer", author: input.buyerEmail.split("@")[0]!, body: input.body, at: today() }],
  };
  s.tickets.unshift(t);
  return t;
}

export async function ticketsForBuyer(email: string): Promise<Ticket[]> {
  return store().tickets.filter((t) => t.buyerEmail === email).sort(byUpdated);
}
export async function ticketsForSeller(storeName: string): Promise<Ticket[]> {
  return store().tickets.filter((t) => t.sellerStore === storeName).sort(byUpdated);
}
export async function allTickets(): Promise<Ticket[]> {
  return [...store().tickets].sort(byUpdated);
}
/** Platform queue: tickets with no seller, or escalated ones. */
export async function platformTickets(): Promise<Ticket[]> {
  return store().tickets.filter((t) => !t.sellerStore || t.escalated).sort(byUpdated);
}

function byUpdated(a: Ticket, b: Ticket): number {
  return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
}

export function findTicket(id: string): Ticket | undefined {
  return store().tickets.find((t) => t.id === id);
}

export type TicketResult = { ok: true; ticket: Ticket } | { ok: false; reason: string };

/** Post a reply. A reply from a party re-opens a resolved ticket to PENDING. */
export async function addMessage(id: string, from: Party, author: string, body: string): Promise<TicketResult> {
  const t = findTicket(id);
  if (!t) return { ok: false, reason: "missing" };
  if (t.status === "CLOSED") return { ok: false, reason: "closed" };
  t.messages.push({ from, author, body, at: today() });
  t.status = from === "buyer" ? "OPEN" : "PENDING";
  t.updatedAt = today();
  return { ok: true, ticket: t };
}

export async function setStatus(id: string, status: TicketStatus): Promise<TicketResult> {
  const t = findTicket(id);
  if (!t) return { ok: false, reason: "missing" };
  t.status = status;
  t.updatedAt = today();
  return { ok: true, ticket: t };
}

/** Seller escalates to the platform: the ticket now also shows in the admin queue. */
export async function escalate(id: string): Promise<TicketResult> {
  const t = findTicket(id);
  if (!t) return { ok: false, reason: "missing" };
  t.escalated = true;
  t.updatedAt = today();
  return { ok: true, ticket: t };
}

export const TICKET_TONE: Record<TicketStatus, "ok" | "warn" | "info" | "neutral"> = {
  OPEN: "warn", PENDING: "info", RESOLVED: "ok", CLOSED: "neutral",
};
