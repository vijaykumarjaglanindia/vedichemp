import type { ReactNode } from "react";

/**
 * The admin console's chrome is rendered per-page via `Shell.tsx` (each page
 * needs a different `active` nav item and breadcrumb). This layout is
 * intentionally a pass-through — see src/app/account/layout.tsx for the same
 * pattern on the buyer console.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
