"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, ScanLine, ShoppingCart, Wifi, WifiOff, ClipboardList, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePOSStore, usePOSTotaux } from "@/store/pos.store";
import type { ProduitPOS } from "@/store/pos.store";
import { useAppStore } from "@/store/app.store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POSProduitGrid } from "./pos-produit-grid";
import { POSPanier } from "./pos-panier";
import { POSClientBar } from "./pos-client-bar";
import { POSCategorieBar } from "./pos-categorie-bar";
import { POSMesCommandes } from "./pos-mes-commandes";
import { CATEGORIES_DEMO, PRODUITS_DEMO } from "./pos-data-demo";
import { useSession } from "@/lib/auth/client";

type CategorieAPI = {
  id: string;
  nom: string;
  nomMG: string | null;
  slug: string;
  icone: string | null;
};

type ProduitAPI = ProduitPOS & { categorieId: string | null };

export function POSAgent() {
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [mesCommandesOuvert, setMesCommandesOuvert] = useState(false);
  const [produits, setProduits] = useState<ProduitAPI[]>([]);
  const [categories, setCategories] = useState<CategorieAPI[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    recherche,
    setRecherche,
    categorieActive,
    setCategorieActive,
    modeHorsLigne,
    setAgent,
  } = usePOSStore();
  const connexion = useAppStore((s) => s.connexion);
  const { nbArticles, totalTTC } = usePOSTotaux();
  const { data: session } = useSession();

  // Rehydrate the persisted POS store from localStorage after React hydration.
  // Must happen in useEffect (post-mount) to avoid React 19 error #185.
  useEffect(() => {
    usePOSStore.persist.rehydrate();
  }, []);

  // Synchroniser agentId du store avec la session utilisateur connectée
  useEffect(() => {
    if (session?.user?.id) {
      setAgent(session.user.id, usePOSStore.getState().depotId ?? "default");
    }
  }, [session?.user?.id, setAgent]);

  useEffect(() => {
    fetch("/api/produits")
      .then((r) => r.json())
      .then((data: { produits: ProduitAPI[]; categories: CategorieAPI[] }) => {
        const apiProduits = data.produits ?? [];
        const apiCategories = data.categories ?? [];
        // Fall back to demo data if DB is empty (e.g. not yet seeded)
        setProduits(apiProduits.length > 0 ? apiProduits : (PRODUITS_DEMO as ProduitAPI[]));
        setCategories(
          apiCategories.length > 0
            ? apiCategories
            : CATEGORIES_DEMO.map((c) => ({
                id: c.id,
                nom: c.label,
                nomMG: c.labelMG ?? null,
                slug: c.id,
                icone: c.icon,
              }))
        );
      })
      .catch(() => {
        // Network failure: use demo data so the POS remains usable offline
        setProduits(PRODUITS_DEMO as ProduitAPI[]);
        setCategories(
          CATEGORIES_DEMO.map((c) => ({
            id: c.id,
            nom: c.label,
            nomMG: c.labelMG ?? null,
            slug: c.id,
            icone: c.icon,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const produitsFiltres = produits.filter((p) => {
    const q = recherche.toLowerCase();
    const matchRecherche =
      !q ||
      p.nom.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.nomMG ?? "").toLowerCase().includes(q);
    const matchCat = !categorieActive || p.categorieId === categorieActive;
    return matchRecherche && matchCat;
  });

  const categoriesForBar = categories.map((c) => ({
    id: c.id,
    label: c.nom,
    labelMG: c.nomMG ?? undefined,
    icon: c.icone ?? "📦",
  }));

  return (
    <div className="flex h-[calc(100vh-3rem)] lg:h-screen bg-[--pos-bg] text-[--pos-text] overflow-hidden relative">
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

          {/* Mes commandes */}
          <Button
            variant="pos-ghost"
            size="pos-md"
            className="gap-2 hidden sm:flex"
            onClick={() => setMesCommandesOuvert(true)}
            title="Mes commandes envoyées"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden lg:inline text-sm">Mes commandes</span>
          </Button>

          {/* Panier toggle (mobile) */}
          <Button
            variant="pos"
            size="pos-md"
            className="relative md:hidden gap-2"
            onClick={() => setPanierOuvert(true)}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Panier</span>
            {nbArticles > 0 && (
              <span className="ml-1 bg-white text-[--pos-primary] rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center shrink-0">
                {nbArticles}
              </span>
            )}
          </Button>
        </div>

        {/* Client bar */}
        <POSClientBar />

        {/* Catégories */}
        <POSCategorieBar
          categories={categoriesForBar}
          active={categorieActive}
          onSelect={setCategorieActive}
        />

        {/* Grille produits */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-36 rounded-xl bg-[--pos-surface-hover] animate-pulse" />
              ))}
            </div>
          ) : produitsFiltres.length === 0 ? (
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

      {/* ── Drawer : Mes commandes ── */}
      {mesCommandesOuvert && (
        <>
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setMesCommandesOuvert(false)}
          />
          <div className="absolute inset-y-0 right-0 z-50 w-full sm:w-[380px] shadow-2xl">
            <POSMesCommandes onClose={() => setMesCommandesOuvert(false)} />
          </div>
        </>
      )}

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
