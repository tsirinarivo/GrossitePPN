import type { Metadata } from "next";
import { CategoriesView } from "@/components/domain/stock/categories-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  await requireRole("admin", "gerant", "magasinier");
  return <CategoriesView />;
}
