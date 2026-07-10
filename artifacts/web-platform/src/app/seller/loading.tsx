/**
 * VEDIC HEMP — SELLER CONSOLE LOADING SKELETON
 *
 * Shown while any /seller route resolves. Mirrors the console layout:
 * rail, topbar, page head, KPI row, two content cards and a table block.
 */

import { Skeleton } from "@/components/ui";

export default function SellerLoading() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--vh-bg)" }} aria-busy="true" aria-label="Loading Seller Central">
      {/* Rail */}
      <div style={{ width: "var(--vh-rail-w, 232px)", flexShrink: 0, padding: "var(--sp-3)", borderRight: "1px solid var(--vh-line)", display: "grid", gap: 12, alignContent: "start" }}>
        <Skeleton w={140} h={22} r={8} />
        <div style={{ height: 8 }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} w="88%" h={14} r={6} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ padding: "var(--sp-2) var(--sp-4)", borderBottom: "1px solid var(--vh-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton w={220} h={14} r={6} />
          <Skeleton w={96} h={28} r={8} />
        </div>

        <div style={{ padding: "var(--sp-4)", display: "grid", gap: "var(--sp-4)" }}>
          {/* Page head */}
          <div style={{ display: "grid", gap: 8 }}>
            <Skeleton w={120} h={12} r={6} />
            <Skeleton w={320} h={28} r={8} />
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} w={128} h={32} r={8} />
            ))}
          </div>

          {/* Two content cards */}
          <div className="vh-grid cols-2">
            <div className="vh-card" style={{ display: "grid", gap: 12 }}>
              <Skeleton w={160} h={16} r={6} />
              <Skeleton h={112} r={10} />
              <div style={{ display: "flex", gap: 16 }}>
                <Skeleton w={90} h={36} r={8} />
                <Skeleton w={90} h={36} r={8} />
                <Skeleton w={90} h={36} r={8} />
              </div>
            </div>
            <div className="vh-card" style={{ display: "grid", gap: 12 }}>
              <Skeleton w={160} h={16} r={6} />
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Skeleton w={84} h={84} r={999} />
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <Skeleton h={12} r={6} />
                  <Skeleton h={12} r={6} />
                  <Skeleton w="70%" h={12} r={6} />
                </div>
              </div>
            </div>
          </div>

          {/* Table block */}
          <div className="vh-card" style={{ display: "grid", gap: 12 }}>
            <Skeleton w={200} h={16} r={6} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} h={16} r={6} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
