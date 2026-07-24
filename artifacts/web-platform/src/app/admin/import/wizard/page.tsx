/**
 * VEDIC HEMP — IMPORT WIZARD (server wrapper).
 *
 * Supplies the client wizard with the data it needs (sellers, connection
 * methods, default rules, existing mappings) and renders it inside the admin
 * shell. All mutation goes back through the server actions in ../actions.ts.
 */

import type { Metadata } from "next";
import { Shell } from "../../Shell";
import { ImpShell } from "../_ui";
import { Wizard } from "./Wizard";
import { METHODS } from "@/lib/import/connectors";
import { defaultRules } from "@/lib/import/types";
import { readCatalog } from "@/lib/catalog";
import { listCategoryMap, listBrandMap, listAttributeMap } from "@/lib/import/store";

export const metadata: Metadata = { title: "Import Wizard" };
export const dynamic = "force-dynamic";

export default async function WizardPage() {
  const [cat, catMap, brandMap, attrMap] = await Promise.all([
    readCatalog(), listCategoryMap(), listBrandMap(), listAttributeMap(),
  ]);
  const sellers = Array.from(
    new Map(cat.map((p) => {
      const email = p.sellerEmail ?? `${p.seller.toLowerCase().replace(/[^a-z0-9]+/g, "")}@seller.vedic`;
      return [email, { name: p.seller, email }];
    })).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Shell active="/admin/import" breadcrumb={["Admin", "Marketplace", "Import"]} title="Import Wizard">
      <ImpShell>
        <Wizard
          sellers={sellers}
          methods={METHODS}
          defaultRules={defaultRules()}
          categoryMap={catMap}
          brandMap={brandMap}
          attributeMap={attrMap}
        />
      </ImpShell>
    </Shell>
  );
}
