/**
 * VEDIC HEMP — PRODUCT IMPORT · Import History.
 *
 * An append-only ledger of every import/sync run across every connected store:
 * what was imported, updated, skipped, deleted and failed, when it ran and who
 * (or what schedule/webhook) triggered it. Rows are records — they are only ever
 * added, never edited — so this page is read-only. Every figure is summed from
 * what listHistory() returns; nothing is hand-typed. From each run you can jump
 * to its logs or, when a run had failures, to the failures queue.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { History, Boxes, RefreshCw, AlertTriangle } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero, Metric } from "@/app/admin/import/_ui";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import type { ImportHistoryRow } from "@/lib/import/types";
import { listHistory } from "@/lib/import/store";
import { RunDetail } from "./RunDetail";

export const metadata: Metadata = { title: "Import History" };
export const dynamic = "force-dynamic";

function statusTone(status: ImportHistoryRow["status"]): "ok" | "warn" | "danger" | "neutral" {
  if (status === "completed") return "ok";
  if (status === "completed_with_errors") return "warn";
  if (status === "failed") return "danger";
  return "neutral";
}

export default async function ImportHistoryPage() {
  const history = await listHistory(100);

  const totals = history.reduce(
    (acc, r) => {
      acc.imported += r.imported;
      acc.updated += r.updated;
      acc.failed += r.failed;
      acc.warnings += r.warnings;
      if (r.status === "completed") acc.completed += 1;
      return acc;
    },
    { imported: 0, updated: 0, failed: 0, warnings: 0, completed: 0 },
  );

  return (
    <Shell active="/admin/import/history" breadcrumb={["Admin", "Marketplace", "Import"]} title="Import History">
      <ImpShell>
        <ImpHero
          badge="History"
          title="Import history"
          sub="Every import and synchronization run, oldest kept and newest first. History is an append-only record — rows are added, never edited — so this is the ledger you audit against."
        />

        {/* Totals across all runs shown below */}
        <div className="imp-grid cols-4">
          <Metric
            label="Total runs"
            value={history.length.toLocaleString("en-IN")}
            foot={`${totals.completed.toLocaleString("en-IN")} completed cleanly`}
            icon={<History size={18} />}
          />
          <Metric
            label="Products imported"
            value={totals.imported.toLocaleString("en-IN")}
            foot="landed as drafts"
            icon={<Boxes size={18} />}
          />
          <Metric
            label="Products updated"
            value={totals.updated.toLocaleString("en-IN")}
            foot="in-place syncs"
            icon={<RefreshCw size={18} />}
          />
          <Metric
            label="Failed"
            value={totals.failed.toLocaleString("en-IN")}
            foot={`${totals.warnings.toLocaleString("en-IN")} warnings`}
            icon={<AlertTriangle size={18} />}
          />
        </div>

        <Card
          title={<span className="vh-row" style={{ gap: 8 }}><History size={16} aria-hidden /> Run history</span>}
          action={<Link className="small" href="/admin/import/logs">All logs →</Link>}
        >
          {history.length === 0 ? (
            <EmptyState
              icon="🕓"
              headline="No runs yet"
              sub="Once a store is imported or synced, every run is recorded here — permanently."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="vh-table">
                <thead>
                  <tr>
                    <th scope="col">Store</th>
                    <th scope="col">Method</th>
                    <th scope="col">Started</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Imported</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Skipped</th>
                    <th scope="col">Deleted</th>
                    <th scope="col">Failed</th>
                    <th scope="col">Warnings</th>
                    <th scope="col">Trigger</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id}>
                      <td className="small" style={{ fontWeight: 700 }}>{r.storeLabel}</td>
                      <td><span className="imp-chip">{r.method}</span></td>
                      <td className="small muted tabular" style={{ whiteSpace: "nowrap" }}>
                        {new Date(r.startedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="small tabular">
                        {r.durationMs != null ? `${Math.round(r.durationMs / 1000)}s` : "—"}
                      </td>
                      <td className="small tabular">{r.imported.toLocaleString("en-IN")}</td>
                      <td className="small tabular">{r.updated.toLocaleString("en-IN")}</td>
                      <td className="small tabular muted">{r.skipped.toLocaleString("en-IN")}</td>
                      <td className="small tabular muted">{r.deleted.toLocaleString("en-IN")}</td>
                      <td className="small tabular" style={r.failed > 0 ? { color: "var(--vh-danger)", fontWeight: 700 } : undefined}>
                        {r.failed.toLocaleString("en-IN")}
                      </td>
                      <td className="small tabular muted">{r.warnings.toLocaleString("en-IN")}</td>
                      <td><span className="imp-chip">{r.trigger}</span></td>
                      <td><StatusPill tone={statusTone(r.status)}>{r.status.replace(/_/g, " ")}</StatusPill></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <span className="vh-row" style={{ gap: 6, justifyContent: "flex-end" }}>
                          <RunDetail
                            run={{
                              id: r.id, storeLabel: r.storeLabel, method: r.method, startedAt: r.startedAt,
                              finishedAt: r.finishedAt, durationMs: r.durationMs, status: r.status, trigger: r.trigger,
                              actor: r.actor, imported: r.imported, updated: r.updated, skipped: r.skipped,
                              deleted: r.deleted, failed: r.failed, warnings: r.warnings,
                            }}
                            logsHref={`/admin/import/logs?historyId=${r.id}`}
                            failedHref={r.failed > 0 ? "/admin/import/failed" : undefined}
                          />
                          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/admin/import/logs?historyId=${r.id}`}>Logs</Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="small muted" style={{ margin: 0, paddingTop: 12 }}>
            History is append-only: this is a record of every run, kept intact. Rows are never edited or removed —
            a correction is a new run, not a rewrite of an old one.
          </p>
        </Card>
      </ImpShell>
    </Shell>
  );
}
