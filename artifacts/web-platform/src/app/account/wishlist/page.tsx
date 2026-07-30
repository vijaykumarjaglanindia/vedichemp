/**
 * VEDIC HEMP — WISHLIST
 *
 * Reads the real wishlist (httpOnly cookie written only by server actions) and
 * resolves every id against the LIVE catalogue — the same store the add-to-
 * wishlist action validates against, so a saved item reflects the seller's and
 * admin's current price, sale and listing state. A listing that has left LIVE
 * simply drops out. Every id is re-filtered against the viewer's permitted
 * classes on render — MED_CANNABIS cannot appear here for a viewer without a
 * verified Rx (A1), even if an id were smuggled into the cookie.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Shell } from "../Shell";
import { Card, MoneyText, Rating, EmptyState } from "@/components/ui";
import { permittedClasses } from "@/lib/compliance";
import { readWishlist } from "@/lib/engage";
import { readLiveProducts, saleActive, effectivePricePaise } from "@/lib/catalog";
import { moveWishlistItemToCart, removeFromWishlist } from "../../(site)/actions";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const ids = await readWishlist();
  const permitted = permittedClasses({ hasRx: false });
  const live = await readLiveProducts();
  const items = ids
    .map((id) => live.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && permitted.includes(p.cls));

  return (
    <Shell active="/account/wishlist" breadcrumb={["My Account", "Wishlist"]} title="Wishlist">
      {items.length === 0 ? (
        <EmptyState
          icon="❤️"
          headline="Your wishlist is empty"
          sub="Tap the heart on any product to save it here for later."
          cta={{ label: "Browse products", href: "/catalogue" }}
        />
      ) : (
        <>
          <p className="small muted" style={{ marginTop: 0, marginBottom: "var(--sp-3)" }}>
            <span className="tabular">{items.length}</span> saved item{items.length === 1 ? "" : "s"} —
            prices are updated live and confirmed at checkout.
          </p>
          <div className="vh-grid cols-4">
            {items.map((p) => {
              const onSale = saleActive(p);
              const pricePaise = effectivePricePaise(p);
              const strikePaise = onSale ? p.pricePaise : p.mrpPaise > p.pricePaise ? p.mrpPaise : 0;
              return (
                <Card key={p.id}>
                  <Link href={`/products/${p.slug}`} aria-hidden tabIndex={-1} style={{ display: "block", fontSize: "2rem", marginBottom: 8 }}>
                    {p.emoji}
                  </Link>
                  <Link href={`/products/${p.slug}`} style={{ fontWeight: 600, marginBottom: 4, display: "block", color: "var(--vh-ink)" }}>
                    {p.title}
                  </Link>
                  <div className="small muted" style={{ marginBottom: 8 }}>{p.seller}</div>
                  {p.rating > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Rating value={p.rating} />
                    </div>
                  )}
                  <div className="vh-row" style={{ gap: 8, alignItems: "baseline", marginBottom: 10, flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--vh-ink)" }}><MoneyText paise={pricePaise} /></strong>
                    {strikePaise > 0 && (
                      <span className="small muted" style={{ textDecoration: "line-through" }}>
                        <MoneyText paise={strikePaise} />
                      </span>
                    )}
                  </div>
                  <div className="vh-row" style={{ gap: 8 }}>
                    <form action={moveWishlistItemToCart} style={{ flex: 1, display: "flex" }}>
                      <input type="hidden" name="productId" value={p.id} />
                      <button type="submit" className="vh-btn vh-btn-sm vh-btn-primary" style={{ flex: 1 }}>
                        <ShoppingCart size={13} aria-hidden /> Move to cart
                      </button>
                    </form>
                    <form action={removeFromWishlist}>
                      <input type="hidden" name="productId" value={p.id} />
                      <button
                        type="submit"
                        className="vh-btn vh-btn-sm vh-btn-ghost"
                        aria-label={`Remove ${p.title} from wishlist`}
                        title="Remove"
                      >
                        <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                      </button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="small muted vh-row" style={{ gap: 6, marginTop: "var(--sp-3)" }}>
            <Heart size={13} aria-hidden style={{ color: "var(--vh-accent)" }} />
            Saved items stay in your wishlist so you can come back to them later.
          </p>
        </>
      )}
    </Shell>
  );
}
