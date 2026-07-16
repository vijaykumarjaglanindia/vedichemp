import "server-only";

/**
 * VEDIC HEMP — VENDOR VERIFICATION (KYC)
 *
 * A store must be verified before any of its listings can go live. The seller
 * submits business details (legal name, GSTIN, PAN, registered address, payout
 * bank) and, for a regulated class, a drug licence with an expiry. The platform
 * reviews and approves, asks for more information, rejects, or later revokes a
 * verification (an expired licence, a compliance breach).
 *
 * The rule is a SERVER GUARD, not a UI condition (CLAUDE.md §0): the go-live
 * action calls `kycApproved(store)` — a store that is not APPROVED simply
 * cannot move a listing into review, no matter what the client renders.
 *
 * Store = the DB seam (a `VendorKyc` table keyed by store name). We keep only
 * the last four digits of the payout account here — never the full number
 * (CLAUDE.md §4: never return a full bank account number).
 */

import type { ComplianceClass } from "@prisma/client";

export type KycStatus =
  | "NOT_STARTED"
  | "SUBMITTED"
  | "APPROVED"
  | "MORE_INFO"
  | "REJECTED"
  | "SUSPENDED";

/** Classes that require a licence on file before they can be verified. */
export const REGULATED_CLASSES: ComplianceClass[] = ["CBD_WELLNESS", "MED_CANNABIS"];

export interface VendorKyc {
  store: string;
  ownerEmail: string;
  legalName: string;
  gstin: string;
  pan: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  bankName: string;
  bankAccountLast4: string; // only the last four — never the full number
  bankIfsc: string;
  classes: ComplianceClass[];
  drugLicenceNo?: string;
  drugLicenceExpiry?: string; // ISO date (YYYY-MM-DD)
  status: KycStatus;
  note?: string; // reviewer note for MORE_INFO / REJECTED / SUSPENDED
  submittedAt?: string;
  decidedAt?: string;
  history: { at: string; status: KycStatus; by: string; note?: string }[];
}

interface VendorStore {
  records: VendorKyc[];
}

declare global {
  // eslint-disable-next-line no-var
  var __vhVendorKyc: VendorStore | undefined;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The console is single-tenant on the seed store ("Vedic Botanicals"), an
 * established, already-verified seller — so the KYC gate is a no-op for it
 * until an admin revokes it. New stores would seed at NOT_STARTED.
 */
function seed(): VendorStore {
  return {
    records: [
      {
        store: "Vedic Botanicals",
        ownerEmail: "seller@example.in",
        legalName: "Vedic Botanicals Wellness Pvt Ltd",
        gstin: "27AABCV1234M1Z5",
        pan: "AABCV1234M",
        addressLine: "14, Ayurveda Enclave, Baner",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411045",
        bankName: "HDFC Bank",
        bankAccountLast4: "4472",
        bankIfsc: "HDFC0000123",
        classes: ["CBD_WELLNESS", "AYURVEDA"],
        drugLicenceNo: "MH-AYUSH-2021-88213",
        drugLicenceExpiry: "2027-03-31",
        status: "APPROVED",
        submittedAt: "2026-01-02",
        decidedAt: "2026-01-05",
        history: [
          { at: "2026-01-02", status: "SUBMITTED", by: "seller@example.in" },
          { at: "2026-01-05", status: "APPROVED", by: "compliance@vedichemp.in" },
        ],
      },
    ],
  };
}

function store(): VendorStore {
  globalThis.__vhVendorKyc ??= seed();
  return globalThis.__vhVendorKyc;
}

export function kycFor(storeName: string): VendorKyc | undefined {
  return store().records.find((r) => r.store.toLowerCase() === storeName.toLowerCase());
}

export function kycStatus(storeName: string): KycStatus {
  return kycFor(storeName)?.status ?? "NOT_STARTED";
}

/** THE GATE. A listing may only go live for a store whose KYC is APPROVED. */
export function kycApproved(storeName: string): boolean {
  return kycFor(storeName)?.status === "APPROVED";
}

/** A licence that has lapsed cannot back a regulated class. */
export function licenceExpired(r: VendorKyc): boolean {
  return !!r.drugLicenceExpiry && r.drugLicenceExpiry < today();
}

export async function allKyc(): Promise<VendorKyc[]> {
  return [...store().records].sort((a, b) => {
    // Pending review first, then by most recent activity.
    const rank = (s: KycStatus) => (s === "SUBMITTED" ? 0 : s === "MORE_INFO" ? 1 : 2);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return (b.submittedAt ?? "") < (a.submittedAt ?? "") ? -1 : 1;
  });
}

export async function pendingKyc(): Promise<VendorKyc[]> {
  return store().records.filter((r) => r.status === "SUBMITTED");
}

export interface KycInput {
  store: string;
  ownerEmail: string;
  legalName: string;
  gstin: string;
  pan: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  bankName: string;
  bankAccount: string; // full number in; only last4 is retained
  bankIfsc: string;
  classes: ComplianceClass[];
  drugLicenceNo?: string;
  drugLicenceExpiry?: string;
}

export type KycResult = { ok: true; record: VendorKyc } | { ok: false; reason: string };

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Seller submits (or re-submits) KYC. Server-side validation is authoritative:
 * a regulated class without a valid, unexpired licence is rejected here, never
 * merely hidden on the form. A re-submission always re-enters review.
 */
export async function submitKyc(input: KycInput): Promise<KycResult> {
  const legalName = input.legalName.trim();
  const gstin = input.gstin.trim().toUpperCase();
  const pan = input.pan.trim().toUpperCase();
  const ifsc = input.bankIfsc.trim().toUpperCase();
  const account = input.bankAccount.replace(/\s/g, "");
  const classes = input.classes.filter((c) => c !== "MED_CANNABIS"); // never self-onboards
  const wantsRegulated = classes.some((c) => REGULATED_CLASSES.includes(c));

  if (legalName.length < 3) return { ok: false, reason: "name" };
  if (!GSTIN_RE.test(gstin)) return { ok: false, reason: "gstin" };
  if (!PAN_RE.test(pan)) return { ok: false, reason: "pan" };
  if (input.addressLine.trim().length < 6) return { ok: false, reason: "address" };
  if (!input.city.trim() || !input.state.trim()) return { ok: false, reason: "city" };
  if (!/^\d{6}$/.test(input.pincode.trim())) return { ok: false, reason: "pincode" };
  if (!/^\d{6,18}$/.test(account)) return { ok: false, reason: "bank" };
  if (!IFSC_RE.test(ifsc)) return { ok: false, reason: "ifsc" };
  if (classes.length === 0) return { ok: false, reason: "classes" };
  if (wantsRegulated) {
    const lic = (input.drugLicenceNo ?? "").trim();
    const exp = (input.drugLicenceExpiry ?? "").trim();
    if (lic.length < 6) return { ok: false, reason: "licence" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exp) || exp < today()) return { ok: false, reason: "licexpiry" };
  }

  const s = store();
  const existing = kycFor(input.store);
  const record: VendorKyc = {
    store: input.store,
    ownerEmail: input.ownerEmail,
    legalName,
    gstin,
    pan,
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    bankName: input.bankName.trim(),
    bankAccountLast4: account.slice(-4),
    bankIfsc: ifsc,
    classes,
    ...(wantsRegulated
      ? { drugLicenceNo: input.drugLicenceNo!.trim(), drugLicenceExpiry: input.drugLicenceExpiry!.trim() }
      : {}),
    status: "SUBMITTED",
    submittedAt: today(),
    history: [
      ...(existing?.history ?? []),
      { at: today(), status: "SUBMITTED", by: input.ownerEmail },
    ],
  };
  if (existing) Object.assign(existing, record);
  else s.records.push(record);
  return { ok: true, record: existing ?? record };
}

export type Decision = "approve" | "more_info" | "reject";

/** Admin reviews a SUBMITTED store. MORE_INFO / REJECT carry a reason. */
export async function decideKyc(
  storeName: string,
  decision: Decision,
  by: string,
  note?: string,
): Promise<KycResult> {
  const r = kycFor(storeName);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "SUBMITTED") return { ok: false, reason: "state" };
  const next: KycStatus = decision === "approve" ? "APPROVED" : decision === "more_info" ? "MORE_INFO" : "REJECTED";
  r.status = next;
  r.decidedAt = today();
  if (note) r.note = note;
  else if (decision === "approve") r.note = undefined;
  r.history.push({ at: today(), status: next, by, ...(note ? { note } : {}) });
  return { ok: true, record: r };
}

/** Admin revokes a live verification (licence lapse, compliance breach). The
 *  store can no longer take listings live until it re-verifies. */
export async function revokeKyc(storeName: string, by: string, note: string): Promise<KycResult> {
  const r = kycFor(storeName);
  if (!r) return { ok: false, reason: "missing" };
  if (r.status !== "APPROVED") return { ok: false, reason: "state" };
  r.status = "SUSPENDED";
  r.decidedAt = today();
  r.note = note;
  r.history.push({ at: today(), status: "SUSPENDED", by, note });
  return { ok: true, record: r };
}

export function statusLabel(s: KycStatus): string {
  switch (s) {
    case "NOT_STARTED": return "Not started";
    case "SUBMITTED": return "In review";
    case "APPROVED": return "Verified";
    case "MORE_INFO": return "More info needed";
    case "REJECTED": return "Not approved";
    case "SUSPENDED": return "Verification paused";
  }
}
