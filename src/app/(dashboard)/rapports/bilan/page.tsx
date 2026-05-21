import type { Metadata } from "next";
import { BilanView } from "@/components/domain/rapports/bilan-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Bilan simplifié" };

export default async function BilanPage() {
  await requireRole("admin", "gerant", "comptable");
  return <BilanView />;
}
