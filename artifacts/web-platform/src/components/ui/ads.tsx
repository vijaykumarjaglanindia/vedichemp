/**
 * VEDIC HEMP — ADVERTISING SURFACE PRIMITIVES
 *
 * Every paid placement on the platform renders through these, which buys two
 * guarantees for the whole ad ecosystem at once:
 *
 *  1. Disclosure — a sponsored surface is ALWAYS visibly labelled. There is no
 *     unlabelled variant to reach for.
 *  2. A1 — a MED_CANNABIS creative cannot render. The check lives here in the
 *     component (a pure guard, no DB), on top of the API/DB CHECK, the index
 *     omission and the auction drop. One bug must not produce an unlawful ad.
 *
 * Placements are configured from /admin/ads (inventory registry); this module
 * is only the render contract.
 */

import type { ReactNode } from "react";
import { ComplianceClass } from "@prisma/client";

export class AdRenderViolation extends Error {
  constructor() {
    super("A1: a MED_CANNABIS creative reached an ad surface. This is a SEV-1 — the upstream layers have leaked.");
    this.name = "AdRenderViolation";
  }
}

/** Pure A1 guard for render time. Throws — never filters silently. */
export function assertCreativeClassRenderable(cls: ComplianceClass): void {
  if (cls === ComplianceClass.MED_CANNABIS) throw new AdRenderViolation();
}

export function SponsoredLabel({ kind = "Sponsored" }: { kind?: "Sponsored" | "Ad" | "Promoted" }) {
  return <span className="vh-ad-label">{kind}</span>;
}

export function CampaignLabel({ children = "Campaign" }: { children?: ReactNode }) {
  return <span className="vh-campaign-badge">{children}</span>;
}

/**
 * A bordered, labelled ad container. `cls` is the compliance class of the
 * advertised product/brand — the guard runs before anything renders.
 */
export function AdSlot({
  cls, placement, children, unstyled,
}: { cls: ComplianceClass; placement: string; children: ReactNode; unstyled?: boolean }) {
  assertCreativeClassRenderable(cls);
  if (unstyled) {
    return (
      <div data-ad-placement={placement}>
        <SponsoredLabel />
        {children}
      </div>
    );
  }
  return (
    <div className="vh-adslot" data-ad-placement={placement}>
      <div className="vh-row-between" style={{ marginBottom: 10 }}>
        <SponsoredLabel />
        <span className="small muted" style={{ fontSize: ".68rem" }}>{placement}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Banner ad unit ─────────────────────────────────────────
   A wide, labelled brand banner (leaderboard / sidebar / inline). Pure
   presentation: the placement id and creative copy come from the caller;
   the A1 guard runs in AdSlot. */
export function AdBanner({
  cls, placement, brand, headline, body, cta, href, tall,
}: {
  cls: ComplianceClass; placement: string; brand: string; headline: string;
  body?: string; cta: string; href: string; tall?: boolean;
}) {
  assertCreativeClassRenderable(cls);
  return (
    <div className="vh-adslot" data-ad-placement={placement} style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex", flexDirection: tall ? "column" : "row", alignItems: tall ? "flex-start" : "center",
          gap: 16, padding: "18px 20px",
          background: "linear-gradient(120deg, var(--vh-green-50), #ffffff 70%)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vh-row" style={{ gap: 8, marginBottom: 6 }}>
            <SponsoredLabel />
            <span className="small muted" style={{ fontWeight: 600 }}>{brand}</span>
          </div>
          <div style={{ fontWeight: 700, color: "var(--vh-ink)", fontSize: "1.02rem", letterSpacing: "-0.01em" }}>{headline}</div>
          {body && <div className="small muted" style={{ marginTop: 3 }}>{body}</div>}
        </div>
        <a href={href} className="vh-btn vh-btn-primary vh-btn-sm" style={{ flexShrink: 0 }}>{cta}</a>
      </div>
    </div>
  );
}

/* ── Video ad unit ──────────────────────────────────────────
   A 16:9 labelled video placement. Renders the poster + play affordance and
   the brand strip; the actual stream URL is creative-served once the ad
   server is attached (the placement contract is what matters here). */
export function AdVideo({
  cls, placement, brand, title, duration, href,
}: {
  cls: ComplianceClass; placement: string; brand: string; title: string; duration: string; href: string;
}) {
  assertCreativeClassRenderable(cls);
  return (
    <div className="vh-adslot" data-ad-placement={placement} style={{ padding: 0, overflow: "hidden" }}>
      <a href={href} style={{ display: "block", color: "inherit", textDecoration: "none" }} aria-label={`Sponsored video: ${title} by ${brand}`}>
        <div
          style={{
            aspectRatio: "16 / 9", position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            // Light poster — the platform is light-theme-only, ad units included.
            background:
              "radial-gradient(420px 220px at 78% 22%, color-mix(in srgb, var(--vh-green-400) 26%, transparent), transparent 60%), linear-gradient(150deg, var(--vh-green-100), var(--vh-green-50))",
            borderBottom: "1px solid var(--vh-line)",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 58, height: 58, borderRadius: 999, background: "rgba(255,255,255,.94)",
              border: "1px solid var(--vh-line)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 10px 30px rgba(6, 48, 43, 0.18)",
            }}
          >
            {/* play triangle */}
            <span style={{ width: 0, height: 0, borderTop: "11px solid transparent", borderBottom: "11px solid transparent", borderLeft: "18px solid var(--vh-green-700)", marginLeft: 5 }} />
          </span>
          <span className="small" style={{ position: "absolute", right: 10, bottom: 10, background: "rgba(255,255,255,.92)", color: "var(--vh-ink)", border: "1px solid var(--vh-line)", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
            {duration}
          </span>
          <span style={{ position: "absolute", left: 10, top: 10 }}><SponsoredLabel kind="Ad" /></span>
        </div>
        <div className="vh-row-between" style={{ padding: "12px 16px", background: "var(--vh-surface)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: "var(--vh-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
            <div className="small muted">{brand} · video</div>
          </div>
          <span className="vh-btn vh-btn-ghost vh-btn-sm" style={{ flexShrink: 0 }}>Watch</span>
        </div>
      </a>
    </div>
  );
}
