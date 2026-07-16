/**
 * VEDIC HEMP — STORE VERIFICATION (KYC) · seller
 *
 * Submit your store's business details for verification. A store must be
 * verified before its listings can go live — the gate is a server guard on the
 * go-live action, not a button state here (CLAUDE.md §0). A regulated class
 * (CBD wellness) needs a valid, unexpired licence on file; the server checks
 * it, so the form cannot be talked past.
 */

import type { Metadata } from "next";
import { BadgeCheck, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { kycFor, statusLabel, licenceExpired, type KycStatus } from "@/lib/vendor";
import { submitVendorKyc } from "../actions";

export const metadata: Metadata = { title: "Store verification" };
export const dynamic = "force-dynamic";

const STORE = "Vedic Botanicals";

const ERRORS: Record<string, string> = {
  name: "Enter your registered legal business name (at least 3 characters).",
  gstin: "Enter a valid 15-character GSTIN.",
  pan: "Enter a valid 10-character PAN (e.g. AABCV1234M).",
  address: "Enter your registered address.",
  city: "Enter your city and state.",
  pincode: "Enter a valid 6-digit PIN code.",
  bank: "Enter a valid payout account number (digits only).",
  ifsc: "Enter a valid IFSC (e.g. HDFC0000123).",
  classes: "Choose at least one product category to sell.",
  licence: "CBD wellness needs a drug licence number on file.",
  licexpiry: "Enter a valid, unexpired licence expiry date (YYYY-MM-DD).",
};

const TONE: Record<KycStatus, "ok" | "warn" | "danger" | "neutral"> = {
  NOT_STARTED: "neutral", SUBMITTED: "warn", APPROVED: "ok", MORE_INFO: "warn", REJECTED: "danger", SUSPENDED: "danger",
};

const CLASSES: { value: string; label: string; regulated?: boolean }[] = [
  { value: "HEMP_FOOD", label: "Hemp foods" },
  { value: "AYURVEDA", label: "Ayurveda" },
  { value: "CBD_WELLNESS", label: "CBD wellness", regulated: true },
];

export default async function SellerVerificationPage({ searchParams }: { searchParams: Promise<{ done?: string; err?: string; blocked?: string }> }) {
  const { done, err, blocked } = await searchParams;
  const rec = kycFor(STORE);
  const status = rec?.status ?? "NOT_STARTED";
  const expired = rec ? licenceExpired(rec) : false;
  const canEdit = status !== "SUBMITTED"; // don't let a seller thrash a pending review

  return (
    <Shell active="/seller/verification" breadcrumb={["Seller Central", "Store verification"]} title="Store verification">
      {blocked && (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Banner severity="danger" title="Verify your store to go live">
            Your store isn&rsquo;t verified right now, so listings can&rsquo;t be sent for approval. Complete the details
            below — once we verify your store, you can take products live again.
          </Banner>
        </div>
      )}
      {done && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Submitted for verification">Our compliance team reviews new stores within a working day. We&rsquo;ll notify you here once it&rsquo;s done.</Banner></div>}
      {err && ERRORS[err] && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger">{ERRORS[err]}</Banner></div>}

      <div className="vh-grid cols-2" style={{ alignItems: "start", gap: "var(--sp-4)" }}>
        <Card title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck size={16} strokeWidth={2.2} aria-hidden /> Verification status</span>}>
          <div className="vh-row" style={{ gap: 10, alignItems: "center" }}>
            <StatusPill tone={TONE[status]}>
              {status === "APPROVED" ? <><BadgeCheck size={12} aria-hidden /> Verified</> : statusLabel(status)}
            </StatusPill>
            {status === "SUBMITTED" && <span className="small muted vh-row" style={{ gap: 4 }}><Clock size={12} aria-hidden /> In review</span>}
          </div>

          {status === "APPROVED" && (
            <p className="small muted" style={{ marginTop: 12 }}>
              Your store is verified. Buyers see a <strong>Verified seller</strong> badge on your storefront, and you can
              take listings live. {expired && "Your licence on file has expired — renew it to keep selling regulated products."}
            </p>
          )}
          {(status === "MORE_INFO" || status === "REJECTED" || status === "SUSPENDED") && rec?.note && (
            <div style={{ marginTop: 12 }}>
              <Banner severity={status === "MORE_INFO" ? "warn" : "danger"}>
                <span className="vh-row" style={{ gap: 6 }}><ShieldAlert size={14} aria-hidden /> {rec.note}</span>
              </Banner>
            </div>
          )}
          {status === "NOT_STARTED" && (
            <p className="small muted" style={{ marginTop: 12 }}>Your store isn&rsquo;t verified yet. Submit your business details to start selling.</p>
          )}

          {rec && (
            <dl className="vh-grid" style={{ gap: 6, marginTop: 16 }}>
              <div className="vh-row-between"><dt className="small muted">Legal name</dt><dd className="small" style={{ margin: 0 }}>{rec.legalName}</dd></div>
              <div className="vh-row-between"><dt className="small muted">GSTIN</dt><dd className="small mono" style={{ margin: 0 }}>{rec.gstin}</dd></div>
              <div className="vh-row-between"><dt className="small muted">PAN</dt><dd className="small mono" style={{ margin: 0 }}>{rec.pan}</dd></div>
              <div className="vh-row-between"><dt className="small muted">Payout account</dt><dd className="small mono" style={{ margin: 0 }}>••••{rec.bankAccountLast4} · {rec.bankIfsc}</dd></div>
              {rec.drugLicenceNo && <div className="vh-row-between"><dt className="small muted">Drug licence</dt><dd className="small mono" style={{ margin: 0 }}>{rec.drugLicenceNo} · exp {rec.drugLicenceExpiry}</dd></div>}
            </dl>
          )}
        </Card>

        {canEdit && (
          <Card title={status === "APPROVED" ? "Update your details" : "Submit for verification"}>
            <form action={submitVendorKyc} className="vh-grid" style={{ gap: 14 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="legalName">Registered legal name <span className="req">*</span></label>
                <input className="vh-input" id="legalName" name="legalName" required defaultValue={rec?.legalName ?? ""} placeholder="e.g. Vedic Botanicals Wellness Pvt Ltd" />
              </div>
              <div className="vh-grid cols-2" style={{ gap: 12 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="gstin">GSTIN <span className="req">*</span></label>
                  <input className="vh-input mono" id="gstin" name="gstin" required defaultValue={rec?.gstin ?? ""} placeholder="27AABCV1234M1Z5" style={{ textTransform: "uppercase" }} />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="pan">PAN <span className="req">*</span></label>
                  <input className="vh-input mono" id="pan" name="pan" required defaultValue={rec?.pan ?? ""} placeholder="AABCV1234M" style={{ textTransform: "uppercase" }} />
                </div>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="addressLine">Registered address <span className="req">*</span></label>
                <input className="vh-input" id="addressLine" name="addressLine" required defaultValue={rec?.addressLine ?? ""} placeholder="Building, street, area" />
              </div>
              <div className="vh-grid cols-3" style={{ gap: 12 }}>
                <div className="vh-field"><label className="vh-label" htmlFor="city">City <span className="req">*</span></label><input className="vh-input" id="city" name="city" required defaultValue={rec?.city ?? ""} /></div>
                <div className="vh-field"><label className="vh-label" htmlFor="state">State <span className="req">*</span></label><input className="vh-input" id="state" name="state" required defaultValue={rec?.state ?? ""} /></div>
                <div className="vh-field"><label className="vh-label" htmlFor="pincode">PIN <span className="req">*</span></label><input className="vh-input mono" id="pincode" name="pincode" required defaultValue={rec?.pincode ?? ""} placeholder="411045" /></div>
              </div>
              <div className="vh-grid cols-3" style={{ gap: 12 }}>
                <div className="vh-field"><label className="vh-label" htmlFor="bankName">Bank <span className="req">*</span></label><input className="vh-input" id="bankName" name="bankName" required defaultValue={rec?.bankName ?? ""} placeholder="HDFC Bank" /></div>
                <div className="vh-field"><label className="vh-label" htmlFor="bankAccount">Payout account no. <span className="req">*</span></label><input className="vh-input mono" id="bankAccount" name="bankAccount" required placeholder="digits only" /></div>
                <div className="vh-field"><label className="vh-label" htmlFor="bankIfsc">IFSC <span className="req">*</span></label><input className="vh-input mono" id="bankIfsc" name="bankIfsc" required defaultValue={rec?.bankIfsc ?? ""} placeholder="HDFC0000123" style={{ textTransform: "uppercase" }} /></div>
              </div>

              <fieldset className="vh-field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="vh-label">Categories you sell <span className="req">*</span></legend>
                <div className="vh-row" style={{ gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                  {CLASSES.map((c) => (
                    <label key={c.value} className="vh-row" style={{ gap: 6, fontSize: ".85rem" }}>
                      <input type="checkbox" name="classes" value={c.value} defaultChecked={(rec?.classes as string[] | undefined)?.includes(c.value) ?? false} />
                      {c.label}{c.regulated && <span className="vh-pill vh-pill-info" style={{ fontSize: ".68rem" }}>licence</span>}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="vh-grid cols-2" style={{ gap: 12 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="drugLicenceNo">Drug / AYUSH licence no.</label>
                  <input className="vh-input mono" id="drugLicenceNo" name="drugLicenceNo" defaultValue={rec?.drugLicenceNo ?? ""} placeholder="required for CBD wellness" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="drugLicenceExpiry">Licence expiry</label>
                  <input className="vh-input mono" id="drugLicenceExpiry" name="drugLicenceExpiry" defaultValue={rec?.drugLicenceExpiry ?? ""} placeholder="YYYY-MM-DD" />
                </div>
              </div>

              <p className="small muted" style={{ margin: 0 }}>We store only the last four digits of your payout account — never the full number.</p>
              <button className="vh-btn vh-btn-primary" type="submit" style={{ justifySelf: "start" }}>
                {status === "APPROVED" ? "Update details" : "Submit for verification"}
              </button>
            </form>
          </Card>
        )}
        {!canEdit && (
          <Card title="In review">
            <p className="small muted" style={{ margin: 0 }}>Your details are with our compliance team. You&rsquo;ll be notified here once the review is complete.</p>
          </Card>
        )}
      </div>
    </Shell>
  );
}
