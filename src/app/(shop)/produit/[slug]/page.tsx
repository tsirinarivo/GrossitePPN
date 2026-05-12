import type { Metadata } from "next";
import { FicheProduit } from "@/components/shop/fiche-produit";

export const metadata: Metadata = { title: "Fiche produit" };

export default function ProduitPage({ params }: { params: { slug: string } }) {
  return <FicheProduit slug={params.slug} />;
}
