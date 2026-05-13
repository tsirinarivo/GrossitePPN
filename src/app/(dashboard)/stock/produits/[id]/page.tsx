import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Package, Edit } from "lucide-react";

export const metadata: Metadata = { title: "Détail produit" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StockProduitDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/stock"
          className="flex items-center gap-1.5 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Stock
        </Link>
        <span className="text-[--border]">/</span>
        <span className="text-sm text-[--foreground] font-mono">{id}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--foreground]">Détail produit</h1>
          <p className="text-sm text-[--foreground-muted]">Vue complète — disponible prochainement</p>
        </div>
      </div>

      <div className="rounded-xl border border-[--border] bg-[--background-subtle] p-6 text-center space-y-3">
        <Edit className="w-8 h-8 text-[--foreground-subtle] mx-auto" />
        <p className="text-sm text-[--foreground-muted]">
          La page de détail et d&apos;édition produit sera disponible dans la prochaine version.
        </p>
        <Link
          href="/stock"
          className="inline-flex items-center gap-1.5 text-sm text-[--primary] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au stock
        </Link>
      </div>
    </div>
  );
}
