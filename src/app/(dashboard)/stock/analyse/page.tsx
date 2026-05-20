import type { Metadata } from "next";
import { StockAnalyse } from "@/components/domain/stock/stock-analyse-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Analyse de stock" };

export default async function StockAnalysePage() {
  await requireRole("admin", "gerant", "magasinier", "comptable");
  return <StockAnalyse />;
}
