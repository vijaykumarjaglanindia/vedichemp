# Product Import & Synchronization

Connect any seller store, pull its catalogue, and keep it in sync — under the
same compliance gates as every other path onto the marketplace.

## Architecture

```
lib/import/
  types.ts        The normalized model every connector maps into + all import DTOs.
  connectors.ts   14 methods (Woo, Shopify, Magento, …, CSV, JSON, scraper). Adapter
                  contract: validate(config) + fetchProducts(config). Registry.
  store.ts        In-memory stores (globalThis seam → import_* tables), seeded.
  rules.ts        Pure business-rules engine (price transforms + filters).
  dedupe.ts       Pure duplicate detection (SKU → barcode → slug → title).
  changes.ts      Pure change detection (price/stock/desc/category/image/variant/seo).
  service.ts      Orchestrator: fetch → rules → dedupe → per-product import + GATES + audit.
  dashboard.ts    Derived metrics for the admin home.

app/admin/import/
  page.tsx                 Landing dashboard (derived KPIs, store roster).
  stores/page.tsx          Connected Stores.
  wizard/                  14-step import wizard (server wrapper + client flow).
  history/ logs/ failed/   History, logs, failed imports.
  mapping/{category,attribute,brand}/  Mapping consoles.
  scheduler/ rules/        Sync cadence + default import rules.
  actions.ts               Server actions (validate/fetch/preview/run + mutations).
  _ui.tsx                  Shared presentational components (glass, metrics, steps).
```

## The gates (why this is safe)

A bulk importer is exactly the tool that could smuggle an untested cannabinoid
product live or list prescription cannabis. It cannot:

- **A1 — Medical Cannabis is never imported.** `service.ts::classify` treats
  anything that reads as medical cannabis as `MED_CANNABIS`; the orchestrator
  refuses it, records a **non-retryable** `med_cannabis_blocked` failure, and
  writes its own audit row. `createListing` refuses the class as a backstop.
- **A2 — regulated products land gated.** Every CBD import is created as
  `DRAFT` with `coaState: NONE`. It cannot sell until an approved, batch-matched
  lab report clears the catalogue's publish gate. The `autoPublish` store flag
  never touches regulated products.
- **Claims** — a source description with cure/treat/prevent wording is rejected
  at import (`violatesClaimsCopy`), same as a hand-typed listing.
- **Money** — prices are integer paise; a non-positive price is a validation
  failure. No float ever enters the model.
- **Audit** — every run writes an `IMPORT_RUN` row synchronously before
  returning; blocks and connections audit too.

Proven by `tests/import.test.ts` (14 cases).

## What is live vs. demo-backed

This environment has no outbound network to arbitrary seller stores, and the
constitution forbids inventing live numbers. So:

- **Real:** the full data model, the rules/dedupe/change-detection logic, the
  orchestrator and every gate, the stores, the audit trail, the dashboard
  derivations, the whole admin UI and wizard flow, and `validate()` — which runs
  real checks against the supplied config (missing creds fail, bad URLs fail,
  `planned` methods report unavailable).
- **Demo-backed behind the adapter boundary:** `fetchProducts()` returns a
  deterministic fixture catalogue per store (clearly a fixture, stable across
  previews). Swapping a demo adapter for a live HTTP client is a single function
  body — the `Connector` contract and everything above it are unchanged. The
  scraper and AI enrichment (title/description rewrite, SEO/alt-text generation,
  translation) are declared behind the same seam for the same reason.
