"use client";

import { useState, useEffect } from "react";
import { Search, ScanLine, ShoppingCart, Wifi, WifiOff, ClipboardList, Package, ChevronRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { usePOSStore, usePOSTotaux } from "@/store/pos.store";
import type { ProduitPOS } from "@/store/pos.store";
import { useAppStore } from "@/store/app.store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { POSProduitGrid } from "./pos-produit-grid";
import { POSPanier } from "./pos-panier";
import { POSClientBar } from "./pos-client-bar";
import { POSCategorieBar } from "./pos-categorie-bar";
import { POSMesCommandes } from "./pos-mes-commandes";
import { POSKeyboardShortcuts } from "./pos-keyboard-shortcuts";
import { CATEGORIES_DEMO, PRODUITS_DEMO } from "./pos-data-demo";
import { useSession } from "@/lib/auth/client";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";

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
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen bg-[--pos-bg] text-[--pos-text] overflow-hidden relative">
      {/* ── Colonne gauche : catalogue ── */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-all duration-300",
          panierOuvert && "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 border-b border-[--pos-border] bg-[--pos-surface] shrink-0">
          {/* Connexion indicator — icône seule sur mobile */}
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-1.5 sm:px-2 py-1 rounded-full shrink-0",
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

          {/* Search — prend tout l'espace disponible */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[--pos-text-muted]" />
            <Input
              id="pos-search-input"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher... (F2)"
              className="pl-8 sm:pl-9 bg-[--pos-surface-hover] border-[--pos-border] text-[--pos-text] placeholder:text-[--pos-text-muted] h-10 text-sm"
            />
          </div>

          <Button variant="pos-ghost" size="icon" title="Scanner code-barres" className="shrink-0 h-10 w-10">
            <ScanLine className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          <FullscreenToggle
            iconOnly
            className="text-[--pos-text-muted] hover:text-[--pos-text] hover:bg-[--pos-surface-hover] hidden md:flex"
          />

          {/* Mes commandes — toujours visible, icône seule sur mobile */}
          <Button
            variant="pos-ghost"
            size="icon"
            className="shrink-0 h-10 w-10 sm:w-auto sm:px-3 sm:gap-2"
            onClick={() => setMesCommandesOuvert(true)}
            title="Mes commandes envoyées"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Mes commandes</span>
          </Button>

          {/* Panier toggle (mobile uniquement) */}
          <div className="relative md:hidden shrink-0">
            <Button
              variant="pos"
              size="icon"
              className="h-10 w-10"
              onClick={() => setPanierOuvert(true)}
            >
              <ShoppingCart className="w-5 h-5" />
            </Button>
            {nbArticles > 0 && (
              <span className="pointer-events-none absolute -top-2 -right-2 z-10 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-extrabold flex items-center justify-center shadow-lg"
                style={{ backgroundColor: "#ffffff", color: "#FF4D00" }}>
                {nbArticles > 9 ? "9+" : nbArticles}
              </span>
            )}
          </div>
        </div>

        {/* Client bar */}
        <POSClientBar />

        {/* Catégories */}
        <POSCategorieBar
          categories={categoriesForBar}
          active={categorieActive}
          onSelect={setCategorieActive}
        />

        {/* Grille produits — padding-bottom pour laisser place à la barre sticky */}
        <div className={cn("flex-1 overflow-y-auto p-4", !panierOuvert && "pb-24 md:pb-4")}>
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

        {/* ── Barre sticky panier — mobile uniquement, toujours visible ── */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-30 md:hidden",
            "transition-all duration-300 ease-out",
            panierOuvert ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          )}
        >
          <div className="px-3 pb-3 pt-2"
            style={{ background: "linear-gradient(to top, var(--pos-bg) 70%, transparent)" }}
          >
            <button
              onClick={() => setPanierOuvert(true)}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl transition-all duration-200"
              style={{
                background: nbArticles > 0
                  ? "linear-gradient(135deg, var(--pos-primary) 0%, #FF6D30 100%)"
                  : "linear-gradient(135deg, #2a2a2a 0%, #333 100%)",
                boxShadow: nbArticles > 0
                  ? "0 8px 32px rgba(255, 77, 0, 0.45)"
                  : "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Badge article */}
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 relative">
                <ShoppingCart className="w-4.5 h-4.5 text-white" />
                {nbArticles > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center"
                    style={{ backgroundColor: "#ffffff", color: "#FF4D00" }}
                  >
                    {nbArticles > 9 ? "9+" : nbArticles}
                  </span>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">
                  {nbArticles > 0 ? `${nbArticles} article${nbArticles > 1 ? "s" : ""}` : "Panier vide"}
                </p>
                <p className="text-white/70 text-xs font-medium text-mga leading-tight">
                  {nbArticles > 0 ? formatMGA(totalTTC) : "Ajoutez des produits"}
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-1 text-white font-semibold text-sm shrink-0">
                <Send className="w-4 h-4" />
                <span>Voir le panier</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Drawer : Mes commandes ── */}
      {mesCommandesOuvert && (
        <>
          <div
            className="absolute inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
            onClick={() => setMesCommandesOuvert(false)}
          />
          <div
            className="absolute inset-y-0 right-0 z-50 w-full sm:w-[420px] shadow-2xl flex flex-col"
            style={{ backgroundColor: "var(--pos-surface)" }}
          >
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

      {/* Raccourcis clavier */}
      <POSKeyboardShortcuts
        searchInputId="pos-search-input"
        clientInputId="pos-client-search-input"
        onTogglePanier={() => setPanierOuvert((v) => !v)}
        onSubmit={() => {
          const btn = document.getElementById("pos-submit-btn") as HTMLButtonElement | null;
          btn?.click();
        }}
      />
    </div>
  );
}
