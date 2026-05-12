import type { Metadata } from "next";
import { DashboardAnalytics } from "@/components/domain/dashboard-analytics";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function RapportsPage() {
  return <DashboardAnalytics />;
}
