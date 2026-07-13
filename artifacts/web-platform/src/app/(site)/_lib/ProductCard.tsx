/**
 * VEDIC HEMP — PUBLIC PRODUCT CARD (site-local)
 *
 * One card used across home, catalogue, storefront and PDP scrollers so price,
 * rating and compliance badges read identically everywhere. Server component —
 * the heart and add-to-cart buttons post to server actions (the server decides,
 * the client renders); the wishlist lives in an httpOnly cookie and is viewed
 * from My Account → Wishlist.
 *
 * Only ever fed products from the permitted-class universe (A1).
 */

import Link from "next/link";
import { Heart } from "lucide-react";
import { ComplianceBadge, MoneyText, Rating } from "@/components/ui";
import type { SampleProduct } from "@/lib/sample";
import { addToCart } from "../cart/actions";
import { toggleWishlist } from "../actions";
import { discountPct } from "./data";

export function reviewCountFor(p: SampleProduct): number {
  return 40 + Math.round(p.rating * 37);
}

export function ProductCard({
  p,
  actions = false,
  mediaSize = "2.6rem",
}: {
  p: SampleProduct;
  /** Show Add-to-cart primary + quick-view ghost row (listing view). */
  actions?: boolean;
  mediaSize?: string;
}) {
  const off = discountPct(p);
  return (
    <article className="vh-product" style={{ position: "relative" }}>
      {off > 0 && (
        <span className="vh-pill vh-pill-ok flag" style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}>
          {off}% off
        </span>
      )}
      <form action={toggleWishlist} style={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
        <input type="hidden" name="productId" value={p.id} />
        <button
          type="submit"
          className="vh-iconbtn"
          aria-label={`Toggle ${p.title} in wishlist`}
          title="Save to wishlist"
          style={{ background: "var(--vh-surface)", border: "1px solid var(--vh-line)" }}
        >
          <Heart size={15} strokeWidth={2.2} aria-hidden />
        </button>
      </form>

      <Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden style={{ color: "inherit" }}>
        <div className="vh-product-media" style={{ fontSize: mediaSize }}>{p.emoji}</div>
      </Link>

      <div className="vh-product-body">
        <Link href={`/products/${p.slug}`} className="vh-product-title" style={{ color: "var(--vh-ink)" }}>
          {p.title}
        </Link>
        <ComplianceBadge cls={p.cls} />
        <Rating value={p.rating} count={reviewCountFor(p)} />
        <div className="vh-row" style={{ gap: 8, alignItems: "baseline" }}>
          <strong style={{ color: "var(--vh-ink)", fontSize: "1.02rem" }}>
            <MoneyText paise={p.pricePaise} />
          </strong>
          {p.mrpPaise > p.pricePaise && (
            <span className="small muted" style={{ textDecoration: "line-through" }}>
              <MoneyText paise={p.mrpPaise} />
            </span>
          )}
        </div>
        <span className="small muted">{p.seller}</span>
        {actions && (
          <div className="vh-row" style={{ gap: 8, marginTop: 2 }}>
            <form action={addToCart} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="productId" value={p.id} />
              <button type="submit" className="vh-btn vh-btn-primary vh-btn-sm" style={{ flex: 1 }}>
                Add to cart
              </button>
            </form>
            <Link href={`/products/${p.slug}`} className="vh-btn vh-btn-ghost vh-btn-sm">
              Quick view
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
