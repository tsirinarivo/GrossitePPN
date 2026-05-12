import type { Metadata } from "next";
import { POSAgent } from "@/components/domain/pos/pos-agent";

export const metadata: Metadata = {
  title: "Point de vente — Agent",
};

export default function POSAgentPage() {
  return <POSAgent />;
}
