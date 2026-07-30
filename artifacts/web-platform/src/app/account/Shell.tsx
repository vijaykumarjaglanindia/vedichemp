/**
 * VEDIC HEMP — BUYER (MY ACCOUNT) SHELL
 *
 * Thin wrapper around the shared ConsoleShell that fixes the buyer brand and
 * nav for every page in src/app/account/**. Each page renders this directly
 * (see CONTRACT.md — the shell is rendered per-page, not in layout.tsx, so
 * each route can set its own `active` path).
 *
 * Per spec §0.4 shell chrome, an Rx status chip renders on every dashboard
 * page whenever the buyer has any prescription: amber when it expires within
 * 15 days, red when expired, info while an upload is under review. It is
 * resolved from the buyer's OWN rows in the live prescription store — a buyer
 * with no prescription gets no chip at all.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, Package, MapPin, RefreshCw, Stethoscope, Wallet,
  Heart, UserRound, Bell, LifeBuoy, Building2,
} from "lucide-react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";
import { daysUntil } from "./_lib/data";
import { getSession } from "@/lib/auth-lite";
import { myPrescriptions } from "@/lib/prescriptions";
import { unreadCount } from "@/lib/notify";

const I = { size: 16, strokeWidth: 2.2 } as const;

const BUYER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/account", label: "Home", icon: <LayoutDashboard {...I} /> },
      { href: "/account/orders", label: "Orders", icon: <Package {...I} /> },
      { href: "/account/addresses", label: "Addresses", icon: <MapPin {...I} /> },
      { href: "/account/subscriptions", label: "Subscriptions", icon: <RefreshCw {...I} /> },
      { href: "/account/medical", label: "Medical (Rx)", icon: <Stethoscope {...I} /> },
      { href: "/account/wallet", label: "Wallet", icon: <Wallet {...I} /> },
      { href: "/account/business", label: "Business account", icon: <Building2 {...I} /> },
      { href: "/account/wishlist", label: "Wishlist", icon: <Heart {...I} /> },
      { href: "/account/profile", label: "Profile", icon: <UserRound {...I} /> },
      { href: "/account/notifications", label: "Notifications", icon: <Bell {...I} /> },
      { href: "/account/support", label: "Support", icon: <LifeBuoy {...I} /> },
    ],
  },
];

function chip(className: string, label: string): ReactNode {
  return (
    <Link href="/account/medical" className={`vh-pill ${className}`} style={{ textDecoration: "none" }}>
      {label}
    </Link>
  );
}

async function RxChip(email: string): Promise<ReactNode> {
  const rows = await myPrescriptions(email);
  if (rows.some((r) => r.status === "PENDING_REVIEW")) return chip("vh-pill-info", "Rx under review");

  const approved = rows.find((r) => r.status === "APPROVED");
  if (approved) {
    const days = daysUntil(approved.validTill);
    return days <= 15 ? chip("vh-pill-warn", `Rx expires in ${days}d`) : chip("vh-pill-ok", "Rx active");
  }
  if (rows.some((r) => r.status === "EXPIRED")) return chip("vh-pill-danger", "Rx expired · renew");
  // No prescription on file (or only a rejected one) — no status to report.
  return null;
}

export async function Shell({
  active, title, breadcrumb, actions, children,
}: {
  active: string;
  title?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const session = await getSession();
  // The edge middleware only checks that a session cookie EXISTS; this is where
  // it is verified. A cookie that fails verification is signed out, never
  // resolved to a substitute buyer.
  if (!session?.email) redirect(`/signin?next=${encodeURIComponent(active)}`);
  const email = session.email;
  return (
    <ConsoleShell
      brand="🌿 My Account"
      nav={BUYER_NAV}
      active={active}
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
      topbarExtra={await RxChip(email)}
      bellHref="/account/notifications"
      bellCount={await unreadCount("buyer", email)}
      userLabel={session.name || "My account"}
      userSub={email}
    >
      {children}
    </ConsoleShell>
  );
}
