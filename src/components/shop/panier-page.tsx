"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Tag,
  Lock,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function PanierPage() {
  const [lignes, setLignes] = useState<{ id: string; produitId: string; nom: string; unite: string; qte: number; prixUnit: number; emoji: string; reserve: boolean }[]>([]);
  const [codePromo, setCodePromo] = useState("");
  const [promoAppliquee, setPromoAppliquee] = useState(false);

  const total = lignes.reduce((s, l) => s + l.qte * l.prixUnit, 0);
  const remisePromo = promoAppliquee ? Math.round(total * 0.05) : 0;
  const totalFinal = total - remisePromo;

  const modifierQte = (id: string, delta: number) => {
    setLignes((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qte: Math.max(0, l.qte + delta) } : l))
        .filter((l) => l.qte > 0)
    );
  };

  const supprimer = (id: string) => setLignes((prev) => prev.filter((l) => l.id !== id));

  if (lignes.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-[--background-muted] flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-10 h-10 text-[--foreground-subtle]" />
        </div>
        <h2 className="text-2xl font-bold text-[--foreground] mb-2">Panier vide</h2>
        <p className="text-[--foreground-muted] mb-6">
          Parcourez notre catalogue et ajoutez des produits à votre panier.
        </p>
        <Button size="lg" asChild>
          <Link href="/shop">
            <Package className="w-4 h-4" />
            Voir le catalogue
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingCart className="w-6 h-6 text-[--primary]" />
        <h1 className="text-2xl font-bold text-[--foreground]">Mon panier</h1>
        <Badge className="text-sm">{lignes.length} article{lignes.length > 1 ? "s" : ""}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lignes */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {lignes.map((l) => (
              <motion.div
                key={l.id}
                layout
                exit={{ opacity: 0, x: -16, height: 0 }}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border border-[--card-border] bg-[--card] p-4",
                  "hover:border-[--primary]/20 transition-all"
                )}
              >
                {/* Emoji produit */}
                <div className="w-14 h-14 rounded-xl bg-[--background-muted] flex items-center justify-center text-3xl shrink-0">
                  {l.emoji}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[--foreground] truncate">{l.nom}</p>
                  <p className="text-sm text-[--foreground-muted]">{l.unite}</p>
                  {l.reserve && (
                    <div className="flex items-center gap-1 text-[10px] text-[--success] mt-1">
                      <Lock className="w-2.5 h-2.5" />
                      Stock réservé (15 min)
                    </div>
                  )}
                </div>

                {/* Quantité */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => modifierQte(l.id, -1)}
                    className="w-8 h-8 rounded-lg border border-[--border] flex items-center justify-center hover:bg-[--accent] transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{l.qte}</span>
                  <button
                    onClick={() => modifierQte(l.id, 1)}
                    className="w-8 h-8 rounded-lg border border-[--border] flex items-center justify-center hover:bg-[--accent] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Total ligne */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-mga">{formatMGA(l.qte * l.prixUnit)}</p>
                  <p className="text-xs text-[--foreground-muted] text-mga">
                    {formatMGA(l.prixUnit)}/unité
                  </p>
                </div>

                {/* Supprimer */}
                <button
                  onClick={() => supprimer(l.id)}
                  className="text-[--foreground-subtle] hover:text-[--destructive] transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Continuer */}
          <div className="pt-2">
            <Link
              href="/shop"
              className="text-sm text-[--primary] hover:text-[--primary-hover] font-medium transition-colors"
            >
              ← Continuer mes achats
            </Link>
          </div>
        </div>

        {/* Récapitulatif */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[--card-border] bg-[--card] p-6 space-y-4">
            <h3 className="font-semibold text-[--foreground]">Récapitulatif</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[--foreground-muted]">
                <span>Sous-total</span>
                <span className="text-mga">{formatMGA(total)}</span>
              </div>
              {remisePromo > 0 && (
                <div className="flex justify-between text-[--success]">
                  <span>Code promo (5%)</span>
                  <span className="text-mga">−{formatMGA(remisePromo)}</span>
                </div>
              )}
              <div className="flex justify-between text-[--foreground-muted]">
                <span>Livraison</span>
                <span className="text-[--success] font-medium">Gratuite</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-[--primary] text-mga">{formatMGA(totalFinal)}</span>
              </div>
            </div>

            {/* Code promo */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={codePromo}
                  onChange={(e) => setCodePromo(e.target.value.toUpperCase())}
                  placeholder="Code promo"
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (codePromo === "PPN5") setPromoAppliquee(true);
                  }}
                >
                  <Tag className="w-3.5 h-3.5" />
                </Button>
              </div>
              {promoAppliquee && (
                <p className="text-xs text-[--success] flex items-center gap-1">
                  ✓ Code PPN5 appliqué — 5% de remise
                </p>
              )}
            </div>

            <Button size="lg" className="w-full" asChild>
              <Link href="/checkout">
                Commander
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            {/* Sécurité */}
            <div className="flex items-center gap-2 text-xs text-[--foreground-subtle]">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Paiement sécurisé — Mvola, Orange Money, Espèces
            </div>
          </div>

          {/* Résumé produits */}
          <div className="rounded-2xl border border-[--card-border] bg-[--card] p-4 space-y-2">
            {lignes.map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-xs">
                <span className="text-lg">{l.emoji}</span>
                <span className="text-[--foreground-muted] flex-1 truncate">
                  {l.qte}× {l.nom}
                </span>
                <span className="font-medium text-mga shrink-0">
                  {formatMGA(l.qte * l.prixUnit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
