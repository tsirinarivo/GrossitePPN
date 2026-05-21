import type { Metadata } from "next";
import { DepotsView } from "@/components/domain/admin/depots-view";

export const metadata: Metadata = { title: "Dépôts" };

export default function DepotsPage() {
  return <DepotsView />;
}
