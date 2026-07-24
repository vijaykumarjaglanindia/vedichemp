"use client";

/**
 * VEDIC HEMP — MODAL (reusable view / edit popup)
 *
 * The one dialog primitive for the whole platform: any row, card or record can
 * open a popup to show its full detail or an edit form. Accessible by default —
 * ESC and backdrop close it, focus moves in on open and restores on close, and
 * it is a labelled aria-modal dialog. Server mutations still run through server
 * actions passed to the form inside; the modal is presentation only.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open, onClose, title, subtitle, children, footer, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog for keyboard + screen-reader users.
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button, input, select, textarea, a[href]")?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const maxWidth = size === "sm" ? 420 : size === "lg" ? 860 : 620;

  return (
    <div className="vh-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} className="vh-modal" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} style={{ maxWidth }}>
        <div className="vh-modal-head">
          <div style={{ minWidth: 0 }}>
            <div className="vh-modal-title">{title}</div>
            {subtitle && <div className="small muted">{subtitle}</div>}
          </div>
          <button type="button" className="vh-btn vh-btn-sm vh-btn-ghost" aria-label="Close" onClick={onClose}><X size={16} aria-hidden /></button>
        </div>
        <div className="vh-modal-body">{children}</div>
        {footer && <div className="vh-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** A read-only label→value detail list for "view" popups. */
export function DetailRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="vh-detail">
      {rows.map((r, i) => (
        <div key={i} className="vh-detail-row">
          <dt className="small muted">{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
