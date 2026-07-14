/**
 * VEDIC HEMP — CONSOLE SHELL
 *
 * The chrome shared by the buyer, seller and admin dashboards: a left nav rail,
 * a sticky glass topbar (search, notifications, avatar), breadcrumbs, and —
 * for support impersonation — the fixed red "actions logged" banner. Each
 * console passes its own nav model and brand.
 *
 * The mobile nav drawer is CSS-only (hidden checkbox + hamburger + scrim), so
 * the shell stays a Server Component with no client JS.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu, Search, Bell } from "lucide-react";

export interface NavItem { href: string; label: string; icon: ReactNode }
export interface NavGroup { group?: string; items: NavItem[] }

function initials(brand: string): string {
  const words = brand.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return letters || "VH";
}

export function ConsoleShell({
  brand, nav, active, topbar, topbarExtra, bellHref, bellCount, breadcrumb, title, actions, impersonation, children,
}: {
  brand: string;
  nav: NavGroup[];
  active: string;
  /** Replaces the whole default topbar (rarely wanted). */
  topbar?: ReactNode;
  /** Extra chrome (e.g. the buyer Rx chip) rendered inside the default topbar. */
  topbarExtra?: ReactNode;
  /** Where the notification bell points; omit to hide the bell. */
  bellHref?: string;
  /** Unread notification count — shows a number badge and only lights the dot when > 0. */
  bellCount?: number;
  breadcrumb?: string[];
  title?: string;
  actions?: ReactNode;
  impersonation?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="vh-shell">
      {/* CSS-only mobile drawer toggle — must precede .vh-rail and .vh-scrim */}
      <input type="checkbox" id="vh-nav-toggle" className="vh-nav-toggle" aria-hidden tabIndex={-1} />

      <nav className="vh-rail" aria-label={`${brand} navigation`}>
        <div className="vh-rail-brand">{brand}</div>
        {nav.map((g, gi) => (
          <div key={gi}>
            {g.group && <div className="vh-rail-group">{g.group}</div>}
            {g.items.map((it) => (
              <Link key={it.href} href={it.href} className={it.href === active ? "active" : ""} aria-current={it.href === active ? "page" : undefined}>
                <span aria-hidden>{it.icon}</span>
                {it.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="vh-rail-user">
          <span className="vh-avatar" aria-hidden>{initials(brand)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--vh-ink)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Signed in</div>
            <div className="small" style={{ opacity: 0.7 }}>Session · secured</div>
          </div>
        </div>
      </nav>

      <label className="vh-scrim" htmlFor="vh-nav-toggle" aria-hidden />

      <div className="vh-main">
        {impersonation && (
          <div className="vh-impersonation-banner" role="alert">
            <span aria-hidden>🛑</span>
            Support session — every action is logged and attributed to {impersonation}. Write actions are disabled.
          </div>
        )}
        <div className="vh-topbar">
          <label className="vh-hamburger" htmlFor="vh-nav-toggle" aria-label="Open navigation">
            <Menu size={19} aria-hidden />
          </label>
          {topbar ?? (
            <>
              <div className="vh-search">
                <Search size={15} aria-hidden />
                <input placeholder="Search…" aria-label="Search" />
                <span className="vh-kbd" aria-hidden>/</span>
              </div>
              <div className="vh-spacer" />
              {topbarExtra}
              {bellHref && (
                <Link className="vh-iconbtn" href={bellHref} aria-label={bellCount ? `Notifications, ${bellCount} unread` : "Notifications"}>
                  <Bell size={17} aria-hidden />
                  {bellCount ? <span className="vh-notif-count" aria-hidden>{bellCount > 99 ? "99+" : bellCount}</span> : null}
                </Link>
              )}
              <span className="vh-avatar" aria-hidden>{initials(brand)}</span>
            </>
          )}
        </div>
        <main className="vh-content">
          {(breadcrumb || title || actions) && (
            <header className="vh-page-head vh-row-between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
              <div>
                {breadcrumb && <div className="vh-breadcrumb">{breadcrumb.join(" › ")}</div>}
                {title && <h1 style={{ margin: 0 }}>{title}</h1>}
              </div>
              {actions}
            </header>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
