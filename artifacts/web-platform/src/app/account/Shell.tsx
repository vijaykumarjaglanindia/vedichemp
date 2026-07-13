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
 * 15 days, red when expired, info while an upload is under review.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  LayoutDashboard, Package, MapPin, RefreshCw, Stethoscope, Wallet,
  Heart, UserRound, Bell, LifeBuoy,
} from "lucide-react";
import { ConsoleShell, type NavGroup } from "@/components/shell/ConsoleShell";
import { PRESCRIPTIONS, daysUntil } from "./_lib/data";

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
      { href: "/account/wishlist", label: "Wishlist", icon: <Heart {...I} /> },
      { href: "/account/profile", label: "Profile", icon: <UserRound {...I} /> },
      { href: "/account/notifications", label: "Notifications", icon: <Bell {...I} /> },
      { href: "/account/support", label: "Support", icon: <LifeBuoy {...I} /> },
    ],
  },
];

async function RxChip(): Promise<ReactNode> {
  const jar = await cookies();
  let uploads: { status?: string }[] = [];
  try { uploads = JSON.parse(jar.get("vh-rx")?.value ?? "[]") as { status?: string }[]; } catch { uploads = []; }

  if (uploads.length > 0) {
    return (
      <Link href="/account/medical" className="vh-pill vh-pill-info" style={{ textDecoration: "none" }}>
        Rx under review
      </Link>
    );
  }
  const rx = PRESCRIPTIONS[0];
  if (!rx) return null;
  const days = daysUntil(rx.validTill);
  const expired = rx.status === "EXPIRED" || days < 0;
  return (
    <Link
      href="/account/medical"
      className={`vh-pill ${expired ? "vh-pill-danger" : days <= 15 ? "vh-pill-warn" : "vh-pill-ok"}`}
      style={{ textDecoration: "none" }}
    >
      {expired ? "Rx expired · renew" : days <= 15 ? `Rx expires in ${days}d` : "Rx active"}
    </Link>
  );
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
  return (
    <ConsoleShell
      brand="🌿 My Account"
      nav={BUYER_NAV}
      active={active}
      breadcrumb={breadcrumb}
      title={title}
      actions={actions}
      topbarExtra={await RxChip()}
      bellHref="/account/notifications"
    >
      {children}
    </ConsoleShell>
  );
}
