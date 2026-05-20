import type { Metadata } from "next";
import { MargesProduits } from "@/components/domain/rapports/marges-produits-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Marges par produit" };

export default async function MargesPage() {
  await requireRole("admin", "gerant", "comptable");
  return <MargesProduits />;
}
