import type { Metadata } from "next";
import { CaisseView } from "@/components/domain/caisse/caisse-view";

export const metadata: Metadata = {
  title: "Caisse",
};

export default function CaissePage() {
  return <CaisseView />;
}
