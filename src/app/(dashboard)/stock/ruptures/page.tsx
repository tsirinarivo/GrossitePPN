import type { Metadata } from "next";
import { RupturesImminentesView } from "@/components/domain/stock/ruptures-imminentes-view";

export const metadata: Metadata = { title: "Ruptures imminentes" };

export default function RupturesPage() {
  return <RupturesImminentesView />;
}
