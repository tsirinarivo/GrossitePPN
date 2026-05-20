import type { Metadata } from "next";
import { RapportTVAView } from "@/components/domain/rapports/rapport-tva-view";

export const metadata: Metadata = { title: "Rapport TVA" };

export default function RapportTVAPage() {
  return <RapportTVAView />;
}
