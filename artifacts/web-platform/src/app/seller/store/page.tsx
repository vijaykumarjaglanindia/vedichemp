/**
 * VEDIC HEMP — STORE & KYC (§2.2)
 *
 * Store profile, business/tax details, bank verification, licences and the
 * capability matrix a licence derives. An expired licence blocks the class
 * it unlocks — this is a server-side fact rendered here, not a UI opinion.
 * Separation of duties: no single user here can both edit payout bank
 * details and approve a settlement (A6-adjacent control on this console).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Plus, BadgeCheck } from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, Banner, Rating } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SELLER, LICENCES, CAPABILITY_MATRIX, STORE_PREVIEW, daysUntil } from "../_lib/data";
import { CLASS_META } from "@/lib/compliance";
import { addLicence, requestOwnerTransfer, saveStoreAnnouncement, saveStoreAvailability, updateStorefront } from "../actions";
import { readStoreAnnouncement, readStoreAvailability, readStoreCopy } from "@/lib/engage";
import { storeAggregate } from "@/lib/store-reviews";
import { listStaff, ROLE_DEFS } from "@/lib/staff";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "Store & KYC" };
export const dynamic = "force-dynamic";

const ROLE_LABEL = Object.fromEntries(ROLE_DEFS.map((r) => [r.role, r.label]));

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ transfer?: string; err?: string; licence?: string; copy?: string; avail?: string; ann?: string }>;
}) {
  const { transfer, err, licence, avail, ann } = await searchParams;
  const copyParam = (await searchParams).copy;
  const storeCopy = await readStoreCopy();
  const availability = await readStoreAvailability();
  const announcement = await readStoreAnnouncement();
  // Real store rating (from moderated buyer reviews) and real team roster.
  const storeAgg = await storeAggregate(STORE_PREVIEW.handle);
  const staff = await listStaff();
  const jar = await cookies();
  let submittedLicences: { type: string; number: string; validTo: string; status: string }[] = [];
  try { submittedLicences = JSON.parse(jar.get("vh-sell-lic")?.value ?? "[]") as typeof submittedLicences; } catch { submittedLicences = []; }
  return (
    <Shell active="/seller/store" breadcrumb={["Seller Central", "Store & KYC"]} title="Store & KYC">
      {avail === "saved" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="ok" title="Store availability updated">Your storefront reflects it right away.</Banner></div>}
      {err === "vacclaims" && <div style={{ marginBottom: "var(--sp-3)" }}><Banner severity="danger" title="Message rejected">Your away message can&rsquo;t contain claims language (cure/treat/prevent).</Banner></div>}

      {/* Vacation mode (Dokan-style store open/close) */}
      <div id="availability" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
        <Card
          title="Store availability (vacation mode)"
          action={<StatusPill tone={availability?.onVacation ? "warn" : "ok"}>{availability?.onVacation ? "On vacation — store closed" : "Open for orders"}</StatusPill>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            Turn on vacation mode when you can&rsquo;t fulfil orders. Buyers see an away notice on your storefront.
            Your listings stay visible for browsing; turn it back off to resume selling.
          </p>
          <form action={saveStoreAvailability} className="vh-grid" style={{ gap: 12, maxWidth: 560 }}>
            <label className="vh-row small" style={{ gap: 8 }}>
              <input type="checkbox" name="onVacation" value="1" defaultChecked={availability?.onVacation ?? false} />
              Turn on vacation mode (temporarily close my store)
            </label>
            <div className="vh-field">
              <label className="vh-label" htmlFor="vac-msg">Away message</label>
              <input className="vh-input" id="vac-msg" name="vacationMessage" maxLength={160}
                defaultValue={availability?.message ?? ""} placeholder="We're on a short break — back soon. Thanks for your patience!" />
              <span className="vh-help">Shown to buyers on your storefront. No health claims.</span>
            </div>
            <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit" style={{ justifySelf: "start" }}>Save availability</button>
          </form>
        </Card>
      </div>

      <div id="announcement" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
        {ann === "saved" && <div style={{ marginBottom: 12 }}><Banner severity="ok" title="Announcement published">It shows at the top of your storefront while it&rsquo;s active.</Banner></div>}
        {ann === "cleared" && <div style={{ marginBottom: 12 }}><Banner severity="ok" title="Announcement removed">Your storefront no longer shows a notice.</Banner></div>}
        {err === "annclaims" && <div style={{ marginBottom: 12 }}><Banner severity="danger" title="Message rejected">An announcement can&rsquo;t contain claims language (cure/treat/prevent/heal). Nothing was published.</Banner></div>}
        {err === "annshort" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Your announcement should be at least 6 characters (or leave it blank to remove it).</Banner></div>}
        {err === "anndate" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Dates should be in YYYY-MM-DD format.</Banner></div>}
        {err === "annrange" && <div style={{ marginBottom: 12 }}><Banner severity="danger">The end date can&rsquo;t be before the start date.</Banner></div>}
        <Card
          title="Storefront announcement"
          action={<StatusPill tone={announcement?.active ? "ok" : "neutral"}>{announcement?.active ? "Live" : "Off"}</StatusPill>}
        >
          <p className="small muted" style={{ marginTop: 0 }}>
            Post a short notice at the top of your storefront — a sale, a dispatch delay, festival hours. Set optional
            start and end dates and it shows only within that window. Leave the message blank and save to remove it.
          </p>
          <form action={saveStoreAnnouncement} className="vh-grid" style={{ gap: 12, maxWidth: 620 }}>
            <div className="vh-field">
              <label className="vh-label" htmlFor="ann-msg">Message</label>
              <input className="vh-input" id="ann-msg" name="message" maxLength={200}
                defaultValue={announcement?.message ?? ""} placeholder="Diwali sale — 10% off all balms this week!" />
              <span className="vh-help">Shown to every visitor. No health claims.</span>
            </div>
            <div className="vh-grid cols-3" style={{ gap: 12 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ann-tone">Style</label>
                <select className="vh-input" id="ann-tone" name="tone" defaultValue={announcement?.tone ?? "info"}>
                  <option value="info">Info (neutral)</option>
                  <option value="sale">Sale (green)</option>
                  <option value="warn">Heads-up (amber)</option>
                </select>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ann-start">Show from (optional)</label>
                <input className="vh-input mono" id="ann-start" name="startsAt" defaultValue={announcement?.startsAt ?? ""} placeholder="2026-07-20" />
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="ann-end">Show until (optional)</label>
                <input className="vh-input mono" id="ann-end" name="endsAt" defaultValue={announcement?.endsAt ?? ""} placeholder="2026-07-27" />
              </div>
            </div>
            <div className="vh-row" style={{ gap: 8 }}>
              <button className="vh-btn vh-btn-primary vh-btn-sm" type="submit">Publish announcement</button>
              <span className="small muted">Clear the message and save to remove it.</span>
            </div>
          </form>
        </Card>
      </div>

      <div className="vh-grid cols-2" style={{ alignItems: "start", marginBottom: "var(--sp-4)" }}>
        {/* Storefront preview */}
        <Card
          title="Storefront preview"
          action={
            <Link className="vh-btn vh-btn-sm vh-btn-ghost" href={`/store/${STORE_PREVIEW.handle}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ExternalLink size={13} strokeWidth={2.2} aria-hidden /> View live store
            </Link>
          }
          pad0
        >
          <div style={{ height: 88, background: "linear-gradient(120deg, var(--vh-green-100), var(--vh-green-50))", borderBottom: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius) var(--vh-radius) 0 0" }} aria-hidden />
          <div style={{ padding: "0 18px 18px" }}>
            <div className="vh-row" style={{ gap: 14, marginTop: -28, alignItems: "flex-end" }}>
              <span
                aria-hidden
                style={{
                  width: 56, height: 56, borderRadius: 14, background: "var(--vh-surface)",
                  border: "1px solid var(--vh-line)", boxShadow: "var(--vh-shadow-sm)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "1.3rem", color: "var(--vh-green-700)",
                }}
              >
                {SELLER.name.charAt(0)}
              </span>
              <div style={{ paddingBottom: 4 }}>
                <div className="vh-row" style={{ gap: 6, fontWeight: 800 }}>
                  {SELLER.name}
                  <BadgeCheck size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
                </div>
                <div className="small muted">/store/{STORE_PREVIEW.handle}</div>
              </div>
            </div>
            <p className="small muted" style={{ margin: "10px 0" }}>{storeCopy?.tagline ?? STORE_PREVIEW.tagline}</p>
            <div className="vh-row" style={{ gap: 16, flexWrap: "wrap" }}>
              {storeAgg.count > 0
                ? <Rating value={storeAgg.avg} count={storeAgg.count} />
                : <span className="small muted">No store reviews yet</span>}
            </div>
          </div>
        </Card>

        {/* Store profile + business details as V2 form */}
        <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
          <Card title="Store profile" action={<StatusPill tone="ok">{SELLER.healthScore}/100 health</StatusPill>}>
            <div className="vh-grid cols-2" style={{ gap: 16 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="storeName">Store name</label>
                <input className="vh-input" id="storeName" name="storeName" type="text" defaultValue={SELLER.name} readOnly />
                <span className="vh-help">Your registered store name — shown on every listing. Contact support to change it (it re-runs KYC).</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="regState">Registered state</label>
                <input className="vh-input" id="regState" name="regState" type="text" defaultValue="Karnataka" readOnly />
                <span className="vh-help">Changing state re-runs KYC.</span>
              </div>
            </div>
            <div className="vh-row-between" style={{ marginTop: 12 }}>
              <span className="small muted">Classes listed</span>
              <span className="small" style={{ fontWeight: 600 }}>{SELLER.classes.map((c) => CLASS_META[c].short).join(", ")}</span>
            </div>
          </Card>

          <Card title="Business & tax details">
            <div className="vh-grid" style={{ gap: 8 }}>
              <div className="vh-row-between"><span className="small muted">GSTIN</span><span className="mono small">{SELLER.gstin}</span></div>
              <div className="vh-row-between"><span className="small muted">PAN</span><span className="mono small">AABCV1234M</span></div>
              <div className="vh-row-between"><span className="small muted">Bank account</span><span className="mono small">••••••4821</span></div>
              <div className="vh-row-between">
                <span className="small muted">Penny-drop verification</span>
                <StatusPill tone="ok">Verified — Kotak Mahindra Bank</StatusPill>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Storefront copy — WordPress-style edit → copy-check → publish live */}
      <div id="storefront-copy" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-4)" }}>
        <Card title="Storefront copy" action={<a className="vh-btn vh-btn-sm vh-btn-ghost" href={`/store/${STORE_PREVIEW.handle}`}>See it live</a>}>
          {copyParam === "published" && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity="ok" title="Published">
                Your storefront copy is live on the public store right now.
              </Banner>
            </div>
          )}
          {err === "tagline" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Tagline should be 10–90 characters.</Banner></div>}
          {err === "story" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Story should be 40–500 characters.</Banner></div>}
          {err === "website" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Website must be a full https:// address.</Banner></div>}
          {err === "social" && <div style={{ marginBottom: 12 }}><Banner severity="danger">Use a plain handle for social links (letters, numbers, dots, dashes) — not a full URL.</Banner></div>}
          {err === "copyclaims" && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity="danger" title="Copy-check blocked the publish">
                Storefront copy is promotional — claims language (cure/treat/prevent/heal) cannot be published. Nothing went live.
              </Banner>
            </div>
          )}
          <form action={updateStorefront} className="vh-grid" style={{ gap: 14 }}>
            <div className="vh-field">
              <label className="vh-label" htmlFor="sf-tagline">Tagline <span className="req">*</span></label>
              <input className="vh-input" id="sf-tagline" name="tagline" required minLength={10} maxLength={90} defaultValue={storeCopy?.tagline ?? STORE_PREVIEW.tagline} />
              <span className="vh-help">Shown under your store name on the public storefront.</span>
            </div>
            <div className="vh-field">
              <label className="vh-label" htmlFor="sf-story">Store story <span className="req">*</span></label>
              <RichTextEditor
                name="story"
                id="sf-story"
                defaultValue={storeCopy?.story ?? "AYUSH-licensed CBD wellness maker. Every batch is lab-tested before it ships, and the report is linked on each listing."}
                maxLength={500}
                minHeight={120}
                placeholder="Your craft, your facility, your testing routine."
                help="Composition and craft, not claims — the copy-check runs on publish, and a failure blocks the send (fail closed)."
              />
            </div>
            <div style={{ borderTop: "1px solid var(--vh-line)", paddingTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: ".92rem", marginBottom: 2 }}>Search &amp; social</div>
              <p className="small muted" style={{ margin: "0 0 12px" }}>How your store looks in Google results and when someone shares your link. Leave blank to use your tagline.</p>
              <div className="vh-field">
                <label className="vh-label" htmlFor="sf-metaTitle">Search title</label>
                <input className="vh-input" id="sf-metaTitle" name="metaTitle" maxLength={70} defaultValue={storeCopy?.metaTitle ?? ""} placeholder="Vedic Botanicals — official store" />
                <span className="vh-help">Up to 70 characters. Shown as the clickable headline in search.</span>
              </div>
              <div className="vh-field">
                <label className="vh-label" htmlFor="sf-metaDescription">Search description</label>
                <input className="vh-input" id="sf-metaDescription" name="metaDescription" maxLength={160} defaultValue={storeCopy?.metaDescription ?? ""} placeholder="A short line describing your store." />
                <span className="vh-help">Up to 160 characters. The grey summary under the title.</span>
              </div>
              <div className="vh-grid cols-2" style={{ gap: 12 }}>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="sf-website">Website</label>
                  <input className="vh-input" id="sf-website" name="website" defaultValue={storeCopy?.website ?? ""} placeholder="https://yourstore.in" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="sf-instagram">Instagram</label>
                  <input className="vh-input" id="sf-instagram" name="instagram" defaultValue={storeCopy?.instagram ?? ""} placeholder="handle (no @)" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="sf-facebook">Facebook</label>
                  <input className="vh-input" id="sf-facebook" name="facebook" defaultValue={storeCopy?.facebook ?? ""} placeholder="page handle" />
                </div>
                <div className="vh-field">
                  <label className="vh-label" htmlFor="sf-youtube">YouTube</label>
                  <input className="vh-input" id="sf-youtube" name="youtube" defaultValue={storeCopy?.youtube ?? ""} placeholder="channel handle" />
                </div>
              </div>
            </div>
            <button type="submit" className="vh-btn vh-btn-primary" style={{ justifySelf: "start" }}>Publish to storefront</button>
          </form>
        </Card>
      </div>

      <div id="licences">
        <Card
          title="Licences"
          action={
            <a className="vh-btn vh-btn-sm vh-btn-primary" href="#add-licence" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={13} strokeWidth={2.2} aria-hidden /> Add licence
            </a>
          }
          pad0
        >
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead>
                <tr>
                  <th>Type</th><th>Number</th><th>Valid from</th><th>Valid to</th><th>Status</th><th>Unlocks</th>
                </tr>
              </thead>
              <tbody>
                {submittedLicences.map((l) => (
                  <tr key={l.number}>
                    <td style={{ fontWeight: 600 }}>{l.type}</td>
                    <td className="mono">{l.number}</td>
                    <td className="tabular">—</td>
                    <td className="tabular">{l.validTo}</td>
                    <td><StatusPill tone="warn">PENDING VERIFICATION</StatusPill></td>
                    <td className="small muted">Unlocks after verification</td>
                  </tr>
                ))}
                {LICENCES.map((l) => {
                  const days = l.validTo ? daysUntil(l.validTo) : null;
                  const expiringSoon = days !== null && days <= 30;
                  return (
                    <tr key={l.type}>
                      <td style={{ fontWeight: 600 }}>{l.type.replace("_", " ")}</td>
                      <td className="mono">{l.number ?? "—"}</td>
                      <td className="tabular">{l.validFrom ?? "—"}</td>
                      <td className="tabular">{l.validTo ?? "—"}</td>
                      <td>
                        <StatusPill tone={l.status === "VERIFIED" ? (expiringSoon ? "warn" : "ok") : l.status === "NOT_APPLIED" ? "neutral" : "danger"}>
                          {l.status === "VERIFIED" && expiringSoon ? `Verified — expires in ${days}d` : l.status.replace("_", " ")}
                        </StatusPill>
                      </td>
                      <td>{l.unlocks.map((c) => CLASS_META[c].short).join(", ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div style={{ height: "var(--sp-3)" }} />

      {/* Add licence */}
      <div id="add-licence" style={{ scrollMarginTop: 90, marginBottom: "var(--sp-3)" }}>
        <Card title="Add a licence">
          {licence === "submitted" ? (
            <Banner severity="ok" title="Licence submitted for verification">
              Verification typically completes within a few business days. The class it unlocks stays
              locked until then — capability is derived from VERIFIED licences only.
            </Banner>
          ) : (
            <>
              {err && err.startsWith("lic") && (
                <div style={{ marginBottom: 12 }}>
                  <Banner severity="danger">
                    {err === "lictype" ? "Pick a licence type." : err === "licnumber" ? "Licence number should be 6–25 characters (letters, digits, / or -)." : "Valid-to must be a future date."}
                  </Banner>
                </div>
              )}
              <form action={addLicence} className="vh-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="vh-field" style={{ minWidth: 160 }}>
                  <label className="vh-label" htmlFor="lic-type">Type <span className="req">*</span></label>
                  <select className="vh-select" id="lic-type" name="type" required defaultValue="FSSAI">
                    <option>FSSAI</option>
                    <option>AYUSH</option>
                    <option>GST</option>
                    <option>TRADE</option>
                  </select>
                </div>
                <div className="vh-field" style={{ minWidth: 200 }}>
                  <label className="vh-label" htmlFor="lic-number">Licence number <span className="req">*</span></label>
                  <input className="vh-input mono" id="lic-number" name="number" required minLength={6} maxLength={25} placeholder="10019022001234" style={{ textTransform: "uppercase" }} />
                </div>
                <div className="vh-field" style={{ minWidth: 160 }}>
                  <label className="vh-label" htmlFor="lic-validto">Valid to <span className="req">*</span></label>
                  <input className="vh-input" id="lic-validto" name="validTo" type="date" required />
                </div>
                <button type="submit" className="vh-btn vh-btn-primary">Submit for verification</button>
                <span className="vh-help" style={{ flexBasis: "100%" }}>
                  State Drug (Medical Cannabis) licensing is handled in a separate manual review — it never
                  unlocks through this form, and the class it gates is never advertisable regardless (A1).
                </span>
              </form>
            </>
          )}
        </Card>
      </div>

      <Card title="Capability matrix (derived from licences)">
        <p className="small muted" style={{ marginTop: 0 }}>
          A licence unlocks a compliance class; an expired or missing licence blocks it. Regulated classes additionally
          require an APPROVED, batch-matched CoA per batch before that batch can sell (A2).
        </p>
        <div className="vh-grid" style={{ gap: 8 }}>
          {CAPABILITY_MATRIX.map((row) => {
            const meta = CLASS_META[row.cls];
            const tone = row.capability === "LOCKED" ? "neutral" : row.capability === "ACTIVE_RENEW" ? "warn" : "ok";
            return (
              <div key={row.cls} className="vh-row-between" style={{ border: "1px solid var(--vh-line)", borderRadius: "var(--vh-radius-sm)", padding: 12 }}>
                <span>
                  <div style={{ fontWeight: 600 }}><span aria-hidden>{meta.emoji}</span> {meta.label}</div>
                  <div className="small muted">{row.note}</div>
                </span>
                <StatusPill tone={tone}>
                  {row.capability === "LOCKED" ? "Locked" : row.capability === "ACTIVE_RENEW" ? "Active — renew licence" : "Active"}
                </StatusPill>
              </div>
            );
          })}
        </div>
        {CAPABILITY_MATRIX.some((r) => r.cls === "MED_CANNABIS") && (
          <Banner severity="info" title="Medical Cannabis" icon="⚕️">
            <span className="small">Even if this store obtains a State Drug licence in future, Medical Cannabis can never be advertised or
            promoted (A1) — that prohibition is independent of any licence held.</span>
          </Banner>
        )}
      </Card>

      <div style={{ height: "var(--sp-3)" }} />

      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <Card title="KYC status">
          <div className="vh-row-between" style={{ marginBottom: 8 }}>
            <span className="small muted">Overall KYC</span>
            <StatusPill tone={toneForStatus(SELLER.kycState)}>{SELLER.kycState.replace(/_/g, " ")}</StatusPill>
          </div>
          <div className="small muted">Re-verification due annually. Next check: 1 Apr 2027.</div>
        </Card>

        <Card title="Users & roles" action={<Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/seller/staff">Manage staff</Link>}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {staff.map((m) => (
              <li key={m.id} className="vh-row-between">
                <span>{m.name} <span className="muted">({ROLE_LABEL[m.role] ?? m.role})</span></span>
                <StatusPill tone={m.status === "ACTIVE" ? "ok" : m.status === "INVITED" ? "warn" : "neutral"}>{m.status === "ACTIVE" ? "Active" : m.status === "INVITED" ? "Invited" : "Suspended"}</StatusPill>
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 10 }}>
            Separation of duties: the user who edits payout bank details can never be the same user who approves a
            settlement touching this store — that check runs on the marketplace side (A6).
          </p>
        </Card>
      </div>

      <div style={{ height: "var(--sp-3)" }} />

      <Card title="Owner transfer">
        {transfer === "requested" ? (
          <Banner severity="ok" title="Transfer request logged">
            The incoming owner receives a KYC link; payouts pause until it clears. The request — and
            every decision on it — is written to the audit trail.
          </Banner>
        ) : (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              Transferring ownership re-runs full KYC on the incoming owner and pauses payouts until it clears. This is a
              high-impact action — it requires a reason of at least 20 characters and is logged whether it succeeds or is
              denied.
            </p>
            {err === "reason" && (
              <div style={{ marginBottom: 12 }}>
                <Banner severity="danger">A reason of at least 20 characters is required — the request was denied and the denial logged.</Banner>
              </div>
            )}
            <form action={requestOwnerTransfer} className="vh-grid" style={{ gap: 12, maxWidth: 560 }}>
              <div className="vh-field">
                <label className="vh-label" htmlFor="transfer-reason">Reason <span className="req">*</span></label>
                <textarea className="vh-textarea" id="transfer-reason" name="reason" rows={2} minLength={20} maxLength={500} required placeholder="Why is ownership changing? (min 20 characters)" />
              </div>
              <button className="vh-btn vh-btn-sm vh-btn-danger" type="submit" style={{ justifySelf: "start" }}>Start owner transfer</button>
            </form>
          </>
        )}
      </Card>
    </Shell>
  );
}
