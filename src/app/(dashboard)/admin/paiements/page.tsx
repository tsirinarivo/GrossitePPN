import type { Metadata } from "next";
import { PaiementsView } from "@/components/domain/admin/paiements-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Paiement Mobile Money" };

export default async function PaiementsPage() {
  await requireRole("admin");
  return <PaiementsView />;
}
