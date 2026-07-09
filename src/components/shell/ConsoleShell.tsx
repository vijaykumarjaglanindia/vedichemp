/**
 * VEDIC HEMP — CONSOLE SHELL
 *
 * The chrome shared by the buyer, seller and admin dashboards: a left nav rail,
 * a sticky glass topbar, breadcrumbs, and (for support impersonation) the fixed
 * red "actions logged" banner. Each console passes its own nav model and brand.
 *
 * The mobile nav drawer is CSS-only (a hidden checkbox + a label hamburger +
 * a scrim), so the shell stays a Server Component with no client JS.
 */

import type { ReactNode } from "react";

export interface NavItem { href: string; label: string; icon: string }
export interface NavGroup { group?: string; items: NavItem[] }

function initials(brand: string): string {
  const words = brand.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return letters || "VH";
}

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
      {/* CSS-only mobile drawer toggle — must precede .vh-rail and .vh-scrim */}
      <input type="checkbox" id="vh-nav-toggle" className="vh-nav-toggle" aria-hidden tabIndex={-1} />

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
        <div className="vh-rail-user">
          <span className="vh-avatar" aria-hidden>{initials(brand)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Signed in</div>
            <div className="small" style={{ color: "#8fb39c" }}>Session · secured</div>
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
          <label className="vh-hamburger" htmlFor="vh-nav-toggle" aria-label="Open navigation">☰</label>
          {topbar ?? (
            <>
              <div className="vh-search">
                <span aria-hidden>🔎</span>
                <input placeholder="Search…" aria-label="Search" />
              </div>
              <div className="vh-spacer" />
              <a className="vh-iconbtn" href="#" aria-label="Notifications">
                🔔<span className="vh-dot" aria-hidden />
              </a>
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
