import "server-only";

/**
 * VEDIC HEMP — RECALL REGISTER (A3, append-only)
 *
 * A3: recall records cannot be deleted or altered — corrections are new rows.
 * A recall is therefore a SEQUENCE of immutable events sharing a `ref`: an
 * INITIATE opens it (freezing the named batches from sale), a CLOSE ends it.
 * Closing appends a CLOSE event — it never removes the INITIATE. Every event
 * carries the actor and a monotonic seq, so the full history is reconstructable
 * and nothing that happened can be made to un-happen.
 *
 * A6 lives in the caller: the admin who initiated a recall may not close it.
 */

export type RecallKind = "INITIATE" | "CLOSE";

export interface RecallEvent {
  seq: number;
  ref: string; // recall reference (shared across its INITIATE/CLOSE events)
  kind: RecallKind;
  at: string; // ISO date
  actor: string; // admin email
  reason: string;
  batches: string[]; // affected batch codes (frozen while the recall is open)
}

interface RecallStore {
  events: RecallEvent[]; // append-only, newest first
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhRecalls: RecallStore | undefined;
}

function store(): RecallStore {
  globalThis.__vhRecalls ??= { events: [], seq: 1 };
  return globalThis.__vhRecalls;
}

const today = () => new Date().toISOString().slice(0, 10);

/** The full immutable register, newest event first. */
export async function recallEvents(): Promise<RecallEvent[]> {
  return [...store().events];
}

/** Refs that have an INITIATE and no later CLOSE. */
function openRefs(): Set<string> {
  const open = new Set<string>();
  // events are newest-first; walk oldest-first to apply in order
  for (const e of [...store().events].reverse()) {
    if (e.kind === "INITIATE") open.add(e.ref);
    else open.delete(e.ref);
  }
  return open;
}

export interface OpenRecallView {
  ref: string;
  at: string;
  initiator: string;
  reason: string;
  batches: string[];
}

export async function openRecalls(): Promise<OpenRecallView[]> {
  const open = openRefs();
  const seen = new Set<string>();
  const out: OpenRecallView[] = [];
  for (const e of store().events) {
    if (e.kind === "INITIATE" && open.has(e.ref) && !seen.has(e.ref)) {
      seen.add(e.ref);
      out.push({ ref: e.ref, at: e.at, initiator: e.actor, reason: e.reason, batches: e.batches });
    }
  }
  return out;
}

export async function isRecallOpen(ref: string): Promise<boolean> {
  return openRefs().has(ref);
}

/** All batch codes currently frozen by an open recall. */
export async function frozenBatches(): Promise<Set<string>> {
  const frozen = new Set<string>();
  for (const r of await openRecalls()) for (const b of r.batches) frozen.add(b.toUpperCase());
  return frozen;
}

function initiatorOf(ref: string): string | null {
  // newest-first — the last INITIATE for this ref is its opener
  const ev = store().events.find((e) => e.ref === ref && e.kind === "INITIATE");
  return ev?.actor ?? null;
}

export type RecallResult = { ok: true; event: RecallEvent } | { ok: false; reason: string };

export async function initiateRecall(input: { ref: string; actor: string; reason: string; batches: string[] }): Promise<RecallResult> {
  if (await isRecallOpen(input.ref)) return { ok: false, reason: "open" };
  const s = store();
  const event: RecallEvent = {
    seq: s.seq++, ref: input.ref, kind: "INITIATE", at: today(), actor: input.actor,
    reason: input.reason, batches: input.batches.map((b) => b.trim().toUpperCase()).filter(Boolean),
  };
  s.events.unshift(event);
  return { ok: true, event };
}

/** Close a recall. A6: the closer must differ from the initiator. Appends a
 *  CLOSE event — the INITIATE is never touched. */
export async function closeRecall(ref: string, actor: string): Promise<RecallResult> {
  if (!(await isRecallOpen(ref))) return { ok: false, reason: "none" };
  if (initiatorOf(ref) === actor) return { ok: false, reason: "maker" };
  const s = store();
  const event: RecallEvent = { seq: s.seq++, ref, kind: "CLOSE", at: today(), actor, reason: "closed after review", batches: [] };
  s.events.unshift(event);
  return { ok: true, event };
}
