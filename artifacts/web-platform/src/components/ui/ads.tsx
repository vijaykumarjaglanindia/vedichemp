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
