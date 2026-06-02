"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { PaiementMobileMoney } from "@/components/domain/paiement/paiement-mobile-money";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const montant = Number(search.get("montant") ?? "0");
  const mode = (search.get("mode") ?? "mvola") as "mvola" | "orange_money" | "airtel_money";

  return (
    <div className="min-h-screen bg-[--background] flex items-center justify-center p-4">
      <PaiementMobileMoney id={id} montant={montant} mode={mode} />
    </div>
  );
}
