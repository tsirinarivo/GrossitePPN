"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Tag,
  Package,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useShopCart } from "@/store/shop-cart.store";
import { toast } from "sonner";

type PromoApplied = {
  code: string;
  nom: string;
  valeur: number;
  typeValeur: string;
  remise: number;
};

export function PanierPage() {
  const { lignes, modifierQte: modifierQteStore, supprimer: supprimerStore } = useShopCart();
  const [codePromo, setCodePromo] = useState("");
  const [promo, setPromo] = useState<PromoApplied | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    useShopCart.persist.rehydrate();
  }, []);

  const total = lignes.reduce((s, l) => s + l.qte * l.prixUnit, 0);

  // Re-vérifier la promo si le total change
  useEffect(() => {
    if (!promo) return;
    if (promo.typeValeur === "pct") {
      const nouvelleRemise = Math.round((total * promo.valeur) / 100);
      if (nouvelleRemise !== promo.remise) {
        setPromo({ ...promo, remise: nouvelleRemise });
      }
    }
  }, [total, promo]);

  const remisePromo = promo?.remise ?? 0;
  const totalFinal = Math.max(0, total - remisePromo);

  const appliquerCode = async () => {
    if (!codePromo.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/shop/promotions/valider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codePromo.trim(), totalPanier: total }),
      });
      const data = await res.json();
      if (data.valide && data.promotion) {
        setPromo({
          code: data.promotion.code,
          nom: data.promotion.nom,
          valeur: data.promotion.valeur,
          typeValeur: data.promotion.typeValeur,
          remise: data.remise,
        });
        toast.success(`Code ${data.promotion.code} appliqué`);
      } else {
        toast.error(data.raison ?? "Code invalide");
      }
    } catch {
      toast.error("Erreur lors de la vérification");
    } finally {
      setVerifying(false);
    }
  };

  const retirerCode = () => {
    setPromo(null);
    setCodePromo("");
  };

  const modifierQte = (produitId: string, delta: number) => modifierQteStore(produitId, delta);

  const supprimer = (produitId: string) => supprimerStore(produitId);

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

      {/* Sur mobile : récap en premier, lignes dessous */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lignes */}
        <div className="lg:col-span-2 space-y-3 order-2 lg:order-1">
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
                </div>

                {/* Quantité */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => modifierQte(l.produitId, -1)}
                    className="w-10 h-10 rounded-xl border border-[--border] flex items-center justify-center hover:bg-[--accent] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold w-7 text-center">{l.qte}</span>
                  <button
                    onClick={() => modifierQte(l.produitId, 1)}
                    className="w-10 h-10 rounded-xl border border-[--border] flex items-center justify-center hover:bg-[--accent] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
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
                  onClick={() => supprimer(l.produitId)}
                  className="text-[--foreground-subtle] hover:text-[--destructive] transition-colors p-2.5"
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

        {/* Récapitulatif — affiché en premier sur mobile */}
        <div className="space-y-4 order-1 lg:order-2">
          <div className="rounded-2xl border border-[--card-border] bg-[--card] p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-[--foreground]">Récapitulatif</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[--foreground-muted]">
                <span>Sous-total</span>
                <span className="text-mga">{formatMGA(total)}</span>
              </div>
              {promo && (
                <div className="flex justify-between text-[--success]">
                  <span>
                    Code {promo.code}
                    {promo.typeValeur === "pct" ? ` (${promo.valeur}%)` : ""}
                  </span>
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
              {promo ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[--success]/30 bg-[--success]/5">
                  <Check className="w-3.5 h-3.5 text-[--success] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[--success]">{promo.code}</div>
                    <div className="text-[10px] text-[--foreground-muted] truncate">{promo.nom}</div>
                  </div>
                  <button
                    onClick={retirerCode}
                    className="p-1 rounded hover:bg-[--accent] text-[--foreground-subtle]"
                    title="Retirer le code"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={codePromo}
                    onChange={(e) => setCodePromo(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        appliquerCode();
                      }
                    }}
                    placeholder="Code promo"
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={appliquerCode}
                    disabled={verifying || !codePromo.trim()}
                  >
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                  </Button>
                </div>
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
              🔒 Paiement sécurisé — Mvola, Orange Money, Espèces
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
