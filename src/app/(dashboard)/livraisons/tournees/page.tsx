import type { Metadata } from "next";
import { TourneesView } from "@/components/domain/tournees/tournees-view";

export const metadata: Metadata = { title: "Tournées logistiques" };

export default function TourneesPage() {
  return <TourneesView />;
}
