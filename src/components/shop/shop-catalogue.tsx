"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutGrid,
  List,
  ShoppingCart,
  Plus,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useShopCart } from "@/store/shop-cart.store";

// Données de démo complètes
const CATALOGUE = [
  { id: "1", slug: "riz-makalioka", nom: "Riz Makalioka", nomMG: "Vary Makalioka", cat: "riz", prix: 3200, unite: "kg", prixCarton: 145000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 50, emoji: "🌾", vedette: true },
  { id: "2", slug: "riz-tsipala", nom: "Riz Tsipala", nomMG: "Vary Tsipala", cat: "riz", prix: 2800, unite: "kg", prixCarton: 125000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🌾", vedette: false },
  { id: "3", slug: "riz-saonjo", nom: "Riz Saonjo", nomMG: "Vary Saonjo", cat: "riz", prix: 2600, unite: "kg", prixCarton: 115000, uniteCarton: "Sac 50kg", stock: "limite", qteMinCommande: 25, emoji: "🌾", vedette: false },
  { id: "4", slug: "huile-tiko-1l", nom: "Huile Tiko 1L", nomMG: "Menaka Tiko 1L", cat: "huile", prix: 12000, unite: "btl", prixCarton: 132000, uniteCarton: "Carton 12", stock: "ok", qteMinCommande: 10, emoji: "🫙", vedette: true },
  { id: "5", slug: "huile-tiko-5l", nom: "Huile Tiko 5L", nomMG: "Menaka Tiko 5L", cat: "huile", prix: 55000, unite: "btl", prixCarton: null, uniteCarton: null, stock: "ok", qteMinCommande: 1, emoji: "🫙", vedette: false },
  { id: "6", slug: "sucre-blanc", nom: "Sucre Blanc", nomMG: "Siramamy Fotsy", cat: "sucre", prix: 4800, unite: "kg", prixCarton: 220000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🍬", vedette: false },
  { id: "7", slug: "sucre-roux", nom: "Sucre Roux", nomMG: "Siramamy Mena", cat: "sucre", prix: 5200, unite: "kg", prixCarton: 240000, uniteCarton: "Sac 50kg", stock: "limite", qteMinCommande: 1, emoji: "🍬", vedette: false },
  { id: "8", slug: "savon-madar", nom: "Savon Madar", nomMG: "Savony Madar", cat: "savon", prix: 800, unite: "pce", prixCarton: 70000, uniteCarton: "Carton 100", stock: "ok", qteMinCommande: 1, emoji: "🧼", vedette: true },
  { id: "9", slug: "savon-doux", nom: "Savon Doux", nomMG: "Savony Malemy", cat: "savon", prix: 1200, unite: "pce", prixCarton: 108000, uniteCarton: "Carton 100", stock: "ok", qteMinCommande: 1, emoji: "🧼", vedette: false },
  { id: "10", slug: "lait-gloria", nom: "Lait Gloria concentré", nomMG: "Ronono Gloria", cat: "lait", prix: 4500, unite: "bte", prixCarton: 200000, uniteCarton: "Carton 48", stock: "ok", qteMinCommande: 1, emoji: "🥛", vedette: false },
  { id: "11", slug: "lait-kiri", nom: "Lait Kiri", nomMG: "Ronono Kiri", cat: "lait", prix: 3800, unite: "bte", prixCarton: 175000, uniteCarton: "Carton 48", stock: "rupture", qteMinCommande: 1, emoji: "🥛", vedette: false },
  { id: "12", slug: "farine-mixa", nom: "Farine Mixa 1kg", nomMG: "Harina Mixa 1kg", cat: "farine", prix: 4200, unite: "pct", prixCarton: 96000, uniteCarton: "Carton 24", stock: "ok", qteMinCommande: 1, emoji: "🌾", vedette: false },
  { id: "13", slug: "sel-marin", nom: "Sel marin 1kg", nomMG: "Sira anaty 1kg", cat: "sel", prix: 700, unite: "pct", prixCarton: 30000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🧂", vedette: false },
  { id: "14", slug: "haricot-blanc", nom: "Haricots blancs", nomMG: "Tsaramaso fotsy", cat: "legumes", prix: 5500, unite: "kg", prixCarton: 250000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🫘", vedette: false },
  { id: "15", slug: "tomate-boite", nom: "Tomates concentrées 400g", nomMG: "Voatabia boaty", cat: "conserves", prix: 3500, unite: "bte", prixCarton: 156000, uniteCarton: "Carton 48", stock: "ok", qteMinCommande: 1, emoji: "🥫", vedette: false },
  { id: "16", slug: "sardines-boite", nom: "Sardines huile 250g", nomMG: "Trozona menaka", cat: "conserves", prix: 4800, unite: "bte", prixCarton: 216000, uniteCarton: "Carton 48", stock: "limite", qteMinCommande: 1, emoji: "🐟", vedette: false },
  { id: "17", slug: "savon-protex", nom: "Savon Protex", nomMG: "Savony Protex", cat: "savon", prix: 2500, unite: "pce", prixCarton: 220000, uniteCarton: "Carton 100", stock: "ok", qteMinCommande: 12, emoji: "🧼", vedette: true },
];

const CATEGORIES = [
  { id: null, label: "Tout", emoji: "🛒" },
  { id: "riz", label: "Riz", emoji: "🌾" },
  { id: "huile", label: "Huile", emoji: "🫙" },
  { id: "sucre", label: "Sucre", emoji: "🍬" },
  { id: "savon", label: "Savon", emoji: "🧼" },
  { id: "lait", label: "Lait", emoji: "🥛" },
  { id: "farine", label: "Farine", emoji: "🌾" },
  { id: "sel", label: "Sel", emoji: "🧂" },
  { id: "conserves", label: "Conserves", emoji: "🥫" },
  { id: "legumes", label: "Légumes secs", emoji: "🫘" },
];

// ── Bannières promotionnelles ──────────────────────────
const BANNIERES = [
  {
    id: 1,
    titre: "Riz Makalioka",
    sousTitre: "Commandez par palette — livraison offerte",
    gradient: "from-orange-600 to-amber-500",
    icon: Truck,
    cta: "Voir les offres",
    href: "/shop?cat=riz",
  },
  {
    id: 2,
    titre: "Huile Tiko",
    sousTitre: "Remise 5% dès 10 cartons commandés",
    gradient: "from-blue-600 to-cyan-500",
    icon: Sparkles,
    cta: "Voir les offres",
    href: "/shop?cat=huile",
  },
  {
    id: 3,
    titre: "Nouveau : Savon Protex en gros",
    sousTitre: "Disponible par carton de 100 pièces",
    gradient: "from-green-600 to-emerald-500",
    icon: Package,
    cta: "Voir les offres",
    href: "/shop?cat=savon",
  },
];

function BanniereCarousel() {
  const [actif, setActif] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActif((prev) => (prev + 1) % BANNIERES.length);
    }, 4000);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aller = (idx: number) => {
    setActif(idx);
    resetTimer();
  };

  const precedent = () => aller((actif - 1 + BANNIERES.length) % BANNIERES.length);
  const suivant = () => aller((actif + 1) % BANNIERES.length);

  const banniere = BANNIERES[actif]!;
  const Icon = banniere.icon;

  return (
    <div className="relative mb-8 rounded-2xl overflow-hidden select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={banniere.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
          className={cn(
            "bg-gradient-to-r p-6 sm:p-8 text-white",
            banniere.gradient
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold leading-tight">
                  {banniere.titre}
                </h2>
                <p className="text-sm text-white/80 mt-0.5">{banniere.sousTitre}</p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-white text-gray-900 hover:bg-white/90 shrink-0 hidden sm:flex"
            >
              <Link href={banniere.href}>{banniere.cta}</Link>
            </Button>
          </div>

          <Button
            asChild
            size="sm"
            className="mt-4 bg-white text-gray-900 hover:bg-white/90 sm:hidden"
          >
            <Link href={banniere.href}>{banniere.cta}</Link>
          </Button>
        </motion.div>
      </AnimatePresence>

      {/* Contrôles flèches */}
      <button
        onClick={precedent}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-all"
        aria-label="Bannière précédente"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={suivant}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-all"
        aria-label="Bannière suivante"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Points indicateurs */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNIERES.map((_, i) => (
          <button
            key={i}
            onClick={() => aller(i)}
            className={cn(
              "rounded-full transition-all duration-300",
              i === actif
                ? "w-5 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
            )}
            aria-label={`Bannière ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

type ViewMode = "grid" | "list" | "quick";

export function ShopCatalogue() {
  const [recherche, setRecherche] = useState("");
  const [catActive, setCatActive] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("grid");

  const { lignes, ajouterArticle } = useShopCart();

  useEffect(() => {
    useShopCart.persist.rehydrate();
  }, []);

  const produitsFiltres = useMemo(
    () =>
      CATALOGUE.filter((p) => {
        const q = recherche.toLowerCase();
        const matchQ =
          !q ||
          p.nom.toLowerCase().includes(q) ||
          p.nomMG.toLowerCase().includes(q);
        const matchCat = !catActive || p.cat === catActive;
        return matchQ && matchCat;
      }),
    [recherche, catActive]
  );

  const panier: Record<string, number> = Object.fromEntries(
    lignes.map((l) => [l.produitId, l.qte])
  );
  const nbPanier = lignes.reduce((s, l) => s + l.qte, 0);

  const addToCart = (id: string, nom: string) => {
    const produit = CATALOGUE.find((p) => p.id === id);
    if (!produit) return;
    ajouterArticle({
      produitId: id,
      nom,
      unite: produit.unite,
      emoji: produit.emoji,
      prixUnit: produit.prix,
      qte: 1,
    });
    toast.success(`${nom} ajouté au panier`, { duration: 1500 });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Titre + actions ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Catalogue</h1>
          <p className="text-[--foreground-muted] text-sm mt-1">
            {produitsFiltres.length} produit{produitsFiltres.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Panier flottant */}
        {nbPanier > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button size="lg" asChild>
              <Link href="/panier">
                <ShoppingCart className="w-4 h-4" />
                Panier
                <Badge className="bg-white/20 text-white ring-white/30 ml-1">
                  {nbPanier}
                </Badge>
              </Link>
            </Button>
          </motion.div>
        )}
      </div>

      {/* ── Bannières promotionnelles ── */}
      <BanniereCarousel />

      {/* ── Barre de recherche + filtres ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-subtle]" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un produit…"
            className="pl-9"
          />
          {recherche && (
            <button
              onClick={() => setRecherche("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle] hover:text-[--foreground]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Vue toggle */}
        <div className="flex items-center gap-1 bg-[--background-muted] rounded-lg p-1">
          {(
            [
              { id: "grid", icon: LayoutGrid, label: "Grille" },
              { id: "list", icon: List, label: "Liste" },
              { id: "quick", icon: Zap, label: "Rapide" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                view === v.id
                  ? "bg-[--card] text-[--foreground] shadow-sm"
                  : "text-[--foreground-muted] hover:text-[--foreground]"
              )}
            >
              <v.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Catégories — scroll horizontal avec fade droite ── */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 z-10"
          style={{ background: "linear-gradient(to right, transparent, var(--background))" }} />
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map((c) => (
          <button
            key={String(c.id)}
            onClick={() => setCatActive(c.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all",
              catActive === c.id
                ? "bg-[--primary] text-white"
                : "bg-[--background-muted] text-[--foreground-muted] hover:bg-[--accent] hover:text-[--foreground]"
            )}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>
      </div>

      {/* ── Contenu ── */}
      <AnimatePresence mode="wait">
        {view === "quick" ? (
          <motion.div
            key="quick"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <QuickOrderTable
              produits={produitsFiltres}
              panier={panier}
              onChange={(id, q) => {
                const produit = CATALOGUE.find((p) => p.id === id);
                if (!produit) return;
                if (q <= 0) {
                  useShopCart.getState().supprimer(id);
                } else {
                  useShopCart.getState().setQte(id, q);
                  if (!lignes.find((l) => l.produitId === id)) {
                    ajouterArticle({ produitId: id, nom: produit.nom, unite: produit.unite, emoji: produit.emoji, prixUnit: produit.prix, qte: q });
                  }
                }
              }}
            />
          </motion.div>
        ) : view === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {produitsFiltres.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <ProduitListItem
                  produit={p}
                  qty={panier[p.id] ?? 0}
                  onAdd={() => addToCart(p.id, p.nom)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {produitsFiltres.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ProduitGridCard
                  produit={p}
                  qty={panier[p.id] ?? 0}
                  onAdd={() => addToCart(p.id, p.nom)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {produitsFiltres.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-5xl">🔍</div>
          <h3 className="text-lg font-semibold text-[--foreground]">
            Aucun produit trouvé
          </h3>
          <p className="text-[--foreground-muted] text-sm">
            Essayez avec un autre terme ou sélectionnez une catégorie différente.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setRecherche("");
              setCatActive(null);
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Badge de stock ────────────────────────────────────

function StockBadge({ stock }: { stock: string }) {
  if (stock === "ok") {
    return (
      <Badge variant="success" className="text-[9px] px-1.5 py-0.5">
        En stock
      </Badge>
    );
  }
  if (stock === "limite") {
    return (
      <Badge variant="warning" className="text-[9px] px-1.5 py-0.5">
        Stock limité
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5">
      Rupture
    </Badge>
  );
}

// ── Carte grille ──────────────────────────────────────

type Produit = (typeof CATALOGUE)[0];

function ProduitGridCard({
  produit: p,
  qty,
  onAdd,
}: {
  produit: Produit;
  qty: number;
  onAdd: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border border-[--card-border] bg-[--card] overflow-hidden",
        "transition-all duration-200 hover:border-[--primary]/30 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <Link href={`/produit/${p.slug}`} className="block">
        <div className="h-28 bg-[--background-muted] flex items-center justify-center relative">
          <span className="text-4xl">{p.emoji}</span>
          {p.stock === "rupture" && (
            <div className="absolute inset-0 bg-[--background]/60 flex items-center justify-center">
              <span className="text-xs font-semibold text-[--foreground-muted]">
                Rupture
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 flex-1 flex flex-col gap-2">
        {/* Stock badge */}
        <div className="flex items-center justify-between gap-1">
          <StockBadge stock={p.stock} />
          {p.vedette && (
            <span className="text-[9px] font-bold text-[--primary] bg-[--primary]/10 px-1.5 py-0.5 rounded-full">
              Vedette
            </span>
          )}
        </div>

        <Link href={`/produit/${p.slug}`}>
          <p className="text-sm font-semibold text-[--foreground] leading-tight group-hover:text-[--primary] transition-colors line-clamp-2">
            {p.nom}
          </p>
          <p className="text-[10px] text-[--foreground-muted] italic">{p.nomMG}</p>
        </Link>

        <div className="mt-auto">
          <p className="text-base font-bold text-mga">
            {formatMGA(p.prix)}
            <span className="text-[11px] font-normal text-[--foreground-muted] ml-1">
              /{p.unite} <span className="text-[--foreground-subtle]">HT</span>
            </span>
          </p>
          {p.prixCarton && (
            <p className="text-[10px] text-[--foreground-subtle]">
              {p.uniteCarton} → {formatMGA(p.prixCarton)}
            </p>
          )}
          {p.qteMinCommande > 1 && (
            <p className="text-[10px] text-[--foreground-subtle] mt-0.5">
              Min : {p.qteMinCommande} unités
            </p>
          )}
        </div>

        <button
          onClick={onAdd}
          disabled={p.stock === "rupture"}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-sm font-medium transition-all",
            p.stock === "rupture"
              ? "bg-[--background-muted] text-[--foreground-subtle] cursor-not-allowed"
              : "bg-[--primary]/10 text-[--primary] hover:bg-[--primary] hover:text-white"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {qty > 0 ? `Ajouter (${qty})` : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

// ── Ligne liste ──────────────────────────────────────

function ProduitListItem({
  produit: p,
  qty,
  onAdd,
}: {
  produit: Produit;
  qty: number;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[--card-border] bg-[--card] p-4 hover:border-[--primary]/20 transition-all">
      <span className="text-3xl shrink-0">{p.emoji}</span>

      <div className="flex-1 min-w-0">
        <Link
          href={`/produit/${p.slug}`}
          className="text-sm font-semibold text-[--foreground] hover:text-[--primary] transition-colors"
        >
          {p.nom}
        </Link>
        <p className="text-[11px] text-[--foreground-muted] italic">{p.nomMG}</p>
        {p.qteMinCommande > 1 && (
          <p className="text-[10px] text-[--foreground-subtle] mt-0.5">
            Min : {p.qteMinCommande} unités
          </p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-mga">
          {formatMGA(p.prix)}
          <span className="text-[11px] font-normal text-[--foreground-muted]">
            /{p.unite}{" "}
            <span className="text-[--foreground-subtle]">HT</span>
          </span>
        </p>
        {p.prixCarton && (
          <p className="text-[10px] text-[--foreground-subtle]">
            {p.uniteCarton}: {formatMGA(p.prixCarton)}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <StockBadge stock={p.stock} />
      </div>

      <button
        onClick={onAdd}
        disabled={p.stock === "rupture"}
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0",
          p.stock === "rupture"
            ? "bg-[--background-muted] text-[--foreground-subtle] cursor-not-allowed"
            : "bg-[--primary]/10 text-[--primary] hover:bg-[--primary] hover:text-white"
        )}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Commande rapide (type tableur) ──────────────────

function QuickOrderTable({
  produits,
  panier,
  onChange,
}: {
  produits: Produit[];
  panier: Record<string, number>;
  onChange: (id: string, q: number) => void;
}) {
  const total = produits.reduce((sum, p) => {
    const q = panier[p.id] ?? 0;
    return sum + q * p.prix;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="bg-[--primary]/5 border border-[--primary]/20 rounded-xl p-4 flex items-center gap-3">
        <Zap className="w-5 h-5 text-[--primary] shrink-0" />
        <p className="text-sm text-[--foreground]">
          <strong>Mode commande rapide</strong> — Saisissez directement les quantités.
          Le total se met à jour en temps réel.
        </p>
      </div>

      <div className="rounded-xl border border-[--border] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[--background-subtle]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[--foreground-muted] w-2/5">
                Produit
              </th>
              <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">
                Prix/unité HT
              </th>
              <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">
                Prix/carton
              </th>
              <th className="text-center px-4 py-3 font-medium text-[--foreground-muted] w-24">
                Qté
              </th>
              <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">
                Sous-total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--border]">
            {produits.map((p) => {
              const q = panier[p.id] ?? 0;
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "hover:bg-[--accent] transition-colors",
                    q > 0 && "bg-[--primary]/3"
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <div>
                        <p className="font-medium text-[--foreground]">{p.nom}</p>
                        <p className="text-[10px] text-[--foreground-muted] italic">
                          {p.nomMG}
                        </p>
                        {p.qteMinCommande > 1 && (
                          <p className="text-[10px] text-[--foreground-subtle]">
                            Min : {p.qteMinCommande} unités
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-4 py-2.5 text-mga">
                    {formatMGA(p.prix)}<span className="text-[--foreground-muted] text-xs">/{p.unite}</span>
                  </td>
                  <td className="text-right px-4 py-2.5">
                    {p.prixCarton ? (
                      <span className="text-xs text-[--foreground-muted]">
                        {formatMGA(p.prixCarton)}/{p.uniteCarton}
                      </span>
                    ) : (
                      <span className="text-[--foreground-subtle]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={q || ""}
                      placeholder="0"
                      onChange={(e) => onChange(p.id, Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={p.stock === "rupture"}
                      className={cn(
                        "w-full text-center text-sm rounded-lg px-2 py-1.5 border",
                        "bg-[--input] border-[--border]",
                        "focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent",
                        q > 0 && "border-[--primary] bg-[--primary]/5 font-semibold",
                        p.stock === "rupture" && "opacity-40 cursor-not-allowed"
                      )}
                    />
                  </td>
                  <td className="text-right px-4 py-2.5 font-semibold text-mga">
                    {q > 0 ? formatMGA(q * p.prix) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {total > 0 && (
            <tfoot className="bg-[--background-subtle]">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-bold text-right text-[--foreground]">
                  Total estimé HT
                </td>
                <td className="px-4 py-3 font-bold text-right text-[--primary] text-mga text-base">
                  {formatMGA(total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button size="lg" asChild>
            <Link href="/panier">
              <ShoppingCart className="w-4 h-4" />
              Valider la sélection — {formatMGA(total)}
            </Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
