"use client";

/**
 * VEDIC HEMP — SELLER CONNECT (client flow).
 *
 * A streamlined three-step self-service flow: pick how your store connects,
 * enter its details, and preview + import your catalogue. It is deliberately
 * simpler than the admin's full wizard — the seller is always themselves, so
 * there is no "choose seller" step, and mapping uses sensible defaults. Every
 * import still lands as DRAFT behind the same compliance gates.
 */

import { useState, useTransition } from "react";
import { PlugZap, ShieldCheck, Loader2, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, PackagePlus } from "lucide-react";
import type { MethodMeta, ConnectionMethod, NormalizedProduct } from "@/lib/import/types";
import type { ImportPreview } from "@/lib/import/service";
import { sellerValidate, sellerPreview, sellerImport } from "./actions";

type ValidateResult = Awaited<ReturnType<typeof sellerValidate>>;
type Summary = Awaited<ReturnType<typeof sellerImport>>;

export function Connect({ methods }: { methods: MethodMeta[] }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [method, setMethod] = useState<MethodMeta | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [markup, setMarkup] = useState<string>("0");
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const set = (k: string, v: string) => setConfig((c) => ({ ...c, [k]: v }));
  const markupNum = () => Number(markup) || 0;

  function pick(m: MethodMeta) {
    if (m.status === "planned") return;
    setMethod(m); setConfig({}); setValidation(null); setPreview(null); setError(null); setStep(2);
  }

  function validateAndPreview() {
    if (!method) return;
    setError(null);
    start(async () => {
      const v = await sellerValidate(method.method, config);
      setValidation(v);
      if (!v.ok) return;
      const { products: prods, preview: pv } = await sellerPreview(method.method, config, markupNum());
      setProducts(prods); setPreview(pv); setStep(3);
    });
  }

  function doImport() {
    if (!method) return;
    setError(null);
    start(async () => {
      try {
        const s = await sellerImport({
          method: method.method,
          label: `${method.name}`,
          endpoint: config.storeUrl || config.apiUrl || config.feedUrl || config.shopUrl || config.endpoint,
          config, products, markupPct: markupNum(),
        });
        setSummary(s); setStep(4);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed. Please try again.");
      }
    });
  }

  const reset = () => { setStep(1); setMethod(null); setConfig({}); setMarkup("0"); setValidation(null); setProducts([]); setPreview(null); setSummary(null); setError(null); };

  return (
    <div className="vh-card" style={{ padding: 0, overflow: "hidden" }}>
      <Steps step={step} />

      {/* STEP 1 — choose a method */}
      {step === 1 && (
        <div style={{ padding: "var(--sp-4)" }}>
          <p className="muted" style={{ marginTop: 0 }}>How does your store connect? Pick a platform or a feed — we handle the rest.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {methods.map((m) => (
              <button
                key={m.method}
                type="button"
                onClick={() => pick(m)}
                disabled={m.status === "planned"}
                className="vh-card"
                style={{ textAlign: "left", cursor: m.status === "planned" ? "not-allowed" : "pointer", opacity: m.status === "planned" ? 0.55 : 1, padding: 14, border: "1px solid var(--vh-border)" }}
              >
                <div className="vh-row" style={{ gap: 8, justifyContent: "space-between" }}>
                  <span style={{ fontSize: "1.5rem" }} aria-hidden>{m.emoji}</span>
                  <span className={`vh-pill ${m.status === "live" ? "vh-pill-ok" : m.status === "beta" ? "vh-pill-warn" : "vh-pill-neutral"}`}>{m.status}</span>
                </div>
                <div style={{ fontWeight: 650, marginTop: 8 }}>{m.name}</div>
                <div className="small muted">{m.tagline}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — credentials */}
      {step === 2 && method && (
        <div style={{ padding: "var(--sp-4)", display: "grid", gap: 14 }}>
          <div className="vh-row" style={{ gap: 8 }}><span style={{ fontSize: "1.4rem" }} aria-hidden>{method.emoji}</span><strong>{method.name}</strong></div>
          {method.fields.map((f) => (
            <div key={f.key} style={{ display: "grid", gap: 6 }}>
              <label htmlFor={`f-${f.key}`} className="small muted">{f.label}{f.required ? " *" : ""}</label>
              {f.type === "textarea" ? (
                <textarea id={`f-${f.key}`} className="vh-input" rows={3} placeholder={f.placeholder} value={config[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === "select" ? (
                <select id={`f-${f.key}`} className="vh-input" value={config[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">Choose…</option>
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input id={`f-${f.key}`} className="vh-input" type={f.secret ? "password" : f.type === "url" ? "url" : "text"} placeholder={f.placeholder} value={config[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.help && <span className="small muted">{f.help}</span>}
            </div>
          ))}
          <div style={{ display: "grid", gap: 6, maxWidth: 220 }}>
            <label htmlFor="markup" className="small muted">Markup on source price (%)</label>
            <input id="markup" className="vh-input" type="number" min={-90} max={500} step={1} value={markup} onChange={(e) => setMarkup(e.target.value)} />
            <span className="small muted">Applied to every imported price, rounded to the nearest rupee.</span>
          </div>

          {validation && !validation.ok && (
            <div className="vh-banner vh-banner-danger" role="alert"><AlertTriangle size={16} aria-hidden /><div>{validation.reason ?? "Those details did not validate."}</div></div>
          )}

          <div className="vh-row" style={{ gap: 8 }}>
            <button type="button" className="vh-btn vh-btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={15} aria-hidden /> Back</button>
            <button type="button" className="vh-btn vh-btn-primary" onClick={validateAndPreview} disabled={busy}>
              {busy ? <Loader2 size={15} aria-hidden className="imp-spin" /> : <ShieldCheck size={15} aria-hidden />} Validate & preview
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — preview */}
      {step === 3 && preview && (
        <div style={{ padding: "var(--sp-4)", display: "grid", gap: 14 }}>
          <p style={{ margin: 0 }}>We found <strong>{preview.total}</strong> products. Here is what will happen:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            <Tile label="New (as DRAFT)" value={preview.counts.create} tone="ok" />
            <Tile label="Updated" value={preview.counts.update} tone="info" />
            <Tile label="Skipped" value={preview.counts.skip} tone="neutral" />
            <Tile label="Blocked" value={preview.counts.block} tone="danger" />
          </div>
          {preview.counts.blockedMedical > 0 && (
            <div className="vh-banner vh-banner-warn" role="note"><ShieldCheck size={16} aria-hidden /><div><strong>{preview.counts.blockedMedical}</strong> Medical Cannabis product(s) will not be imported — that class is never listed on the marketplace.</div></div>
          )}
          {preview.counts.gatedRegulated > 0 && (
            <div className="vh-banner vh-banner-info" role="note"><div><strong>{preview.counts.gatedRegulated}</strong> CBD product(s) will land as DRAFT and cannot sell until their lab report is approved.</div></div>
          )}
          {error && <div className="vh-banner vh-banner-danger" role="alert"><AlertTriangle size={16} aria-hidden /><div>{error}</div></div>}
          <div className="vh-row" style={{ gap: 8 }}>
            <button type="button" className="vh-btn vh-btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={15} aria-hidden /> Back</button>
            <button type="button" className="vh-btn vh-btn-primary" onClick={doImport} disabled={busy}>
              {busy ? <Loader2 size={15} aria-hidden className="imp-spin" /> : <PackagePlus size={15} aria-hidden />} Import my products
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — done */}
      {step === 4 && summary && (
        <div style={{ padding: "var(--sp-4)", display: "grid", gap: 14 }}>
          <div className="vh-row" style={{ gap: 8 }}><CheckCircle2 size={22} aria-hidden style={{ color: "var(--vh-ok)" }} /><strong style={{ fontSize: "1.1rem" }}>Store connected & catalogue imported</strong></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            <Tile label="Imported (DRAFT)" value={summary.imported} tone="ok" />
            <Tile label="Updated" value={summary.updated} tone="info" />
            <Tile label="Skipped" value={summary.skipped} tone="neutral" />
            <Tile label="Blocked" value={summary.blockedMedical + summary.failed} tone="danger" />
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Your imported products are in <a href="/seller/products">Products</a> as drafts. Review them, add images and lab reports where needed, and submit them for approval to go live.
          </p>
          <div className="vh-row" style={{ gap: 8 }}>
            <a className="vh-btn vh-btn-primary" href="/seller/products"><ArrowRight size={15} aria-hidden /> Go to my products</a>
            <button type="button" className="vh-btn vh-btn-ghost" onClick={reset}>Connect another store</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Choose", "Connect", "Preview", "Done"];
  return (
    <div className="vh-row" style={{ gap: 0, borderBottom: "1px solid var(--vh-border)", padding: "10px var(--sp-4)", flexWrap: "wrap" }}>
      {labels.map((l, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "now" : "todo";
        return (
          <div key={l} className="vh-row" style={{ gap: 8, opacity: state === "todo" ? 0.5 : 1 }}>
            <span className="vh-pill" style={{ background: state === "now" ? "var(--vh-primary)" : state === "done" ? "var(--vh-ok)" : "var(--vh-surface-2)", color: state === "todo" ? "var(--vh-text)" : "#fff", minWidth: 22, justifyContent: "center" }}>{n}</span>
            <span className="small" style={{ fontWeight: state === "now" ? 650 : 400 }}>{l}</span>
            {n < labels.length && <span className="muted" style={{ margin: "0 10px" }}>·</span>}
          </div>
        );
      })}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "ok" | "info" | "neutral" | "danger" }) {
  const color = tone === "ok" ? "var(--vh-ok)" : tone === "info" ? "var(--vh-primary)" : tone === "danger" ? "var(--vh-danger)" : "var(--vh-text)";
  return (
    <div className="vh-card" style={{ padding: 12, textAlign: "center" }}>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color }}>{value}</div>
      <div className="small muted">{label}</div>
    </div>
  );
}
