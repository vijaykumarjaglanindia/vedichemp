"use client";

/**
 * VEDIC HEMP — HEADER LIVE BITS
 *
 * A tiny client island for the two pieces of header state that change per
 * visitor: the cart badge and the signed-in chip. Both read DISPLAY-ONLY,
 * non-httpOnly cookies (`vh-cart-n`, `vh-user`) written by the server actions,
 * so the surrounding layout stays fully static/cacheable. Nothing here is
 * trusted server-side — the real cart and session are httpOnly.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingCart, UserRound, LogOut } from "lucide-react";
import { signOut } from "../signin/actions";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export function HeaderBits() {
  const [count, setCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    setCount(parseInt(readCookie("vh-cart-n") ?? "0", 10) || 0);
    setWishCount(parseInt(readCookie("vh-wish-n") ?? "0", 10) || 0);
    setUser(readCookie("vh-user"));
  }, []);

  return (
    <>
      <Link href="/account/wishlist" className="vh-iconbtn" aria-label={`Wishlist, ${wishCount} item${wishCount === 1 ? "" : "s"}`} style={{ position: "relative" }}>
        <Heart size={17} strokeWidth={2.2} aria-hidden />
        {wishCount > 0 && <span className="vhx-cart-badge" aria-hidden>{wishCount > 9 ? "9+" : wishCount}</span>}
      </Link>
      <Link href="/cart" className="vh-iconbtn" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} style={{ position: "relative" }}>
        <ShoppingCart size={17} strokeWidth={2.2} aria-hidden />
        {count > 0 && <span className="vhx-cart-badge" aria-hidden>{count > 9 ? "9+" : count}</span>}
      </Link>
      {user ? (
        <details className="vhx-signin vhx-hide-sm">
          <summary
            className="vh-btn vh-btn-ghost vh-btn-sm"
            style={{ listStyle: "none", cursor: "pointer", width: "auto", height: "auto", border: "1px solid var(--vh-line)", gap: 7 }}
          >
            <UserRound size={14} aria-hidden />
            {user.split(" ")[0]} <span aria-hidden style={{ fontSize: ".7em" }}>▾</span>
          </summary>
          <nav className="vhx-signin-panel" aria-label="Your account">
            <Link href="/account">My account</Link>
            <Link href="/account/orders">Orders</Link>
            <Link href="/account/wallet">Wallet</Link>
            <form action={signOut} style={{ display: "contents" }}>
              <button type="submit" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", font: "inherit", color: "var(--vh-accent)", padding: "8px 12px", textAlign: "left" }}>
                <LogOut size={14} aria-hidden /> Sign out
              </button>
            </form>
          </nav>
        </details>
      ) : (
        <details className="vhx-signin vhx-hide-sm">
          <summary
            className="vh-btn vh-btn-ghost vh-btn-sm"
            style={{ listStyle: "none", cursor: "pointer", width: "auto", height: "auto", border: "1px solid var(--vh-line)" }}
          >
            Sign in <span aria-hidden style={{ fontSize: ".7em" }}>▾</span>
          </summary>
          <nav className="vhx-signin-panel" aria-label="Sign in as">
            <Link href="/signin">As a buyer</Link>
            <Link href="/seller-login">As a seller</Link>
            <Link href="/sell" style={{ color: "var(--vh-accent)" }}>New seller? Start here</Link>
          </nav>
        </details>
      )}
    </>
  );
}
