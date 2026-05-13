import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mes factures" };

export default function FacturesPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-[--foreground] mb-2">Mes factures</h1>
      <p className="text-[--foreground-muted]">Historique des factures — disponible prochainement.</p>
    </div>
  );
}
