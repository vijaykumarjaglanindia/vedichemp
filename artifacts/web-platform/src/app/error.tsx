"use client";

/**
 * VEDIC HEMP — ROUTE ERROR BOUNDARY (whole app)
 *
 * A server error must never strand a buyer on a stack trace or a dead white
 * screen. This renders inside the root layout (light theme, dark ink), says
 * what happened in plain language, and offers the two useful moves: retry
 * and go home. The error digest is shown so support can find the log line —
 * never the message itself, which could leak internals.
 */

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "72px 20px", textAlign: "center" }}>
      <div aria-hidden style={{ fontSize: "2.4rem", marginBottom: 12 }}>🌿</div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 10, color: "var(--vh-ink, #1c2b21)" }}>
        Something went wrong on our side
      </h1>
      <p className="muted" style={{ marginBottom: 6 }}>
        The page hit an unexpected error. Nothing was charged and your cart is safe —
        trying again usually fixes it.
      </p>
      {error.digest && (
        <p className="small muted" style={{ marginBottom: 20 }}>
          If you contact support, quote error reference <code>{error.digest}</code>.
        </p>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={reset} className="vh-btn vh-btn-primary">
          Try again
        </button>
        <a href="/" className="vh-btn vh-btn-ghost">
          Back to the homepage
        </a>
      </div>
    </div>
  );
}
