import type { Metadata } from "next";
import { DepotsView } from "@/components/domain/depots/depots-view";

export const metadata: Metadata = { title: "Gestion dépôts" };

export default function DepotsPage() {
  return <DepotsView />;
}
