"use client";

/**
 * VEDIC HEMP — CONNECTED STORE · VIEW / EDIT POPUP.
 *
 * A per-store "View / Edit" button that opens the shared Modal: the top shows
 * the full connection detail read-only, the bottom is an edit form that saves
 * the label, sync cadence and auto-publish preference through the server action
 * (auto-publish can never override the CoA gate — regulated imports still land
 * DRAFT). Credentials are shown masked only.
 */

import { useState } from "react";
import { Eye } from "lucide-react";
import { Modal, DetailRows } from "@/components/ui/Modal";

export interface StoreView {
  id: string;
  sellerName: string;
  methodName: string;
  label: string;
  endpoint?: string;
  health: string;
  productCount: number;
  schedule: string;
  autoPublish: boolean;
  lastSyncAt?: string;
  createdAt: string;
  credentialsMasked: Record<string, string>;
}

const CADENCES = ["manual", "hourly", "daily", "weekly", "monthly", "realtime"] as const;

export function StoreDetail({ store, editAction }: { store: StoreView; editAction: (fd: FormData) => void }) {
  const [open, setOpen] = useState(false);
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN") : "—");

  return (
    <>
      <button type="button" className="vh-btn vh-btn-sm vh-btn-ghost" onClick={() => setOpen(true)}>
        <Eye size={13} aria-hidden /> View / Edit
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={store.sellerName}
        subtitle={`${store.methodName} · connected ${fmt(store.createdAt)}`}
      >
        <DetailRows
          rows={[
            { label: "Connection", value: store.label },
            { label: "Method", value: store.methodName },
            { label: "Endpoint", value: store.endpoint ? <span className="mono">{store.endpoint}</span> : "—" },
            { label: "Health", value: store.health },
            { label: "Products", value: store.productCount },
            { label: "Sync cadence", value: store.schedule },
            { label: "Last sync", value: fmt(store.lastSyncAt) },
            {
              label: "Credentials",
              value: Object.keys(store.credentialsMasked).length
                ? <span className="mono small">{Object.entries(store.credentialsMasked).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
                : "none stored",
            },
          ]}
        />

        <form action={editAction} onSubmit={() => setOpen(false)} style={{ display: "grid", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--vh-border)" }}>
          <div className="vh-modal-title" style={{ fontSize: "0.95rem" }}>Edit settings</div>
          <input type="hidden" name="id" value={store.id} />
          <div style={{ display: "grid", gap: 6 }}>
            <label htmlFor={`lbl-${store.id}`} className="small muted">Connection label</label>
            <input id={`lbl-${store.id}`} name="label" className="vh-input" defaultValue={store.label} maxLength={80} />
          </div>
          <div style={{ display: "grid", gap: 6, maxWidth: 240 }}>
            <label htmlFor={`sch-${store.id}`} className="small muted">Sync cadence</label>
            <select id={`sch-${store.id}`} name="schedule" className="vh-input" defaultValue={store.schedule}>
              {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className="vh-row" style={{ gap: 8 }}>
            <input type="checkbox" name="autoPublish" defaultChecked={store.autoPublish} />
            <span className="small">Auto-publish non-regulated imports <span className="muted">(regulated products always stay DRAFT until their lab report is approved)</span></span>
          </label>
          <div className="vh-row" style={{ gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="vh-btn vh-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="vh-btn vh-btn-primary">Save changes</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
