import type { Metadata } from "next";
import { CompteCommandes } from "@/components/shop/compte-commandes";

export const metadata: Metadata = { title: "Mes commandes" };

export default function CommandesPage() {
  return <CompteCommandes />;
}
