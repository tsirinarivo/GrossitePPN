import type { Metadata } from "next";
import { ProduitEditView } from "@/components/domain/stock/produit-edit-view";

export const metadata: Metadata = { title: "Modifier produit" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StockProduitDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProduitEditView id={id} />;
}
