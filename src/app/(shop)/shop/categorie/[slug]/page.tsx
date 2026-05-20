"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useShopCart } from "@/store/shop-cart.store";

// Catalogue local (même données que shop-catalogue)
const CATALOGUE = [
  { id: "1", slug: "riz-makalioka", nom: "Riz Makalioka", nomMG: "Vary Makalioka", cat: "riz", prix: 3200, unite: "kg", prixCarton: 145000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 50, emoji: "🌾" },
  { id: "2", slug: "riz-tsipala", nom: "Riz Tsipala", nomMG: "Vary Tsipala", cat: "riz", prix: 2800, unite: "kg", prixCarton: 125000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🌾" },
  { id: "3", slug: "riz-saonjo", nom: "Riz Saonjo", nomMG: "Vary Saonjo", cat: "riz", prix: 2600, unite: "kg", prixCarton: 115000, uniteCarton: "Sac 50kg", stock: "limite", qteMinCommande: 25, emoji: "🌾" },
  { id: "4", slug: "huile-tiko-1l", nom: "Huile Tiko 1L", nomMG: "Menaka Tiko 1L", cat: "huile", prix: 12000, unite: "btl", prixCarton: 132000, uniteCarton: "Carton 12", stock: "ok", qteMinCommande: 10, emoji: "🫙" },
  { id: "5", slug: "huile-tiko-5l", nom: "Huile Tiko 5L", nomMG: "Menaka Tiko 5L", cat: "huile", prix: 55000, unite: "btl", prixCarton: null, uniteCarton: null, stock: "ok", qteMinCommande: 1, emoji: "🫙" },
  { id: "6", slug: "sucre-blanc", nom: "Sucre Blanc", nomMG: "Siramamy Fotsy", cat: "sucre", prix: 4800, unite: "kg", prixCarton: 220000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🍬" },
  { id: "7", slug: "sucre-roux", nom: "Sucre Roux", nomMG: "Siramamy Mena", cat: "sucre", prix: 5200, unite: "kg", prixCarton: 240000, uniteCarton: "Sac 50kg", stock: "limite", qteMinCommande: 1, emoji: "🍬" },
  { id: "8", slug: "savon-madar", nom: "Savon Madar", nomMG: "Savony Madar", cat: "savon", prix: 800, unite: "pce", prixCarton: 70000, uniteCarton: "Carton 100", stock: "ok", qteMinCommande: 1, emoji: "🧼" },
  { id: "9", slug: "savon-doux", nom: "Savon Doux", nomMG: "Savony Malemy", cat: "savon", prix: 1200, unite: "pce", prixCarton: 108000, uniteCarton: "Carton 100", stock: "ok", qteMinCommande: 1, emoji: "🧼" },
  { id: "10", slug: "lait-gloria", nom: "Lait Gloria concentré", nomMG: "Ronono Gloria", cat: "lait", prix: 4500, unite: "bte", prixCarton: 200000, uniteCarton: "Carton 48", stock: "ok", qteMinCommande: 1, emoji: "🥛" },
  { id: "11", slug: "lait-kiri", nom: "Lait Kiri", nomMG: "Ronono Kiri", cat: "lait", prix: 3800, unite: "bte", prixCarton: 175000, uniteCarton: "Carton 48", stock: "rupture", qteMinCommande: 1, emoji: "🥛" },
  { id: "12", slug: "farine-mixa", nom: "Farine Mixa 1kg", nomMG: "Harina Mixa 1kg", cat: "farine", prix: 4200, unite: "pct", prixCarton: 96000, uniteCarton: "Carton 24", stock: "ok", qteMinCommande: 1, emoji: "🌾" },
  { id: "13", slug: "sel-marin", nom: "Sel marin 1kg", nomMG: "Sira anaty 1kg", cat: "sel", prix: 700, unite: "pct", prixCarton: 30000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🧂" },
  { id: "14", slug: "haricot-blanc", nom: "Haricots blancs", nomMG: "Tsaramaso fotsy", cat: "legumes", prix: 5500, unite: "kg", prixCarton: 250000, uniteCarton: "Sac 50kg", stock: "ok", qteMinCommande: 1, emoji: "🫘" },
  { id: "15", slug: "tomate-boite", nom: "Tomates concentrées 400g", nomMG: "Voatabia boaty", cat: "conserves", prix: 3500, unite: "bte", prixCarton: 156000, uniteCarton: "Carton 48", stock: "ok", qteMinCommande: 1, emoji: "🥫" },
  { id: "16", slug: "sardines-boite", nom: "Sardines huile 250g", nomMG: "Trozona menaka", cat: "conserves", prix: 4800, unite: "bte", prixCarton: 216000, uniteCarton: "Carton 48", stock: "limite", qteMinCommande: 1, emoji: "🐟" },
  { id: "17", slug: "savon-protex", nom: "Savon Protex", nomMG: "Savony Protex", cat: "savon", prix: 2500, unite: "pce", prixCarton: 220000, uniteCarton: "Carton 100", stock: "ok", qteMinCommande: 12, emoji: "🧼" },
];

const CAT_LABELS: Record<string, { label: string; emoji: string }> = {
  riz: { label: "Riz & Céréales", emoji: "🌾" },
  huile: { label: "Huile", emoji: "🫙" },
  sucre: { label: "Sucre", emoji: "🍬" },
  savon: { label: "Savon & Hygiène", emoji: "🧼" },
  lait: { label: "Lait & Produits laitiers", emoji: "🥛" },
  farine: { label: "Farine", emoji: "🌾" },
  sel: { label: "Sel", emoji: "🧂" },
  conserves: { label: "Conserves", emoji: "🥫" },
  legumes: { label: "Légumes secs", emoji: "🫘" },
};

function StockBadge({ stock }: { stock: string }) {
  if (stock === "ok") {
    return <Badge variant="success" className="text-[9px] px-1.5 py-0.5">En stock</Badge>;
  }
  if (stock === "limite") {
    return <Badge variant="warning" className="text-[9px] px-1.5 py-0.5">Stock limité</Badge>;
  }
  return <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5">Rupture</Badge>;
}

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
              <span className="text-xs font-semibold text-[--foreground-muted]">Rupture</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <StockBadge stock={p.stock} />

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

export default function CategorieSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const { lignes, ajouterArticle } = useShopCart();

  useEffect(() => {
    useShopCart.persist.rehydrate();
  }, []);

  const produits = useMemo(
    () => CATALOGUE.filter((p) => p.cat === slug),
    [slug]
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

  const catInfo = CAT_LABELS[slug];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation */}
      <div className="flex items-center gap-2 text-sm text-[--foreground-muted] mb-6">
        <Link
          href="/shop"
          className="flex items-center gap-1 hover:text-[--foreground] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Catalogue
        </Link>
        <span>/</span>
        <span className="text-[--foreground]">
          {catInfo ? catInfo.label : slug}
        </span>
      </div>

      {/* En-tête catégorie */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {catInfo && (
            <div className="w-14 h-14 rounded-2xl bg-[--background-muted] flex items-center justify-center text-3xl">
              {catInfo.emoji}
            </div>
          )}
          <div>
            <h1 className="text-display-sm text-[--foreground]">
              {catInfo ? catInfo.label : slug}
            </h1>
            <p className="text-[--foreground-muted] text-sm mt-1">
              {produits.length} produit{produits.length > 1 ? "s" : ""} disponible
              {produits.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

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

      {produits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-5xl">📦</div>
          <h3 className="text-lg font-semibold text-[--foreground]">
            Aucun produit dans cette catégorie
          </h3>
          <p className="text-[--foreground-muted] text-sm">
            La catégorie « {slug} » n'existe pas ou ne contient pas encore de produits.
          </p>
          <Button variant="outline" asChild>
            <Link href="/shop">Retour au catalogue</Link>
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {produits.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
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
    </div>
  );
}
