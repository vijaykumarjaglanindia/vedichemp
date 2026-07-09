/**
 * VEDIC HEMP — MARKETING (§2.8 adjacent)
 *
 * Coupons, bundles and flash sales. Any promotional copy touching a
 * regulated class (CBD Wellness) passes an automated compliance copy-check
 * before it can go live — no disease claims, no medical language.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, DataTable, StatusPill, toneForStatus, Banner, type Column } from "@/components/ui";
import { COUPONS, BUNDLES, FLASH_SALES } from "../_lib/data";

export const metadata: Metadata = { title: "Marketing" };

interface Coupon { code: string; type: string; value: string; scope: string; status: string; redemptions: number }

export default function MarketingPage() {
  const couponColumns: Column<Coupon>[] = [
    { key: "code", header: "Code", render: (c) => <span className="mono" style={{ fontWeight: 600 }}>{c.code}</span> },
    { key: "type", header: "Type", render: (c) => c.type },
    { key: "value", header: "Value", render: (c) => c.value },
    { key: "scope", header: "Scope", render: (c) => c.scope },
    { key: "status", header: "Status", render: (c) => <StatusPill tone={toneForStatus(c.status)}>{c.status}</StatusPill> },
    { key: "redemptions", header: "Redemptions", align: "right", render: (c) => c.redemptions },
  ];

  return (
    <Shell
      active="/seller/marketing"
      breadcrumb={["Seller Central", "Marketing"]}
      title="Marketing"
    >
      <Banner severity="info" title="Compliance copy-check" icon="📝">
        Promotional copy for CBD Wellness listings is scanned before publishing. Disease claims, medical language and
        "cure"/"treat" framing are rejected automatically — coupons and creatives fail closed on a copy-check error.
      </Banner>

      <div style={{ height: 16 }} />

      <Card title="Coupons" action={<button className="vh-btn vh-btn-sm vh-btn-primary" type="button">+ Create coupon</button>} pad0>
        <DataTable columns={couponColumns} rows={COUPONS} empty={<div className="vh-empty">No coupons yet.</div>} />
      </Card>

      <div style={{ height: 16 }} />

      <div className="vh-grid cols-2">
        <Card title="Bundles" action={<button className="vh-btn vh-btn-sm vh-btn-ghost" type="button">+ Create bundle</button>}>
          {BUNDLES.length === 0 ? (
            <div className="vh-empty">No bundles yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {BUNDLES.map((b, i) => (
                <li key={i} className="vh-row-between">
                  <span>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div className="small muted">{b.products.join(" + ")}</div>
                  </span>
                  <StatusPill tone={toneForStatus(b.status)}>{b.status}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Flash sales" action={<button className="vh-btn vh-btn-sm vh-btn-ghost" type="button">+ Schedule flash sale</button>}>
          {FLASH_SALES.length === 0 ? (
            <div className="vh-empty">No flash sales scheduled.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {FLASH_SALES.map((f, i) => (
                <li key={i} className="vh-row-between">
                  <span>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div className="small muted">{f.window} · {f.discount}</div>
                  </span>
                  <StatusPill tone={toneForStatus(f.status)}>{f.status}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
