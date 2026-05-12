import type { Metadata } from "next";
import { StockView } from "@/components/domain/stock/stock-view";

export const metadata: Metadata = { title: "Stock" };

export default function StockPage() {
  return <StockView />;
}
