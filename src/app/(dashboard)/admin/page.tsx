import type { Metadata } from "next";
import { AdminView } from "@/components/domain/admin/admin-view";

export const metadata: Metadata = { title: "Administration" };

export default function AdminPage() {
  return <AdminView />;
}
