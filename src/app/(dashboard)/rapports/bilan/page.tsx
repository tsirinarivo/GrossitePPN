import type { Metadata } from "next";
import { RapportBilanView } from "@/components/domain/rapports/rapport-bilan-view";

export const metadata: Metadata = { title: "Bilan simplifié" };

export default function Page() {
  return <RapportBilanView />;
}
