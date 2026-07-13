"use client";

/**
 * VEDIC HEMP — GLOBAL ERROR BOUNDARY (root layout crashed)
 *
 * Reached only when the root layout itself throws, so nothing from
 * globals.css exists here — every style is inline and the light theme is
 * hand-set. Same promise as the route boundary: plain language, a retry,
 * and the error digest for support.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#f7f9f7",
          color: "#1c2b21",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "88px 20px", textAlign: "center" }}>
          <div aria-hidden style={{ fontSize: "2.4rem", marginBottom: 12 }}>🌿</div>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 10px" }}>Vedic Hemp hit an unexpected error</h1>
          <p style={{ color: "#51665a", margin: "0 0 6px", lineHeight: 1.6 }}>
            Nothing was charged and your cart is safe. Trying again usually fixes it.
          </p>
          {error.digest && (
            <p style={{ color: "#51665a", fontSize: ".85rem", margin: "0 0 22px" }}>
              If you contact support, quote error reference <code>{error.digest}</code>.
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "1px solid #2f6f4f",
              background: "#2f6f4f",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: ".95rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
