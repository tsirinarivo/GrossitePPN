import type { Metadata } from "next";
import { FicheProduit } from "@/components/shop/fiche-produit";

export const metadata: Metadata = { title: "Fiche produit" };

export default async function ProduitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <FicheProduit slug={decodeURIComponent(slug)} />;
}
