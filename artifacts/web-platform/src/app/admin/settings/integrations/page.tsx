/**
 * VEDIC HEMP — ADMIN · INTEGRATIONS.
 *
 * The one screen that shows every external service the platform can plug into
 * and whether it is connected — read purely from environment variables. It never
 * displays a secret value, only which variable NAMES are set. To connect a
 * provider you add its variables in your host's secrets (Replit → Secrets) and
 * redeploy; the feature activates with no code change. Until then the feature
 * runs in a safe sandbox/stub.
 */

import type { Metadata } from "next";
import { PlugZap, CreditCard, MessageSquare, Mail, KeyRound, Database, Sparkles, CheckCircle2, CircleDashed } from "lucide-react";
import { Shell } from "../../Shell";
import { Card, StatusPill } from "@/components/ui";
import { allStatuses, type IntegrationCategory, type IntegrationStatus } from "@/lib/integrations";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

const CATEGORY: Record<IntegrationCategory, { label: string; icon: React.ReactNode; blurb: string }> = {
  payments: { label: "Payments", icon: <CreditCard size={16} aria-hidden />, blurb: "Charge buyers at checkout. Connect one PSP; the first configured wins." },
  sms: { label: "SMS", icon: <MessageSquare size={16} aria-hidden />, blurb: "Phone OTP and order SMS." },
  email: { label: "Email", icon: <Mail size={16} aria-hidden />, blurb: "Transactional email over SMTP." },
  oauth: { label: "Social sign-in", icon: <KeyRound size={16} aria-hidden />, blurb: "Let buyers sign in with Google or Facebook." },
  storage: { label: "Sensitive storage", icon: <Database size={16} aria-hidden />, blurb: "Object-locked, encrypted bucket for prescriptions and lab reports." },
  ai: { label: "AI", icon: <Sparkles size={16} aria-hidden />, blurb: "Live model calls for assistant surfaces (always claims-checked)." },
};

const ORDER: IntegrationCategory[] = ["payments", "sms", "email", "oauth", "storage", "ai"];

export default async function IntegrationsPage() {
  const statuses = allStatuses();
  const byCat = (c: IntegrationCategory) => statuses.filter((s) => s.category === c);
  const liveCount = statuses.filter((s) => s.configured).length;

  return (
    <Shell active="/admin/settings/integrations" breadcrumb={["Admin", "Settings"]} title="Integrations">
      <div style={{ display: "grid", gap: "var(--sp-4)" }}>
        <div className="vh-banner vh-banner-info" role="note">
          <div>
            <strong>{liveCount} of {statuses.length} providers connected.</strong> Connect a provider by setting its
            environment variables in your host&apos;s secrets, then redeploy — no code change. Nothing here shows a secret
            value; a provider is &quot;connected&quot; once all its required variables are present. Until then the feature runs
            in sandbox.
          </div>
        </div>

        {ORDER.map((cat) => {
          const items = byCat(cat);
          if (items.length === 0) return null;
          const meta = CATEGORY[cat];
          const anyLive = items.some((i) => i.configured);
          return (
            <Card
              key={cat}
              title={<span className="vh-row" style={{ gap: 8 }}>{meta.icon} {meta.label}</span>}
              action={<StatusPill tone={anyLive ? "ok" : "neutral"}>{anyLive ? "connected" : "sandbox"}</StatusPill>}
            >
              <p className="small muted" style={{ marginTop: 0 }}>{meta.blurb}</p>
              <div style={{ display: "grid", gap: 12 }}>
                {items.map((s) => <Provider key={s.key} s={s} />)}
              </div>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}

function Provider({ s }: { s: IntegrationStatus }) {
  return (
    <div className="vh-card" style={{ padding: 14 }}>
      <div className="vh-row" style={{ gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <div className="vh-row" style={{ gap: 8 }}>
            {s.configured
              ? <CheckCircle2 size={16} aria-hidden style={{ color: "var(--vh-ok)" }} />
              : <CircleDashed size={16} aria-hidden style={{ color: "var(--vh-muted)" }} />}
            <strong>{s.name}</strong>
            <StatusPill tone={s.configured ? "ok" : "neutral"}>{s.configured ? "connected" : "not connected"}</StatusPill>
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>{s.blurb}</div>
        </div>
        {s.docsHref && <a className="vh-btn vh-btn-sm vh-btn-ghost" href={s.docsHref} target="_blank" rel="noreferrer">Provider docs ↗</a>}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
        {s.env.map((v) => {
          const present = s.present.includes(v.name);
          return (
            <div key={v.name} className="vh-row small" style={{ gap: 8, flexWrap: "wrap" }}>
              <code className="mono" style={{ background: "var(--vh-surface-2)", padding: "1px 6px", borderRadius: 4 }}>{v.name}</code>
              <StatusPill tone={present ? "ok" : (v.required ?? true) ? "warn" : "neutral"}>
                {present ? "set" : (v.required ?? true) ? "required" : "optional"}
              </StatusPill>
              {v.secret && <span className="muted" style={{ fontSize: "0.75rem" }}>secret</span>}
              {v.note && <span className="muted">— {v.note}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
