import type { Metadata } from "next";
import { StockView } from "@/components/domain/stock/stock-view";
import { requireRole } from "../layout";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage() {
  await requireRole("admin", "gerant", "magasinier");
  return <StockView />;
}
