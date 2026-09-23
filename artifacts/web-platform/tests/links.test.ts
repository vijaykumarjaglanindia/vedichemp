/**
 * VEDIC HEMP — NO INTERNAL LINK POINTS AT NOTHING
 *
 * A live crawl found the admin settings page offering "Open integrations →"
 * against /admin/integrations, which does not exist — the page lives at
 * /admin/settings/integrations. A typed href is invisible to the type checker,
 * so nothing caught it.
 *
 * This walks every literal internal href in the source and asserts it matches a
 * real route on disk. It is a completeness check, not a compliance one: a link
 * that 404s is a promise the product does not keep.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const APP = join(process.cwd(), "src/app");
const SRC = join(process.cwd(), "src");

function walk(dir: string, hit: (p: string) => void): void {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, hit);
    else hit(p);
  }
}

/** Every renderable route, as a regex (dynamic segments match one/any segment). */
function routeMatchers(): RegExp[] {
  const out: RegExp[] = [];
  walk(APP, (p) => {
    const base = p.split("/").pop()!;
    if (base !== "page.tsx" && base !== "route.ts") return;
    const route =
      "/" +
      relative(APP, p)
        .replace(/\/(page\.tsx|route\.ts)$/, "")
        .split("/")
        .filter((seg) => !(seg.startsWith("(") && seg.endsWith(")"))) // route groups
        .join("/");
    const pattern = route
      .replace(/\[\.\.\.[^\]]+\]/g, "@@CATCHALL@@")
      .replace(/\[[^\]]+\]/g, "@@PARAM@@")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/@@CATCHALL@@/g, ".+")
      .replace(/@@PARAM@@/g, "[^/]+");
    out.push(new RegExp(`^${pattern === "/" ? "/" : pattern}/?$`));
  });
  // Files served from /public and framework-owned endpoints.
  for (const p of ["/icon.svg", "/favicon.ico", "/opengraph-image", "/manifest.webmanifest"]) {
    out.push(new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  }
  return out;
}

function literalHrefs(): { file: string; href: string }[] {
  const found: { file: string; href: string }[] = [];
  walk(SRC, (p) => {
    if (!/\.(tsx|ts)$/.test(p)) return;
    const text = readFileSync(p, "utf8");
    // Both JSX attributes (href="/x") and object properties (href: "/x") — the
    // link this test was written for was the latter, and the first version of
    // the regex sailed straight past it.
    for (const m of text.matchAll(/href\s*[=:]\s*\{?\s*"(\/[^"'`{}\s]*)"/g)) {
      const raw = m[1]!.split("#")[0]!.split("?")[0]!;
      if (!raw || raw.includes("${")) continue; // interpolated — not a literal
      found.push({ file: relative(process.cwd(), p), href: raw });
    }
  });
  return found;
}

describe("every literal internal link resolves to a real route", () => {
  it("has no href pointing at a route that does not exist", () => {
    const matchers = routeMatchers();
    const dead = literalHrefs()
      .filter(({ href }) => !matchers.some((re) => re.test(href)))
      .map(({ file, href }) => `${href}  (${file})`);
    expect([...new Set(dead)]).toEqual([]);
  });

  it("found a meaningful number of links to check (the scan still works)", () => {
    // Guards the guard: a regex change that silently matches nothing would make
    // the assertion above pass vacuously forever.
    expect(literalHrefs().length).toBeGreaterThan(50);
    expect(routeMatchers().length).toBeGreaterThan(50);
  });
});
