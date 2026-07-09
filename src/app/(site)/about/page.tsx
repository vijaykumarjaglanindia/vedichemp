/**
 * VEDIC HEMP — ABOUT
 *
 * Short mission page. The four-verticals table is presentation-only (from
 * CLASS_META) — it states plainly that Medical Cannabis is prescription-only
 * and never advertised, rather than omitting it entirely, because this is an
 * explanatory page, not a shopping surface (A1 only restricts shoppable /
 * promotional surfaces).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Card, DataTable, type Column } from "@/components/ui";
import { CLASS_META, type ClassMeta } from "@/lib/compliance";

export const metadata: Metadata = {
  title: "About",
  description: "Vedic Hemp's mission, the four verticals we operate, and our regulatory posture.",
};

const VERTICAL_ROWS: ClassMeta[] = Object.values(CLASS_META);

const VERTICAL_COLUMNS: Column<ClassMeta>[] = [
  {
    key: "vertical",
    header: "Vertical",
    render: (row) => (
      <span className="vh-row" style={{ gap: 8 }}>
        <span aria-hidden>{row.emoji}</span>
        <strong style={{ color: "var(--vh-ink)" }}>{row.label}</strong>
      </span>
    ),
  },
  { key: "blurb", header: "What it covers", render: (row) => <span className="small">{row.blurb}</span> },
  {
    key: "rx",
    header: "Prescription",
    render: (row) => <span className="small">{row.rxRequired ? "Required" : "Not required"}</span>,
  },
  {
    key: "age",
    header: "Age-gated",
    render: (row) => <span className="small">{row.ageGated ? "18+" : "No"}</span>,
  },
  {
    key: "ads",
    header: "Advertisable",
    render: (row) => <span className="small">{row.advertisable ? "Yes" : "Never (A1)"}</span>,
  },
];

export default function AboutPage() {
  return (
    <div className="vh-container" style={{ paddingTop: 28, paddingBottom: 56 }}>
      <div className="vh-page-head">
        <h1>About Vedic Hemp</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          Vedic Hemp is a regulated multi-vendor marketplace for hemp, CBD wellness, Ayurveda and
          medical cannabis in India — built so that compliance is a property of the platform, not
          a policy someone has to remember to follow.
        </p>
      </div>

      <section style={{ marginBottom: 28 }}>
        <Card title="Our mission">
          <p className="small">
            India's hemp, wellness and Ayurveda sector is large, fragmented and mostly
            self-certified. We think buyers deserve better than a seller's word: every regulated
            product on Vedic Hemp carries a batch-matched, independently issued lab report before
            it can be sold, every seller's licence is checked before they can list, and every
            access to a buyer's health information is logged and disclosed to that buyer.
          </p>
          <p className="small" style={{ marginBottom: 0 }}>
            We'd rather ship a smaller catalogue we can stand behind than a large one we can't.
          </p>
        </Card>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 12 }}>The four verticals</h2>
        <Card pad0>
          <DataTable columns={VERTICAL_COLUMNS} rows={VERTICAL_ROWS} />
        </Card>
        <p className="small muted" style={{ marginTop: 10 }}>
          Medical Cannabis is listed here for transparency about how the platform is structured —
          it is never shown as a shoppable or recommended item on public pages. See{" "}
          <Link href="/trust#prescriptions">how prescriptions work</Link> for how it becomes
          visible to an individual, verified buyer.
        </p>
      </section>

      <section>
        <Card title="Our regulatory posture">
          <ul className="small" style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, margin: 0 }}>
            <li>
              We register and operate under the applicable Indian frameworks for each vertical:
              FSSAI for food, AYUSH for Ayurveda and CBD wellness formulations, and the
              prescription and licensing regime around the NDPS Act for medical cannabis.
            </li>
            <li>
              No product on the platform is permitted to carry a disease cure/treatment claim,
              per the Drugs &amp; Magic Remedies (Objectionable Advertisements) Act — copy is
              reviewed for this before a listing goes live.
            </li>
            <li>
              All personal data and payment data are stored in Indian data centres (ap-south-1 /
              ap-south-2), consistent with data-localisation expectations for a platform handling
              health-adjacent information.
            </li>
            <li>
              We publish our prohibitions rather than our promises — see{" "}
              <Link href="/trust">Trust &amp; Lab Reports</Link> for the six things this platform
              is built to be structurally incapable of.
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
