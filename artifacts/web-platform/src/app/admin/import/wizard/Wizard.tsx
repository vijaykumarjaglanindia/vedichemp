"use client";

/**
 * VEDIC HEMP — IMPORT WIZARD (client).
 *
 * A 14-step flow: seller → method → connect → validate → fetch → preview →
 * select → category/brand/attribute mapping → rules → review → import →
 * summary. Validate, fetch, preview and run all call server actions; the CoA
 * gate (A2) and MED_CANNABIS block (A1) are enforced server-side and surfaced
 * on the Review and Summary steps.
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, Loader2, Wand2, ShieldAlert,
  Search, PackageCheck, AlertTriangle, Store,
} from "lucide-react";
import { StepRail, Progress, Thumb, SkeletonRows, CapabilityChips } from "../_ui";
import { wizardValidate, wizardFetch, wizardPreview, wizardRun } from "../actions";
import type {
  MethodMeta, ConnectionMethod, NormalizedProduct, ImportRules, ImportOptions,
  ImportSummary, CategoryMapping, BrandMapping, AttributeMapping,
} from "@/lib/import/types";
import type { ImportPreview } from "@/lib/import/service";
import type { ValidateResult } from "@/lib/import/connectors";

const money = (paise?: number) => paise == null ? "—" : `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

type Seller = { name: string; email: string };

export function Wizard({ sellers, methods, defaultRules, categoryMap, brandMap, attributeMap }: {
  sellers: Seller[];
  methods: MethodMeta[];
  defaultRules: ImportRules;
  categoryMap: CategoryMapping[];
  brandMap: BrandMapping[];
  attributeMap: AttributeMapping[];
}) {
  const [step, setStep] = useState(1);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [method, setMethod] = useState<ConnectionMethod | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [rules, setRules] = useState<ImportRules>(defaultRules);
  const [options, setOptions] = useState<ImportOptions>({ mode: "everything", duplicateStrategy: "update", deleteRemoved: false });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const meta = methods.find((m) => m.method === method) ?? null;
  const selectedProducts = useMemo(() => products.filter((p) => selected.has(p.sourceId)), [products, selected]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter((p) => `${p.title} ${p.sku ?? ""} ${p.brand ?? ""}`.toLowerCase().includes(q)) : products;
  }, [products, query]);

  const set = (k: string, v: string) => setConfig((c) => ({ ...c, [k]: v }));
  const next = () => { setError(null); setStep((s) => Math.min(14, s + 1)); };
  const back = () => { setError(null); setStep((s) => Math.max(1, s - 1)); };

  const canNext = (() => {
    switch (step) {
      case 1: return !!seller;
      case 2: return !!method && meta?.status !== "planned";
      case 3: return !!meta && meta.fields.filter((f) => f.required).every((f) => (config[f.key] ?? "").trim());
      case 4: return validation?.ok === true;
      case 5: return products.length > 0;
      case 7: return selected.size > 0;
      default: return true;
    }
  })();

  const doValidate = () => {
    if (!method) return;
    start(async () => {
      setError(null);
      const r = await wizardValidate(method, config);
      setValidation(r);
      if (!r.ok) setError(r.reason ?? "Could not validate the connection.");
    });
  };
  const doFetch = () => {
    if (!method) return;
    start(async () => {
      setError(null);
      const rows = await wizardFetch(method, config);
      setProducts(rows);
      setSelected(new Set(rows.map((p) => p.sourceId)));
    });
  };
  const doPreview = () => {
    start(async () => {
      setError(null);
      const p = await wizardPreview(selectedProducts, rules, options);
      setPreview(p);
    });
  };
  const doRun = () => {
    if (!seller || !method || !meta) return;
    start(async () => {
      setError(null);
      try {
        const s = await wizardRun({
          sellerName: seller.name, sellerEmail: seller.email, method, label: `${seller.name} — ${meta.name}`,
          endpoint: config.storeUrl || config.apiUrl || config.feedUrl || config.shopUrl || config.endpoint,
          config, products: selectedProducts, rules, options,
        });
        setSummary(s);
        setStep(14);
      } catch {
        setError("The import could not be completed. Nothing was published.");
      }
    });
  };

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => s.size === products.length ? new Set() : new Set(products.map((p) => p.sourceId)));

  return (
    <div style={{ display: "grid", gap: "var(--sp-4)" }}>
      <div className="imp-glass" style={{ padding: 14 }}>
        <StepRail current={step} />
      </div>

      {error && (
        <div className="vh-banner vh-banner-warn" role="alert"><XCircle size={16} aria-hidden /><div>{error}</div></div>
      )}

      <div className="imp-glass" style={{ padding: "var(--sp-4)", minHeight: 280 }}>
        {/* STEP 1 — seller */}
        {step === 1 && (
          <Section title="Choose the seller" sub="Which seller's catalogue are you importing?">
            <div className="imp-grid cols-3">
              {sellers.map((s) => (
                <button key={s.email} className="imp-method-card" aria-pressed={seller?.email === s.email} onClick={() => setSeller(s)}>
                  <span className="imp-method-emoji">🏪</span>
                  <strong>{s.name}</strong>
                  <span className="small muted">{s.email}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* STEP 2 — method */}
        {step === 2 && (
          <Section title="Choose an import method" sub="Connect an API, upload a feed, or point the crawler at a shop page.">
            <div className="imp-grid cols-3">
              {methods.map((m) => (
                <button key={m.method} className="imp-method-card" aria-pressed={method === m.method} disabled={m.status === "planned"} onClick={() => { setMethod(m.method); setConfig({}); setValidation(null); }} style={m.status === "planned" ? { opacity: 0.55, cursor: "not-allowed" } : undefined}>
                  <div className="vh-row-between"><span className="imp-method-emoji">{m.emoji}</span><span className={`imp-chip ${m.status === "live" ? "on" : ""}`}>{m.status}</span></div>
                  <strong>{m.name}</strong>
                  <span className="small muted">{m.tagline}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* STEP 3 — connect */}
        {step === 3 && meta && (
          <Section title={`Connect to ${meta.name}`} sub="Credentials are stored masked — only the last four characters are ever shown again.">
            <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
              {meta.fields.map((f) => (
                <label key={f.key} style={{ display: "grid", gap: 4 }}>
                  <span className="small" style={{ fontWeight: 700 }}>{f.label}{f.required && <span style={{ color: "var(--vh-danger)" }}> *</span>}</span>
                  {f.type === "textarea" ? (
                    <textarea className="vh-input" rows={3} placeholder={f.placeholder} value={config[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                  ) : f.type === "select" ? (
                    <select className="vh-input" value={config[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="vh-input" type={f.secret ? "password" : f.type === "url" ? "url" : "text"} placeholder={f.placeholder} value={config[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                  )}
                  {f.help && <span className="small muted">{f.help}</span>}
                </label>
              ))}
              <CapabilityChips meta={meta} />
            </div>
          </Section>
        )}

        {/* STEP 4 — validate */}
        {step === 4 && meta && (
          <Section title="Validate the connection" sub="We check the credentials and confirm we can read the catalogue before importing anything.">
            <button className="vh-btn vh-btn-primary" onClick={doValidate} disabled={pending}>
              {pending ? <Loader2 size={15} className="imp-spin" aria-hidden /> : <ShieldAlert size={15} aria-hidden />} Test connection
            </button>
            {validation?.ok && (
              <div className="vh-banner vh-banner-ok" style={{ marginTop: 16 }}><CheckCircle2 size={16} aria-hidden /><div><strong>Connected to {validation.storeName ?? meta.name}.</strong> {validation.productCountHint != null && `About ${validation.productCountHint} products available.`}</div></div>
            )}
          </Section>
        )}

        {/* STEP 5 — fetch */}
        {step === 5 && (
          <Section title="Fetch products" sub="Pull the seller's catalogue. Nothing is imported yet — this just reads.">
            {products.length === 0 ? (
              pending ? <SkeletonRows rows={6} /> : <button className="vh-btn vh-btn-primary" onClick={doFetch}><PackageCheck size={15} aria-hidden /> Fetch catalogue</button>
            ) : (
              <div className="vh-banner vh-banner-ok"><CheckCircle2 size={16} aria-hidden /><div><strong>{products.length} products fetched.</strong> Review and select them next.</div></div>
            )}
          </Section>
        )}

        {/* STEP 6 & 7 — preview / select */}
        {(step === 6 || step === 7) && (
          <Section title={step === 6 ? "Preview products" : "Select products to import"} sub={step === 6 ? "Everything the connector read, before any rules." : "Tick the products to import. All are selected by default."}>
            <div className="vh-row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span className="vh-input" style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 320 }}>
                <Search size={14} aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, SKU, brand" style={{ border: 0, outline: 0, background: "transparent", flex: 1 }} />
              </span>
              {step === 7 && <button className="vh-btn vh-btn-sm vh-btn-ghost" onClick={toggleAll}>{selected.size === products.length ? "Clear all" : "Select all"}</button>}
              <span className="small muted" style={{ marginLeft: "auto" }}>{step === 7 ? `${selected.size} of ${products.length} selected` : `${filtered.length} products`}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="vh-table" style={{ minWidth: 760 }}>
                <thead><tr>{step === 7 && <th />}<th>Product</th><th>SKU</th><th>Category</th><th>Brand</th><th style={{ textAlign: "right" }}>Price</th><th style={{ textAlign: "right" }}>Stock</th><th>Type</th></tr></thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.sourceId} style={{ opacity: step === 7 && !selected.has(p.sourceId) ? 0.5 : 1 }}>
                      {step === 7 && <td><input type="checkbox" checked={selected.has(p.sourceId)} onChange={() => toggle(p.sourceId)} aria-label={`Select ${p.title}`} /></td>}
                      <td><span className="vh-row" style={{ gap: 8 }}><Thumb url={p.images[0]?.url} /> <span style={{ fontWeight: 600 }}>{p.title}</span></span></td>
                      <td className="mono small">{p.sku ?? "—"}</td>
                      <td className="small">{p.subCategory ?? p.category ?? "—"}</td>
                      <td className="small">{p.brand ?? "—"}</td>
                      <td className="tabular" style={{ textAlign: "right" }}>{money(p.pricing.salePricePaise ?? p.pricing.pricePaise)}</td>
                      <td className="tabular" style={{ textAlign: "right" }}>{p.inventory.quantity ?? "—"}</td>
                      <td>{p.productType === "variable" ? <span className="imp-chip on">Variable</span> : <span className="imp-chip">Simple</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* STEP 8/9/10 — mappings */}
        {step === 8 && <MappingStep title="Category mapping" sub="Seller categories are mapped to marketplace categories. Unmapped paths use a best-guess and can be fixed on the Category Mapping page." values={uniq(selectedProducts.map((p) => p.category))} mapped={new Map(categoryMap.map((m) => [m.sourcePath, m.targetLabel]))} />}
        {step === 9 && <MappingStep title="Brand mapping" sub="Detected brands are matched to existing marketplace brands; new brands are created on import." values={uniq(selectedProducts.map((p) => p.brand))} mapped={new Map(brandMap.map((m) => [m.sourceName, m.targetBrand]))} />}
        {step === 10 && <MappingStep title="Attribute mapping" sub="Source attribute names are mapped to marketplace attributes so variants line up." values={uniq(selectedProducts.flatMap((p) => p.attributes.map((a) => a.name)))} mapped={new Map(attributeMap.map((m) => [m.sourceName, m.targetName]))} />}

        {/* STEP 11 — rules */}
        {step === 11 && (
          <Section title="Import rules & options" sub="Business rules applied to every product as it imports. Money stays in paise; regulated products are always gated regardless of these settings.">
            <div className="imp-grid cols-2">
              <div style={{ display: "grid", gap: 12 }}>
                <NumberField label="Adjust price by %" value={rules.priceAdjustPct} onChange={(v) => setRules({ ...rules, priceAdjustPct: v })} hint="+ markup, − discount" />
                <label style={{ display: "grid", gap: 4 }}>
                  <span className="small" style={{ fontWeight: 700 }}>Round prices</span>
                  <select className="vh-input" value={rules.roundTo ?? 0} onChange={(e) => setRules({ ...rules, roundTo: Number(e.target.value) as ImportRules["roundTo"] })}>
                    <option value={0}>No rounding</option><option value={100}>Nearest ₹1</option><option value={1000}>Nearest ₹10</option><option value={10000}>Nearest ₹100</option>
                  </select>
                </label>
                <TextField label="Auto-add tags (comma-separated)" value={rules.autoTags.join(", ")} onChange={(v) => setRules({ ...rules, autoTags: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <Check label="Only import active products" checked={rules.onlyActive} onChange={(v) => setRules({ ...rules, onlyActive: v })} />
                <Check label="Skip draft products" checked={rules.skipDrafts} onChange={(v) => setRules({ ...rules, skipDrafts: v })} />
                <Check label="Skip out-of-stock products" checked={rules.skipOutOfStock} onChange={(v) => setRules({ ...rules, skipOutOfStock: v })} />
                <Check label="Only import products with an image" checked={rules.requireImage} onChange={(v) => setRules({ ...rules, requireImage: v })} />
                <label style={{ display: "grid", gap: 4, marginTop: 6 }}>
                  <span className="small" style={{ fontWeight: 700 }}>On duplicate</span>
                  <select className="vh-input" value={options.duplicateStrategy} onChange={(e) => setOptions({ ...options, duplicateStrategy: e.target.value as ImportOptions["duplicateStrategy"] })}>
                    <option value="update">Update the existing listing</option><option value="skip">Skip</option><option value="create_new">Create a new listing</option><option value="merge">Merge</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span className="small" style={{ fontWeight: 700 }}>Import mode</span>
                  <select className="vh-input" value={options.mode} onChange={(e) => setOptions({ ...options, mode: e.target.value as ImportOptions["mode"] })}>
                    <option value="everything">Import everything</option><option value="new_only">Only new products</option><option value="update_existing">Update existing only</option><option value="pricing_only">Pricing only</option><option value="inventory_only">Inventory only</option>
                  </select>
                </label>
              </div>
            </div>
          </Section>
        )}

        {/* STEP 12 — review */}
        {step === 12 && (
          <Section title="Review" sub="Exactly what will happen when you import. Regulated products land as drafts; Medical Cannabis is blocked.">
            {!preview ? (
              <button className="vh-btn vh-btn-primary" onClick={doPreview} disabled={pending}>{pending ? <Loader2 size={15} className="imp-spin" aria-hidden /> : <CheckCircle2 size={15} aria-hidden />} Run pre-flight check</button>
            ) : (
              <>
                <div className="imp-grid cols-4">
                  <ReviewStat label="Will import" value={preview.counts.create} tone="ok" />
                  <ReviewStat label="Will update" value={preview.counts.update} tone="info" />
                  <ReviewStat label="Skipped" value={preview.counts.skip} tone="neutral" />
                  <ReviewStat label="Blocked" value={preview.counts.block} tone="danger" />
                </div>
                {preview.counts.gatedRegulated > 0 && (
                  <div className="vh-banner vh-banner-info" style={{ marginTop: 14 }}><ShieldAlert size={16} aria-hidden /><div><strong>{preview.counts.gatedRegulated} regulated (CBD) product{preview.counts.gatedRegulated === 1 ? "" : "s"}</strong> will import as drafts and cannot sell until an approved lab report is on file (A2).</div></div>
                )}
                {preview.counts.blockedMedical > 0 && (
                  <div className="vh-banner vh-banner-warn" style={{ marginTop: 10 }}><ShieldAlert size={16} aria-hidden /><div><strong>{preview.counts.blockedMedical} Medical Cannabis product{preview.counts.blockedMedical === 1 ? "" : "s"}</strong> will be blocked and logged — never imported (A1).</div></div>
                )}
                <div className="small muted" style={{ marginTop: 12 }}>
                  Rules: {rules.priceAdjustPct ? `${rules.priceAdjustPct > 0 ? "+" : ""}${rules.priceAdjustPct}% price · ` : ""}{rules.onlyActive ? "active only · " : ""}{rules.requireImage ? "image required · " : ""}duplicates → {options.duplicateStrategy}.
                </div>
              </>
            )}
          </Section>
        )}

        {/* STEP 13 — import */}
        {step === 13 && (
          <Section title="Import" sub="This creates draft listings for the selected products and records everything in Import History.">
            <div style={{ maxWidth: 520 }}>
              <Progress percent={pending ? 66 : summary ? 100 : 8} />
              <button className="vh-btn vh-btn-primary" onClick={doRun} disabled={pending} style={{ marginTop: 16 }}>
                {pending ? <><Loader2 size={15} className="imp-spin" aria-hidden /> Importing…</> : <><Wand2 size={15} aria-hidden /> Import {selectedProducts.length} products</>}
              </button>
            </div>
          </Section>
        )}

        {/* STEP 14 — summary */}
        {step === 14 && summary && (
          <Section title="Import complete" sub="Here's what happened. Imported products are drafts awaiting review.">
            <div className="imp-grid cols-4">
              <ReviewStat label="Imported" value={summary.imported} tone="ok" />
              <ReviewStat label="Updated" value={summary.updated} tone="info" />
              <ReviewStat label="Skipped" value={summary.skipped} tone="neutral" />
              <ReviewStat label="Failed" value={summary.failed} tone={summary.failed ? "danger" : "neutral"} />
            </div>
            <div className="vh-row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {summary.gatedRegulated > 0 && <span className="imp-chip on"><ShieldAlert size={12} aria-hidden style={{ marginRight: 4 }} />{summary.gatedRegulated} regulated held for CoA</span>}
              {summary.blockedMedical > 0 && <span className="imp-chip" style={{ color: "var(--vh-danger)" }}><ShieldAlert size={12} aria-hidden style={{ marginRight: 4 }} />{summary.blockedMedical} medical blocked (A1)</span>}
              {summary.warnings > 0 && <span className="imp-chip"><AlertTriangle size={12} aria-hidden style={{ marginRight: 4 }} />{summary.warnings} warnings</span>}
            </div>
            <div className="vh-row" style={{ gap: 8, marginTop: 18 }}>
              <Link href="/admin/catalogue" className="vh-btn vh-btn-primary"><Store size={15} aria-hidden /> Review drafts in Catalogue</Link>
              <Link href="/admin/import/history" className="vh-btn vh-btn-ghost">Import History</Link>
              <Link href="/admin/import/failed" className="vh-btn vh-btn-ghost">Failed imports</Link>
            </div>
          </Section>
        )}
      </div>

      {/* Nav */}
      {step < 14 && (
        <div className="vh-row-between">
          <button className="vh-btn vh-btn-ghost" onClick={back} disabled={step === 1}><ArrowLeft size={15} aria-hidden /> Back</button>
          {step === 13 ? <span /> : (
            <button className="vh-btn vh-btn-primary" onClick={next} disabled={!canNext || pending}>Next <ArrowRight size={15} aria-hidden /></button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── small pieces ─────────────────────────── */

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem" }}>{title}</h2>
      {sub && <p className="small muted" style={{ margin: "0 0 16px", maxWidth: "70ch" }}>{sub}</p>}
      {children}
    </div>
  );
}

function MappingStep({ title, sub, values, mapped }: { title: string; sub: string; values: string[]; mapped: Map<string, string> }) {
  return (
    <Section title={title} sub={sub}>
      {values.length === 0 ? <p className="small muted">Nothing to map in the selected products.</p> : (
        <div style={{ display: "grid", gap: 8, maxWidth: 640 }}>
          {values.map((v) => {
            const target = mapped.get(v);
            return (
              <div key={v} className="vh-row-between" style={{ gap: 12, border: "1px solid var(--vh-line)", borderRadius: 10, padding: "10px 12px" }}>
                <span className="small" style={{ fontWeight: 600 }}>{v}</span>
                <span className="vh-row" style={{ gap: 8 }}><ArrowRight size={13} aria-hidden style={{ opacity: 0.5 }} />
                  {target ? <span className="imp-chip on">{target}</span> : <span className="imp-chip">auto · best guess</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function ReviewStat({ label, value, tone }: { label: string; value: number; tone: "ok" | "info" | "danger" | "neutral" }) {
  const color = tone === "ok" ? "var(--vh-ok)" : tone === "info" ? "var(--vh-info)" : tone === "danger" ? "var(--vh-danger)" : "var(--vh-ink)";
  return <div className="imp-metric"><div className="imp-metric-label">{label}</div><div className="imp-metric-value tabular" style={{ color }}>{value}</div></div>;
}

function NumberField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return <label style={{ display: "grid", gap: 4 }}><span className="small" style={{ fontWeight: 700 }}>{label}</span><input className="vh-input" type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />{hint && <span className="small muted">{hint}</span>}</label>;
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label style={{ display: "grid", gap: 4 }}><span className="small" style={{ fontWeight: 700 }}>{label}</span><input className="vh-input" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="vh-row" style={{ gap: 8, cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="small">{label}</span></label>;
}

function uniq(arr: (string | undefined)[]): string[] {
  return Array.from(new Set(arr.filter((x): x is string => !!x)));
}
