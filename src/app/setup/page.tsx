import type { Metadata } from "next";
import { SetupWizard } from "@/components/domain/setup/setup-wizard";

export const metadata: Metadata = { title: "Configuration initiale" };

export default function Page() {
  return <SetupWizard />;
}
