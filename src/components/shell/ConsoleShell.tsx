/**
 * VEDIC HEMP — CONSOLE SHELL
 *
 * The chrome shared by the buyer, seller and admin dashboards: a left nav rail,
 * a sticky topbar, breadcrumbs, and (for support impersonation) the fixed red
 * "actions logged" banner. Each console passes its own nav model and accent.
 */

import type { ReactNode } from "react";

export interface NavItem { href: string; label: string; icon: string }
export interface NavGroup { group?: string; items: NavItem[] }

export function ConsoleShell({
  brand, nav, active, topbar, breadcrumb, title, actions, impersonation, children,
}: {
  brand: string;
  nav: NavGroup[];
  active: string;
  topbar?: ReactNode;
  breadcrumb?: string[];
  title?: string;
  actions?: ReactNode;
  impersonation?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="vh-shell">
      <nav className="vh-rail" aria-label={`${brand} navigation`}>
        <div className="vh-rail-brand">{brand}</div>
        {nav.map((g, gi) => (
          <div key={gi}>
            {g.group && <div className="vh-rail-group">{g.group}</div>}
            {g.items.map((it) => (
              <a key={it.href} href={it.href} className={it.href === active ? "active" : ""} aria-current={it.href === active ? "page" : undefined}>
                <span aria-hidden>{it.icon}</span>
                {it.label}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="vh-main">
        {impersonation && (
          <div className="vh-impersonation-banner" role="alert">
            <span aria-hidden>🛑</span>
            Support session — every action is logged and attributed to {impersonation}. Write actions are disabled.
          </div>
        )}
        <div className="vh-topbar">
          {topbar ?? <strong>{brand}</strong>}
        </div>
        <main className="vh-content">
          {(breadcrumb || title || actions) && (
            <header className="vh-page-head vh-row-between" style={{ alignItems: "flex-end" }}>
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
