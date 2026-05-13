import type { Metadata } from "next";
import { LivraisonsView } from "@/components/domain/livraisons/livraisons-view";

export const metadata: Metadata = { title: "Livraisons" };

export default function LivraisonsPage() {
  return <LivraisonsView />;
}
