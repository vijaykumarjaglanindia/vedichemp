/**
 * VEDIC HEMP — CUSTOMERS (§2.5 adjacent)
 *
 * Buyer questions, reviews and messages. Health data never appears here —
 * a review or message referencing symptoms/medical use would be redacted
 * before reaching this view (A4 boundary, enforced server-side).
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus } from "@/components/ui";
import { QUESTIONS, REVIEWS, MESSAGES } from "../_lib/data";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <Shell active="/seller/customers" breadcrumb={["Seller Central", "Customers"]} title="Customers">
      <div className="vh-grid cols-3" style={{ alignItems: "start" }}>
        <Card title="Questions">
          {QUESTIONS.length === 0 ? (
            <div className="vh-empty">No open questions.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {QUESTIONS.map((q) => (
                <li key={q.id}>
                  <div className="vh-row-between" style={{ marginBottom: 4 }}>
                    <span className="small muted">{q.product}</span>
                    <StatusPill tone={toneForStatus(q.status)}>{q.status}</StatusPill>
                  </div>
                  <div style={{ fontSize: "0.9rem" }}>&ldquo;{q.text}&rdquo;</div>
                  <div className="small muted">{q.buyer} · {q.askedAt}</div>
                  {q.status === "UNANSWERED" && <a className="small" href="#answer">Answer →</a>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Reviews">
          {REVIEWS.length === 0 ? (
            <div className="vh-empty">No reviews yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {REVIEWS.map((r) => (
                <li key={r.id}>
                  <div className="vh-row-between" style={{ marginBottom: 4 }}>
                    <span className="small muted">{r.product}</span>
                    <StatusPill tone={toneForStatus(r.status)}>{r.status}</StatusPill>
                  </div>
                  <div style={{ fontSize: "0.9rem" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} &ldquo;{r.text}&rdquo;</div>
                  <div className="small muted">{r.buyer}</div>
                  {r.status === "FLAGGED" && <a className="small" href="#respond">Respond →</a>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Messages">
          {MESSAGES.length === 0 ? (
            <div className="vh-empty">No messages.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {MESSAGES.map((m) => (
                <li key={m.id} className="vh-row-between">
                  <span>
                    <div style={{ fontWeight: m.unread ? 700 : 400 }}>{m.subject}</div>
                    <div className="small muted">{m.buyer} · {m.at}</div>
                  </span>
                  {m.unread && <StatusPill tone="info">New</StatusPill>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
