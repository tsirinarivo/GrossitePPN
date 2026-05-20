import type { Metadata } from "next";
import { PromotionsView } from "@/components/domain/admin/promotions-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  await requireRole("admin", "gerant");
  return <PromotionsView />;
}
