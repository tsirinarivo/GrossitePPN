import type { Metadata } from "next";
import { RapportLivraisonsView } from "@/components/domain/rapports/rapport-livraisons-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Rapport livraisons" };

export default async function RapportLivraisonsPage() {
  await requireRole("admin", "gerant", "comptable");
  return <RapportLivraisonsView />;
}
