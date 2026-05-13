import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon équipe" };

export default function EquipePage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-[--foreground] mb-2">Mon équipe</h1>
      <p className="text-[--foreground-muted]">Gestion des membres de l&apos;équipe — disponible prochainement.</p>
    </div>
  );
}
