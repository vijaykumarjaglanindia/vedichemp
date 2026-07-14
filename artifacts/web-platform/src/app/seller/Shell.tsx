/**
 * VEDIC HEMP — SELLER (VEDIC SELLER CENTRAL) SHELL
 *
 * Thin wrapper around the shared ConsoleShell that fixes the seller brand and
 * nav for every page in src/app/seller/**. Each page renders this directly so
 * it can set its own `active` path (see CONTRACT.md).
 */

import type { ReactNode } from "react";
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Landmark,
  Target, Megaphone, MessagesSquare, BarChart3, Sparkles, Store, Wallet, Bell,
} from "lucide-react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";
import { unreadCount } from "@/lib/notify";

const I = { size: 16, strokeWidth: 2.2 } as const;

const SELLER_NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [{ href: "/seller", label: "Home", icon: <LayoutDashboard {...I} /> }],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/seller/products", label: "Products", icon: <Package {...I} /> },
      { href: "/seller/inventory", label: "Inventory", icon: <Warehouse {...I} /> },
    ],
  },
  {
    group: "Sell",
    items: [
      { href: "/seller/orders", label: "Orders", icon: <ShoppingCart {...I} /> },
      { href: "/seller/earnings", label: "Earnings & Withdraw", icon: <Wallet {...I} /> },
      { href: "/seller/finance", label: "Finance", icon: <Landmark {...I} /> },
    ],
  },
  {
    group: "Grow",
    items: [
      { href: "/seller/marketing", label: "Marketing", icon: <Target {...I} /> },
      { href: "/seller/ads", label: "Vedic Ads", icon: <Megaphone {...I} /> },
      { href: "/seller/customers", label: "Customers", icon: <MessagesSquare {...I} /> },
    ],
  },
  {
    group: "Insight",
    items: [
      { href: "/seller/reports", label: "Reports", icon: <BarChart3 {...I} /> },
      { href: "/seller/assistant", label: "AI Assistant", icon: <Sparkles {...I} /> },
    ],
  },
  {
    group: "Store",
    items: [
      { href: "/seller/store", label: "Store & KYC", icon: <Store {...I} /> },
      { href: "/seller/notifications", label: "Notifications", icon: <Bell {...I} /> },
      { href: "/seller/help", label: "Help & guide", icon: <Sparkles {...I} /> },
    ],
  },
];

const STORE = "Vedic Botanicals";

export async function Shell({
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
      bellHref="/seller/notifications"
      bellCount={await unreadCount("seller", STORE)}
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
    >
      {children}
    </ConsoleShell>
  );
}
