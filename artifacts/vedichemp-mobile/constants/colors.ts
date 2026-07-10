/**
 * Semantic design tokens for the Vedic Hemp mobile app.
 * Synced from the sibling web artifact (artifacts/vedichemp/src/index.css).
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#1b221f",
    tint: "#296549",

    // Core surfaces
    background: "#fbfaf7",
    foreground: "#1b221f",

    // Cards / elevated surfaces
    card: "#ffffff",
    cardForeground: "#1b221f",

    // Primary action color (buttons, links, active states)
    primary: "#296549",
    primaryForeground: "#ffffff",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#e6ede9",
    secondaryForeground: "#222b27",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#edf2ef",
    mutedForeground: "#5e6e66",

    // Accent highlights (badges, selected items, focus rings)
    accent: "#e2ebe6",
    accentForeground: "#222b27",

    // Destructive actions (delete, error states)
    destructive: "#b81e1e",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "#dde4e0",
    input: "#dde4e0",
  },

  // Border radius (in px). Synced from the web artifact's --radius (0.5rem).
  radius: 8,
};

export default colors;
