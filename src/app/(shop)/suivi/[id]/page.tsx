import type { Metadata } from "next";
import Link from "next/link";
import { Package, CheckCircle, Clock, Truck } from "lucide-react";

export const metadata: Metadata = { title: "Suivi de commande" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SuiviPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[--background] p-4">
      <div className="max-w-lg mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[--primary]/10 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6 text-[--primary]" />
          </div>
          <h1 className="text-xl font-bold text-[--foreground]">Suivi de commande</h1>
          <p className="text-sm text-[--foreground-muted] font-mono bg-[--background-subtle] px-3 py-1 rounded-lg inline-block">
            #{id}
          </p>
        </div>

        {/* Timeline suivi */}
        <div className="rounded-xl border border-[--border] bg-[--background-subtle] p-6">
          <div className="space-y-4">
            {[
              { icon: CheckCircle, label: "Commande confirmée", done: true },
              { icon: Package, label: "En préparation", done: true },
              { icon: Truck, label: "En cours de livraison", done: false },
              { icon: CheckCircle, label: "Livré", done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <step.icon
                  className={`w-5 h-5 shrink-0 ${step.done ? "text-[--primary]" : "text-[--border]"}`}
                />
                <span className={`text-sm ${step.done ? "text-[--foreground] font-medium" : "text-[--foreground-subtle]"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/compte/commandes" className="text-sm text-[--primary] hover:underline">
            ← Retour à mes commandes
          </Link>
        </div>
      </div>
    </div>
  );
}
