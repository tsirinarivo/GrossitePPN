import type { Metadata } from "next";
import { CaisseSessionsView } from "@/components/domain/caisse/caisse-sessions-view";

export const metadata: Metadata = { title: "Historique sessions caisse" };

export default function CaisseSessionsPage() {
  return <CaisseSessionsView />;
}
