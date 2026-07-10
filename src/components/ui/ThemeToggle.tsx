"use client";

/**
 * VEDIC HEMP — THEME TOGGLE
 *
 * The viewer's explicit choice is stamped on <html data-theme> and persisted;
 * an inline script in the root layout re-applies it before first paint so
 * there is no flash. With no stored choice, the OS preference wins via
 * `prefers-color-scheme` in globals.css.
 */

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function resolveCurrent(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => setTheme(resolveCurrent()), []);

  const toggle = () => {
    const next = resolveCurrent() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("vh-theme", next); } catch { /* private mode */ }
    setTheme(next);
  };

  return (
    <button className="vh-iconbtn" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {theme === "dark" ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
    </button>
  );
}
