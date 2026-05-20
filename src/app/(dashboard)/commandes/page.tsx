import type { Metadata } from "next";
import { CommandesView } from "@/components/domain/commandes/commandes-view";

export const metadata: Metadata = { title: "Commandes" };

export default function CommandesPage() {
  return <CommandesView />;
}
