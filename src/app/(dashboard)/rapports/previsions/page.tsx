import type { Metadata } from "next";
import { RapportPrevisionsView } from "@/components/domain/rapports/rapport-previsions-view";

export const metadata: Metadata = { title: "Prévisions & Saisonnalité" };

export default function PrevisionsPage() {
  return <RapportPrevisionsView />;
}
