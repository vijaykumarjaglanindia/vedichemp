/**
 * VEDIC HEMP — PRODUCT IMPORT · import logs.
 *
 * The append-only record of everything the importer said while pulling a
 * seller's catalogue: info, warnings and errors, newest first. Rows are read
 * straight from the import store (lib/import/store.listLogs) and filtered by
 * `level` and (optionally) a single run's `historyId` via searchParams — the
 * page invents nothing. Logs are records, not documents: they are only ever
 * appended, never edited or deleted (A3), which is why there is no action here.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, Info, AlertTriangle, XCircle } from "lucide-react";
import { Shell } from "@/app/admin/Shell";
import { ImpShell, ImpHero, Metric } from "@/app/admin/import/_ui";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import type { ImportLogRow, LogLevel } from "@/lib/import/types";
import { listLogs } from "@/lib/import/store";

export const metadata: Metadata = { title: "Import Logs" };
export const dynamic = "force-dynamic";

const LEVELS: { key: "all" | LogLevel; label: string }[] = [
  { key: "all", label: "All levels" },
  { key: "info", label: "Info" },
  { key: "warn", label: "Warnings" },
  { key: "error", label: "Errors" },
];

function toneForLevel(level: LogLevel): "danger" | "warn" | "info" {
  return level === "error" ? "danger" : level === "warn" ? "warn" : "info";
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; historyId?: string }>;
}) {
  const { level, historyId } = await searchParams;
  const active: "all" | LogLevel =
    level === "info" || level === "warn" || level === "error" ? level : "all";

  const rows: ImportLogRow[] = await listLogs({ level: active, historyId, limit: 300 });

  const errorCount = rows.filter((r) => r.level === "error").length;
  const warnCount = rows.filter((r) => r.level === "warn").length;

  const hrefFor = (lvl: "all" | LogLevel) => {
    const params = new URLSearchParams();
    if (lvl !== "all") params.set("level", lvl);
    if (historyId) params.set("historyId", historyId);
    const qs = params.toString();
    return qs ? `/admin/import/logs?${qs}` : "/admin/import/logs";
  };

  return (
    <Shell active="/admin/import/logs" breadcrumb={["Admin", "Marketplace", "Import"]} title="Import Logs">
      <ImpShell>
        <ImpHero
          badge="Import · Logs"
          title="Import logs"
          sub="Everything the importer reported while pulling and syncing catalogues — newest first. Logs are append-only: they are recorded, never edited or deleted (A3), so what the importer saw stays exactly as it saw it."
          actions={
            <>
              <Link href="/admin/import/history" className="vh-btn vh-btn-ghost">Run history</Link>
              <Link href="/admin/import/failed" className="vh-btn vh-btn-ghost">Failed imports</Link>
            </>
          }
        />

        {/* Snapshot of the current view */}
        <div className="imp-grid cols-3">
          <Metric label="Entries shown" value={rows.length} foot="newest first · up to 300" icon={<ScrollText size={18} />} />
          <Metric label="Warnings in view" value={warnCount} foot={active === "all" ? "across all levels" : `${active} filter`} icon={<AlertTriangle size={18} />} />
          <Metric label="Errors in view" value={errorCount} foot="blocked or refused rows" icon={<XCircle size={18} />} />
        </div>

        {/* Level filter */}
        <nav className="vh-row" style={{ gap: 8, flexWrap: "wrap" }} aria-label="Filter logs by level">
          {LEVELS.map((l) => (
            <Link
              key={l.key}
              href={hrefFor(l.key)}
              className={`imp-chip ${active === l.key ? "on" : ""}`}
              aria-current={active === l.key ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Scope note when a single run is being inspected */}
        {historyId && (
          <div className="vh-banner vh-banner-info" role="note">
            <span aria-hidden style={{ fontSize: "1.1rem", lineHeight: 1 }}><Info size={18} /></span>
            <div>
              Showing entries for a single run — <span className="mono">{historyId}</span>.{" "}
              <Link href={hrefFor(active)} className="small">Clear run filter</Link>
            </div>
          </div>
        )}

        <Card title={<span className="vh-row" style={{ gap: 8 }}><ScrollText size={16} aria-hidden /> Log entries</span>}>
          {rows.length === 0 ? (
            <EmptyState
              icon="🗒️"
              headline="No log entries"
              sub={
                active === "all" && !historyId
                  ? "The importer has not recorded anything yet. Run an import and its info, warnings and errors will appear here."
                  : "No entries match this filter. Try a different level or clear the run filter."
              }
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="vh-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Time</th>
                    <th style={{ textAlign: "left" }}>Level</th>
                    <th style={{ textAlign: "left" }}>Message</th>
                    <th style={{ textAlign: "left" }}>Product</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id}>
                      <td className="mono tabular small" style={{ whiteSpace: "nowrap" }}>
                        {new Date(l.at).toLocaleTimeString()}
                      </td>
                      <td>
                        <StatusPill tone={toneForLevel(l.level)}>{l.level}</StatusPill>
                      </td>
                      <td>{l.message}</td>
                      <td className="small muted">{l.productRef ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
            Logs are append-only. Entries are recorded as the importer runs and are never edited or removed (A3); a
            correction is always a new entry, never a rewrite of an old one.
          </p>
        </Card>
      </ImpShell>
    </Shell>
  );
}
