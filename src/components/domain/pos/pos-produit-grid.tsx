"use client";

import { useState } from "react";
import { Plus, ChevronDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { usePOSStore } from "@/store/pos.store";
import type { ProduitPOS, UniteVente } from "@/store/pos.store";
import { Button } from "@/components/ui/button";

type Props = {
  produits: ProduitPOS[];
};

export function POSProduitGrid({ produits }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
      {produits.map((produit) => (
        <ProduitCard key={produit.id} produit={produit} />
      ))}
    </div>
  );
}

function ProduitCard({ produit }: { produit: ProduitPOS }) {
  const { ajouterLigne, client } = usePOSStore();
  const palier = client?.palier ?? "detail";

  const [uniteSelectee, setUniteSelectee] = useState<UniteVente>(
    () => produit.unitesVente[0] ?? {
      id: "default",
      nom: produit.uniteBase,
      facteurConversion: 1,
      prixGros: null,
      prixSemiGros: null,
      prixDetail: null,
      codeBarres: null,
    }
  );

  const getPrix = (unite: UniteVente): number => {
    if (palier === "gros") return unite.prixGros ?? unite.prixDetail ?? 0;
    if (palier === "semi_gros") return unite.prixSemiGros ?? unite.prixDetail ?? 0;
    return unite.prixDetail ?? 0;
  };

  const prixActuel = getPrix(uniteSelectee);
  const stockEnUnite = Math.floor(produit.stockDisponible / uniteSelectee.facteurConversion);
  const stockBas = stockEnUnite < 5;

  const handleAjouter = () => {
    if (!prixActuel) return;
    ajouterLigne({
      produitId: produit.id,
      nomProduit: produit.nom,
      uniteId: uniteSelectee.id,
      nomUnite: uniteSelectee.nom,
      facteurConversion: uniteSelectee.facteurConversion,
      quantite: 1,
      quantiteBase: uniteSelectee.facteurConversion,
      prixUnitaire: prixActuel,
      tauxRemise: 0,
      montantRemise: 0,
      tauxTVA: produit.tauxTVA,
      totalHT: prixActuel,
      totalTVA: 0,
      totalTTC: prixActuel,
    });
  };

  return (
    <div
      onClick={handleAjouter}
      className={cn(
        "flex flex-col rounded-xl border border-[--pos-border] bg-[--pos-surface]",
        "overflow-hidden transition-all duration-150",
        "hover:border-[--pos-primary]/50 hover:shadow-lg hover:shadow-[--pos-primary]/5",
        "active:scale-[0.98]",
        "group",
        prixActuel && produit.stockDisponible > 0
          ? "cursor-pointer"
          : "opacity-60 cursor-not-allowed"
      )}
    >
      {/* Image/Icône produit */}
      <div className="relative h-24 bg-[--pos-surface-hover] flex items-center justify-center">
        {produit.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produit.photo}
            alt={produit.nom}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-10 h-10 text-[--pos-text-muted] opacity-40" />
        )}
        {/* Badge stock bas */}
        {stockBas && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[--pos-danger]/90 text-white text-[10px] font-semibold rounded-full">
            Bas
          </div>
        )}
        {/* Code */}
        <div className="absolute bottom-1 left-2 text-[9px] text-[--pos-text-muted] font-mono">
          {produit.code}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <div>
          <h3 className="text-sm font-semibold text-[--pos-text] leading-tight line-clamp-2">
            {produit.nom}
          </h3>
          {produit.nomMG && (
            <p className="text-[11px] text-[--pos-text-muted] mt-0.5 italic">
              {produit.nomMG}
            </p>
          )}
        </div>

        {/* Sélecteur d'unité */}
        {produit.unitesVente.length > 1 && (
          <div className="relative">
            <select
              value={uniteSelectee.id}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                const unite = produit.unitesVente.find((u) => u.id === e.target.value);
                if (unite) setUniteSelectee(unite);
              }}
              className={cn(
                "w-full text-xs rounded-lg px-2 py-1.5 pr-6",
                "bg-[--pos-surface-hover] border border-[--pos-border]",
                "text-[--pos-text] appearance-none cursor-pointer",
                "focus:outline-none focus:border-[--pos-primary]"
              )}
            >
              {produit.unitesVente.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nom}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[--pos-text-muted] pointer-events-none" />
          </div>
        )}

        {/* Prix + stock */}
        <div className="flex items-end justify-between gap-1">
          <div>
            <div className="text-base font-bold text-[--pos-text] text-mga leading-none">
              {prixActuel ? formatMGA(prixActuel) : "—"}
            </div>
            <div className="text-[10px] text-[--pos-text-muted] mt-0.5">
              Stock:{" "}
              <span className={cn(stockBas ? "text-[--pos-danger]" : "text-[--pos-success]")}>
                {stockEnUnite} {uniteSelectee.nom}
              </span>
            </div>
          </div>

          <Button
            onClick={(e) => { e.stopPropagation(); handleAjouter(); }}
            disabled={!prixActuel || produit.stockDisponible <= 0}
            variant="pos"
            size="icon"
            className="rounded-lg h-9 w-9 shrink-0 shadow-none"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
