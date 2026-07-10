/**
 * VEDIC HEMP — BUYER CONSOLE LOADING STATE
 *
 * Skeleton composition that mirrors the console layout (rail + topbar +
 * widget grid) so the page doesn't jump when real content streams in.
 * The rail placeholder uses the same width token as the real shell.
 */

import { Skeleton } from "@/components/ui";

export default function AccountLoading() {
  return (
    <div className="vh-shell" aria-busy="true" aria-label="Loading your account">
      {/* Rail placeholder */}
      <div className="vh-rail" aria-hidden>
        <div style={{ padding: "8px 4px", display: "grid", gap: 16 }}>
          <Skeleton w={140} h={24} r={8} />
          <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} h={34} r={10} />
            ))}
          </div>
        </div>
      </div>

      {/* Content placeholder */}
      <div style={{ minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--vh-line)", display: "flex", gap: 16, alignItems: "center" }}>
          <Skeleton w={220} h={16} r={6} />
          <span className="vh-spacer" />
          <Skeleton w={34} h={34} r={999} />
        </div>

        <div style={{ padding: 24, display: "grid", gap: 16 }}>
          {/* Page head */}
          <Skeleton w={280} h={28} r={8} />

          {/* Quick actions */}
          <div className="vh-grid cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} h={68} r={14} />
            ))}
          </div>

          {/* Two-up cards */}
          <div className="vh-grid cols-2">
            <Skeleton h={160} r={14} />
            <Skeleton h={160} r={14} />
          </div>

          {/* Wide table/list card */}
          <Skeleton h={220} r={14} />

          {/* Stat row */}
          <div className="vh-grid cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} h={120} r={14} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
