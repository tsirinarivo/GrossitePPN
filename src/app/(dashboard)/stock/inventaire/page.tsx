import type { Metadata } from "next";
import { InventaireView } from "@/components/domain/stock/inventaire-view";

export const metadata: Metadata = { title: "Inventaire" };

export default function InventairePage() {
  return <InventaireView />;
}
