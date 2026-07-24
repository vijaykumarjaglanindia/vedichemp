/**
 * VEDIC HEMP — PRODUCT IMPORT & SYNCHRONIZATION · DATA MODEL
 *
 * The normalized shape every connector (WooCommerce, Shopify, CSV, JSON, REST,
 * scraper, …) maps a seller's raw product into. Nothing downstream — dedupe,
 * rules, change-detection, the import orchestrator — knows or cares which
 * source a product came from; they all speak `NormalizedProduct`.
 *
 * Money is integer paise everywhere (CLAUDE.md §2). A connector that reads a
 * float price MUST round to paise at the adapter boundary; no float ever
 * enters this model.
 *
 * Compliance is not optional at import time. A regulated class (CBD_WELLNESS,
 * MED_CANNABIS) never lands sellable: the orchestrator routes every import
 * through the same DRAFT + CoA gate as a hand-created listing (A2), and
 * MED_CANNABIS is refused outright (A1). See ./service.ts.
 */

import type { ComplianceClass } from "@prisma/client";

/* ─────────────────────────── Connection methods ─────────────────────────── */

export type ConnectionMethod =
  | "woocommerce"
  | "shopify"
  | "magento"
  | "opencart"
  | "bigcommerce"
  | "prestashop"
  | "wix"
  | "squarespace"
  | "rest"
  | "graphql"
  | "xml"
  | "csv"
  | "json"
  | "scraper";

export type AuthType = "none" | "api_key" | "bearer" | "basic" | "oauth2";

/** A single credential/config field a method needs, for the dynamic connect form. */
export interface MethodField {
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  type?: "text" | "url" | "password" | "textarea" | "select" | "file";
  options?: string[];
  required?: boolean;
  secret?: boolean; // masked in the UI and at rest
}

export interface MethodMeta {
  method: ConnectionMethod;
  name: string;
  emoji: string;
  tagline: string;
  /** Real, demo-backed connector vs. declared-but-not-yet-wired. */
  status: "live" | "beta" | "planned";
  auth: AuthType;
  fields: MethodField[];
  /** What this connector can pull — drives the wizard's capability chips. */
  capabilities: {
    variations: boolean;
    images: boolean;
    inventory: boolean;
    categories: boolean;
    seo: boolean;
    incrementalSync: boolean;
    webhooks: boolean;
  };
}

/* ─────────────────────────── Normalized product ─────────────────────────── */

export interface NormImage {
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
  position?: number;
}

export interface NormVariant {
  sku?: string;
  options: Record<string, string>; // { Size: "30ml", Strength: "500mg" }
  pricePaise?: number;
  salePricePaise?: number;
  stockQty?: number;
  barcode?: string;
  weightGrams?: number;
}

export interface NormAttribute {
  name: string; // seller's raw attribute name (mapped later)
  values: string[];
  variation?: boolean; // participates in variants
}

export interface NormPricing {
  pricePaise: number;
  salePricePaise?: number;
  compareAtPaise?: number;
  costPaise?: number;
  msrpPaise?: number;
  wholesalePaise?: number;
  currency: string; // ISO 4217, e.g. "INR"
}

export interface NormInventory {
  quantity?: number;
  stockStatus?: "in_stock" | "out_of_stock" | "backorder" | "preorder";
  lowStockAt?: number;
  tracked?: boolean;
  backorders?: boolean;
  warehouse?: string;
}

export interface NormShipping {
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  shippingClass?: string;
  shippingCostPaise?: number;
}

export interface NormSeo {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogImage?: string;
}

export interface NormIdentifiers {
  barcode?: string;
  upc?: string;
  gtin?: string;
  ean?: string;
  isbn?: string;
  mpn?: string;
}

export interface NormDoc {
  kind: "pdf" | "manual" | "lab_report" | "coa" | "certificate";
  url: string;
  label?: string;
}

/** Marketplace-specific fields this platform cares about (CBD/Ayurveda/medical). */
export interface NormMarketplace {
  cbdPercent?: number;
  thcPercent?: number;
  prescriptionRequired?: boolean;
  coaUrl?: string;
  labReportUrl?: string;
  ingredients?: string;
  usage?: string;
  warnings?: string;
  legalDisclaimer?: string;
  manufacturerLicence?: string;
  expiryDate?: string; // ISO date
  countryOfOrigin?: string;
}

export interface NormalizedProduct {
  /** Stable id at the *source* (used for incremental sync + dedupe). */
  sourceId: string;
  sourceUrl?: string;

  // Basic
  title: string;
  shortDescription?: string;
  description?: string;
  productType?: "simple" | "variable" | "bundle" | "grouped";
  sku?: string;
  slug?: string;
  brand?: string;
  manufacturer?: string;
  vendor?: string;
  collection?: string;
  category?: string; // seller's raw category path, mapped later
  subCategory?: string;
  tags: string[];
  status?: "active" | "draft" | "archived";
  featured?: boolean;

  // Guessed compliance class from the source (never trusted for publish — the
  // orchestrator re-derives and gates). null = "let the operator decide".
  guessedClass?: ComplianceClass | null;

  pricing: NormPricing;
  inventory: NormInventory;
  images: NormImage[];
  videos: string[];
  documents: NormDoc[];
  shipping: NormShipping;
  seo: NormSeo;
  identifiers: NormIdentifiers;
  attributes: NormAttribute[];
  variants: NormVariant[];
  marketplace: NormMarketplace;

  /** Populated by the connector for auditing what was actually seen. */
  rawFieldCount?: number;
}

/* ─────────────────────────── Connected stores ─────────────────────────── */

export type StoreHealth = "healthy" | "degraded" | "auth_expired" | "unreachable" | "never_connected";

export interface ConnectedStore {
  id: string;
  sellerEmail: string;
  sellerName: string;
  method: ConnectionMethod;
  label: string; // e.g. "Vedic Botanicals — WooCommerce"
  endpoint?: string; // store URL / feed URL
  /** Credentials are stored masked (secrets never returned to the client). */
  credentialsMasked: Record<string, string>;
  createdAt: string;
  lastSyncAt?: string;
  health: StoreHealth;
  productCount?: number;
  schedule?: SyncCadence;
  autoPublish: boolean; // never overrides the CoA gate; only affects non-regulated
}

/* ─────────────────────────── Mappings ─────────────────────────── */

export interface CategoryMapping {
  id: string;
  storeId?: string; // null = global mapping
  sourcePath: string; // "Health > CBD"
  targetCategoryId: string;
  targetLabel: string;
  auto: boolean; // AI-suggested vs. operator-confirmed
}

export interface AttributeMapping {
  id: string;
  sourceName: string; // "Bottle Size"
  targetName: string; // "Volume"
  auto: boolean;
}

export interface BrandMapping {
  id: string;
  sourceName: string;
  targetBrand: string;
  merged: boolean; // merged into an existing brand
  auto: boolean;
}

/* ─────────────────────────── Import rules ─────────────────────────── */

export interface ImportRules {
  priceAdjustPct: number; // + markup / - discount, applied to pricePaise
  roundTo?: 0 | 100 | 1000 | 10000; // paise: none / to ₹1 / ₹10 / ₹100
  minMarginPct?: number; // floor price at cost * (1+margin)
  maxDiscountPct?: number; // cap sale discount
  skipOutOfStock: boolean;
  skipDrafts: boolean;
  skipArchived: boolean;
  requireImage: boolean;
  onlyActive: boolean;
  onlyCategories: string[]; // target category ids; empty = all
  onlyBrands: string[]; // empty = all
  autoTags: string[];
  autoShippingClass?: string;
  autoTaxClass?: string;
}

export function defaultRules(): ImportRules {
  return {
    priceAdjustPct: 0,
    skipOutOfStock: false,
    skipDrafts: true,
    skipArchived: true,
    requireImage: false,
    onlyActive: true,
    onlyCategories: [],
    onlyBrands: [],
    autoTags: [],
  };
}

/* ─────────────────────────── Import options + jobs ─────────────────────────── */

export type ImportMode =
  | "everything"
  | "new_only"
  | "update_existing"
  | "inventory_only"
  | "pricing_only"
  | "images_only"
  | "descriptions_only"
  | "categories_only"
  | "seo_only";

export type DuplicateStrategy = "update" | "skip" | "create_new" | "merge";

export interface ImportOptions {
  mode: ImportMode;
  duplicateStrategy: DuplicateStrategy;
  deleteRemoved: boolean; // else archive
}

export type SyncCadence = "manual" | "hourly" | "daily" | "weekly" | "monthly" | "realtime";

/* ─────────────────────────── History + logs + failures ─────────────────────────── */

export type JobStatus = "queued" | "running" | "completed" | "completed_with_errors" | "failed" | "cancelled";

export interface ImportHistoryRow {
  id: string;
  storeId: string;
  storeLabel: string;
  method: ConnectionMethod;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  status: JobStatus;
  imported: number;
  updated: number;
  skipped: number;
  deleted: number;
  failed: number;
  warnings: number;
  trigger: "manual" | "scheduled" | "webhook";
  actor: string;
}

export type LogLevel = "info" | "warn" | "error";

export interface ImportLogRow {
  id: string;
  historyId: string;
  at: string;
  level: LogLevel;
  message: string;
  productRef?: string; // title or sku
}

export type FailureCode =
  | "auth_error"
  | "connection_error"
  | "timeout"
  | "rate_limited"
  | "missing_image"
  | "invalid_price"
  | "missing_category"
  | "duplicate_sku"
  | "corrupt_image"
  | "validation_error"
  | "med_cannabis_blocked"
  | "claims_blocked";

export interface FailedImportRow {
  id: string;
  historyId: string;
  storeId: string;
  at: string;
  productRef: string;
  code: FailureCode;
  message: string;
  suggestedFix: string;
  retryable: boolean;
}

/* ─────────────────────────── Change detection ─────────────────────────── */

export type ChangeKind =
  | "new"
  | "removed"
  | "price"
  | "stock"
  | "description"
  | "category"
  | "image"
  | "variation"
  | "seo";

export interface ProductChange {
  kind: ChangeKind;
  productRef: string;
  from?: string;
  to?: string;
}

/* ─────────────────────────── Dedupe ─────────────────────────── */

export type MatchSignal = "sku" | "barcode" | "slug" | "title";

export interface DuplicateMatch {
  sourceId: string;
  productRef: string;
  matchedListingId: string;
  matchedTitle: string;
  signal: MatchSignal;
  confidence: number; // 0..1
}

/* ─────────────────────────── Import summary ─────────────────────────── */

export interface ImportSummary {
  historyId: string;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  warnings: number;
  gatedRegulated: number; // regulated products that landed DRAFT awaiting CoA (A2)
  blockedMedical: number; // MED_CANNABIS refused at import (A1)
  changes: ProductChange[];
  failures: FailedImportRow[];
}
