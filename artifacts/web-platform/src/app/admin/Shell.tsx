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
  ShieldCheck, Ban, FileText, Target, BarChart3, Settings, ScrollText,
} from "lucide-react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";

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
      { href: "/admin/ads", label: "Ads", icon: <Megaphone {...I} /> },
    ],
  },
  {
    group: "Trust",
    items: [
      { href: "/admin/compliance", label: "Compliance", icon: <ShieldCheck {...I} /> },
      { href: "/admin/prohibitions", label: "Prohibitions", icon: <Ban {...I} /> },
    ],
  },
  {
    group: "Platform",
    items: [
      { href: "/admin/cms", label: "CMS", icon: <FileText {...I} /> },
      { href: "/admin/marketing", label: "Marketing", icon: <Target {...I} /> },
      { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 {...I} /> },
      { href: "/admin/audit", label: "Audit trail", icon: <ScrollText {...I} /> },
      { href: "/admin/settings", label: "Settings", icon: <Settings {...I} /> },
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
      brand="🛡️ Admin Console"
      nav={ADMIN_NAV}
      active={active}
      bellHref="/admin"
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
    >
      {children}
    </ConsoleShell>
  );
}
