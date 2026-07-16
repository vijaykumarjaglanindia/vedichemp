import "server-only";

/**
 * VEDIC HEMP — ADVERSE EVENTS / PHARMACOVIGILANCE (A3, append-only)
 *
 * A buyer (or seller) can report a suspected side effect from a product. These
 * are SAFETY RECORDS: like recalls and audit rows they cannot be deleted or
 * altered (A3). The report NARRATIVE is immutable; triage is tracked as a
 * SEPARATE append-only log of status events referencing the report, so the
 * report itself is never edited.
 *
 * The narrative can contain health information about the reporter, so it is
 * treated as sensitive — it is shown only in the compliance console and is
 * NEVER written into an audit note, notification body, or analytics event
 * (§6). Audit rows carry the event id and the action, never the narrative.
 */

export type Severity = "MILD" | "MODERATE" | "SEVERE";
export type AeStatus = "OPEN" | "ACKNOWLEDGED" | "TRIAGED" | "CLOSED";
export type ReporterRole = "BUYER" | "SELLER";

export interface AdverseEvent {
  id: string;
  productId?: string;
  productTitle: string;
  orderRef?: string;
  reporter: string; // email
  reporterRole: ReporterRole;
  severity: Severity;
  narrative: string; // SENSITIVE — compliance-only, never logged
  at: string;
}

export interface TriageEvent {
  seq: number;
  eventId: string;
  at: string;
  actor: string;
  status: AeStatus;
  note: string; // reviewer note — not the narrative
}

interface AeStore {
  reports: AdverseEvent[]; // append-only
  triage: TriageEvent[]; // append-only status log
  seq: number;
  triageSeq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhAdverseEvents: AeStore | undefined;
}

function store(): AeStore {
  globalThis.__vhAdverseEvents ??= { reports: [], triage: [], seq: 1, triageSeq: 1 };
  return globalThis.__vhAdverseEvents;
}

const today = () => new Date().toISOString().slice(0, 10);

export function isSeverity(v: string): v is Severity {
  return v === "MILD" || v === "MODERATE" || v === "SEVERE";
}

export async function reportAdverseEvent(input: {
  productId?: string; productTitle: string; orderRef?: string; reporter: string; reporterRole: ReporterRole; severity: Severity; narrative: string;
}): Promise<AdverseEvent> {
  const s = store();
  const ev: AdverseEvent = {
    id: `ae-${s.seq++}`,
    ...(input.productId ? { productId: input.productId } : {}),
    productTitle: input.productTitle,
    ...(input.orderRef ? { orderRef: input.orderRef } : {}),
    reporter: input.reporter,
    reporterRole: input.reporterRole,
    severity: input.severity,
    narrative: input.narrative,
    at: today(),
  };
  s.reports.unshift(ev);
  return ev;
}

export function findEvent(id: string): AdverseEvent | undefined {
  return store().reports.find((e) => e.id === id);
}

/** Current status of a report — derived from its latest triage event. */
export function statusOf(id: string): AeStatus {
  const events = store().triage.filter((t) => t.eventId === id);
  return events.length ? events[events.length - 1]!.status : "OPEN";
}

export async function allEvents(): Promise<(AdverseEvent & { status: AeStatus })[]> {
  return store().reports.map((e) => ({ ...e, status: statusOf(e.id) })).sort((a, b) => {
    const rank = (s: AeStatus) => (s === "CLOSED" ? 1 : 0);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return a.at < b.at ? 1 : -1;
  });
}

export async function openEventCount(): Promise<number> {
  return store().reports.filter((e) => statusOf(e.id) !== "CLOSED").length;
}

export async function triageFor(id: string): Promise<TriageEvent[]> {
  return store().triage.filter((t) => t.eventId === id);
}

export type TriageResult = { ok: true; status: AeStatus } | { ok: false; reason: string };

const NEXT: Record<AeStatus, AeStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "TRIAGED", "CLOSED"],
  ACKNOWLEDGED: ["TRIAGED", "CLOSED"],
  TRIAGED: ["CLOSED"],
  CLOSED: [],
};

/** Append a triage status change. Never edits the report — a new row (A3). */
export async function triageEvent(id: string, to: AeStatus, actor: string, note: string): Promise<TriageResult> {
  const ev = findEvent(id);
  if (!ev) return { ok: false, reason: "missing" };
  const from = statusOf(id);
  if (!NEXT[from].includes(to)) return { ok: false, reason: "state" };
  const s = store();
  s.triage.push({ seq: s.triageSeq++, eventId: id, at: today(), actor, status: to, note });
  return { ok: true, status: to };
}
