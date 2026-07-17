/**
 * VEDIC HEMP — PROHIBITION REGISTRY (§0–1, the signature page)
 *
 * A1–A6 are not settings. Each is an absence in the codebase, asserted by a
 * test that fails the build, and each has a DB constraint or trigger as its
 * first line of defence, a server guard as its second, and — for A1 — an
 * auction check as its third. This page is a live registry over that
 * structure, not a place any of it can be toggled. There is no switch here.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Megaphone, FlaskConical, Archive, Stethoscope, CalendarClock, UsersRound, Check, X } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner } from "@/components/ui";
import { prohibitionProbes } from "@/lib/prohibition-checks";

export const metadata: Metadata = { title: "Prohibition Registry · Admin" };
export const dynamic = "force-dynamic";

const I = { size: 18, strokeWidth: 2.2 } as const;

const PROHIBITION_ICON: Record<string, ReactNode> = {
  A1: <Megaphone {...I} aria-hidden />,
  A2: <FlaskConical {...I} aria-hidden />,
  A3: <Archive {...I} aria-hidden />,
  A4: <Stethoscope {...I} aria-hidden />,
  A5: <CalendarClock {...I} aria-hidden />,
  A6: <UsersRound {...I} aria-hidden />,
};

interface Prohibition {
  code: string;
  rule: string;
  enforcement: { layer: string; detail: string }[];
  testRef: string;
}

const PROHIBITIONS: Prohibition[] = [
  {
    code: "A1",
    rule: "No MED_CANNABIS product may be advertised or promoted, by anyone, ever.",
    enforcement: [
      { layer: "API", detail: "assertAdvertisable() rejects the campaign at creation — no force parameter exists." },
      { layer: "Index", detail: "Search / recommendation index omits MED_CANNABIS from any advertisable feed at ingest." },
      { layer: "Auction", detail: "auctionAssertClass() drops the candidate on every call and writes an AdClassViolation row." },
      { layer: "Database", detail: "CHECK constraint on AdCampaign — no column, flag or override endpoint can satisfy it." },
    ],
    testRef: "tests/prohibitions.test.ts § A1 — ads.threeLayer.test",
  },
  {
    code: "A2",
    rule: "No batch of a regulated class becomes sellable without an approved, batch-matched Certificate of Analysis.",
    enforcement: [
      { layer: "Server guard", detail: "assertBatchSellable() reads LabReport.status = APPROVED and matches batchCode." },
      { layer: "Server guard", detail: "Δ9-THC > 0.3% throws THC_LIMIT_EXCEEDED regardless of report status." },
      { layer: "Database", detail: "Publish gate has no force_sellable column and no bulk-approve write path." },
    ],
    testRef: "tests/prohibitions.test.ts § A2 — coa.gate.test",
  },
  {
    code: "A3",
    rule: "Safety reports, adverse events, dispensing registers, recall records and audit logs cannot be deleted or altered.",
    enforcement: [
      { layer: "Database", detail: "REVOKE DELETE, UPDATE at the DB role level on the affected tables." },
      { layer: "Storage", detail: "Object lock on the S3-compatible bucket holding safety documents." },
      { layer: "Application", detail: "Corrections are new rows referencing the old — never an edit in place." },
    ],
    testRef: "tests/prohibitions.test.ts § A3 — immutable.audit.test",
  },
  {
    code: "A4",
    rule: "Health data is viewable only by Pharmacist/Compliance, only with a logged reason, and the buyer is notified.",
    enforcement: [
      { layer: "Auth", detail: "Scope claims come from the verified token, never the client." },
      { layer: "Server guard", detail: "assertSensitiveAccess() requires a controlled reasonCode + ≥20 char reasonText." },
      { layer: "Database", detail: "SensitiveAccessLog write is synchronous and precedes URL resolution — losing the log fails the read." },
      { layer: "Notification", detail: "Buyer notification is enqueued in the same transaction as the log row." },
    ],
    testRef: "tests/prohibitions.test.ts § A4 — sensitive.access.test",
  },
  {
    code: "A5",
    rule: "No retroactive fee increase.",
    enforcement: [
      { layer: "Database", detail: "CHECK (effectiveFrom >= noticeSentAt + interval '30 days') on CommissionSchedule." },
    ],
    testRef: "tests/prohibitions.test.ts § A5 — fee.notice.test",
  },
  {
    code: "A6",
    rule: "No single admin moves money.",
    enforcement: [
      { layer: "Database", detail: "CHECK (makerId <> checkerId) on every money table." },
      { layer: "Server guard", detail: "assertCheckerPresent() rejects a service actor as either party." },
      { layer: "Server guard", detail: "assertNoThresholdSplitting() blocks a maker whose prior unchecked movements already crossed ₹5,000." },
    ],
    testRef: "tests/prohibitions.test.ts § A6 — maker.checker.test",
  },
];

export default async function AdminProhibitionsPage() {
  const statuses = await prohibitionProbes();
  const byCode = Object.fromEntries(statuses.map((s) => [s.code, s]));
  const allGreen = statuses.every((s) => s.ok);
  const totalProbes = statuses.reduce((n, s) => n + s.total, 0);
  const passedProbes = statuses.reduce((n, s) => n + s.passed, 0);

  return (
    <Shell active="/admin/prohibitions" breadcrumb={["Admin", "Prohibitions"]} title="Prohibition Registry">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Banner severity="danger" title="These are absences, not settings">
          Each prohibition below is asserted by a test that fails the build if weakened. A PR that deletes, skips or
          weakens one of these tests fails review by a CODEOWNERS rule on{" "}
          <code>tests/prohibitions.test.ts</code>. A prohibition can change — in the open, with reasons, with
          sign-off, with a new test. What it cannot do is change quietly.
        </Banner>

        <Card
          title="prohibition_status"
          action={<StatusPill tone={allGreen ? "ok" : "danger"}>{allGreen ? "all enforced" : "check failed"}</StatusPill>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            Each status below is <strong>computed at request time</strong> by running the actual guards in-process —
            not a stored pill. The A1 and A6 rows call the very functions{" "}
            <code>tests/prohibitions.test.ts</code> asserts (<code>assertAdvertisable</code>,{" "}
            <code>assertCheckerPresent</code>); the rest exercise the runtime enforcement primitives. If a guard is
            deleted or weakened, its probe fails and the row turns red here. Every probe is read-only — there is no
            write path from this page. <span className="mono">{passedProbes}/{totalProbes}</span> probes passing.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Rule</th>
                  <th>Enforcement</th>
                  <th>Live probes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PROHIBITIONS.map((p) => {
                  const st = byCode[p.code];
                  return (
                  <tr key={p.code}>
                    <td style={{ verticalAlign: "top" }}>
                      <span className="vh-row" style={{ gap: 8, alignItems: "center" }}>
                        <span aria-hidden style={{ color: "var(--vh-accent)", display: "inline-flex" }}>{PROHIBITION_ICON[p.code]}</span>
                        <span className="mono" style={{ fontWeight: 700 }}>{p.code}</span>
                      </span>
                    </td>
                    <td style={{ maxWidth: 240, verticalAlign: "top" }}>{p.rule}</td>
                    <td style={{ verticalAlign: "top" }}>
                      <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
                        {p.enforcement.map((e, i) => (
                          <li key={i} className="small">
                            <strong>{e.layer}:</strong> {e.detail}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ verticalAlign: "top", minWidth: 260 }}>
                      {st ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                          {st.probes.map((pr, i) => (
                            <li key={i} className="small vh-row" style={{ gap: 6, alignItems: "flex-start", color: pr.ok ? "var(--vh-ok)" : "var(--vh-danger)" }}>
                              {pr.ok
                                ? <Check size={13} strokeWidth={3} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
                                : <X size={13} strokeWidth={3} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />}
                              <span style={{ color: "var(--vh-text)" }}>{pr.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <span className="small muted">—</span>}
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      {st?.ok
                        ? <StatusPill tone="ok">ENFORCED</StatusPill>
                        : <StatusPill tone="danger">CHECK FAILED</StatusPill>}
                      {st && <div className="small tabular muted" style={{ marginTop: 4 }}>{st.passed}/{st.total} probes</div>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="vh-grid cols-2">
          <Card title="How a prohibition is allowed to change">
            <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              <li className="small">Proposed in the open — a written rationale, not a silent diff.</li>
              <li className="small">Reviewed by CODEOWNERS on <code>tests/prohibitions.test.ts</code>; the test author cannot self-approve.</li>
              <li className="small">A new or amended test lands in the same PR as the code change — never after.</li>
              <li className="small">The constraint and the guard move together; a PR that loosens one without the other fails review.</li>
            </ol>
          </Card>
          <Card title="What we deliberately did not build">
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              <li className="small">A &quot;senior approval&quot; override for the CoA gate — a licence to sell an untested cannabinoid product.</li>
              <li className="small">A <code>force_sellable</code> flag, anywhere.</li>
              <li className="small">Screenshot detection on the prescription viewer — theatre; the watermark is the deterrent.</li>
              <li className="small">A superadmin role. PLATFORM_OWNER appoints who reads prescriptions, approves money and adjudicates disputes — it cannot do any of those things itself.</li>
            </ul>
          </Card>
        </div>

        <Banner severity="ok" title="Loud, attributable, and slow">
          We cannot make insider abuse impossible. Every gate on this page exists to make it loud (logged, alerting),
          attributable (a named actor, a reason code) and slow (a second human in the loop) instead.
        </Banner>
      </div>
    </Shell>
  );
}
