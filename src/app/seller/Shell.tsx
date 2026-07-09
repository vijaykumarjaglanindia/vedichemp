/**
 * VEDIC HEMP — SELLER (VEDIC SELLER CENTRAL) SHELL
 *
 * Thin wrapper around the shared ConsoleShell that fixes the seller brand and
 * nav for every page in src/app/seller/**. Each page renders this directly so
 * it can set its own `active` path (see CONTRACT.md).
 */

import type { ReactNode } from "react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";

const SELLER_NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [{ href: "/seller", label: "Home", icon: "🏠" }],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/seller/products", label: "Products", icon: "🧴" },
      { href: "/seller/inventory", label: "Inventory", icon: "🏭" },
    ],
  },
  {
    group: "Sell",
    items: [
      { href: "/seller/orders", label: "Orders", icon: "📦" },
      { href: "/seller/finance", label: "Finance", icon: "💰" },
    ],
  },
  {
    group: "Grow",
    items: [
      { href: "/seller/marketing", label: "Marketing", icon: "🎯" },
      { href: "/seller/ads", label: "Vedic Ads", icon: "📣" },
      { href: "/seller/customers", label: "Customers", icon: "💬" },
    ],
  },
  {
    group: "Insight",
    items: [
      { href: "/seller/reports", label: "Reports", icon: "📊" },
      { href: "/seller/assistant", label: "AI Assistant", icon: "✨" },
    ],
  },
  {
    group: "Store",
    items: [{ href: "/seller/store", label: "Store & KYC", icon: "🏪" }],
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
      brand="🌿 Seller Central"
      nav={SELLER_NAV}
      active={active}
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
    >
      {children}
    </ConsoleShell>
  );
}
