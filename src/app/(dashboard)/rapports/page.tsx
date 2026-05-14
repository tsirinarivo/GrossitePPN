import type { Metadata } from "next";
import { DashboardAnalytics } from "@/components/domain/dashboard-analytics";
import { requireRole } from "../layout";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function RapportsPage() {
  await requireRole("admin", "gerant", "comptable", "marketing");
  return <DashboardAnalytics />;
}
