/**
 * VEDIC HEMP — SYSTEM SETTINGS (§0.4 IA)
 *
 * Tax rules, commission rules (A5), shipping, payment gateways, notification
 * templates, the Roles & Permissions separation-of-duties matrix, audit
 * logs, API keys and feature flags. This page is where the platform's
 * governance structure is documented, not where it is loosened — none of
 * the mutually-exclusive role pairs below have a UI control to combine them.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck, Percent, ReceiptText, Truck, CreditCard, BellRing, ScrollText, KeyRound, ToggleLeft,
} from "lucide-react";
import { Shell } from "../Shell";
import { Card, StatusPill, Banner } from "@/components/ui";
import { FEATURE_FLAGS, API_KEYS } from "../_lib/data";

export const metadata: Metadata = { title: "Settings · Admin" };

const I = { size: 16, strokeWidth: 2.2 } as const;

const SOD_PAIRS = [
  { a: "ADMIN_FINANCE", b: "ADMIN_FINANCE_APPROVER", note: "The admin who prepares a settlement or refund (maker) cannot also hold the approver (checker) role — enforced at grant time, not just at click time." },
  { a: "ADMIN_DISPUTE", b: "ADMIN_GRIEVANCE", note: "The admin adjudicating a buyer–seller dispute is not the same admin who handles the buyer's escalated grievance about that dispute." },
  { a: "ADMIN_ANALYST", b: "ADMIN_SUPPORT", note: "Analysts with broad read access to aggregate data do not also hold support's per-record lookup powers, and vice versa." },
];

const ROLES = [
  "ADMIN_OWNER", "ADMIN_SECURITY", "ADMIN_COMPLIANCE", "ADMIN_PHARMACIST", "ADMIN_SELLER_OPS",
  "ADMIN_CATALOGUE", "ADMIN_ORDER_OPS", "ADMIN_DISPUTE", "ADMIN_GRIEVANCE", "ADMIN_FINANCE",
  "ADMIN_FINANCE_APPROVER", "ADMIN_ADS", "ADMIN_CMS", "ADMIN_MARKETING", "ADMIN_SUPPORT",
  "ADMIN_ANALYST", "ADMIN_AUDITOR",
];

export default function AdminSettingsPage() {
  return (
    <Shell active="/admin/settings" breadcrumb={["Admin", "Settings"]} title="System settings">
      <div className="vh-grid" style={{ gap: "var(--sp-4)" }}>
        <Banner severity="danger" title="No superadmin">
          There is no <code>PLATFORM_OWNER</code>-can-do-everything role. <code>ADMIN_OWNER</code> can appoint the
          people who read prescriptions, approve money and adjudicate disputes — it cannot itself do any of those
          three things. This is a deliberate design choice (CLAUDE.md §7), not a gap.
        </Banner>

        <Banner severity="info" title="Every change on this page is maker–checker">
          Tax slabs, shipping rules, gateway routing, notification templates, feature flags and key rotation are all
          proposed by one admin and confirmed by a second, different admin before they apply. Configuration is a
          money-and-eligibility surface too — it gets the same A6 treatment as a settlement.
        </Banner>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><ShieldCheck {...I} aria-hidden /> Roles & permissions — separation of duties</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            These role pairs are mutually exclusive on a single account: granting one revokes eligibility for the
            other, enforced at grant time by the roles service, not by a checkbox in this UI.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="vh-table">
              <thead><tr><th>Role A</th><th>Cannot also hold</th><th>Why</th></tr></thead>
              <tbody>
                {SOD_PAIRS.map((p) => (
                  <tr key={p.a}>
                    <td className="mono small">{p.a}</td>
                    <td className="mono small">{p.b}</td>
                    <td className="small">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="vh-row" style={{ gap: 6, flexWrap: "wrap", marginTop: "var(--sp-3)" }}>
            {ROLES.map((r) => <StatusPill key={r} tone="neutral">{r}</StatusPill>)}
          </div>
        </Card>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><ReceiptText {...I} aria-hidden /> Tax rules</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>GST slabs by HSN code, TCS/TDS thresholds by seller turnover — computed server-side at checkout, editable here with a change log.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Percent {...I} aria-hidden /> Commission rules (A5)</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Every commission schedule change is subject to <code>CHECK (effectiveFrom &gt;= noticeSentAt +
              interval &apos;30 days&apos;)</code> at the database. This settings page can draft a new schedule and
              send the notice — it cannot make the new rate effective before that 30-day clock elapses, for any
              seller, under any admin combination.
            </p>
          </Card>
        </div>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><Truck {...I} aria-hidden /> Shipping</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Carrier zones, SLA tiers by pincode and compliance class (MED_CANNABIS ships signature-required only). The platform is prepaid-only — no COD configuration exists.</p>
          </Card>
          <Card title={<span className="vh-row" style={{ gap: 8 }}><CreditCard {...I} aria-hidden /> Payments</span>}>
            <p className="small muted" style={{ marginTop: 0 }}>Gateway routing, settlement bank accounts (masked here — full account numbers are never returned to this console).</p>
          </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><BellRing {...I} aria-hidden /> Notification templates</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Rx-view buyer notifications, recall notices, and settlement statements are templated here. No template
            in this list is permitted to include health data in its subject line — the linter that checks this runs
            in CI, not just at send time.
          </p>
        </Card>

        <div className="vh-grid cols-2">
          <Card title={<span className="vh-row" style={{ gap: 8 }}><ToggleLeft {...I} aria-hidden /> Feature flags</span>} pad0>
            <table className="vh-table">
              <thead><tr><th>Flag</th><th>Description</th><th>State</th></tr></thead>
              <tbody>
                {FEATURE_FLAGS.map((f) => (
                  <tr key={f.key}>
                    <td className="mono small" style={{ fontWeight: 600 }}>{f.key}</td>
                    <td className="small muted">{f.desc}</td>
                    <td><StatusPill tone={f.status === "ON" ? "ok" : "neutral"}>{f.status}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted" style={{ margin: 0, padding: "12px 18px 16px" }}>
              Feature flags never gate a prohibition (A1–A6) — those are compile-time absences, not runtime toggles.
            </p>
          </Card>

          <Card title={<span className="vh-row" style={{ gap: 8 }}><KeyRound {...I} aria-hidden /> API keys</span>} pad0>
            <table className="vh-table">
              <thead><tr><th>Key</th><th>Scope</th><th>Last used</th></tr></thead>
              <tbody>
                {API_KEYS.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{k.name}</div>
                      <div className="mono small muted">{k.masked}</div>
                    </td>
                    <td className="mono small">{k.scope}</td>
                    <td className="small muted">{k.lastUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted" style={{ margin: 0, padding: "12px 18px 16px" }}>
              Service-account API keys are scoped and rotatable, and are structurally barred from being a maker or
              checker on any money-moving action (A6). Full key material is shown once at creation, never again.
            </p>
          </Card>
        </div>

        <Card title={<span className="vh-row" style={{ gap: 8 }}><ScrollText {...I} aria-hidden /> Audit logs</span>}>
          <p className="small muted" style={{ marginTop: 0 }}>Full AuditLog and SensitiveAccessLog search lives here for ADMIN_AUDITOR and ADMIN_SECURITY. Both tables are append-only.</p>
          <Link className="vh-btn vh-btn-sm vh-btn-ghost" href="/admin/compliance">Open compliance logs →</Link>
        </Card>
      </div>
    </Shell>
  );
}
