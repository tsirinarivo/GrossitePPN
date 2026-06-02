import type { Metadata } from "next";
import { RapportFournisseursView } from "@/components/domain/rapports/rapport-fournisseurs-view";

export const metadata: Metadata = { title: "Rapport fournisseurs" };

export default function Page() {
  return <RapportFournisseursView />;
}
