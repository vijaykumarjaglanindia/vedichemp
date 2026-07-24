/**
 * VEDIC HEMP — IMPORT MODULE · shared presentational components.
 *
 * Server-safe (no client hooks) so every page can compose them. Styling lives
 * in globals.css under the `.imp-*` scope; these components only arrange it.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import type { StoreHealth, MethodMeta } from "@/lib/import/types";
import { methodMeta } from "@/lib/import/connectors";
import type { ConnectionMethod } from "@/lib/import/types";

export const IMPORT_STEPS = [
  "Choose seller", "Import method", "Connect", "Validate", "Fetch", "Preview", "Select",
  "Category mapping", "Brand mapping", "Attribute mapping", "Import rules", "Review", "Import", "Summary",
] as const;

/** Wraps a whole import page so the module gets its scoped dark-mode surface. */
export function ImpShell({ children }: { children: ReactNode }) {
  return <div className="imp-shell" style={{ display: "grid", gap: "var(--sp-4)" }}>{children}</div>;
}

export function ImpHero({ badge, title, sub, actions }: { badge?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="imp-hero">
      <div className="vh-row-between" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          {badge && <span className="imp-hero-badge">{badge}</span>}
          <h1 style={{ marginTop: badge ? 10 : 0 }}>{title}</h1>
          {sub && <p className="imp-hero-sub">{sub}</p>}
        </div>
        {actions && <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>{actions}</div>}
      </div>
    </header>
  );
}

export function Metric({ label, value, foot, icon, href }: { label: string; value: ReactNode; foot?: ReactNode; icon?: ReactNode; href?: string }) {
  const inner = (
    <div className="imp-metric">
      {icon && <span className="imp-metric-icon" aria-hidden>{icon}</span>}
      <div className="imp-metric-label">{label}</div>
      <div className="imp-metric-value tabular">{value}</div>
      {foot && <div className="imp-metric-foot">{foot}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : inner;
}

const HEALTH_LABEL: Record<StoreHealth, { cls: string; text: string }> = {
  healthy: { cls: "healthy", text: "Healthy" },
  degraded: { cls: "degraded", text: "Degraded" },
  auth_expired: { cls: "down", text: "Auth expired" },
  unreachable: { cls: "down", text: "Unreachable" },
  never_connected: { cls: "idle", text: "Never synced" },
};

export function HealthPill({ health }: { health: StoreHealth }) {
  const h = HEALTH_LABEL[health];
  return <span className={`imp-health ${h.cls}`}>{h.text}</span>;
}

export function MethodGlyph({ method }: { method: ConnectionMethod }) {
  const m = methodMeta(method);
  return <span aria-hidden style={{ fontSize: "1.1rem" }}>{m.emoji}</span>;
}

export function CapabilityChips({ meta }: { meta: MethodMeta }) {
  const caps: [keyof MethodMeta["capabilities"], string][] = [
    ["variations", "Variants"], ["images", "Images"], ["inventory", "Stock"],
    ["categories", "Categories"], ["seo", "SEO"], ["incrementalSync", "Incremental"], ["webhooks", "Webhooks"],
  ];
  return (
    <div className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
      {caps.map(([k, label]) => (
        <span key={k} className={`imp-chip ${meta.capabilities[k] ? "on" : ""}`}>{meta.capabilities[k] ? "✓ " : "· "}{label}</span>
      ))}
    </div>
  );
}

export function StepRail({ current }: { current: number }) {
  return (
    <div className="imp-steprail" aria-label={`Import wizard, step ${current} of ${IMPORT_STEPS.length}`}>
      {IMPORT_STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "";
        return (
          <span key={label} className={`imp-step ${state}`}>
            <span className="imp-step-n">{n < current ? "✓" : n}</span>
            <span className="imp-step-label">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function Progress({ percent }: { percent: number }) {
  return <div className="imp-progress" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} /></div>;
}

export function Thumb({ emoji, url }: { emoji?: string; url?: string }) {
  return <span className="imp-thumb" aria-hidden>{url ? "🖼️" : emoji || "📦"}</span>;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="vh-row" style={{ gap: 12 }}>
          <div className="imp-skel" style={{ width: 44, height: 44, borderRadius: 10 }} />
          <div style={{ flex: 1, display: "grid", gap: 6 }}>
            <div className="imp-skel" style={{ width: "40%", height: 12 }} />
            <div className="imp-skel" style={{ width: "70%", height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
