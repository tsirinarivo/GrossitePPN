import type { Metadata } from "next";
import { RetourNouveauView } from "@/components/domain/retours/retour-nouveau-view";

export const metadata: Metadata = { title: "Nouveau retour" };

export default function NouveauRetourPage() {
  return <RetourNouveauView />;
}
