/**
 * VEDIC HEMP — ABOUT (V2 reskin)
 *
 * Short mission page. The four-verticals table is presentation-only (from
 * CLASS_META) — it states plainly that Medical Cannabis is prescription-only
 * and never advertised, rather than omitting it entirely, because this is an
 * explanatory page, not a shopping surface (A1 only restricts shoppable /
 * promotional surfaces). Content unchanged from V1 — this pass applies the V2
 * marketing rhythm (SectionHead, lucide icons, section spacing).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Scale } from "lucide-react";
import { Card, DataTable, SectionHead, type Column } from "@/components/ui";
import { CLASS_META, type ClassMeta } from "@/lib/compliance";
import { mdToHtml } from "@/lib/richtext";
import { readSiteContent } from "@/lib/sitecontent";

export const metadata: Metadata = {
  title: "About",
  description: "Vedic Hemp's mission, the four verticals we operate, and our regulatory posture.",
  alternates: { canonical: "/about" },
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
    render: (row) => <span className="small">{row.ageGated ? "21+" : "No"}</span>,
  },
  {
    key: "ads",
    header: "Advertisable",
    render: (row) => <span className="small">{row.advertisable ? "Yes" : "Never (A1)"}</span>,
  },
];

export default async function AboutPage() {
  const content = await readSiteContent();
  return (
    <div className="vh-container" style={{ paddingTop: "var(--sp-5)", paddingBottom: "var(--sp-7)" }}>
      <div className="vh-section-head">
        <div className="vh-eyebrow" style={{ marginBottom: 8 }}>Company</div>
        <h1 className="vh-display" style={{ fontSize: "clamp(1.8rem, 1.3rem + 2vw, 2.6rem)" }}>About Vedic Hemp</h1>
        <div
          className="muted vh-prose"
          style={{ maxWidth: 640 }}
          dangerouslySetInnerHTML={{ __html: mdToHtml(content.aboutIntro ?? "") }}
        />
      </div>

      <section className="vh-section" style={{ paddingBottom: 0 }}>
        <Card>
          <div className="vh-row" style={{ gap: 10, marginBottom: 10 }}>
            <Compass size={18} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
            <h3 style={{ margin: 0 }}>Our mission</h3>
          </div>
          <p className="small">
            India&apos;s hemp, wellness and Ayurveda sector is large, fragmented and mostly
            self-certified. We think buyers deserve better than a seller&apos;s word: every regulated
            product on Vedic Hemp carries a batch-matched, independently issued lab report before
            it can be sold, every seller&apos;s licence is checked before they can list, and every
            access to a buyer&apos;s health information is logged and disclosed to that buyer.
          </p>
          <p className="small" style={{ marginBottom: 0 }}>
            We&apos;d rather ship a smaller catalogue we can stand behind than a large one we can&apos;t.
          </p>
        </Card>
      </section>

      <section className="vh-section" style={{ paddingBottom: 0 }}>
        <SectionHead eyebrow="Structure" title="The four verticals" />
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

      <section className="vh-section" style={{ paddingBottom: 0 }}>
        <Card>
          <div className="vh-row" style={{ gap: 10, marginBottom: 10 }}>
            <Scale size={18} strokeWidth={2.2} aria-hidden style={{ color: "var(--vh-accent)" }} />
            <h3 style={{ margin: 0 }}>Our regulatory posture</h3>
          </div>
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
