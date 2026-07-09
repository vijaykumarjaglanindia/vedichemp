/**
 * VEDIC HEMP — WISHLIST
 *
 * Built from `classProducts(viewer.permittedClasses)` like the dashboard's
 * recommendations — MED_CANNABIS cannot appear here for a viewer without a
 * verified Rx (A1), because it is structurally absent from the permitted
 * class list, not filtered out in this component.
 */

import type { Metadata } from "next";
import { Shell } from "../Shell";
import { Card, MoneyText, StatusPill, EmptyState } from "@/components/ui";
import { currentBuyer } from "@/lib/session";
import { classProducts } from "@/lib/sample";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  const viewer = currentBuyer();
  // Illustrative: wishlist a subset, and mark a couple with a price drop.
  const items = classProducts(viewer.permittedClasses).slice(0, 5).map((p, i) => ({
    ...p,
    wasPricePaise: i % 2 === 0 ? p.pricePaise + 15000 : null,
  }));

  return (
    <Shell active="/account/wishlist" breadcrumb={["My Account", "Wishlist"]} title="Wishlist">
      {items.length === 0 ? (
        <EmptyState icon="❤️" headline="Your wishlist is empty" cta={{ label: "Browse products", href: "/" }} />
      ) : (
        <div className="vh-grid cols-4">
          {items.map((p) => (
            <Card key={p.id}>
              <div aria-hidden style={{ fontSize: "2rem", marginBottom: 8 }}>{p.emoji}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
              <div className="small muted" style={{ marginBottom: 8 }}>{p.seller} · ★ {p.rating}</div>
              <div className="vh-row" style={{ gap: 8, alignItems: "baseline", marginBottom: 10 }}>
                <MoneyText paise={p.pricePaise} />
                {p.wasPricePaise && (
                  <>
                    <span className="small muted" style={{ textDecoration: "line-through" }}>
                      <MoneyText paise={p.wasPricePaise} />
                    </span>
                    <StatusPill tone="ok">Price drop</StatusPill>
                  </>
                )}
              </div>
              <div className="vh-row" style={{ gap: 8 }}>
                <span className="vh-btn vh-btn-sm vh-btn-primary" aria-disabled>Move to cart</span>
                <span className="vh-btn vh-btn-sm vh-btn-ghost" aria-disabled>Remove</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
