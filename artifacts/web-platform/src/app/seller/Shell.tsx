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
  Target, Megaphone, MessagesSquare, BarChart3, Sparkles, Store, Wallet, Bell, Star, Users, LifeBuoy, ShieldCheck,
} from "lucide-react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";
import { unreadCount } from "@/lib/notify";
import { currentStaff } from "@/lib/staff";
import { ROLE_DEFS } from "@/lib/staff";
import { actingStore } from "./_lib/store";

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
      { href: "/seller/reviews", label: "Reviews", icon: <Star {...I} /> },
      { href: "/seller/customers", label: "Customers", icon: <MessagesSquare {...I} /> },
      { href: "/seller/support", label: "Support", icon: <LifeBuoy {...I} /> },
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
      { href: "/seller/verification", label: "Verification", icon: <ShieldCheck {...I} /> },
      { href: "/seller/staff", label: "Staff & roles", icon: <Users {...I} /> },
      { href: "/seller/notifications", label: "Notifications", icon: <Bell {...I} /> },
      { href: "/seller/help", label: "Help & guide", icon: <Sparkles {...I} /> },
    ],
  },
];


export async function Shell({
  active, title, breadcrumb, actions, children,
}: {
  active: string;
  title?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const STORE = await actingStore();
  const me = await currentStaff();
  const roleLabel = ROLE_DEFS.find((r) => r.role === me.role)?.label ?? me.role;
  return (
    <ConsoleShell
      brand="🌿 Seller Central"
      nav={SELLER_NAV}
      active={active}
      bellHref="/seller/notifications"
      bellCount={await unreadCount("seller", STORE)}
      topbarExtra={me.role !== "OWNER" ? (
        <a href="/seller/staff" className="vh-pill vh-pill-warn" style={{ textDecoration: "none" }}>Acting as {me.name} · {roleLabel}</a>
      ) : undefined}
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
    >
      {children}
    </ConsoleShell>
  );
}
