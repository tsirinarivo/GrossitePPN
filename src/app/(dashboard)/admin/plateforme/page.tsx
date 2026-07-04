import type { Metadata } from "next";
import { PlateformeView } from "@/components/domain/admin/plateforme-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Tableau de bord plateforme" };

export default async function PlateformePage() {
  await requireRole("admin");
  return <PlateformeView />;
}
