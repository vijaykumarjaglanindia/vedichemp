/**
 * VEDIC HEMP — SHARED UI COMPONENT LIBRARY (§0.5)
 *
 * One set of primitives across the website and all three consoles, so a status
 * pill means the same thing to a buyer, a seller and an admin. Colour never
 * carries meaning alone: every status pairs colour + icon + text (WCAG 1.4.1).
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { ComplianceClass } from "@prisma/client";
import { formatPaise } from "@/lib/money";
import { CLASS_META } from "@/lib/compliance";

/* ── MoneyText ─────────────────────────────────────────────── */
export function MoneyText({ paise, sign, className = "" }: { paise: number; sign?: boolean; className?: string }) {
  const negative = paise < 0;
  return (
    <span className={`tabular ${className}`} style={negative ? { color: "var(--vh-danger)" } : undefined}>
      {formatPaise(paise, { sign })}
    </span>
  );
}

/* ── StatusPill ────────────────────────────────────────────── */
type PillTone = "ok" | "warn" | "danger" | "info" | "neutral";
const PILL_ICON: Record<PillTone, string> = { ok: "●", warn: "▲", danger: "■", info: "◆", neutral: "○" };

export function StatusPill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span className={`vh-pill vh-pill-${tone}`}>
      <span aria-hidden>{PILL_ICON[tone]}</span>
      {children}
    </span>
  );
}

/** Maps a domain status string to a tone so consoles stay consistent. */
export function toneForStatus(status: string): PillTone {
  const s = status.toUpperCase();
  if (/(LIVE|DELIVERED|APPROVED|ACTIVE|POSTED|PAID|VERIFIED|OK|PASS)/.test(s)) return "ok";
  if (/(PENDING|UNDER_REVIEW|SUBMITTED|AWAITING|PACKED|SHIPPED|OUT_FOR|DRAFT)/.test(s)) return "info";
  if (/(AT_RISK|PAUSED|EXPIR|WARN|LOW|SNOOZ)/.test(s)) return "warn";
  if (/(REJECT|SUSPEND|CANCEL|FAIL|DENIED|BLOCK|RECALL|DEACT|CLOSED)/.test(s)) return "danger";
  return "neutral";
}

/* ── ComplianceBadge ───────────────────────────────────────── */
export function ComplianceBadge({ cls }: { cls: ComplianceClass }) {
  const meta = CLASS_META[cls];
  return (
    <span className="vh-row" style={{ gap: 6, flexWrap: "wrap" }}>
      <span className="vh-cbadge vh-cbadge-ayush">{meta.short}</span>
      {isRegulatedBadge(cls) && <span className="vh-cbadge vh-cbadge-lab">Lab Report</span>}
      {meta.rxRequired && <span className="vh-cbadge vh-cbadge-rx">Rx Required</span>}
      {meta.ageGated && <span className="vh-cbadge vh-cbadge-age">Age 21+</span>}
    </span>
  );
}
function isRegulatedBadge(cls: ComplianceClass) {
  return cls === "CBD_WELLNESS" || cls === "MED_CANNABIS";
}

/* ── Banner ────────────────────────────────────────────────── */
export function Banner({
  severity = "info", title, children, icon,
}: { severity?: "info" | "warn" | "danger" | "ok"; title?: string; children?: ReactNode; icon?: string }) {
  const defaultIcon = { info: "ℹ️", warn: "⚠️", danger: "⛔", ok: "✅" }[severity];
  return (
    <div className={`vh-banner vh-banner-${severity}`} role={severity === "danger" ? "alert" : "status"}>
      <span aria-hidden style={{ fontSize: "1.1rem", lineHeight: 1 }}>{icon ?? defaultIcon}</span>
      <div>
        {title && <strong style={{ display: "block", marginBottom: 2 }}>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

/* ── EmptyState ────────────────────────────────────────────── */
export function EmptyState({
  icon = "🗂️", headline, sub, cta,
}: { icon?: string; headline: string; sub?: string; cta?: { label: string; href: string } }) {
  return (
    <div className="vh-empty">
      <div className="vh-empty-icon" aria-hidden>{icon}</div>
      <h3 style={{ marginBottom: 4 }}>{headline}</h3>
      {sub && <p className="small" style={{ maxWidth: 380, margin: "0 auto 12px" }}>{sub}</p>}
      {cta && <Link className="vh-btn vh-btn-primary vh-btn-sm" href={cta.href}>{cta.label}</Link>}
    </div>
  );
}

/* ── Card ──────────────────────────────────────────────────── */
export function Card({
  title, action, children, pad0, className = "",
}: { title?: ReactNode; action?: ReactNode; children: ReactNode; pad0?: boolean; className?: string }) {
  return (
    <section className={`vh-card ${pad0 ? "vh-card-pad-0" : ""} ${className}`}>
      {(title || action) && (
        <header className="vh-row-between" style={{ marginBottom: pad0 ? 0 : 14, padding: pad0 ? "16px 18px" : undefined }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ── Stat tile ─────────────────────────────────────────────── */
export function Stat({
  label, value, delta,
}: { label: string; value: ReactNode; delta?: { dir: "up" | "down"; text: string } }) {
  return (
    <div className="vh-stat">
      <span className="vh-stat-label">{label}</span>
      <span className="vh-stat-value tabular">{value}</span>
      {delta && (
        <span className={delta.dir === "up" ? "vh-stat-delta-up" : "vh-stat-delta-down"}>
          {delta.dir === "up" ? "▲" : "▼"} {delta.text}
        </span>
      )}
    </div>
  );
}

/* ── DataTable (server-rendered core) ──────────────────────── */
export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}
export function DataTable<T>({
  columns, rows, empty,
}: { columns: Column<T>[]; rows: T[]; empty?: ReactNode }) {
  if (rows.length === 0) {
    return <div className="vh-empty">{empty ?? <EmptyState headline="Nothing here yet" />}</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="vh-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align ?? "left" }}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => <td key={c.key} style={{ textAlign: c.align ?? "left" }}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Timeline ──────────────────────────────────────────────── */
export function Timeline({ nodes }: { nodes: { label: string; at?: string; actor?: string; state: "done" | "current" | "pending" | "failed" }[] }) {
  const color = { done: "var(--vh-ok)", current: "var(--vh-info)", pending: "var(--vh-line)", failed: "var(--vh-danger)" };
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {nodes.map((n, i) => (
        <li key={i} className="vh-row" style={{ alignItems: "flex-start", gap: 12, paddingBottom: 14 }}>
          <span aria-hidden style={{ width: 12, height: 12, borderRadius: 999, background: color[n.state], marginTop: 4, flexShrink: 0, boxShadow: `0 0 0 3px ${color[n.state]}22` }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: "var(--vh-ink)" }}>{n.label}</div>
            {(n.at || n.actor) && <div className="small muted">{[n.at, n.actor].filter(Boolean).join(" · ")}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Rating (stars + count, never colour alone) ────────────── */
export function Rating({ value, count }: { value: number; count?: number }) {
  const full = Math.round(value);
  return (
    <span className="vh-rating" aria-label={`Rated ${value} out of 5${count ? ` by ${count} buyers` : ""}`}>
      <span className="stars" aria-hidden>{"★".repeat(full)}{"☆".repeat(5 - full)}</span>
      <span className="tabular">{value.toFixed(1)}</span>
      {count !== undefined && <span className="count tabular">({count.toLocaleString("en-IN")})</span>}
    </span>
  );
}

/* ── Skeleton (loading placeholder) ────────────────────────── */
export function Skeleton({ w, h = 14, r }: { w?: number | string; h?: number | string; r?: number }) {
  return <span className="vh-skeleton" aria-hidden style={{ display: "block", width: w ?? "100%", height: h, borderRadius: r }} />;
}

/* ── Section head (marketing rhythm) ───────────────────────── */
export function SectionHead({
  eyebrow, title, sub, action,
}: { eyebrow?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="vh-row-between" style={{ alignItems: "flex-end", marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: 12 }}>
      <div className="vh-section-head" style={{ marginBottom: 0 }}>
        {eyebrow && <div className="vh-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h2 style={{ marginBottom: sub ? 8 : 0 }}>{title}</h2>
        {sub && <p style={{ margin: 0 }} className="muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Progress ring (SSR, SVG) ──────────────────────────────── */
export function ProgressRing({ percent, size = 64 }: { percent: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  return (
    <svg width={size} height={size} role="img" aria-label={`${percent}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--vh-line)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--vh-green-600)" strokeWidth={6}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size / 4} fontWeight={700} fill="var(--vh-ink)">
        {percent}%
      </text>
    </svg>
  );
}
