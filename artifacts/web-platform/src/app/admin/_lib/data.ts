/**
 * VEDIC HEMP — ADMIN CONSOLE LOCAL DATA (_lib, not routed)
 *
 * What is left here is the ad-inventory registry: the shape of a configurable
 * paid placement. Every figure the admin console renders now comes from a live
 * store — orders, settlements, consent, catalogue — so there are no seeded
 * series in this file to be mistaken for real ones.
 *
 * Nothing here is a source of truth, and nothing here contains an advertisable
 * MED_CANNABIS surface (A1).
 */

/* ── Ad inventory registry (rendered on /admin/ads) ────────── */

export interface AdPlacement {
  id: string;
  placement: string;
  surface: string;
  format: string;
  pricing: "flat/day" | "CPC" | "CPM";
  floorPaise: number;
  status: string;
}
