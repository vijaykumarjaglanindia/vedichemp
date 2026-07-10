"use client";

/**
 * VEDIC HEMP — GENERATIVE SEARCH
 *
 * A natural-language search island: "cbd balm for recovery under ₹1500" is
 * parsed client-side into structured intent (category, price cap, goal,
 * lab-verified) and answered instantly from the public catalogue, with a
 * one-keystroke path into the fully-filtered listing page.
 *
 * The product set is passed in from the server and NEVER contains
 * MED_CANNABIS (A1) — this component cannot surface what it was never given.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FlaskConical, Search, Sparkles, TrendingUp } from "lucide-react";

export interface SearchDoc {
  title: string;
  slug: string;
  pricePaise: number;
  cls: string;
  clsLabel: string;
  rating: number;
  emoji: string;
  seller: string;
  labVerified: boolean;
}

interface Intent {
  terms: string[];
  maxPaise: number | null;
  minPaise: number | null;
  cls: string | null;
  labOnly: boolean;
  goal: string | null;
}

const GOAL_WORDS: Record<string, string[]> = {
  "Sleep & calm": ["sleep", "calm", "relax", "stress", "anxiety"],
  "Muscle recovery": ["recovery", "muscle", "pain", "relief", "sore", "workout"],
  "Daily nutrition": ["protein", "nutrition", "diet", "breakfast", "energy"],
  "Skin & body": ["skin", "body", "hair", "glow"],
  "Digestive care": ["digest", "gut", "stomach"],
};

const CLS_WORDS: Record<string, string[]> = {
  CBD_WELLNESS: ["cbd", "balm", "tincture", "roll", "wellness"],
  HEMP_FOOD: ["hemp", "seed", "oil", "protein", "hearts", "food"],
  AYURVEDA: ["ayurveda", "ayurvedic", "ashwagandha", "triphala", "herb"],
};

function parse(q: string): Intent {
  const lower = q.toLowerCase();
  const intent: Intent = { terms: [], maxPaise: null, minPaise: null, cls: null, labOnly: false, goal: null };

  const under = lower.match(/(?:under|below|less than|upto|up to|<)\s*₹?\s*([\d,]+)/);
  if (under?.[1]) intent.maxPaise = parseInt(under[1].replace(/,/g, ""), 10) * 100;
  const over = lower.match(/(?:over|above|more than|>)\s*₹?\s*([\d,]+)/);
  if (over?.[1]) intent.minPaise = parseInt(over[1].replace(/,/g, ""), 10) * 100;

  if (/lab[- ]?(verified|tested)|coa|certificate/.test(lower)) intent.labOnly = true;

  for (const [cls, words] of Object.entries(CLS_WORDS)) {
    if (words.some((w) => lower.includes(w))) { intent.cls = cls; break; }
  }
  for (const [goal, words] of Object.entries(GOAL_WORDS)) {
    if (words.some((w) => lower.includes(w))) { intent.goal = goal; break; }
  }

  intent.terms = lower
    .replace(/(?:under|below|less than|upto|up to|over|above|more than)\s*₹?\s*[\d,]+/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["for", "the", "and", "with"].includes(t));
  return intent;
}

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const SUGGESTIONS = [
  "cbd balm for muscle recovery under ₹1500",
  "lab verified hemp oil",
  "ayurvedic herbs for sleep",
  "hemp protein under ₹1000",
];

export function GenerativeSearch({ docs }: { docs: SearchDoc[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const intent = useMemo(() => parse(q), [q]);

  const hits = useMemo(() => {
    if (!q.trim()) return [];
    return docs
      .map((d) => {
        let score = 0;
        const hay = `${d.title} ${d.seller} ${d.clsLabel}`.toLowerCase();
        for (const t of intent.terms) if (hay.includes(t)) score += 2;
        if (intent.cls && d.cls === intent.cls) score += 3;
        if (intent.maxPaise !== null && d.pricePaise <= intent.maxPaise) score += 1;
        if (intent.maxPaise !== null && d.pricePaise > intent.maxPaise) score -= 4;
        if (intent.minPaise !== null && d.pricePaise < intent.minPaise) score -= 4;
        if (intent.labOnly && !d.labVerified) score -= 4;
        if (intent.labOnly && d.labVerified) score += 2;
        return { d, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.d.rating - a.d.rating)
      .slice(0, 5)
      .map((x) => x.d);
  }, [q, intent, docs]);

  const catalogueHref = useMemo(() => {
    const p = new URLSearchParams();
    if (intent.terms.length) p.set("q", intent.terms.join(" "));
    if (intent.cls) p.set("class", intent.cls);
    if (intent.maxPaise !== null) p.set("max", String(Math.round(intent.maxPaise / 100)));
    if (intent.labOnly) p.set("lab", "1");
    const qs = p.toString();
    return `/catalogue${qs ? `?${qs}` : ""}`;
  }, [intent]);

  const parsedChips: string[] = [];
  if (intent.cls) parsedChips.push(intent.cls === "CBD_WELLNESS" ? "CBD Wellness" : intent.cls === "HEMP_FOOD" ? "Hemp Food" : "Ayurveda");
  if (intent.goal) parsedChips.push(intent.goal);
  if (intent.maxPaise !== null) parsedChips.push(`under ${formatINR(intent.maxPaise)}`);
  if (intent.minPaise !== null) parsedChips.push(`over ${formatINR(intent.minPaise)}`);
  if (intent.labOnly) parsedChips.push("Lab-verified only");

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, -1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = sel >= 0 && hits[sel] ? `/products/${hits[sel].slug}` : catalogueHref;
      window.location.href = target;
    }
  };

  return (
    <div className="vh-gsearch" ref={boxRef}>
      <div className="vh-site-search" style={{ width: "100%" }}>
        <Search size={15} aria-hidden />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Try “cbd balm for recovery under ₹1500”…"
          aria-label="Search products with natural language"
          aria-expanded={open}
          role="combobox"
          aria-controls="vh-gsearch-panel"
          style={{ width: "100%" }}
        />
        <Sparkles size={14} aria-hidden style={{ color: "var(--vh-accent)", flexShrink: 0 }} />
      </div>

      {open && (
        <div className="vh-gsearch-panel" id="vh-gsearch-panel" role="listbox" aria-label="Search results">
          {q.trim() === "" ? (
            <>
              <div className="vh-gsearch-hint">Popular right now</div>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="vh-gsearch-item"
                  style={{ width: "100%", border: 0, background: "none", font: "inherit", cursor: "pointer", textAlign: "left" }}
                  onClick={() => { setQ(s); setSel(-1); }}
                >
                  <TrendingUp size={14} aria-hidden style={{ color: "var(--vh-muted)", flexShrink: 0 }} />
                  {s}
                </button>
              ))}
            </>
          ) : (
            <>
              {parsedChips.length > 0 && (
                <div className="vh-row" style={{ gap: 6, flexWrap: "wrap", padding: "2px 8px 10px" }}>
                  <span className="small muted" style={{ fontWeight: 700 }}>Understood:</span>
                  {parsedChips.map((c) => (
                    <span key={c} className="vh-pill vh-pill-info" style={{ fontSize: ".7rem" }}><span aria-hidden>◆</span>{c}</span>
                  ))}
                </div>
              )}
              {hits.length > 0 ? (
                hits.map((h, i) => (
                  <a key={h.slug} href={`/products/${h.slug}`} className={`vh-gsearch-item ${i === sel ? "sel" : ""}`} role="option" aria-selected={i === sel}>
                    <span aria-hidden style={{ fontSize: "1.15rem" }}>{h.emoji}</span>
                    <span style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</span>
                    {h.labVerified && <FlaskConical size={13} aria-label="Lab verified" style={{ color: "var(--vh-info)", flexShrink: 0 }} />}
                    <span className="meta tabular">★ {h.rating.toFixed(1)} · {formatINR(h.pricePaise)}</span>
                  </a>
                ))
              ) : (
                <div className="small muted" style={{ padding: "8px 8px 10px" }}>
                  No direct match — try the full catalogue with these filters applied.
                </div>
              )}
              <a href={catalogueHref} className="vh-gsearch-item" style={{ color: "var(--vh-accent)", fontWeight: 700, marginTop: 4, borderTop: `1px solid var(--vh-line)`, borderRadius: 0 }}>
                <ArrowRight size={14} aria-hidden />
                Search the catalogue{parsedChips.length ? " with these filters" : ""}
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
