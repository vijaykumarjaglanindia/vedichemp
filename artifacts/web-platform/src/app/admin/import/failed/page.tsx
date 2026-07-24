/**
 * VEDIC HEMP — PRODUCT IMPORT · failed imports.
 *
 * The rows a connector could not land, read straight from the import store
 * (lib/import/store.listFailures) — one card per failure, with the source
 * product reference, the failure code, what the importer said, and its
 * suggested fix. Nothing is invented here; the page only renders records.
 *
 * A failure is a record, not a document: it is appended when a row is refused
 * and is never edited (A3). "Mark resolved" clears it from the active queue
 * and writes an audit row; it does not rewrite the failure. Some failures are
 * refusals by design and can never be retried — MED_CANNABIS is never imported
 * (A1), so `med_cannabis_blocked` is not retryable and offers no wizard path.
 */

import Link from "next/link";
import { AlertOctagon, RotateCcw, ShieldAlert, ListChecks } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero, Metric } from "@/app/admin/import/_ui";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import type { FailedImportRow } from "@/lib/import/types";
import { listFailures } from "@/lib/import/store";
import { resolveFailureAction } from "@/app/admin/import/actions";

export const metadata = { title: "Failed Imports" };
export const dynamic = "force-dynamic";

export default async function FailedImportsPage() {
  const rows: FailedImportRow[] = await listFailures({ limit: 200 });

  const total = rows.length;
  const retryable = rows.filter((r) => r.retryable).length;
  const blockedA1 = rows.filter((r) => r.code === "med_cannabis_blocked").length;

  return (
    <Shell active="/admin/import/failed" breadcrumb={["Admin", "Marketplace", "Import"]} title="Failed Imports">
      <ImpShell>
        <ImpHero
          badge="Import · Failures"
          title="Failed imports"
          sub="Every product a connector could not land, newest first — with the reason it was refused and how to clear it. Retryable failures can be re-run from the wizard once the underlying data is fixed; imports always land as DRAFT and a regulated (CBD) product still cannot sell until its lab report is approved (A2)."
          actions={
            <>
              <Link href="/admin/import/wizard" className="vh-btn vh-btn-ghost">Open import wizard</Link>
              <Link href="/admin/import/logs?level=error" className="vh-btn vh-btn-ghost">Error logs</Link>
            </>
          }
        />

        <div className="imp-grid cols-3">
          <Metric label="Failed rows" value={total} foot="in the active queue · up to 200" icon={<AlertOctagon size={18} />} />
          <Metric label="Retryable" value={retryable} foot="re-runnable once fixed" icon={<RotateCcw size={18} />} />
          <Metric label="Blocked by design (A1)" value={blockedA1} foot="Medical Cannabis · never imported" icon={<ShieldAlert size={18} />} />
        </div>

        {total === 0 ? (
          <Card>
            <EmptyState
              icon="✅"
              headline="No failed imports"
              sub="Every row from the most recent runs landed. When a connector refuses a product — a bad price, a missing image, or a compliance block — it will appear here with a suggested fix."
            />
          </Card>
        ) : (
          <>
            <div className="imp-grid cols-2">
              {rows.map((f) => (
                <Card
                  key={f.id}
                  title={
                    <span className="vh-row" style={{ gap: 8, minWidth: 0 }}>
                      <AlertOctagon size={16} aria-hidden />
                      <span className="mono" style={{ overflowWrap: "anywhere" }}>{f.productRef}</span>
                    </span>
                  }
                  action={<StatusPill tone="danger">{f.code}</StatusPill>}
                >
                  <p style={{ margin: "0 0 8px" }}>{f.message}</p>

                  <p className="small muted" style={{ margin: "0 0 4px" }}>
                    <strong style={{ color: "var(--vh-text)" }}>Suggested fix:</strong> {f.suggestedFix}
                  </p>

                  <p className="small muted mono tabular" style={{ margin: "0 0 12px" }}>
                    {new Date(f.at).toLocaleString()} · run {f.historyId}
                  </p>

                  {f.code === "med_cannabis_blocked" && (
                    <div className="vh-banner vh-banner-warn" role="note" style={{ marginBottom: 12 }}>
                      <span aria-hidden style={{ fontSize: "1.1rem", lineHeight: 1 }}><ShieldAlert size={18} /></span>
                      <div>
                        Blocked by design (A1). Medical Cannabis is never imported, advertised or listed on the
                        platform — this refusal is not an error and is <strong>not retryable</strong>. Mark it resolved
                        to clear it from the queue; the failure record itself stays on file (A3).
                      </div>
                    </div>
                  )}

                  <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {f.retryable && (
                      <Link href="/admin/import/wizard" className="vh-btn vh-btn-sm vh-btn-ghost">
                        <RotateCcw size={14} aria-hidden /> Retry in wizard
                      </Link>
                    )}
                    <form action={resolveFailureAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost">Mark resolved</button>
                    </form>
                  </div>
                </Card>
              ))}
            </div>

            <p className="small muted" style={{ margin: 0 }}>
              <ListChecks size={13} aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Failures are append-only records (A3). Marking one resolved clears it from this queue and writes an audit
              row — it never edits or deletes the underlying record. A retry re-runs the row through the same DRAFT and
              CoA gate as any other import (A2); nothing here can force a product sellable.
            </p>
          </>
        )}
      </ImpShell>
    </Shell>
  );
}
