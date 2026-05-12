"use client";

import { useState, useCallback } from "react";
import { Search, ScanLine, User, ShoppingCart, Wifi, WifiOff, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePOSStore, usePOSTotaux } from "@/store/pos.store";
import { useAppStore } from "@/store/app.store";
import { formatMGA } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POSProduitGrid } from "./pos-produit-grid";
import { POSPanier } from "./pos-panier";
import { POSClientBar } from "./pos-client-bar";
import { POSCategorieBar } from "./pos-categorie-bar";

// Données de démo — remplacé par vrai fetch en prod
import { PRODUITS_DEMO, CATEGORIES_DEMO } from "./pos-data-demo";

export function POSAgent() {
  const [panierOuvert, setPanierOuvert] = useState(false);
  const {
    recherche,
    setRecherche,
    categorieActive,
    setCategorieActive,
    modeHorsLigne,
  } = usePOSStore();
  const connexion = useAppStore((s) => s.connexion);
  const { nbArticles, totalTTC } = usePOSTotaux();

  const produitsFiltres = PRODUITS_DEMO.filter((p) => {
    const q = recherche.toLowerCase();
    const matchRecherche =
      !q ||
      p.nom.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.nomMG ?? "").toLowerCase().includes(q);
    const matchCat = !categorieActive || p.categorieId === categorieActive;
    return matchRecherche && matchCat;
  });

  return (
    <div className="flex h-screen bg-[--pos-bg] text-[--pos-text] overflow-hidden">
      {/* ── Colonne gauche : catalogue ── */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-all duration-300",
          panierOuvert && "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-[--pos-border] bg-[--pos-surface] shrink-0">
          {/* Connexion indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
              connexion === "offline" || modeHorsLigne
                ? "bg-[--pos-danger]/20 text-[--pos-danger]"
                : "bg-[--pos-success]/20 text-[--pos-success]"
            )}
          >
            {connexion === "offline" || modeHorsLigne ? (
              <WifiOff className="w-3 h-3" />
            ) : (
              <Wifi className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">
              {connexion === "offline" || modeHorsLigne ? "Hors ligne" : "En ligne"}
            </span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--pos-text-muted]" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un produit, code-barres..."
              className="pl-9 bg-[--pos-surface-hover] border-[--pos-border] text-[--pos-text] placeholder:text-[--pos-text-muted] h-9"
            />
          </div>

          <Button variant="pos-ghost" size="icon" title="Scanner code-barres">
            <ScanLine className="w-5 h-5" />
          </Button>

          {/* Panier toggle (mobile) */}
          <Button
            variant="pos"
            size="pos-md"
            className="relative md:hidden"
            onClick={() => setPanierOuvert(true)}
          >
            <ShoppingCart className="w-5 h-5" />
            {nbArticles > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-[--primary] rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                {nbArticles}
              </span>
            )}
          </Button>
        </div>

        {/* Client bar */}
        <POSClientBar />

        {/* Catégories */}
        <POSCategorieBar
          categories={CATEGORIES_DEMO}
          active={categorieActive}
          onSelect={setCategorieActive}
        />

        {/* Grille produits */}
        <div className="flex-1 overflow-y-auto p-4">
          {produitsFiltres.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-[--pos-text-muted]">
              <Package className="w-12 h-12 opacity-30" />
              <div className="text-center">
                <p className="font-medium">Aucun produit trouvé</p>
                <p className="text-sm opacity-70 mt-1">Essayez avec un autre terme ou scannez un code-barres</p>
              </div>
            </div>
          ) : (
            <POSProduitGrid produits={produitsFiltres} />
          )}
        </div>
      </div>

      {/* ── Colonne droite : panier ── */}
      <div
        className={cn(
          "flex flex-col w-full md:w-[380px] lg:w-[420px] xl:w-[460px]",
          "border-l border-[--pos-border] bg-[--pos-surface]",
          "shrink-0",
          // Mobile: full screen quand ouvert
          !panierOuvert && "hidden md:flex",
          panierOuvert && "flex"
        )}
      >
        <POSPanier
          onClose={() => setPanierOuvert(false)}
          totalTTC={totalTTC}
          nbArticles={nbArticles}
        />
      </div>
    </div>
  );
}
