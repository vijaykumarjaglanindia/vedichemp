/**
 * VEDIC HEMP — PUBLIC SITE LOADING SKELETON
 *
 * Mirrors the marketing layout (hero block + section head + product-card grid)
 * so navigation between public pages never flashes an empty screen.
 */

import { Skeleton } from "@/components/ui";

export default function SiteLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      {/* Hero block */}
      <div style={{ padding: "var(--sp-6) 0", background: "var(--vh-bg-subtle)", borderBottom: "1px solid var(--vh-line)" }}>
        <div className="vh-container">
          <Skeleton w={140} h={14} r={999} />
          <div style={{ marginTop: 16 }}>
            <Skeleton w="min(520px, 80%)" h={44} r={10} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Skeleton w="min(420px, 65%)" h={18} r={6} />
          </div>
          <div className="vh-row" style={{ gap: 12, marginTop: 24 }}>
            <Skeleton w={170} h={44} r={12} />
            <Skeleton w={150} h={44} r={12} />
          </div>
        </div>
      </div>

      {/* Section head + card grid */}
      <div className="vh-container" style={{ padding: "var(--sp-6) var(--sp-4)" }}>
        <Skeleton w={220} h={24} r={8} />
        <div style={{ marginTop: 10 }}>
          <Skeleton w={320} h={14} r={6} />
        </div>
        <div className="vh-grid cols-4" style={{ marginTop: "var(--sp-4)" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="vh-card" style={{ padding: 12 }}>
              <Skeleton h={130} r={10} />
              <div style={{ marginTop: 12 }}><Skeleton w="80%" h={14} r={6} /></div>
              <div style={{ marginTop: 8 }}><Skeleton w="55%" h={12} r={6} /></div>
              <div style={{ marginTop: 10 }}><Skeleton w={90} h={16} r={6} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
