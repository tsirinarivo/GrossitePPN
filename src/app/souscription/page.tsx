import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { isPlanKey, PLAN_MAP } from "@/lib/plans";
import { SouscriptionForm } from "@/components/marketing/souscription-form";

export const metadata: Metadata = { title: "Souscription", robots: { index: false } };

export default async function SouscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planParam } = await searchParams;
  if (!planParam || !isPlanKey(planParam)) redirect("/#tarifs");
  const plan = PLAN_MAP[planParam as "standard" | "pro" | "entreprise"];

  let cfg: typeof schema.paiementConfig.$inferSelect | null = null;
  try {
    const [row] = await db.select().from(schema.paiementConfig).limit(1);
    cfg = row ?? null;
  } catch {
    cfg = null;
  }

  const numeros = {
    mvola: { numero: cfg?.mvolaNumero ?? null, nom: cfg?.mvolaNom ?? null },
    orange_money: { numero: cfg?.orangeNumero ?? null, nom: cfg?.orangeNom ?? null },
    airtel_money: { numero: cfg?.airtelNumero ?? null, nom: cfg?.airtelNom ?? null },
  };

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      <header className="border-b border-[--border]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D00] to-[#FFB800] flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight">GrossistePPN</span>
          </Link>
          <Link href="/#tarifs" className="inline-flex items-center gap-1.5 text-sm text-[--foreground-muted] hover:text-[--foreground]">
            <ArrowLeft className="w-4 h-4" /> Formules
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <SouscriptionForm
          planKey={plan.key}
          planNom={plan.nom}
          prix={plan.prix}
          numeros={numeros}
          instructions={cfg?.instructions ?? null}
        />
      </main>
    </div>
  );
}
