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
import { Shell } from "../Shell";
import { Card, StatusPill, toneForStatus, Banner, EmptyState } from "@/components/ui";
import { currentBuyer } from "@/lib/session";

export const metadata: Metadata = { title: "Medical & Prescriptions" };

interface SamplePrescription {
  id: string; doctor: string; regNo: string; issuedAt: string; validTill: string; status: string;
}

const PRESCRIPTIONS: SamplePrescription[] = [
  { id: "rx1", doctor: "Dr. Kavita Rao, MD (Pain Medicine)", regNo: "MCI-88213", issuedAt: "2026-04-02", validTill: "2026-07-02", status: "EXPIRED" },
];

interface AccessLogRow {
  id: string; at: string; actor: string; role: string; reasonCode: string; notified: boolean;
}

const ACCESS_LOG: AccessLogRow[] = [
  { id: "al1", at: "2026-06-18 14:22", actor: "pharmacist.das", role: "Pharmacist", reasonCode: "PRESCRIPTION_VERIFICATION", notified: true },
  { id: "al2", at: "2026-05-30 09:47", actor: "compliance.nair", role: "Compliance", reasonCode: "ROUTINE_AUDIT", notified: true },
];

export default function MedicalPage() {
  const viewer = currentBuyer();
  const hasExpired = PRESCRIPTIONS.some((rx) => rx.status === "EXPIRED");

  return (
    <Shell active="/account/medical" breadcrumb={["My Account", "Medical & Prescriptions"]} title="Medical & Prescriptions">
      <div className="vh-grid" style={{ gap: 18 }}>
        {hasExpired && (
          <Banner severity="warn" title="Your prescription has expired" icon="⏳">
            Any Medical Cannabis order or subscription requires a verified, unexpired prescription. Your
            current prescription expired on {PRESCRIPTIONS[0]?.validTill}. Upload a renewed prescription to
            resume MED_CANNABIS purchases — a pharmacist must re-verify it before it becomes active.
          </Banner>
        )}

        <Banner severity="info" title="How we protect this data" icon="🔒">
          Prescription images are encrypted at rest with a separate KMS key and stored with object lock.
          You view your own prescription through a signed URL that expires after 5 minutes. No one else can
          open it without a logged reason — see the access log below. This page never links directly to the
          stored image.
        </Banner>

        <Card
          title="Your prescriptions"
          action={<span className="vh-btn vh-btn-sm vh-btn-primary" aria-disabled>Upload prescription</span>}
        >
          {PRESCRIPTIONS.length === 0 ? (
            <EmptyState icon="⚕️" headline="No prescriptions on file" sub="Upload one to unlock Medical Cannabis products." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {PRESCRIPTIONS.map((rx) => (
                <li key={rx.id} className="vh-row-between" style={{ borderBottom: "1px solid var(--vh-line)", paddingBottom: 12 }}>
                  <span>
                    <div style={{ fontWeight: 600 }}>{rx.doctor}</div>
                    <div className="small muted">Reg. no. {rx.regNo} · issued {rx.issuedAt} · valid till {rx.validTill}</div>
                  </span>
                  <span className="vh-row" style={{ gap: 10 }}>
                    <StatusPill tone={toneForStatus(rx.status)}>{rx.status}</StatusPill>
                    <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>
                      View (signed link, 5 min)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="small muted" style={{ marginTop: 12 }}>
            Accepted formats: PDF or photo, under 10 MB. A pharmacist verifies every upload before it becomes active.
          </div>
        </Card>

        <Card title="Who viewed my prescription" action={<span className="small muted">Buyer notification is mandatory on every sensitive read</span>}>
          {ACCESS_LOG.length === 0 ? (
            <EmptyState icon="👁️" headline="No one has viewed your prescription" />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {ACCESS_LOG.map((row) => (
                <li key={row.id} className="vh-row-between">
                  <span className="small">
                    <strong>{row.role}</strong> ({row.actor}) — reason: <span className="mono">{row.reasonCode}</span>
                  </span>
                  <span className="vh-row" style={{ gap: 8 }}>
                    <span className="small muted">{row.at}</span>
                    <StatusPill tone={row.notified ? "ok" : "warn"}>{row.notified ? "You were notified" : "Notification pending"}</StatusPill>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Medical Cannabis eligibility">
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
