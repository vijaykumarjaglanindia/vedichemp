/**
 * VEDIC HEMP — ADDRESS BOOK (§1.3)
 *
 * CRUD over saved delivery addresses with exactly one default. Checkout
 * prefills from the default address, and a new address entered at checkout
 * can be saved back here — the loop the spec's workflow describes.
 */

import type { Metadata } from "next";
import { Briefcase, Home, MapPin, Star, Trash2 } from "lucide-react";
import { Shell } from "../Shell";
import { Banner, Card, EmptyState, StatusPill } from "@/components/ui";
import { readAddresses } from "@/lib/engage";
import { addAddress, deleteAddress, setDefaultAddress } from "./actions";

export const metadata: Metadata = { title: "Address book" };

const ERRORS: Record<string, string> = {
  name: "Name should be 2–60 letters (no digits).",
  mobile: "Mobile should be a 10-digit Indian number starting 6–9.",
  line1: "Address line needs 8–120 characters.",
  city: "City and state are both required.",
  pincode: "PIN code is 6 digits.",
  kind: "Pick Home, Work or Other.",
  limit: "You can keep up to 6 saved addresses — delete one first.",
};

const OKS: Record<string, string> = {
  added: "Address saved.",
  deleted: "Address removed.",
  default: "Default address updated — checkout will prefill from it.",
};

function KindIcon({ kind }: { kind: string }) {
  const I = { size: 14, strokeWidth: 2.2 } as const;
  if (kind === "WORK") return <Briefcase {...I} aria-hidden />;
  if (kind === "OTHER") return <MapPin {...I} aria-hidden />;
  return <Home {...I} aria-hidden />;
}

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;
  const addresses = await readAddresses();

  return (
    <Shell active="/account/addresses" breadcrumb={["My Account", "Address book"]} title="Address book">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {ok && OKS[ok] && <Banner severity="ok">{OKS[ok]}</Banner>}
        {err && ERRORS[err] && <Banner severity="danger">{ERRORS[err]}</Banner>}

        {addresses.length === 0 ? (
          <EmptyState
            icon="📍"
            headline="No saved addresses yet"
            sub="Add one below — checkout prefills from your default address, and CBD wellness delivery is checked against its pincode."
          />
        ) : (
          <div className="vh-grid cols-3">
            {addresses.map((a) => (
              <Card key={a.id}>
                <div className="vh-row-between" style={{ marginBottom: 8 }}>
                  <span className="vh-pill vh-pill-neutral" style={{ gap: 6 }}>
                    <KindIcon kind={a.kind} /> {a.kind.charAt(0) + a.kind.slice(1).toLowerCase()}
                  </span>
                  {a.isDefault && <StatusPill tone="ok">Default</StatusPill>}
                </div>
                <div style={{ fontWeight: 700 }}>{a.name}</div>
                <div className="small muted" style={{ margin: "4px 0 2px" }}>{a.line1}</div>
                <div className="small muted">{a.city}, {a.state} — <span className="mono">{a.pincode}</span></div>
                <div className="small muted" style={{ marginTop: 2 }}>+91 {a.mobile}</div>
                <div className="vh-row" style={{ gap: 8, marginTop: 12 }}>
                  {!a.isDefault && (
                    <form action={setDefaultAddress}>
                      <input type="hidden" name="addressId" value={a.id} />
                      <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost">
                        <Star size={13} aria-hidden /> Make default
                      </button>
                    </form>
                  )}
                  <form action={deleteAddress}>
                    <input type="hidden" name="addressId" value={a.id} />
                    <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost" aria-label={`Delete address ${a.line1}`}>
                      <Trash2 size={13} aria-hidden /> Delete
                    </button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div id="add" style={{ scrollMarginTop: 90 }}>
          <Card title="Add an address">
            <form action={addAddress} className="vh-grid cols-2" style={{ gap: 16, alignItems: "start" }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ad-name">Full name <span className="req">*</span></label>
                <input className="vh-input" id="ad-name" name="name" required minLength={2} maxLength={60} placeholder="Recipient's name" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ad-mobile">Mobile <span className="req">*</span></label>
                <input className="vh-input" id="ad-mobile" name="mobile" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit mobile" />
              </div>
              <div className="vh-field" style={{ gridColumn: "1 / -1" }}>
                <label className="vh-label" htmlFor="ad-line1">Address <span className="req">*</span></label>
                <input className="vh-input" id="ad-line1" name="line1" required minLength={8} maxLength={120} placeholder="Flat / house, street, area" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ad-city">City <span className="req">*</span></label>
                <input className="vh-input" id="ad-city" name="city" required placeholder="City" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ad-state">State <span className="req">*</span></label>
                <input className="vh-input" id="ad-state" name="state" required placeholder="State" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ad-pincode">PIN code <span className="req">*</span></label>
                <input className="vh-input mono" id="ad-pincode" name="pincode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit PIN" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ad-kind">Label</label>
                <select className="vh-select" id="ad-kind" name="kind" defaultValue="HOME">
                  <option value="HOME">Home</option>
                  <option value="WORK">Work</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <label className="vh-row small" style={{ gap: 8, cursor: "pointer", gridColumn: "1 / -1" }}>
                <input type="checkbox" name="makeDefault" style={{ accentColor: "var(--vh-accent)" }} />
                Make this my default delivery address
              </label>
              <button type="submit" className="vh-btn vh-btn-primary" style={{ justifySelf: "start" }}>Save address</button>
            </form>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
