/**
 * VEDIC HEMP — ADMIN (MARKETPLACE OPERATIONS CONSOLE) SHELL
 *
 * Thin wrapper around the shared ConsoleShell that fixes the admin brand and
 * nav for every page in src/app/admin/**. Each page renders this directly
 * (see CONTRACT.md — the shell is rendered per-page, not in layout.tsx, so
 * each route can set its own `active` path).
 *
 * The admin console is the highest-privilege surface on the platform. Its
 * chrome does not itself decide anything — every gate rendered here (maker
 * ≠ checker, reason-code prompts, "explicitly absent" notes) mirrors a server
 * guard described in CLAUDE.md §0–1. If you add a control here that does not
 * have a server-side equivalent, it does not belong.
 */

import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, Store, Package, Receipt, Landmark, Megaphone,
  ShieldCheck, Ban, FileText, Target, BarChart3, Settings, ScrollText, Bell, Star, TicketPercent, Truck, LifeBuoy, Building2,
} from "lucide-react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";
import { unreadCount } from "@/lib/notify";

const I = { size: 16, strokeWidth: 2.2 } as const;

const ADMIN_NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [{ href: "/admin", label: "Home", icon: <LayoutDashboard {...I} /> }],
  },
  {
    group: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: <Users {...I} /> },
      { href: "/admin/sellers", label: "Sellers", icon: <Store {...I} /> },
      { href: "/admin/business", label: "Business (B2B)", icon: <Building2 {...I} /> },
    ],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/catalogue", label: "Catalogue", icon: <Package {...I} /> },
      { href: "/admin/orders", label: "Orders", icon: <Receipt {...I} /> },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/admin/finance", label: "Finance", icon: <Landmark {...I} /> },
      { href: "/admin/finance/payments", label: "Payments", icon: <Landmark {...I} /> },
      { href: "/admin/coupons", label: "Coupons", icon: <TicketPercent {...I} /> },
      { href: "/admin/shipping", label: "Shipping", icon: <Truck {...I} /> },
      { href: "/admin/ads", label: "Ads", icon: <Megaphone {...I} /> },
    ],
  },
  {
    group: "Trust",
    items: [
      { href: "/admin/compliance", label: "Compliance", icon: <ShieldCheck {...I} /> },
      { href: "/admin/reviews", label: "Reviews", icon: <Star {...I} /> },
      { href: "/admin/support", label: "Support", icon: <LifeBuoy {...I} /> },
      { href: "/admin/prohibitions", label: "Prohibitions", icon: <Ban {...I} /> },
    ],
  },
  {
    group: "Platform",
    items: [
      { href: "/admin/cms", label: "CMS", icon: <FileText {...I} /> },
      { href: "/admin/marketing", label: "Marketing", icon: <Target {...I} /> },
      { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 {...I} /> },
      { href: "/admin/ai", label: "AI Intelligence", icon: <BarChart3 {...I} /> },
      { href: "/admin/settings/commerce", label: "Commerce", icon: <Settings {...I} /> },
      { href: "/admin/features", label: "Features & tools", icon: <Settings {...I} /> },
      { href: "/admin/audit", label: "Audit trail", icon: <ScrollText {...I} /> },
      { href: "/admin/notifications", label: "Notifications", icon: <Bell {...I} /> },
      { href: "/admin/settings", label: "Settings", icon: <Settings {...I} /> },
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
  return (
    <ConsoleShell
      brand="🛡️ Admin Console"
      nav={ADMIN_NAV}
      active={active}
      bellHref="/admin/notifications"
      bellCount={await unreadCount("admin", "admin")}
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
    >
      {children}
    </ConsoleShell>
  );
}
