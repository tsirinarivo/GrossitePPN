import type { Metadata } from "next";
import { AuditView } from "@/components/domain/admin/audit-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Journal d'audit" };

export default async function AuditPage() {
  await requireRole("admin", "gerant");
  return <AuditView />;
}
