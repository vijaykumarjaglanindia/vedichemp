/**
 * VEDIC HEMP — ADMIN CONSOLE LOADING SKELETON
 *
 * Matches the console's real layout rhythm (page head, KPI row, chart card,
 * two tables) so the transition from skeleton to content does not jump.
 * Purely presentational — nothing compliance-bearing renders here.
 */

import { Skeleton } from "@/components/ui";

export default function AdminLoading() {
  return (
    <div className="vh-container" style={{ padding: "var(--sp-5) var(--sp-4)" }} aria-busy="true" aria-label="Loading admin console">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {/* Page head */}
        <div style={{ display: "grid", gap: 8 }}>
          <Skeleton w={180} h={12} r={6} />
          <Skeleton w={320} h={28} r={8} />
        </div>

        {/* KPI row */}
        <div className="vh-card" style={{ display: "grid", gap: "var(--sp-3)" }}>
          <Skeleton w={160} h={16} r={6} />
          <div className="vh-grid cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: "grid", gap: 8 }}>
                <Skeleton w={90} h={10} r={5} />
                <Skeleton w={130} h={24} r={6} />
                <Skeleton w={150} h={36} r={8} />
              </div>
            ))}
          </div>
        </div>

        {/* Chart card */}
        <div className="vh-card" style={{ display: "grid", gap: "var(--sp-3)" }}>
          <Skeleton w={200} h={16} r={6} />
          <Skeleton h={128} r={10} />
        </div>

        {/* Two table cards */}
        <div className="vh-grid cols-2">
          {[0, 1].map((c) => (
            <div key={c} className="vh-card" style={{ display: "grid", gap: "var(--sp-2)" }}>
              <Skeleton w={180} h={16} r={6} />
              {[0, 1, 2, 3].map((r) => (
                <Skeleton key={r} h={40} r={8} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
