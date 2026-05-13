import type { Metadata } from "next";
import { AchatsView } from "@/components/domain/achats/achats-view";

export const metadata: Metadata = { title: "Achats & Fournisseurs" };

export default function AchatsPage() {
  return <AchatsView />;
}
