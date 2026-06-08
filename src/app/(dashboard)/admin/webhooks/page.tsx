import type { Metadata } from "next";
import { WebhooksView } from "@/components/domain/admin/webhooks-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Webhooks & API" };

export default async function WebhooksPage() {
  await requireRole("admin", "gerant");
  return <WebhooksView />;
}
