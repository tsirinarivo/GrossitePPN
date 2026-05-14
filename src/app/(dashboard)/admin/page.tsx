import type { Metadata } from "next";
import { AdminView } from "@/components/domain/admin/admin-view";
import { requireRole } from "../layout";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  await requireRole("admin", "gerant");
  return <AdminView />;
}
