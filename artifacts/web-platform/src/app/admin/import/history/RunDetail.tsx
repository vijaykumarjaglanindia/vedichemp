"use client";

/**
 * VEDIC HEMP — IMPORT RUN · VIEW POPUP.
 *
 * A "View" button on each history row that opens the shared Modal with the full
 * run detail. History is append-only, so this is view-only — a correction is a
 * new run, never an edit of an old one.
 */

import { useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { Modal, DetailRows } from "@/components/ui/Modal";

export interface RunView {
  id: string;
  storeLabel: string;
  method: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  status: string;
  trigger: string;
  actor?: string;
  imported: number;
  updated: number;
  skipped: number;
  deleted: number;
  failed: number;
  warnings: number;
}

export function RunDetail({ run, logsHref, failedHref }: { run: RunView; logsHref: string; failedHref?: string }) {
  const [open, setOpen] = useState(false);
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN") : "—");
  const num = (n: number) => n.toLocaleString("en-IN");

  const footer: ReactNode = (
    <>
      <a className="vh-btn vh-btn-sm vh-btn-ghost" href={logsHref}>View logs</a>
      {failedHref && <a className="vh-btn vh-btn-sm vh-btn-ghost" href={failedHref}>Failed rows</a>}
      <button type="button" className="vh-btn vh-btn-sm vh-btn-primary" onClick={() => setOpen(false)}>Close</button>
    </>
  );

  return (
    <>
      <button type="button" className="vh-btn vh-btn-sm vh-btn-ghost" onClick={() => setOpen(true)}>
        <Eye size={13} aria-hidden /> View
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Run · ${run.storeLabel}`} subtitle={`${run.method} · ${run.status.replace(/_/g, " ")}`} footer={footer}>
        <DetailRows
          rows={[
            { label: "Store", value: run.storeLabel },
            { label: "Method", value: run.method },
            { label: "Trigger", value: run.trigger },
            { label: "Run by", value: run.actor ?? "—" },
            { label: "Started", value: fmt(run.startedAt) },
            { label: "Finished", value: fmt(run.finishedAt) },
            { label: "Duration", value: run.durationMs != null ? `${Math.round(run.durationMs / 1000)}s` : "—" },
            { label: "Imported (DRAFT)", value: num(run.imported) },
            { label: "Updated", value: num(run.updated) },
            { label: "Skipped", value: num(run.skipped) },
            { label: "Deleted", value: num(run.deleted) },
            { label: "Failed", value: <span style={run.failed > 0 ? { color: "var(--vh-danger)", fontWeight: 700 } : undefined}>{num(run.failed)}</span> },
            { label: "Warnings", value: num(run.warnings) },
          ]}
        />
      </Modal>
    </>
  );
}
