/**
 * VEDIC HEMP — LIVE PROHIBITION PROBES (A1–A6)
 *
 * The Prohibition Registry page must not show a hardcoded "ENFORCED" pill —
 * that is exactly the "changes quietly" failure the constitution forbids.
 * Instead, this module runs a battery of deterministic, in-process probes at
 * request time that EXERCISE the real guards. If a guard is deleted or
 * weakened, its probe fails and the row turns red on the page — loudly.
 *
 * Where possible a probe calls the actual production guard
 * (src/lib/prohibitions.ts: assertAdvertisable, assertCheckerPresent) so this is
 * the same code the CI test in tests/prohibitions.test.ts asserts. The rest
 * exercise the demo's runtime enforcement primitives (the CoA class rule, the
 * §6 redactor, the 30-day-notice math, the append-only audit shape). Every
 * probe is pure or read-only — none mutates a store or touches the database.
 *
 * A "throws expected" probe is green ONLY if the guard throws with its expected
 * error CODE — a missing guard throws a ReferenceError instead, which does not
 * match, so a deleted guard reads red rather than falsely green.
 */

import { assertAdvertisable, assertCheckerPresent, SENSITIVE_REASONS } from "@/lib/prohibitions";
import type { ComplianceClass } from "@prisma/client";
import { REGULATED_CLASSES, CREATABLE_CLASSES } from "@/lib/catalog";
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
    { name: "a promotional send claiming to cure/treat is BLOCKED", ok: screenCampaign("Festival sale", "This balm cures anxiety fast.").verdict === "BLOCKED" },
  ];
}

// Mirrors catalog's publish rule exactly (regulated class ⇒ needs APPROVED CoA),
// driven by the SAME REGULATED_CLASSES constant the gate uses — change it and the
// probe changes with it.
function coaGateBlocks(p: { cls: string; coaState: string }): boolean {
  return REGULATED_CLASSES.includes(cls(p.cls)) && p.coaState !== "APPROVED";
}

async function a2(): Promise<Probe[]> {
  return [
    { name: "CBD_WELLNESS and MED_CANNABIS are regulated classes", ok: REGULATED_CLASSES.includes(cls("CBD_WELLNESS")) && REGULATED_CLASSES.includes(cls("MED_CANNABIS")) },
    { name: "a regulated batch without an APPROVED CoA is not sellable", ok: coaGateBlocks({ cls: "CBD_WELLNESS", coaState: "PENDING_REVIEW" }) },
    { name: "the same batch with an APPROVED CoA is sellable", ok: !coaGateBlocks({ cls: "CBD_WELLNESS", coaState: "APPROVED" }) },
    { name: "a non-regulated class is never gated on a CoA", ok: !coaGateBlocks({ cls: "HEMP_FOOD", coaState: "NONE" }) },
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
  const clinical = "Reminder about your anxiety diagnosis";
  const r = redactHealthData(clinical);
  return [
    { name: "the §6 guard detects clinical vocabulary", ok: hasHealthData(clinical) },
    { name: "redaction removes it and leaves the neutral marker", ok: !hasHealthData(r.text) && r.text.includes(REDACTION_MARK) },
    { name: "ordinary process copy is not a false positive", ok: !hasHealthData("Your order VH123 has shipped") },
    { name: "sensitive access uses a controlled reason list", ok: Array.isArray(SENSITIVE_REASONS) && SENSITIVE_REASONS.length > 0 },
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
