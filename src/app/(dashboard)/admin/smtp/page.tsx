import type { Metadata } from "next";
import { SmtpView } from "@/components/domain/admin/smtp-view";
import { requireRole } from "../../layout";

export const metadata: Metadata = { title: "Configuration Email" };

export default async function SmtpPage() {
  await requireRole("admin");
  return <SmtpView />;
}
