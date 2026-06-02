import type { Metadata } from "next";
import { RapportLivraisonsView } from "@/components/domain/rapports/rapport-livraisons-view";

export const metadata: Metadata = { title: "Rapport livraisons" };

export default function Page() {
  return <RapportLivraisonsView />;
}
