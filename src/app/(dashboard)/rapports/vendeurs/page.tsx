import type { Metadata } from "next";
import { RapportVendeursView } from "@/components/domain/rapports/rapport-vendeurs-view";

export const metadata: Metadata = { title: "Performance vendeurs" };

export default function RapportVendeursPage() {
  return <RapportVendeursView />;
}
