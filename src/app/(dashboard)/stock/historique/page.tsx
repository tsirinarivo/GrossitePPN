import type { Metadata } from "next";
import { HistoriqueStockView } from "@/components/domain/stock/historique-stock-view";

export const metadata: Metadata = { title: "Historique des articles" };

export default function HistoriqueStockPage() {
  return <HistoriqueStockView />;
}
