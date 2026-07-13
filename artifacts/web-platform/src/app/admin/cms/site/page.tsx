/**
 * VEDIC HEMP — SITE CONTENT EDITOR
 *
 * Every public copy surface — announcement bar, hero, section copy, FAQ,
 * testimonials, footer disclosure, page metadata — edited here, saved
 * server-side, live for every visitor on the next request. No hardcoded
 * marketing copy: what the site shows is what this page last published.
 *
 * The claims copy-check runs on every field (no cure/treat/prevent/heal
 * language anywhere), and clearing a field restores the launch default.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe, PenLine } from "lucide-react";
import { Shell } from "../../Shell";
import { Banner, Card, StatusPill } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SITE_FIELDS, SITE_GROUPS, readSiteContent, siteField } from "@/lib/sitecontent";
import { saveSiteContent } from "../../actions";

export const metadata: Metadata = { title: "Site content · Admin" };
export const dynamic = "force-dynamic";

export default async function SiteContentPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; g?: string; f?: string }>;
}) {
  const { site, g, f } = await searchParams;
  const content = await readSiteContent();
  const errField = f ? siteField(f) : undefined;

  return (
    <Shell
      active="/admin/cms"
      breadcrumb={["Admin", "Content & CMS", "Site content"]}
      title="Site content"
      actions={
        <span className="vh-row" style={{ gap: 8 }}>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/cms">
            <ArrowLeft size={14} aria-hidden /> All content
          </Link>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/">
            <Globe size={14} aria-hidden /> View site
          </Link>
        </span>
      }
    >
      <div className="vh-grid" style={{ gap: "var(--sp-3)" }}>
        {site === "saved" && (
          <Banner severity="ok" title={`Saved — ${g ?? "section"} is live`}>
            Public pages render this content on every request; visitors see the update immediately.
          </Banner>
        )}
        {site === "claims" && (
          <Banner severity="danger" title="Not saved — claims language rejected">
            {errField ? `“${errField.label}” contains` : "A field contains"} cure/treat/prevent/heal
            language. Nothing on this platform may carry a disease claim — marketing copy included.
          </Banner>
        )}
        {site === "long" && (
          <Banner severity="danger" title="Not saved — over the length limit">
            {errField ? `“${errField.label}” exceeds ${errField.max} characters.` : "A field is too long."}
          </Banner>
        )}

        <div className="vh-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <PenLine size={15} aria-hidden style={{ color: "var(--vh-muted)" }} />
          <p className="small muted" style={{ margin: 0 }}>
            Clearing a field restores its launch default. Product, deal and seller data are not
            edited here — they come from seller listings and the marketplace itself.
          </p>
        </div>

        {SITE_GROUPS.map((group) => {
          const fields = SITE_FIELDS.filter((x) => x.group === group);
          if (fields.length === 0) return null;
          return (
            <div key={group} id={`g-${group}`}>
              <Card
                title={
                  <span className="vh-row-between" style={{ width: "100%" }}>
                    <span>{group}</span>
                    <StatusPill tone="neutral">{fields.length} fields</StatusPill>
                  </span>
                }
              >
                <form action={saveSiteContent} className="vh-grid" style={{ gap: 16 }}>
                  <input type="hidden" name="group" value={group} />
                  {fields.map((field) => (
                    <div key={field.key} className="vh-field">
                      <label className="vh-label" htmlFor={`sc-${field.key}`}>{field.label}</label>
                      {field.kind === "rich" ? (
                        <RichTextEditor
                          name={field.key}
                          id={`sc-${field.key}`}
                          defaultValue={content[field.key] ?? ""}
                          maxLength={field.max}
                          minHeight={field.max > 1000 ? 200 : 110}
                          help={field.help}
                        />
                      ) : (
                        <>
                          <input
                            className="vh-input"
                            id={`sc-${field.key}`}
                            name={field.key}
                            type="text"
                            maxLength={field.max}
                            defaultValue={content[field.key] ?? ""}
                          />
                          {field.help && <span className="vh-help">{field.help} · max {field.max} chars</span>}
                          {!field.help && <span className="vh-help">Max {field.max} chars</span>}
                        </>
                      )}
                    </div>
                  ))}
                  <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm" style={{ justifySelf: "start" }}>
                    Publish {group.toLowerCase()}
                  </button>
                </form>
              </Card>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
