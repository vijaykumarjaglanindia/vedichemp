/**
 * VEDIC HEMP — MEDICAL & PRESCRIPTIONS (§1.9, A4)
 *
 * Health data is the most sensitive class of data on the platform. The rules
 * this page makes visible to the buyer:
 *  - The buyer sees their OWN prescription image via a signed URL with a
 *    5-minute TTL — never a bare, long-lived link.
 *  - Anyone else (pharmacist/compliance) who views it must supply a logged
 *    reasonCode, and the buyer is notified of that read (SensitiveAccessLog +
 *    notification job) — the "Who viewed my prescription" section below.
 *  - A MED_CANNABIS purchase requires a verified, unexpired prescription;
 *    an expired one blocks checkout server-side, not just in the UI.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Eye, FileUp, KeyRound, Lock, ShieldCheck, Stethoscope, Timer } from "lucide-react";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, Banner, EmptyState, type Column } from "@/components/ui";
import { cookies } from "next/headers";
import { currentBuyer } from "@/lib/session";
import { getSession } from "@/lib/auth-lite";
import { accessLogForBuyer, reasonLabel } from "@/lib/prescriptions";
import { PRESCRIPTIONS, ACCESS_LOG, type AccessLogRow, validityElapsedPct, daysUntil } from "../_lib/data";
import { requestRxViewLink, uploadPrescription, type RxUpload } from "./actions";

export const metadata: Metadata = { title: "Medical & Prescriptions" };

const I = { size: 16, strokeWidth: 2.2 } as const;

function title(icon: ReactNode, text: string) {
  return (
    <span className="vh-row" style={{ gap: 8 }}>
      <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)" }}>{icon}</span>
      {text}
    </span>
  );
}

const PROTECTIONS = [
  {
    icon: <KeyRound size={18} strokeWidth={2.2} />,
    head: "Encrypted with a separate key",
    body: "Prescription images live in a dedicated bucket, encrypted at rest with their own KMS key and protected by object lock.",
  },
  {
    icon: <Timer size={18} strokeWidth={2.2} />,
    head: "5-minute signed links",
    body: "You view your own prescription through a signed URL that expires after 5 minutes. This page never links directly to the stored image.",
  },
  {
    icon: <Eye size={18} strokeWidth={2.2} />,
    head: "Every read is logged — and you're told",
    body: "No one else can open it without a logged reason code, and you are notified of every read. Denied attempts are logged too.",
  },
];

const UPLOAD_ERRORS: Record<string, string> = {
  file: "Choose a file first — PDF, JPG or PNG.",
  type: "That format isn't accepted — upload a PDF, JPG or PNG.",
  size: "File is over 10 MB — compress or re-scan it and try again.",
};

export default async function MedicalPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; err?: string; viewlink?: string }>;
}) {
  const viewer = currentBuyer();
  const email = (await getSession())?.email ?? "buyer@example.in";
  // The A4 receipt — every GRANTED read of THIS buyer's prescription, from the
  // append-only sensitive-access log. Falls back to the demo rows only when the
  // buyer has never had a real read recorded.
  const liveReads = (await accessLogForBuyer(email))
    .filter((e) => e.outcome === "GRANTED")
    .map<AccessLogRow>((e) => ({ id: e.id, at: e.at, actor: e.viewer, role: reasonLabel(e.viewerRole.replace(/^ADMIN_/, "")), reasonCode: e.reasonCode, notified: e.buyerNotified }));
  const accessRows: AccessLogRow[] = liveReads.length ? liveReads : ACCESS_LOG;
  const { uploaded, err, viewlink } = await searchParams;
  const jar = await cookies();
  let uploads: RxUpload[] = [];
  try { uploads = JSON.parse(jar.get("vh-rx")?.value ?? "[]") as RxUpload[]; } catch { uploads = []; }
  const hasExpired = PRESCRIPTIONS.some((rx) => rx.status === "EXPIRED");

  const logColumns: Column<AccessLogRow>[] = [
    { key: "at", header: "When", render: (r) => <span className="small tabular">{r.at}</span> },
    { key: "actor", header: "Who", render: (r) => <span className="small mono">{r.actor}</span> },
    { key: "role", header: "Role", render: (r) => <StatusPill tone="info">{r.role}</StatusPill> },
    { key: "reason", header: "Logged reason", render: (r) => <span className="small mono">{r.reasonCode}</span> },
    {
      key: "notified", header: "Notice", render: (r) => (
        <StatusPill tone={r.notified ? "ok" : "warn"}>{r.notified ? "You were notified" : "Notification pending"}</StatusPill>
      ),
    },
  ];

  return (
    <Shell active="/account/medical" breadcrumb={["My Account", "Medical & Prescriptions"]} title="Medical & Prescriptions">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        {hasExpired && (
          <Banner severity="warn" title="Your prescription has expired" icon="⏳">
            Any Medical Cannabis order or subscription requires a verified, unexpired prescription. Your
            current prescription expired on {PRESCRIPTIONS[0]?.validTill}. Upload a renewed prescription to
            resume MED_CANNABIS purchases — a pharmacist must re-verify it before it becomes active.
          </Banner>
        )}

        {/* Hero: how this data is protected */}
        <Card>
          <div className="vh-row" style={{ gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "color-mix(in srgb, var(--vh-accent) 12%, transparent)",
                color: "var(--vh-accent)",
              }}
            >
              <Lock size={24} strokeWidth={2.2} />
            </span>
            <div>
              <h2 style={{ margin: "0 0 4px" }}>Your health data is sealed, not just stored</h2>
              <p className="muted small" style={{ margin: 0, maxWidth: 620 }}>
                Prescriptions are the most protected records on Vedic Hemp. Here is exactly what guards
                them — and the live log of everyone who has ever looked.
              </p>
            </div>
          </div>
          <div className="vh-grid cols-3">
            {PROTECTIONS.map((p) => (
              <div key={p.head} className="vh-card" style={{ padding: 16 }}>
                <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)", marginBottom: 8 }}>{p.icon}</span>
                <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>{p.head}</div>
                <p className="small muted" style={{ margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* A4 explainer */}
        <Banner severity="info" title="Who can see your prescription (A4)">
          Only a licensed Pharmacist or the Compliance team can view it, only with a logged reason code,
          and you are notified every time. Support agents cannot open your Rx image. Attempts without a
          valid reason are denied — and the denial itself is logged.
        </Banner>

        {/* Prescriptions with validity progress */}
        <Card
          title={title(<Stethoscope {...I} />, "Your prescriptions")}
          action={<a className="vh-btn vh-btn-sm vh-btn-primary" href="#upload">Upload prescription</a>}
        >
          {viewlink && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity="ok" title="Signed link issued — valid for 5 minutes" icon="🔗">
                Opening your own prescription is also written to the access log below (actor: you,
                reason: SELF_ACCESS) — the log is append-only, with no exceptions (A3/A4).
              </Banner>
            </div>
          )}
          {uploads.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
              {uploads.map((u) => (
                <div key={u.id} className="vh-card" style={{ padding: 16 }}>
                  <div className="vh-row-between" style={{ flexWrap: "wrap", gap: 8 }}>
                    <span>
                      <div style={{ fontWeight: 600 }}>{u.fileName}</div>
                      <div className="small muted">Uploaded {u.uploadedAt} · pharmacist review within 4 business hours</div>
                    </span>
                    <StatusPill tone="warn">{u.status.replace(/_/g, " ")}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          )}
          {PRESCRIPTIONS.length === 0 && uploads.length === 0 ? (
            <EmptyState icon="⚕️" headline="No prescriptions on file" sub="Upload one to unlock Medical Cannabis products." />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {PRESCRIPTIONS.map((rx) => {
                const elapsedPct = validityElapsedPct(rx.issuedAt, rx.validTill);
                const days = daysUntil(rx.validTill);
                const expired = rx.status === "EXPIRED" || days < 0;
                return (
                  <div key={rx.id} className="vh-card" style={{ padding: 16 }}>
                    <div className="vh-row-between" style={{ flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      <span>
                        <div style={{ fontWeight: 600 }}>{rx.doctor}</div>
                        <div className="small muted">Reg. no. {rx.regNo} · issued {rx.issuedAt} · valid till {rx.validTill}</div>
                      </span>
                      <span className="vh-row" style={{ gap: 8 }}>
                        <StatusPill tone={toneForStatus(rx.status)}>{rx.status}</StatusPill>
                        <form action={requestRxViewLink} style={{ display: "inline-flex" }}>
                          <input type="hidden" name="rxId" value={rx.id} />
                          <button type="submit" className="vh-btn vh-btn-sm vh-btn-ghost">
                            View (signed link, 5 min)
                          </button>
                        </form>
                      </span>
                    </div>
                    <div
                      style={{ height: 8, borderRadius: 999, background: "var(--vh-bg-subtle)", overflow: "hidden" }}
                      role="img"
                      aria-label={expired ? "Validity period fully elapsed — prescription expired" : `${elapsedPct}% of validity period elapsed`}
                    >
                      <div style={{
                        width: `${elapsedPct}%`, height: "100%", borderRadius: 999,
                        background: expired ? "var(--vh-danger)" : elapsedPct > 80 ? "var(--vh-saffron)" : "var(--vh-accent)",
                      }} />
                    </div>
                    <div className="small muted" style={{ marginTop: 8 }}>
                      {expired
                        ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago — renew to restore eligibility`
                        : `${days} day${days === 1 ? "" : "s"} of validity remaining`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upload flow */}
        <div id="upload" style={{ scrollMarginTop: 90 }}>
        <Card title={title(<FileUp {...I} />, "Upload a new prescription")}>
          {uploaded && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity="ok" title="Prescription received — under review">
                A licensed pharmacist verifies it within 4 business hours. It becomes active only
                after that verification — there is no self-serve override.
              </Banner>
            </div>
          )}
          {err && UPLOAD_ERRORS[err] && (
            <div style={{ marginBottom: 12 }}>
              <Banner severity="danger">{UPLOAD_ERRORS[err]}</Banner>
            </div>
          )}
          <form action={uploadPrescription} className="vh-dropzone">
            <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)", marginBottom: 8 }}>
              <FileUp size={28} strokeWidth={2} />
            </span>
            <div style={{ fontWeight: 700, color: "var(--vh-ink)", marginBottom: 4 }}>
              Drag a photo or PDF here, or browse your files
            </div>
            <div className="vh-help">
              Accepted formats: PDF, JPG, PNG · under 10 MB · make sure the doctor&apos;s registration
              number and the issue date are legible.
            </div>
            <div className="vh-row" style={{ gap: 8, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <input
                type="file"
                name="rx"
                accept="application/pdf,image/jpeg,image/png"
                required
                aria-label="Choose prescription file"
                className="small"
                style={{ maxWidth: 260 }}
              />
              <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary">Upload for review</button>
            </div>
          </form>
          <div className="vh-row" style={{ gap: 8, marginTop: 16, alignItems: "flex-start" }}>
            <span aria-hidden style={{ display: "inline-flex", color: "var(--vh-accent)", marginTop: 2 }}>
              <ShieldCheck size={16} strokeWidth={2.2} />
            </span>
            <p className="small muted" style={{ margin: 0 }}>
              A licensed pharmacist reviews every upload <strong>within 4 business hours</strong>. Your
              prescription becomes active only after that verification — there is no self-serve override.
              You&apos;ll be notified the moment review completes.
            </p>
          </div>
        </Card>
        </div>

        {/* Access log — the A4 receipt */}
        <Card
          title={title(<Eye {...I} />, "Who viewed my prescription")}
          action={<span className="small muted">Buyer notification is mandatory on every sensitive read</span>}
          pad0
        >
          <DataTable
            columns={logColumns}
            rows={accessRows}
            empty={<EmptyState icon="👁️" headline="No one has viewed your prescription" />}
          />
        </Card>

        <Card title={title(<ShieldCheck {...I} />, "Medical Cannabis eligibility")}>
          <p className="small muted" style={{ margin: 0 }}>
            {viewer.hasRx
              ? "You have a verified, unexpired prescription. Medical Cannabis products are visible in your catalogue."
              : "You have no verified, unexpired prescription. Medical Cannabis products are not shown to you anywhere on the platform — not blurred, not locked, simply absent — until a pharmacist verifies a valid upload."}
          </p>
        </Card>
      </div>
    </Shell>
  );
}
