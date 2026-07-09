/**
 * VEDIC HEMP — BUYER (MY ACCOUNT) SHELL
 *
 * Thin wrapper around the shared ConsoleShell that fixes the buyer brand and
 * nav for every page in src/app/account/**. Each page renders this directly
 * (see CONTRACT.md — the shell is rendered per-page, not in layout.tsx, so
 * each route can set its own `active` path).
 */

import type { ReactNode } from "react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";

const BUYER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/account", label: "Home", icon: "🏠" },
      { href: "/account/orders", label: "Orders", icon: "📦" },
      { href: "/account/subscriptions", label: "Subscriptions", icon: "🔁" },
      { href: "/account/medical", label: "Medical (Rx)", icon: "⚕️" },
      { href: "/account/wallet", label: "Wallet", icon: "👛" },
      { href: "/account/wishlist", label: "Wishlist", icon: "❤️" },
      { href: "/account/profile", label: "Profile", icon: "🙍" },
      { href: "/account/notifications", label: "Notifications", icon: "🔔" },
      { href: "/account/support", label: "Support", icon: "💬" },
    ],
  },
];

export function Shell({
  active, title, breadcrumb, actions, children,
}: {
  active: string;
  title?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ConsoleShell
      brand="🌿 My Account"
      nav={BUYER_NAV}
      active={active}
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
    >
      {children}
    </ConsoleShell>
  );
}
