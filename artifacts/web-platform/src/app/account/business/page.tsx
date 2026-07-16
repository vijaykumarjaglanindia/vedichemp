/**
 * VEDIC HEMP — BUSINESS (B2B) ACCOUNT (buyer)
 *
 * Apply for a business account to unlock wholesale pricing. Status is shown
 * live; once approved, bulk price breaks apply automatically at the cart — no
 * client flag, the server keys the discount to the verified account.
 */

import type { Metadata } from "next";
import { Building2, BadgeCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { getSession } from "@/lib/auth-lite";
import { accountFor } from "@/lib/b2b";
import { requestBusinessAccount } from "./actions";

export const metadata: Metadata = { title: "Business account" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  company: "Enter your company or clinic name (at least 3 characters).",
  gstin: "Enter a valid 15-character GSTIN.",
  pending: "You already have a request under review.",
  already: "Your business account is already approved.",
};

export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const email = (await getSession())?.email ?? "guest@vedichemp.in";
  const account = accountFor(email);
  const status = account?.status ?? "NONE";

  return (
    <Shell active="/account/business" breadcrumb={["My Account", "Business account"]} title="Business account">
      {ok && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Request submitted">Our team reviews business accounts within a working day. We&rsquo;ll notify you here once it&rsquo;s approved.</Banner></div>}
      {err && ERRORS[err] && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger">{ERRORS[err]}</Banner></div>}

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><Building2 size={16} strokeWidth={2.2} aria-hidden /> Your status</span>}>
          {status === "APPROVED" ? (
            <div>
              <StatusPill tone="ok"><BadgeCheck size={12} aria-hidden /> Approved business account</StatusPill>
              <p className="small muted" style={{ marginTop: 10 }}>
                Wholesale prices now apply automatically when you reach a seller&rsquo;s bulk quantity — you&rsquo;ll see the
                lower price at the cart. {account?.company} · GSTIN {account?.gstin}.
              </p>
            </div>
          ) : status === "PENDING" ? (
            <div>
              <StatusPill tone="warn">Under review</StatusPill>
              <p className="small muted" style={{ marginTop: 10 }}>We&rsquo;re verifying {account?.company}. You&rsquo;ll be notified here once it&rsquo;s approved.</p>
            </div>
          ) : status === "REJECTED" ? (
            <div>
              <StatusPill tone="danger">Not approved</StatusPill>
              <p className="small muted" style={{ marginTop: 10 }}>{account?.note ?? "Your last request wasn't approved."} You can re-apply below.</p>
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>You don&rsquo;t have a business account yet. Apply to unlock wholesale pricing on bulk orders.</p>
          )}
        </Card>

        {status !== "APPROVED" && status !== "PENDING" && (
          <Card title="Apply for wholesale pricing">
            <form action={requestBusinessAccount} className="vh-grid" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="company">Company / clinic name <span className="req">*</span></label>
                <input className="vh-input" id="company" name="company" required placeholder="e.g. Ananda Wellness Clinic" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="gstin">GSTIN <span className="req">*</span></label>
                <input className="vh-input mono" id="gstin" name="gstin" required placeholder="22AAAAA0000A1Z5" style={{ textTransform: "uppercase" }} />
                <span className="vh-help">15 characters. We verify it before approving wholesale pricing.</span>
              </div>
              <button className="vh-btn vh-btn-primary" type="submit" style={{ justifySelf: "start" }}>Submit request</button>
            </form>
          </Card>
        )}
      </div>
    </Shell>
  );
}
