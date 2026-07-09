/**
 * VEDIC HEMP — PRODUCT EDITOR (§2.3)
 *
 * `params` is a Promise in Next 15 and must be awaited. Batches show CoA
 * status per batch; "Publish" is disabled with remediation text whenever a
 * batch's CoA is not APPROVED and batch-matched (A2). There is no
 * `force_sellable` — the server, not this button, is the authority.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "../../Shell";
import { Card, StatusPill, toneForStatus, ComplianceBadge, MoneyText, Banner } from "@/components/ui";
import { findSellerProduct, type Batch } from "../../_lib/data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = findSellerProduct(id);
  return { title: product ? product.title : "Product" };
}

function coaTone(status: Batch["coaStatus"]): "ok" | "warn" | "danger" {
  if (status === "APPROVED") return "ok";
  if (status === "PENDING_REVIEW") return "warn";
  return "danger";
}

export default async function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = findSellerProduct(id);
  if (!product) notFound();

  return (
    <Shell
      active="/seller/products"
      breadcrumb={["Seller Central", "Products", product.title]}
      title={product.title}
      actions={<StatusPill tone={toneForStatus(product.listingState)}>{product.listingState}</StatusPill>}
    >
      <div className="vh-grid cols-2" style={{ alignItems: "start" }}>
        <div className="vh-grid" style={{ gap: 18 }}>
          <Card title="Overview">
            <div className="vh-grid" style={{ gap: 12 }}>
              <div>
                <div className="small muted">Title</div>
                <div style={{ fontWeight: 600 }}>{product.title}</div>
              </div>
              <div className="vh-row-between">
                <div>
                  <div className="small muted">Compliance class</div>
                  <ComplianceBadge cls={product.cls} />
                </div>
                <div>
                  <div className="small muted">HSN</div>
                  <div className="mono">{product.hsn}</div>
                </div>
              </div>
              <div className="vh-row-between">
                <div>
                  <div className="small muted">Selling price</div>
                  <MoneyText paise={product.pricePaise} />
                </div>
                <div>
                  <div className="small muted">MRP</div>
                  <MoneyText paise={product.mrpPaise} />
                </div>
              </div>
            </div>
          </Card>

          <Card title="Media & SEO">
            <div className="vh-row" style={{ gap: 10, marginBottom: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: 8, background: "var(--vh-green-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }} aria-hidden>
                {product.emoji}
              </div>
              <a className="vh-btn vh-btn-sm vh-btn-ghost" href="#media">Manage media</a>
            </div>
            <div className="small muted">Slug: <span className="mono">/{product.slug}</span></div>
            <div className="small muted" style={{ marginTop: 4 }}>Meta title and description are inherited from the catalogue template unless overridden here.</div>
          </Card>

          <Card title="Lab reports">
            <p className="small muted" style={{ marginTop: 0 }}>
              Upload a Certificate of Analysis matched to a specific batch code. Compliance reviews every submission
              before a batch becomes sellable — there is no bulk approval and no override (A2).
            </p>
            <a className="vh-btn vh-btn-sm vh-btn-primary" href="#upload-coa">Upload lab report</a>
          </Card>
        </div>

        <div className="vh-grid" style={{ gap: 18 }}>
          <div id="batches">
          <Card title="Batches">
            {product.batches.length === 0 ? (
              <div className="vh-empty">No batches yet. Add a batch and its CoA before this product can be published.</div>
            ) : (
              <div className="vh-grid" style={{ gap: 14 }}>
                {product.batches.map((b) => {
                  const publishable = b.coaStatus === "APPROVED";
                  return (
                    <div key={b.code} style={{ border: "1px solid var(--vh-line)", borderRadius: 10, padding: 12 }}>
                      <div className="vh-row-between" style={{ marginBottom: 6 }}>
                        <span className="mono" style={{ fontWeight: 600 }}>{b.code}</span>
                        <StatusPill tone={coaTone(b.coaStatus)}>{b.coaStatus.replace(/_/g, " ")}</StatusPill>
                      </div>
                      <div className="small muted" style={{ marginBottom: 4 }}>
                        Mfg {b.mfgDate} · Expiry {b.expiryDate} · Qty {b.qty} ({b.reserved} reserved)
                      </div>
                      {b.labReportId && <div className="small muted">Lab report: {b.labReportId}</div>}
                      {b.note && <div className="small" style={{ color: "var(--vh-danger)" }}>{b.note}</div>}
                      <div className="vh-row" style={{ gap: 8, marginTop: 10 }}>
                        <button
                          className="vh-btn vh-btn-sm vh-btn-primary"
                          type="button"
                          disabled={!publishable}
                          title={publishable ? undefined : "Blocked: no APPROVED, batch-matched CoA on file (A2)"}
                        >
                          Publish batch
                        </button>
                        {!publishable && <span className="small muted">Upload/await an APPROVED CoA to unlock publishing.</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          </div>

          {product.batches.some((b) => b.coaStatus !== "APPROVED") && (
            <Banner severity="danger" title="Publish gate is closed for at least one batch">
              A batch cannot go live until its CoA reads APPROVED and matches that exact batch code. This is enforced
              server-side — there is no senior-approval override and no `force_sellable` flag.
            </Banner>
          )}
        </div>
      </div>
    </Shell>
  );
}
