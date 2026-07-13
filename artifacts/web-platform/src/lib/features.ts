/**
 * VEDIC HEMP — FEATURES SWITCHBOARD + THEME PRESETS (WordPress-style)
 *
 * Plugin-panel ergonomics: every optional surface has an on/off switch, and
 * the storefront look is picked from curated LIGHT-ONLY presets (the theme
 * lock is policy: dark fonts on light backgrounds, everywhere, always —
 * presets vary accent and shape, never darkness).
 *
 * Server-side store (DB seam → FeatureFlag table). Compliance surfaces are
 * NOT listed here on purpose: the CoA gate, age gate, claims check and
 * prescription rules are not features and cannot be switched off.
 */

export interface FeatureDef {
  key: string;
  label: string;
  help: string;
}

export const FEATURE_DEFS: FeatureDef[] = [
  { key: "announcementBar", label: "Announcement bar", help: "The strip above the header on every public page." },
  { key: "newsletterBlock", label: "Footer newsletter signup", help: "The monthly wellness-notes signup in the footer." },
  { key: "flashSale", label: "Homepage flash sale", help: "The campaign strip with the server-timed countdown." },
  { key: "sponsoredSections", label: "Homepage sponsored placements", help: "Leaderboard, sponsor video and mid-page banner. Always labelled; A1 rules apply regardless of this switch." },
  { key: "testimonials", label: "Homepage testimonials", help: "The 'What buyers say' section." },
  { key: "homeFaq", label: "Homepage FAQ", help: "The FAQ accordion (and its FAQPage structured data)." },
  { key: "educationSection", label: "Homepage Learn section", help: "Journal-driven education cards + explainer." },
  { key: "giftFinder", label: "AI Gift Finder", help: "The /gifts experience. The footer link is managed in Menus." },
];

export interface ThemePreset {
  key: string;
  label: string;
  accent: string;
  accentDark: string;
  radius: string;
}

/** All presets are light theme with dark type — that is not configurable. */
export const THEME_PRESETS: ThemePreset[] = [
  { key: "classic", label: "Classic green (default)", accent: "", accentDark: "", radius: "" },
  { key: "forest", label: "Deep forest", accent: "#166b4d", accentDark: "#0f5039", radius: "14px" },
  { key: "sage", label: "Sage minimal", accent: "#4d7c5f", accentDark: "#3a6349", radius: "8px" },
];

declare global {
  // eslint-disable-next-line no-var
  var __vhFeatures: Record<string, boolean> | undefined;
  // eslint-disable-next-line no-var
  var __vhTheme: string | undefined;
}

function store(): Record<string, boolean> {
  globalThis.__vhFeatures ??= {};
  return globalThis.__vhFeatures;
}

/** Every feature defaults ON; the switchboard stores explicit choices. */
export async function readFeatures(): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const f of FEATURE_DEFS) out[f.key] = store()[f.key] ?? true;
  return out;
}

export async function writeFeatures(flags: Record<string, boolean>): Promise<void> {
  for (const f of FEATURE_DEFS) store()[f.key] = flags[f.key] ?? false;
}

export async function readThemePreset(): Promise<ThemePreset> {
  const key = globalThis.__vhTheme ?? "classic";
  return THEME_PRESETS.find((t) => t.key === key) ?? THEME_PRESETS[0]!;
}

export async function writeThemePreset(key: string): Promise<boolean> {
  if (!THEME_PRESETS.some((t) => t.key === key)) return false;
  globalThis.__vhTheme = key;
  return true;
}

/** CSS variable overrides for the active preset ("" for the default). */
export function themeCss(preset: ThemePreset): string {
  if (!preset.accent) return "";
  return `:root{--vh-accent:${preset.accent};--vh-green-700:${preset.accentDark};--vh-radius:${preset.radius};}`;
}
