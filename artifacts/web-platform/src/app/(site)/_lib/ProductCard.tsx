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
import { type CatalogProduct, saleActive } from "@/lib/catalog";
import { addToCart } from "../cart/actions";
import { toggleWishlist } from "../actions";
import { discountPct } from "./data";

export function reviewCountFor(p: SampleProduct): number {
  return 40 + Math.round(p.rating * 37);
}

/** The card renders sample products and live catalogue products alike; the
 *  merchandising fields (image, sale price) are optional and simply absent on
 *  the older sample shape. */
type CardProduct = SampleProduct & Partial<Pick<CatalogProduct, "images" | "salePricePaise" | "saleFrom" | "saleTo" | "brand">>;

export function ProductCard({
  p,
  actions = false,
  mediaSize = "clamp(3.4rem, 7vw, 4.6rem)",
}: {
  p: CardProduct;
  /** Show Add-to-cart primary + quick-view ghost row (listing view). */
  actions?: boolean;
  mediaSize?: string;
}) {
  const off = discountPct(p);
  const image = p.images?.[0];
  const onSale = saleActive(p as CatalogProduct);
  const price = onSale ? p.salePricePaise! : p.pricePaise;
  const strike = onSale ? p.pricePaise : (p.mrpPaise > p.pricePaise ? p.mrpPaise : 0);
  return (
    <article className="vh-product" style={{ position: "relative" }}>
      {onSale ? (
        <span className="vh-pill vh-pill-warn flag" style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}>Sale</span>
      ) : off > 0 ? (
        <span className="vh-pill vh-pill-ok flag" style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}>
          {off}% off
        </span>
      ) : null}
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
        {image ? (
          <div className="vh-product-media" style={{ padding: 0, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div className="vh-product-media" style={{ fontSize: mediaSize }}>{p.emoji}</div>
        )}
      </Link>

      <div className="vh-product-body">
        <Link href={`/products/${p.slug}`} className="vh-product-title" style={{ color: "var(--vh-ink)" }}>
          {p.title}
        </Link>
        <ComplianceBadge cls={p.cls} />
        <Rating value={p.rating} count={reviewCountFor(p)} />
        <div className="vh-row" style={{ gap: 8, alignItems: "baseline" }}>
          <strong style={{ color: "var(--vh-ink)", fontSize: "1.02rem" }}>
            <MoneyText paise={price} />
          </strong>
          {strike > 0 && (
            <span className="small muted" style={{ textDecoration: "line-through" }}>
              <MoneyText paise={strike} />
            </span>
          )}
        </div>
        <span className="small muted">{p.brand || p.seller}</span>
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
