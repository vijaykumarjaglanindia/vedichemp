"use client";

/**
 * VEDIC HEMP — NEWSLETTER FORM (footer island)
 *
 * Thin client wrapper so the confirmation renders inline without a page
 * navigation. Validation and persistence happen in the server action.
 */

import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterState } from "../actions";

const INITIAL: NewsletterState = { ok: false, message: "" };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeNewsletter, INITIAL);

  if (state.ok) {
    return (
      <p className="small" role="status" style={{ margin: 0, fontWeight: 700, color: "var(--vh-ok)" }}>
        ✓ {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="vh-row" style={{ gap: 8, flexWrap: "wrap" }} aria-label="Newsletter signup">
      <label htmlFor="vh-newsletter" style={{ position: "absolute", left: -9999 }}>Email address</label>
      <input
        id="vh-newsletter"
        name="email"
        type="email"
        required
        placeholder="you@example.in"
        className="vh-input"
        style={{ width: 240, background: "var(--vh-surface)", borderColor: "var(--vh-line-strong)", color: "var(--vh-ink)" }}
      />
      <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm" disabled={pending}>
        {pending ? "Subscribing…" : "Subscribe"}
      </button>
      {state.message && (
        <span className="small" role="alert" style={{ color: "var(--vh-danger)", flexBasis: "100%" }}>
          {state.message}
        </span>
      )}
    </form>
  );
}
