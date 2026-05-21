import type { Metadata } from "next";
import { TourneeDetailView } from "@/components/domain/tournees/tournee-detail-view";

export const metadata: Metadata = { title: "Tournée" };

export default async function TourneeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TourneeDetailView id={id} />;
}
