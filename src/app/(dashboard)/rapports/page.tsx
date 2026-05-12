import type { Metadata } from "next";
import { DashboardHome } from "@/components/domain/dashboard-home";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export default function RapportsPage() {
  return <DashboardHome />;
}
