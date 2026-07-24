import "server-only";

/**
 * VEDIC HEMP — PRESCRIPTIONS & SENSITIVE ACCESS (A4, runtime store)
 *
 * A4: health data is viewable only by Pharmacist/Compliance, only with a
 * LOGGED REASON, and the buyer is NOTIFIED. This is the runtime (__vh*) seam
 * that makes A4 exercisable in the app; the Prisma implementation in
 * src/server/health/* is the production shape.
 *
 * The access log is APPEND-ONLY (A3 spirit — safety/audit records are corrected
 * by new rows, never edited or deleted). The log write happens BEFORE a signed
 * URL is issued: if we can't record who looked and why, the look does not
 * happen. Losing the log is worse than failing the action.
 *
 * A model may EXTRACT fields from an image; it never APPROVES — a human
 * pharmacist verifies. No health data is ever placed in the reasonText, a
 * notification body, or an audit note.
 */

import { SENSITIVE_REASONS, type SensitiveReason } from "@/lib/prohibitions";

export { SENSITIVE_REASONS };
export type { SensitiveReason };

/** Roles permitted to view health data (A4 scope claim). */
export const SENSITIVE_ROLES = ["ADMIN_PHARMACIST", "ADMIN_COMPLIANCE"] as const;
export type SensitiveRole = (typeof SENSITIVE_ROLES)[number];

export type RxStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";

export interface Prescription {
  id: string;
  buyerEmail: string;
  buyerName: string;
  doctor: string;
  regNo: string;
  issuedAt: string; // YYYY-MM-DD
  validTill: string; // YYYY-MM-DD
  status: RxStatus;
  uploadedAt: string;
  reviewerNote?: string;
  fileRef: string; // an object-storage KEY, never the image bytes
}

export interface AccessLogEntry {
  id: string;
  prescriptionId: string;
  buyerEmail: string;
  viewer: string; // admin email
  viewerRole: string;
  reasonCode: string;
  reasonText: string; // staff-authored justification — NEVER health data
  at: string; // ISO datetime
  outcome: "GRANTED" | "DENIED";
  buyerNotified: boolean;
}

interface RxStore {
  rx: Prescription[];
  log: AccessLogEntry[]; // append-only
  seq: number;
  logSeq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhPrescriptions: RxStore | undefined;
}

function seed(): RxStore {
  return {
    rx: [
      {
        id: "rx-1001", buyerEmail: "buyer@example.in", buyerName: "Aarav Sharma",
        doctor: "Dr. Kavita Rao, MD (Pain Medicine)", regNo: "MCI-88213",
        issuedAt: "2026-06-20", validTill: "2026-09-20", status: "APPROVED",
        uploadedAt: "2026-06-21", fileRef: "rx/aarav-1001.pdf",
      },
      {
        id: "rx-1002", buyerEmail: "meera@example.in", buyerName: "Meera Nair",
        doctor: "Dr. S. Iyer, MD", regNo: "MCI-77104",
        issuedAt: "2026-07-10", validTill: "2026-10-10", status: "PENDING_REVIEW",
        uploadedAt: "2026-07-14", fileRef: "rx/meera-1002.pdf",
      },
    ],
    log: [],
    seq: 1003,
    logSeq: 1,
  };
}

function store(): RxStore {
  globalThis.__vhPrescriptions ??= seed();
  return globalThis.__vhPrescriptions;
}

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export function findRx(id: string): Prescription | undefined {
  return store().rx.find((r) => r.id === id);
}

/** Status with expiry applied on read (a valid-till in the past is EXPIRED). */
export function effectiveStatus(r: Prescription): RxStatus {
  if (r.status === "APPROVED" && r.validTill < today()) return "EXPIRED";
  return r.status;
}

export async function myPrescriptions(email: string): Promise<Prescription[]> {
  return store().rx
    .filter((r) => r.buyerEmail.toLowerCase() === email.toLowerCase())
    .map((r) => ({ ...r, status: effectiveStatus(r) }))
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

export async function pendingPrescriptions(): Promise<Prescription[]> {
  return store().rx.filter((r) => r.status === "PENDING_REVIEW").sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

export async function allPrescriptions(): Promise<Prescription[]> {
  return [...store().rx].map((r) => ({ ...r, status: effectiveStatus(r) })).sort((a, b) => {
    const rank = (s: RxStatus) => (s === "PENDING_REVIEW" ? 0 : 1);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return a.uploadedAt < b.uploadedAt ? 1 : -1;
  });
}

export async function uploadPrescription(input: {
  buyerEmail: string; buyerName: string; doctor: string; regNo: string; issuedAt: string; validTill: string; fileRef: string;
}): Promise<Prescription> {
  const s = store();
  const rx: Prescription = {
    id: `rx-${s.seq++}`,
    buyerEmail: input.buyerEmail,
    buyerName: input.buyerName,
    doctor: input.doctor,
    regNo: input.regNo,
    issuedAt: input.issuedAt,
    validTill: input.validTill,
    status: "PENDING_REVIEW",
    uploadedAt: today(),
    fileRef: input.fileRef,
  };
  s.rx.unshift(rx);
  return rx;
}

export type RxDecision = { ok: true; rx: Prescription } | { ok: false; reason: string };

/** A pharmacist verifies (approves) or rejects a pending prescription. A model
 *  never reaches this — only a human decision flips the status. */
export async function decidePrescription(id: string, approve: boolean, note?: string): Promise<RxDecision> {
  const r = findRx(id);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "PENDING_REVIEW") return { ok: false, reason: "state" };
  r.status = approve ? "APPROVED" : "REJECTED";
  if (note) r.reviewerNote = note;
  return { ok: true, rx: r };
}

function isSensitiveRole(role: string): role is SensitiveRole {
  return (SENSITIVE_ROLES as readonly string[]).includes(role);
}
function isReason(code: string): code is SensitiveReason {
  return (SENSITIVE_REASONS as readonly string[]).includes(code);
}

export interface RevealResult {
  ok: boolean;
  reason?: string; // failure code
  url?: string; // short-lived signed URL (stub) — present only on success
  ttlSeconds?: number;
  entry: AccessLogEntry; // the log row that was written (GRANTED or DENIED)
}

/**
 * A4 GATE. Reveal a prescription image. Order matters:
 *   1. validate role + reason code + reason text
 *   2. WRITE the access log (GRANTED or DENIED) — always
 *   3. only on success, notify the buyer and mint a 5-minute URL
 * A denied attempt is still logged (what someone TRIED is informative).
 */
export async function revealPrescription(args: {
  prescriptionId: string; viewer: string; viewerRole: string; reasonCode: string; reasonText: string;
}): Promise<RevealResult> {
  const s = store();
  const rx = findRx(args.prescriptionId);
  const reasonText = args.reasonText.trim();

  let failure: string | null = null;
  if (!rx) failure = "missing";
  else if (!isSensitiveRole(args.viewerRole)) failure = "scope"; // only pharmacist/compliance
  else if (!isReason(args.reasonCode)) failure = "reasoncode";
  else if (reasonText.length < 20) failure = "reasontext";

  const entry: AccessLogEntry = {
    id: `sx-${s.logSeq++}`,
    prescriptionId: args.prescriptionId,
    buyerEmail: rx?.buyerEmail ?? "unknown",
    viewer: args.viewer,
    viewerRole: args.viewerRole,
    reasonCode: args.reasonCode,
    reasonText, // justification only — never health data
    at: nowIso(),
    outcome: failure ? "DENIED" : "GRANTED",
    buyerNotified: false,
  };
  // Append-only: the log row exists BEFORE any URL is issued.
  s.log.unshift(entry);

  if (failure) return { ok: false, reason: failure, entry };

  entry.buyerNotified = true;
  // 5-minute signed URL — a stub reference, never the bytes.
  const ttlSeconds = 300;
  const exp = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const url = `sensitive://prescription/${rx!.id}?exp=${encodeURIComponent(exp)}&sig=logged-${entry.id}`;
  return { ok: true, url, ttlSeconds, entry };
}

/**
 * A4 SELF-ACCESS. A buyer viewing their OWN prescription is a RIGHT, not a
 * staff reveal — §2 fail-open: "a registry outage must not block a buyer
 * from viewing their own prescription." So this path:
 *   - requires no reasonCode and no 20-char justification (that gate is for
 *     someone looking at data that isn't theirs),
 *   - does NOT notify the buyer (they are the viewer; a self-notice is noise),
 *   - but is STILL logged, append-only, because the log is the product (A4/A3),
 *   - and enforces OWNERSHIP server-side: a buyer can only reach their own
 *     record. A foreign id is DENIED and the denial is logged (against the
 *     attempting account, so it never pollutes the owner's transparency view).
 */
export async function selfAccessPrescription(args: {
  prescriptionId: string; buyerEmail: string;
}): Promise<RevealResult> {
  const s = store();
  const rx = findRx(args.prescriptionId);
  const email = args.buyerEmail.toLowerCase();
  const owns = !!rx && rx.buyerEmail.toLowerCase() === email;

  const failure = !rx ? "missing" : !owns ? "forbidden" : null;
  const entry: AccessLogEntry = {
    id: `sx-${s.logSeq++}`,
    prescriptionId: args.prescriptionId,
    // On a forbidden attempt, attribute the row to the attempting account —
    // never to the record's true owner (that would leak the attacker's email
    // into the owner's log).
    buyerEmail: owns ? rx!.buyerEmail : args.buyerEmail,
    viewer: args.buyerEmail,
    viewerRole: "BUYER_SELF",
    reasonCode: "SELF_ACCESS",
    reasonText: "Buyer opened their own prescription",
    at: nowIso(),
    outcome: failure ? "DENIED" : "GRANTED",
    buyerNotified: false, // the viewer is the buyer — no separate notice
  };
  s.log.unshift(entry);

  if (failure) return { ok: false, reason: failure, entry };

  const ttlSeconds = 300;
  const exp = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const url = `sensitive://prescription/${rx!.id}?exp=${encodeURIComponent(exp)}&sig=self-${entry.id}`;
  return { ok: true, url, ttlSeconds, entry };
}

/** The full sensitive-access log (append-only), newest first — admin surface. */
export async function accessLog(limit = 50): Promise<AccessLogEntry[]> {
  return store().log.slice(0, limit);
}

/** A buyer's transparency view — every time their own prescription was viewed. */
export async function accessLogForBuyer(email: string): Promise<AccessLogEntry[]> {
  return store().log.filter((e) => e.buyerEmail.toLowerCase() === email.toLowerCase());
}

export function reasonLabel(code: string): string {
  return code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
