import { ImageResponse } from "next/og";

/**
 * Site-wide OpenGraph card. Rendered server-side by satori — no external
 * assets, light brand palette, dark type (the theme lock applies to shares
 * too). Product/journal pages inherit this until they get bespoke cards.
 */

export const alt = "Vedic Hemp — India's regulated hemp & wellness marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#f2f7f7",
          color: "#0b1210",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#1a7f5a",
              color: "#eaf6f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            🌿
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Vedic Hemp</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 40, lineHeight: 1.15, maxWidth: 980 }}>
          India&rsquo;s regulated marketplace for hemp, Ayurveda &amp; CBD wellness
        </div>
        <div style={{ fontSize: 30, marginTop: 28, color: "#3d4a45", maxWidth: 960 }}>
          Independent licensed sellers · batch lab reports on every regulated listing · no disease claims, ever
        </div>
      </div>
    ),
    size,
  );
}
