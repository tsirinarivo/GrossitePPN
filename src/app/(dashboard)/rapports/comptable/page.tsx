import type { Metadata } from "next";
import { RapportComptableView } from "@/components/domain/rapports/rapport-comptable-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Comptabilité" };

export default async function RapportComptablePage() {
  await requireRole("admin", "gerant", "comptable");
  return <RapportComptableView />;
}
