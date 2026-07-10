/**
 * VEDIC HEMP — BUYER (MY ACCOUNT) SHELL
 *
 * Thin wrapper around the shared ConsoleShell that fixes the buyer brand and
 * nav for every page in src/app/account/**. Each page renders this directly
 * (see CONTRACT.md — the shell is rendered per-page, not in layout.tsx, so
 * each route can set its own `active` path).
 */

import type { ReactNode } from "react";
import {
  LayoutDashboard, Package, RefreshCw, Stethoscope, Wallet,
  Heart, UserRound, Bell, LifeBuoy,
} from "lucide-react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";

const I = { size: 16, strokeWidth: 2.2 } as const;

const BUYER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/account", label: "Home", icon: <LayoutDashboard {...I} /> },
      { href: "/account/orders", label: "Orders", icon: <Package {...I} /> },
      { href: "/account/subscriptions", label: "Subscriptions", icon: <RefreshCw {...I} /> },
      { href: "/account/medical", label: "Medical (Rx)", icon: <Stethoscope {...I} /> },
      { href: "/account/wallet", label: "Wallet", icon: <Wallet {...I} /> },
      { href: "/account/wishlist", label: "Wishlist", icon: <Heart {...I} /> },
      { href: "/account/profile", label: "Profile", icon: <UserRound {...I} /> },
      { href: "/account/notifications", label: "Notifications", icon: <Bell {...I} /> },
      { href: "/account/support", label: "Support", icon: <LifeBuoy {...I} /> },
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
