import type { Metadata } from "next";
import { RapportClientsView } from "@/components/domain/rapports/rapport-clients-view";

export const metadata: Metadata = { title: "Top clients" };

export default function RapportClientsPage() {
  return <RapportClientsView />;
}
