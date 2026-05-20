import type { Metadata } from "next";
import { ChargesView } from "@/components/domain/finances/charges-view";

export const metadata: Metadata = { title: "Charges opérationnelles" };

export default function ChargesPage() {
  return <ChargesView />;
}
