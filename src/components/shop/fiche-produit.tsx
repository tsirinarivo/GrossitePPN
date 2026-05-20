"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Info,
  CheckCircle2,
  ChevronRight,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Catalogue local (source de vérité pour les suggestions similaires)
const CATALOGUE_ALL = [
  { id: "1", slug: "riz-makalioka", nom: "Riz Makalioka", nomMG: "Vary Makalioka", cat: "riz", prix: 3200, unite: "kg", emoji: "🌾" },
  { id: "2", slug: "riz-tsipala", nom: "Riz Tsipala", nomMG: "Vary Tsipala", cat: "riz", prix: 2800, unite: "kg", emoji: "🌾" },
  { id: "3", slug: "riz-saonjo", nom: "Riz Saonjo", nomMG: "Vary Saonjo", cat: "riz", prix: 2600, unite: "kg", emoji: "🌾" },
  { id: "4", slug: "huile-tiko-1l", nom: "Huile Tiko 1L", nomMG: "Menaka Tiko 1L", cat: "huile", prix: 12000, unite: "btl", emoji: "🫙" },
  { id: "5", slug: "huile-tiko-5l", nom: "Huile Tiko 5L", nomMG: "Menaka Tiko 5L", cat: "huile", prix: 55000, unite: "btl", emoji: "🫙" },
  { id: "6", slug: "sucre-blanc", nom: "Sucre Blanc", nomMG: "Siramamy Fotsy", cat: "sucre", prix: 4800, unite: "kg", emoji: "🍬" },
  { id: "7", slug: "sucre-roux", nom: "Sucre Roux", nomMG: "Siramamy Mena", cat: "sucre", prix: 5200, unite: "kg", emoji: "🍬" },
  { id: "8", slug: "savon-madar", nom: "Savon Madar", nomMG: "Savony Madar", cat: "savon", prix: 800, unite: "pce", emoji: "🧼" },
  { id: "9", slug: "savon-doux", nom: "Savon Doux", nomMG: "Savony Malemy", cat: "savon", prix: 1200, unite: "pce", emoji: "🧼" },
  { id: "10", slug: "lait-gloria", nom: "Lait Gloria concentré", nomMG: "Ronono Gloria", cat: "lait", prix: 4500, unite: "bte", emoji: "🥛" },
  { id: "11", slug: "lait-kiri", nom: "Lait Kiri", nomMG: "Ronono Kiri", cat: "lait", prix: 3800, unite: "bte", emoji: "🥛" },
  { id: "12", slug: "farine-mixa", nom: "Farine Mixa 1kg", nomMG: "Harina Mixa 1kg", cat: "farine", prix: 4200, unite: "pct", emoji: "🌾" },
  { id: "13", slug: "sel-marin", nom: "Sel marin 1kg", nomMG: "Sira anaty 1kg", cat: "sel", prix: 700, unite: "pct", emoji: "🧂" },
  { id: "14", slug: "haricot-blanc", nom: "Haricots blancs", nomMG: "Tsaramaso fotsy", cat: "legumes", prix: 5500, unite: "kg", emoji: "🫘" },
  { id: "15", slug: "tomate-boite", nom: "Tomates concentrées 400g", nomMG: "Voatabia boaty", cat: "conserves", prix: 3500, unite: "bte", emoji: "🥫" },
  { id: "16", slug: "sardines-boite", nom: "Sardines huile 250g", nomMG: "Trozona menaka", cat: "conserves", prix: 4800, unite: "bte", emoji: "🐟" },
  { id: "17", slug: "savon-protex", nom: "Savon Protex", nomMG: "Savony Protex", cat: "savon", prix: 2500, unite: "pce", emoji: "🧼" },
];

// Données de démo de la fiche Riz Makalioka
const PRODUIT_DEMO = {
  nom: "Riz Makalioka",
  nomMG: "Vary Makalioka",
  emoji: "🌾",
  description:
    "Le Riz Makalioka est une variété de riz premium cultivée dans les Hauts Plateaux de Madagascar. Grain long, translucide, saveur délicate et cuisson parfaite. Idéal pour la consommation quotidienne et les événements.",
  categorie: "Riz & Céréales",
  marque: "Producteurs des Hautes Terres",
  uniteBase: "kg",
  uniteesVente: [
    { id: "kg", nom: "kg (vrac)", facteur: 1, prixDetail: 3200, prixSemiGros: 3000, prixGros: 2800 },
    { id: "sac25", nom: "Sac 25 kg", facteur: 25, prixDetail: 76000, prixSemiGros: 72000, prixGros: 67000 },
    { id: "sac50", nom: "Sac 50 kg", facteur: 50, prixDetail: 145000, prixSemiGros: 138000, prixGros: 130000 },
  ],
  stockBase: 2500,
  palier: "gros" as const,
  note: 4.8,
  nbAvis: 23,
  tags: ["Sans OGM", "Récolte 2026", "Hautes Terres"],
  related: [
    { slug: "riz-tsipala", nom: "Riz Tsipala", emoji: "🌾", prix: 2800 },
    { slug: "riz-saonjo", nom: "Riz Saonjo", emoji: "🌾", prix: 2600 },
  ],
};

const PALIER_LABELS = { gros: "Gros", semi_gros: "Semi-gros", detail: "Détail" };

export function FicheProduit({ slug }: { slug: string }) {
  const p = PRODUIT_DEMO; // en prod: fetch par slug
  const [uniteId, setUniteId] = useState(p.uniteesVente[0]!.id);
  const [quantite, setQuantite] = useState(1);

  // Suggestions produits similaires : même catégorie, exclu le produit courant, max 4, mélangés
  const produitsSimilaires = useMemo(() => {
    // Déduire la catégorie du slug courant (simplification de démo)
    const entree = CATALOGUE_ALL.find((x) => x.slug === slug);
    const cat = entree?.cat ?? "riz";
    const similaires = CATALOGUE_ALL.filter(
      (x) => x.cat === cat && x.slug !== slug
    );
    // Mélange pseudo-aléatoire reproductible (Fisher-Yates avec seed fixe par slug)
    const copy = [...similaires];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(((i * 7 + slug.length * 3) % (i + 1)));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, 4);
  }, [slug]);

  const unite = p.uniteesVente.find((u) => u.id === uniteId) ?? p.uniteesVente[0]!;
  const prix = p.palier === "gros"
    ? unite.prixGros
    : p.palier === "semi_gros"
      ? unite.prixSemiGros
      : unite.prixDetail;

  const stockEnUnite = Math.floor(p.stockBase / unite.facteur);
  const stockVracRestant = p.stockBase % unite.facteur;

  const handleAjouterPanier = () => {
    toast.success(`${quantite}× ${unite.nom} de ${p.nom} ajouté(s) au panier`, {
      description: `Total : ${formatMGA(prix * quantite)}`,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[--foreground-muted] mb-6">
        <Link href="/shop" className="hover:text-[--foreground] transition-colors">
          Catalogue
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[--foreground-subtle]">{p.categorie}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[--foreground]">{p.nom}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ── Visuel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="aspect-square rounded-3xl bg-[--background-muted] flex items-center justify-center">
            <span className="text-[120px]">{p.emoji}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[p.emoji, p.emoji, p.emoji].map((e, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-xl bg-[--background-muted] flex items-center justify-center cursor-pointer border-2 transition-all",
                  i === 0 ? "border-[--primary]" : "border-transparent hover:border-[--border]"
                )}
              >
                <span className="text-3xl">{e}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Infos + achat ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-semibold text-[--primary] uppercase tracking-widest">
                {p.categorie}
              </span>
              <Badge variant={p.palier === "gros" ? "success" : "secondary"} className="text-[10px]">
                Prix {PALIER_LABELS[p.palier]}
              </Badge>
            </div>
            <h1 className="text-display-sm text-[--foreground]">{p.nom}</h1>
            <p className="text-[--foreground-muted] italic">{p.nomMG}</p>

            {/* Note */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < Math.floor(p.note)
                        ? "text-[--warning] fill-[--warning]"
                        : "text-[--border]"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-[--foreground-muted]">
                {p.note} ({p.nbAvis} avis)
              </span>
            </div>
          </div>

          {/* Sélecteur unité */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[--foreground]">
              Conditionnement
            </label>
            <div className="grid grid-cols-1 gap-2">
              {p.uniteesVente.map((u) => {
                const prixU = p.palier === "gros" ? u.prixGros : p.palier === "semi_gros" ? u.prixSemiGros : u.prixDetail;
                const stockU = Math.floor(p.stockBase / u.facteur);
                return (
                  <button
                    key={u.id}
                    onClick={() => setUniteId(u.id)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                      uniteId === u.id
                        ? "border-[--primary] bg-[--primary]/5"
                        : "border-[--border] hover:border-[--border-strong]"
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[--foreground]">{u.nom}</p>
                      <p className="text-xs text-[--foreground-muted]">
                        Stock : {stockU} {u.nom.includes("kg") ? "" : u.nom}
                        {u.facteur > 1 && (
                          <span className="ml-1 opacity-60">
                            (= {stockU * u.facteur} {p.uniteBase})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-mga">{formatMGA(prixU)}</p>
                      {u.facteur > 1 && (
                        <p className="text-[10px] text-[--foreground-subtle]">
                          soit {formatMGA(prixU / u.facteur)}/{p.uniteBase}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock affiché intelligemment */}
          <div className="flex items-center gap-2 text-sm bg-[--success]/8 text-[--success] px-4 py-3 rounded-xl border border-[--success]/20">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              En stock —{" "}
              <strong>
                {stockEnUnite} {unite.nom}
                {stockVracRestant > 0 && unite.facteur > 1 && ` + ${stockVracRestant} ${p.uniteBase} vrac`}
              </strong>
            </span>
          </div>

          {/* Quantité + prix */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[--foreground]">Quantité</label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-[--background-muted] rounded-xl p-1">
                <button
                  onClick={() => setQuantite(Math.max(1, quantite - 1))}
                  className="w-9 h-9 rounded-lg hover:bg-[--card] flex items-center justify-center transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-bold text-[--foreground]">{quantite}</span>
                <button
                  onClick={() => setQuantite(quantite + 1)}
                  className="w-9 h-9 rounded-lg hover:bg-[--card] flex items-center justify-center transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-right flex-1">
                <p className="text-2xl font-bold text-[--primary] text-mga">
                  {formatMGA(prix * quantite)}
                </p>
                <p className="text-xs text-[--foreground-muted]">
                  {formatMGA(prix)} × {quantite} {unite.nom}
                </p>
              </div>
            </div>

            <Button size="xl" className="w-full" onClick={handleAjouterPanier}>
              <ShoppingCart className="w-5 h-5" />
              Ajouter au panier
            </Button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <span
                key={t}
                className="text-xs text-[--foreground-muted] bg-[--background-muted] px-2.5 py-1 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Description */}
      <div className="mt-10 space-y-4">
        <Separator />
        <h2 className="text-lg font-semibold text-[--foreground] flex items-center gap-2">
          <Info className="w-5 h-5 text-[--primary]" />
          Description
        </h2>
        <p className="text-[--foreground-muted] leading-relaxed">{p.description}</p>
      </div>

      {/* Suggestions produits similaires */}
      {produitsSimilaires.length > 0 && (
        <div className="mt-10 space-y-4">
          <Separator />
          <h2 className="text-lg font-semibold text-[--foreground] flex items-center gap-2">
            <Heart className="w-5 h-5 text-[--primary]" />
            Vous aimerez aussi
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {produitsSimilaires.map((r) => (
              <Link key={r.slug} href={`/produit/${r.slug}`} className="shrink-0">
                <Card className="w-40 hover:shadow-md hover:-translate-y-0.5 transition-all border-[--card-border]">
                  <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[--background-muted] flex items-center justify-center">
                      <span className="text-2xl">{r.emoji}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[--foreground] leading-tight line-clamp-2">
                        {r.nom}
                      </p>
                      <p className="text-[10px] text-[--foreground-muted] italic line-clamp-1 mt-0.5">
                        {r.nomMG}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-mga text-[--primary]">
                      {formatMGA(r.prix)}
                      <span className="text-[--foreground-muted] font-normal">/{r.unite}</span>
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
