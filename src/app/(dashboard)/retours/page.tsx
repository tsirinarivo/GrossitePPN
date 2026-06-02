import type { Metadata } from "next";
import { RetoursView } from "@/components/domain/retours/retours-view";

export const metadata: Metadata = { title: "Retours & avoirs" };

export default function RetoursPage() {
  return <RetoursView />;
}
