import type { Metadata } from "next";
import { TenantsView } from "@/components/domain/admin/tenants-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Tenants" };

export default async function TenantsPage() {
  await requireRole("admin");
  return <TenantsView />;
}
