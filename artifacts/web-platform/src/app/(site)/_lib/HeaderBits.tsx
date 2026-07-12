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
import { ShoppingCart, UserRound } from "lucide-react";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export function HeaderBits() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    setCount(parseInt(readCookie("vh-cart-n") ?? "0", 10) || 0);
    setUser(readCookie("vh-user"));
  }, []);

  return (
    <>
      <a href="/cart" className="vh-iconbtn" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} style={{ position: "relative" }}>
        <ShoppingCart size={17} strokeWidth={2.2} aria-hidden />
        {count > 0 && <span className="vhx-cart-badge" aria-hidden>{count > 9 ? "9+" : count}</span>}
      </a>
      {user ? (
        <a href="/account" className="vh-btn vh-btn-ghost vh-btn-sm vhx-hide-sm" style={{ gap: 7 }}>
          <UserRound size={14} aria-hidden />
          {user.split(" ")[0]}
        </a>
      ) : (
        <a href="/signin" className="vh-btn vh-btn-ghost vh-btn-sm vhx-hide-sm">
          Sign in
        </a>
      )}
    </>
  );
}
