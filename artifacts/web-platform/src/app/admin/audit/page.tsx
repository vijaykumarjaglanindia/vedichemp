/**
 * VEDIC HEMP — AUDIT TRAIL
 *
 * Append-only record of every mutating admin action — including DENIED
 * attempts, which are often more informative than what succeeded. In
 * production this reads the AuditLog table, whose rows cannot be updated or
 * deleted by any application role (A3: REVOKE at the DB level, object lock
 * on the bucket mirror).
 */

import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { Shell } from "../Shell";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import { readAudit } from "@/lib/audit";

export const metadata: Metadata = { title: "Audit trail · Admin" };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = await readAudit(200);
  return (
    <Shell active="/admin/settings" breadcrumb={["Admin", "Audit trail"]} title="Audit trail">
      <Card
        title={<span className="vh-row" style={{ gap: 8 }}><ScrollText size={16} strokeWidth={2.2} aria-hidden /> Every admin action, including denials</span>}
        pad0
      >
        {entries.length === 0 ? (
          <EmptyState icon="🧾" headline="No admin actions yet this session" sub="Every mutating action — and every denied attempt — lands here the moment it happens." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Outcome</th><th>Note</th></tr></thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td className="small tabular" style={{ whiteSpace: "nowrap" }}>{e.at.slice(0, 19).replace("T", " ")}</td>
                    <td className="small">{e.actor}</td>
                    <td className="small mono">{e.action}</td>
                    <td className="small">{e.target}</td>
                    <td><StatusPill tone={e.outcome === "OK" ? "ok" : "danger"}>{e.outcome}</StatusPill></td>
                    <td className="small muted">{e.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="small muted" style={{ marginTop: "var(--sp-3)" }}>
        Corrections are new rows referencing the old — there is no edit and no delete on this
        table, for anyone (A3). Health data never appears in a log line.
      </p>
    </Shell>
  );
}
