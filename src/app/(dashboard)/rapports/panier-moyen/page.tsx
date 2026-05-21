import type { Metadata } from "next";
import { PanierMoyenView } from "@/components/domain/rapports/panier-moyen-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Analyse panier moyen" };

export default async function PanierMoyenPage() {
  await requireRole("admin", "gerant", "comptable", "marketing");
  return <PanierMoyenView />;
}
