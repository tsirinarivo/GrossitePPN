import type { Metadata } from "next";
import { ChauffeurView } from "@/components/domain/chauffeur/chauffeur-view";

export const metadata: Metadata = { title: "Ma tournée" };

export default function Page() {
  return <ChauffeurView />;
}
