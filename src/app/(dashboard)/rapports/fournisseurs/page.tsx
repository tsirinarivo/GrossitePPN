import type { Metadata } from "next";
import { RapportFournisseursView } from "@/components/domain/rapports/rapport-fournisseurs-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Rapport fournisseurs" };

export default async function RapportFournisseursPage() {
  await requireRole("admin", "gerant", "comptable");
  return <RapportFournisseursView />;
}
