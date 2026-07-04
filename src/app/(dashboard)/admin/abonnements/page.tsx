import type { Metadata } from "next";
import { AbonnementsView } from "@/components/domain/admin/abonnements-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Abonnements" };

export default async function AbonnementsPage() {
  await requireRole("admin");
  return <AbonnementsView />;
}
