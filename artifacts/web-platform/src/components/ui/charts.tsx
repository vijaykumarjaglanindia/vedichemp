/**
 * VEDIC HEMP — CHARTS
 *
 * Dependency-free SVG charts that render on the server, inherit the design
 * tokens, and work in both themes. Same care as type: soft area fill, faint
 * grid, emphasised endpoint, tabular numerals in labels.
 */

let uid = 0;

/* ── Sparkline (trend) ─────────────────────────────────────── */
export function Sparkline({
  points, width = 160, height = 44, stroke = "var(--vh-accent)", fill = true, label,
}: { points: number[]; width?: number; height?: number; stroke?: string; fill?: boolean; label?: string }) {
  if (points.length < 2) return null;
  const id = `spark-${uid++}`;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 3;
  const xy = points.map((p, i) => [
    pad + (i / (points.length - 1)) * (width - pad * 2),
    height - pad - ((p - min) / span) * (height - pad * 2),
  ] as const);
  const path = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1]!;
  return (
    <svg width={width} height={height} role="img" aria-label={label ?? "trend"} style={{ display: "block" }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${last[0].toFixed(1)},${height - pad} L${pad},${height - pad} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={stroke} />
    </svg>
  );
}

/* ── Horizontal bar list (comparisons) ─────────────────────── */
export function BarList({
  items, color = "var(--vh-accent)",
}: { items: { label: string; value: number; display?: string }[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="vh-row-between small" style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: "var(--vh-ink)" }}>{it.label}</span>
            <span className="muted tabular">{it.display ?? it.value.toLocaleString("en-IN")}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--vh-bg-subtle)", overflow: "hidden" }} role="img" aria-label={`${it.label}: ${it.display ?? it.value}`}>
            <div style={{ width: `${(it.value / max) * 100}%`, height: "100%", borderRadius: 999, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Donut (share of total) ────────────────────────────────── */
export function Donut({
  segments, size = 120, thickness = 14, centre,
}: { segments: { value: number; color: string; label: string }[]; size?: number; thickness?: number; centre?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} role="img" aria-label={segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--vh-bg-subtle)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * c;
        const el = (
          <circle
            key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness} strokeLinecap="butt"
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += dash;
        return el;
      })}
      {centre && (
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size / 6.2} fontWeight={800} fill="var(--vh-ink)">
          {centre}
        </text>
      )}
    </svg>
  );
}

/* ── Column chart (period series) ──────────────────────────── */
export function Columns({
  values, labels, height = 120, color = "var(--vh-accent)", emphasizeLast = true,
}: { values: number[]; labels?: string[]; height?: number; color?: string; emphasizeLast?: boolean }) {
  const max = Math.max(...values, 1);
  // emphasizeLast highlights the final bar and mutes the rest — the right cue
  // for a time series (the last bar is "now"). For a categorical breakdown
  // (e.g. revenue by seller) pass emphasizeLast={false} so every bar reads as a
  // peer in the brand colour, not one arbitrary category singled out.
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }} role="img" aria-label="column chart">
        {values.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{
              height: `${Math.max((v / max) * 100, 3)}%`, borderRadius: "6px 6px 2px 2px",
              background: !emphasizeLast || i === values.length - 1 ? color : `color-mix(in srgb, ${color} 45%, var(--vh-bg-subtle))`,
            }} />
          </div>
        ))}
      </div>
      {labels && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {labels.map((l, i) => (
            <span key={i} className="small muted tabular" style={{ flex: 1, textAlign: "center", fontSize: ".64rem" }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
