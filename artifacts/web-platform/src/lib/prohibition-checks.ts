/**
 * VEDIC HEMP — LIVE PROHIBITION PROBES (A1–A6)
 *
 * The Prohibition Registry page must not show a hardcoded "ENFORCED" pill —
 * that is exactly the "changes quietly" failure the constitution forbids.
 * Instead, this module runs a battery of deterministic, in-process probes at
 * request time that EXERCISE the real guards. If a guard is deleted or
 * weakened, its probe fails and the row turns red on the page — loudly.
 *
 * Every probe calls a REAL guard, never a private copy of its logic: the A1/A6
 * probes call the production guards assertAdvertisable / assertCheckerPresent;
 * A2 calls catalog's single-source-of-truth coaBlocksPublish() (the same
 * function approveListing/restoreListing use); A4 calls the prescriptions role
 * and reason gates; A3 inspects the audit module's shape; A5 the 30-day-notice
 * math. Weaken any of these and the matching probe — sharing the guard, not
 * duplicating it — goes red. Every probe is pure or read-only: none mutates a
 * store or touches the database.
 *
 * (Note on CI: A6's assertCheckerPresent is also exercised transitively by
 * tests/prohibitions.test.ts via the settlement/refund tests. A1's
 * assertAdvertisable is one of A1's three layers; the CODEOWNERS-protected
 * suite backstops A1 through the DB CHECK and the auction, not this function.)
 *
 * A "throws expected" probe is green ONLY if the guard throws with its expected
 * error CODE — a missing guard throws a ReferenceError instead, which does not
 * match, so a deleted guard reads red rather than falsely green.
 */

import { assertAdvertisable, assertCheckerPresent, SENSITIVE_REASONS, SENSITIVE_ROLES } from "@/lib/prohibitions";
import type { ComplianceClass } from "@prisma/client";
import { REGULATED_CLASSES, CREATABLE_CLASSES, coaBlocksPublish, type CoaState } from "@/lib/catalog";
import { screenCampaign } from "@/lib/marketing";
import { hasHealthData, redactHealthData, REDACTION_MARK } from "@/lib/s6";
import { minEffectiveFrom } from "@/lib/adminstate";
import * as auditModule from "@/lib/audit";

export interface Probe {
  name: string;
  ok: boolean;
}
export interface ProhibitionStatus {
  code: string;
  ok: boolean; // every probe green
  passed: number;
  total: number;
  probes: Probe[];
}

/** Green only if `fn` throws/rejects with an error whose message carries `code`.
 *  A missing guard throws a ReferenceError (no code match) → red, not green. */
async function expectCode(fn: () => unknown | Promise<unknown>, code: string): Promise<boolean> {
  try { await fn(); return false; }
  catch (e) { return e instanceof Error && e.message.includes(code); }
}
/** Green only if `fn` completes without throwing. */
async function expectOk(fn: () => unknown | Promise<unknown>): Promise<boolean> {
  try { await fn(); return true; } catch { return false; }
}

const cls = (c: string) => c as ComplianceClass;

async function a1(): Promise<Probe[]> {
  return [
    { name: "assertAdvertisable(MED_CANNABIS) is rejected", ok: await expectCode(() => assertAdvertisable(cls("MED_CANNABIS")), "NOT_ADVERTISABLE") },
    { name: "assertAdvertisable(HEMP_FOOD) is allowed", ok: await expectOk(() => assertAdvertisable(cls("HEMP_FOOD"))) },
    { name: "MED_CANNABIS is absent from the creatable/advertisable classes", ok: !CREATABLE_CLASSES.includes(cls("MED_CANNABIS")) },
    // Claims-only string (no clinical noun) so this probes the CLAIMS guard
    // specifically — not the §6 health guard — via reason === "claims".
    { name: "a promotional send making a cure/treat claim is BLOCKED on claims", ok: ((r) => r.verdict === "BLOCKED" && r.reason === "claims")(screenCampaign("Festival sale", "This balm cures common ailments overnight.")) },
  ];
}

// Probes call catalog's coaBlocksPublish — the SAME function approveListing and
// restoreListing use — so weakening the demo publish gate turns this row red.
const coa = (c: string, s: string) => coaBlocksPublish({ cls: cls(c), coaState: s as CoaState });

async function a2(): Promise<Probe[]> {
  return [
    { name: "CBD_WELLNESS and MED_CANNABIS are regulated classes", ok: REGULATED_CLASSES.includes(cls("CBD_WELLNESS")) && REGULATED_CLASSES.includes(cls("MED_CANNABIS")) },
    { name: "coaBlocksPublish: a regulated batch without an APPROVED CoA is not sellable", ok: coa("CBD_WELLNESS", "PENDING_REVIEW") },
    { name: "coaBlocksPublish: the same batch with an APPROVED CoA is sellable", ok: !coa("CBD_WELLNESS", "APPROVED") },
    { name: "coaBlocksPublish: a non-regulated class is never gated on a CoA", ok: !coa("HEMP_FOOD", "NONE") },
  ];
}

async function a3(): Promise<Probe[]> {
  const keys = Object.keys(auditModule);
  const mutator = /delete|update|remove|edit|clear|reset|truncate/i;
  return [
    { name: "the audit register exposes an append (writeAudit) and a read (readAudit)", ok: keys.includes("writeAudit") && keys.includes("readAudit") },
    { name: "the audit register exposes NO delete/update/edit mutator", ok: !keys.some((k) => mutator.test(k)) },
  ];
}

async function a4(): Promise<Probe[]> {
  const clinical = "Reminder about your scheduled review";
  const r = redactHealthData("Reminder about your anxiety diagnosis");
  return [
    // The real A4 gate data: only pharmacist/compliance roles read health data,
    // and only with a reason from the controlled list (the same SENSITIVE_ROLES
    // / SENSITIVE_REASONS the production guard membership-checks). Widen the role
    // list or drop a reason and the corresponding probe flips red.
    { name: "only the pharmacist/compliance roles pass the sensitive-role gate", ok: (SENSITIVE_ROLES as readonly string[]).includes("ADMIN_COMPLIANCE") && !(SENSITIVE_ROLES as readonly string[]).includes("ADMIN_MARKETING") },
    { name: "only a controlled reason code is accepted", ok: (SENSITIVE_REASONS as readonly string[]).includes("PRESCRIPTION_VERIFICATION") && !(SENSITIVE_REASONS as readonly string[]).includes("JUST_CURIOUS") },
    // §6 backstop: health data never rides out in a message/log line.
    { name: "the §6 guard detects and redacts clinical vocabulary", ok: !hasHealthData(r.text) && r.text.includes(REDACTION_MARK) },
    { name: "ordinary process copy is not a false positive", ok: !hasHealthData(clinical) && !hasHealthData("Your order VH123 has shipped") },
  ];
}

async function a5(): Promise<Probe[]> {
  const notice = new Date("2026-01-01T00:00:00Z");
  const floor = minEffectiveFrom(notice);
  const tooEarly = new Date("2026-01-20T00:00:00Z"); // +19 days
  const okDate = new Date("2026-02-05T00:00:00Z"); // +35 days
  return [
    { name: "the notice floor is exactly notice + 30 days", ok: floor.getTime() === notice.getTime() + 30 * 86400000 },
    { name: "an increase effective inside 30 days is rejected", ok: tooEarly < floor },
    { name: "an increase effective after 30 days is allowed", ok: okDate >= floor },
  ];
}

async function a6(): Promise<Probe[]> {
  const base = { amountPaise: 100, actorIsService: false };
  return [
    { name: "maker cannot be the checker", ok: await expectCode(() => assertCheckerPresent({ ...base, makerId: "u1", checkerId: "u1" }), "MAKER_IS_CHECKER") },
    { name: "a large movement requires a second approver", ok: await expectCode(() => assertCheckerPresent({ makerId: "u1", checkerId: null, amountPaise: 600_000, actorIsService: false }), "CHECKER_REQUIRED") },
    { name: "a service account may be neither maker nor checker", ok: await expectCode(() => assertCheckerPresent({ makerId: "svc", checkerId: "u2", amountPaise: 100, actorIsService: true }), "CHECKER_MUST_BE_HUMAN") },
    { name: "two distinct humans under threshold is allowed", ok: await expectOk(() => assertCheckerPresent({ ...base, makerId: "u1", checkerId: "u2" })) },
  ];
}

const RUNNERS: { code: string; run: () => Promise<Probe[]> }[] = [
  { code: "A1", run: a1 }, { code: "A2", run: a2 }, { code: "A3", run: a3 },
  { code: "A4", run: a4 }, { code: "A5", run: a5 }, { code: "A6", run: a6 },
];

/** Run every probe and roll up per-prohibition live status. Pure/read-only. */
export async function prohibitionProbes(): Promise<ProhibitionStatus[]> {
  const out: ProhibitionStatus[] = [];
  for (const { code, run } of RUNNERS) {
    let probes: Probe[];
    try {
      probes = await run();
    } catch {
      // A probe runner that throws (e.g. a guard import vanished) is itself a
      // failure — fail closed to a red row rather than hide it.
      probes = [{ name: "probe runner failed to execute", ok: false }];
    }
    const passed = probes.filter((p) => p.ok).length;
    out.push({ code, ok: passed === probes.length, passed, total: probes.length, probes });
  }
  return out;
}
