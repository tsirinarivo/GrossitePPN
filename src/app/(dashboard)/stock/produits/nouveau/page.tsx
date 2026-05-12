import type { Metadata } from "next";
import { NouveauProduitWizard } from "@/components/domain/stock/nouveau-produit-wizard";

export const metadata: Metadata = { title: "Nouveau produit" };

export default function NouveauProduitPage() {
  return <NouveauProduitWizard />;
}
