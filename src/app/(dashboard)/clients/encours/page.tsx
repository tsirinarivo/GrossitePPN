import type { Metadata } from "next";
import { EncoursCreditView } from "@/components/domain/clients/encours-credit-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Encours clients" };

export default async function EncoursPage() {
  await requireRole("admin", "gerant", "comptable");
  return <EncoursCreditView />;
}
