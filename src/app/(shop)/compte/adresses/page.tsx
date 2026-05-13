import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mes adresses" };

export default function AdressesPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-[--foreground] mb-2">Mes adresses</h1>
      <p className="text-[--foreground-muted]">Gestion des adresses de livraison — disponible prochainement.</p>
    </div>
  );
}
