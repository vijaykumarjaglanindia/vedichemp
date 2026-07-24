"use client";

/**
 * VEDIC HEMP — INTEGRATION · VIEW SETUP POPUP.
 *
 * Keeps the Integrations page scannable (one status line per provider) and moves
 * the full setup detail — which env vars to set, which are still missing, notes
 * and provider docs — into a popup. It never shows a secret value, only which
 * variable names are present.
 */

import { useState } from "react";
import { Eye, CheckCircle2, CircleDashed } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui";

export interface EnvRow { name: string; secret?: boolean; required?: boolean; note?: string }
export interface ProviderView {
  key: string;
  name: string;
  blurb: string;
  configured: boolean;
  docsHref?: string;
  env: EnvRow[];
  present: string[];
}

export function ProviderSetup({ p }: { p: ProviderView }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="vh-card" style={{ padding: 14 }}>
        <div className="vh-row" style={{ gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="vh-row" style={{ gap: 8, minWidth: 0 }}>
            {p.configured
              ? <CheckCircle2 size={16} aria-hidden style={{ color: "var(--vh-ok)" }} />
              : <CircleDashed size={16} aria-hidden style={{ color: "var(--vh-muted)" }} />}
            <div style={{ minWidth: 0 }}>
              <div className="vh-row" style={{ gap: 8 }}>
                <strong>{p.name}</strong>
                <StatusPill tone={p.configured ? "ok" : "neutral"}>{p.configured ? "connected" : "not connected"}</StatusPill>
              </div>
              <div className="small muted">{p.blurb}</div>
            </div>
          </div>
          <button type="button" className="vh-btn vh-btn-sm vh-btn-ghost" onClick={() => setOpen(true)}><Eye size={13} aria-hidden /> View setup</button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${p.name} setup`}
        subtitle={p.configured ? "Connected" : `${p.env.filter((v) => (v.required ?? true) && !p.present.includes(v.name)).length} required variable(s) still missing`}
        footer={<>
          {p.docsHref && <a className="vh-btn vh-btn-sm vh-btn-ghost" href={p.docsHref} target="_blank" rel="noreferrer">Provider docs ↗</a>}
          <button type="button" className="vh-btn vh-btn-sm vh-btn-primary" onClick={() => setOpen(false)}>Close</button>
        </>}
      >
        <p className="small muted" style={{ marginTop: 0 }}>
          Set these in your host&apos;s secrets (Replit → Secrets), then redeploy. The provider activates automatically —
          no code change. Values are never shown here; only whether each name is set.
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          {p.env.map((v) => {
            const present = p.present.includes(v.name);
            return (
              <div key={v.name} className="vh-row small" style={{ gap: 8, flexWrap: "wrap", padding: "6px 0", borderBottom: "1px solid var(--vh-border)" }}>
                <code className="mono" style={{ background: "var(--vh-surface-2)", padding: "1px 6px", borderRadius: 4 }}>{v.name}</code>
                <StatusPill tone={present ? "ok" : (v.required ?? true) ? "warn" : "neutral"}>{present ? "set" : (v.required ?? true) ? "required" : "optional"}</StatusPill>
                {v.secret && <span className="muted" style={{ fontSize: "0.75rem" }}>secret</span>}
                {v.note && <span className="muted">— {v.note}</span>}
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
