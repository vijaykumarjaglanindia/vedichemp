import type { ReactNode } from "react";

/**
 * The seller console's chrome is rendered per-page via `Shell.tsx` (each page
 * needs a different `active` nav item and breadcrumb). This layout is
 * intentionally a pass-through.
 */
export default function SellerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
