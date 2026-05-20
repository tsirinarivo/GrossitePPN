import type { Metadata } from "next";
import { CompteEquipe } from "@/components/shop/compte-equipe";

export const metadata: Metadata = { title: "Mon équipe" };

export default function EquipePage() {
  return <CompteEquipe />;
}
