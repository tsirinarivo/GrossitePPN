import type { Metadata } from "next";
import { RapportPanierView } from "@/components/domain/rapports/rapport-panier-view";

export const metadata: Metadata = { title: "Analyse panier moyen" };

export default function Page() {
  return <RapportPanierView />;
}
