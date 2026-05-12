"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Package,
  Info,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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

      {/* Produits connexes */}
      <div className="mt-10 space-y-4">
        <Separator />
        <h2 className="text-lg font-semibold text-[--foreground]">Vous pourriez aussi aimer</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {p.related.map((r) => (
            <Link key={r.slug} href={`/produit/${r.slug}`}>
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{r.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-[--foreground]">{r.nom}</p>
                    <p className="text-xs text-[--primary] font-medium text-mga">
                      {formatMGA(r.prix)}/kg
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
