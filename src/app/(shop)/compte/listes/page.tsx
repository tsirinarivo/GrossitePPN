import type { Metadata } from "next";
import { CompteListes } from "@/components/shop/compte-listes";

export const metadata: Metadata = { title: "Mes listes d'achat" };

export default function CompteListesPage() {
  return <CompteListes />;
}
