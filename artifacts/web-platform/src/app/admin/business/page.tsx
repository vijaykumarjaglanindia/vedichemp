/**
 * VEDIC HEMP — BUSINESS (B2B) ACCOUNTS (admin)
 *
 * Approve or reject buyer applications for wholesale pricing. Approval keys
 * the discount to the verified account (GSTIN on file); a rejection needs a
 * reason. Both are audited. Approved accounts get seller wholesale tiers at
 * the cart — the discount is only ever the seller's own price break.
 */

import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill, EmptyState } from "@/components/ui";
import { allBusiness } from "@/lib/b2b";
import { decideBusinessAccount } from "../actions";

export const metadata: Metadata = { title: "Business accounts · Admin" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { sev: "ok" | "danger"; text: string }> = {
  approve: { sev: "ok", text: "Approved — wholesale pricing now applies to that buyer's bulk orders." },
  reject: { sev: "ok", text: "Rejected — the buyer is notified with the reason." },
  note: { sev: "danger", text: "A rejection needs a short reason (at least 10 characters)." },
};

const TONE = { NONE: "neutral", PENDING: "warn", APPROVED: "ok", REJECTED: "danger" } as const;

export default async function AdminBusinessPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string }> }) {
  const { done, err } = await searchParams;
  const accounts = await allBusiness();
  const pending = accounts.filter((a) => a.status === "PENDING").length;
  const msg = (done && MESSAGES[done]) || (err && MESSAGES[err]) || undefined;

  return (
    <Shell active="/admin/business" breadcrumb={["Admin", "People", "Business accounts"]} title="Business (B2B) accounts"
      actions={<StatusPill tone={pending ? "warn" : "ok"}>{pending} to review</StatusPill>}
    >
      {msg && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity={msg.sev}>{msg.text}</Banner></div>}

      <Card title={<span className="vh-row" style={{ gap: 8 }}><Building2 size={16} strokeWidth={2.2} aria-hidden /> Applications</span>} pad0>
        {accounts.length === 0 ? (
          <div style={{ padding: 12 }}><EmptyState icon="🏢" headline="No business accounts yet" sub="Buyer applications for wholesale pricing appear here." /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Company</th>
                  <th style={{ textAlign: "left" }}>Buyer</th>
                  <th style={{ textAlign: "left" }}>GSTIN</th>
                  <th style={{ textAlign: "left" }}>Requested</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.email}>
                    <td style={{ fontWeight: 700 }}>{a.company}</td>
                    <td className="small">{a.email}</td>
                    <td className="small mono">{a.gstin}</td>
                    <td className="small tabular">{a.requestedAt}</td>
                    <td><StatusPill tone={TONE[a.status]}>{a.status}</StatusPill></td>
                    <td style={{ textAlign: "right" }}>
                      {a.status === "PENDING" && (
                        <span className="vh-row" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <form action={decideBusinessAccount}>
                            <input type="hidden" name="email" value={a.email} />
                            <input type="hidden" name="decision" value="approve" />
                            <button className="vh-btn vh-btn-sm vh-btn-primary" type="submit">Approve</button>
                          </form>
                          <form action={decideBusinessAccount} className="vh-row" style={{ gap: 6, alignItems: "flex-end" }}>
                            <input type="hidden" name="email" value={a.email} />
                            <input type="hidden" name="decision" value="reject" />
                            <input className="vh-input vh-input-sm" name="note" placeholder="Reason" style={{ width: 160 }} aria-label={`Reject reason for ${a.company}`} />
                            <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit">Reject</button>
                          </form>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
