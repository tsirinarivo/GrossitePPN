"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin,
  Smartphone,
  Banknote,
  CreditCard,
  Clock,
  CheckCircle2,
  ChevronRight,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const ETAPES = ["Livraison", "Paiement", "Confirmation"];

const MODES_PAIEMENT = [
  { id: "mvola", label: "Mvola", icon: Smartphone, couleur: "text-red-500", desc: "Paiement mobile Telma" },
  { id: "orange_money", label: "Orange Money", icon: Smartphone, couleur: "text-orange-500", desc: "Paiement mobile Orange" },
  { id: "airtel_money", label: "Airtel Money", icon: Smartphone, couleur: "text-blue-500", desc: "Paiement mobile Airtel" },
  { id: "especes", label: "Espèces", icon: Banknote, couleur: "text-green-600", desc: "Paiement à la livraison" },
  { id: "credit", label: "Crédit client", icon: CreditCard, couleur: "text-[--primary]", desc: "Encours disponible : 350 000 Ar" },
];

const CRENEAUX = [
  { id: "matin", label: "Matin 8h–12h", dispo: true },
  { id: "aprem", label: "Après-midi 14h–18h", dispo: true },
  { id: "urgent", label: "Livraison urgente (+15 000 Ar)", dispo: true },
];

const livSchema = z.object({
  adresse: z.string().min(5, "Adresse requise"),
  quartier: z.string().min(2, "Quartier requis"),
  telephone: z.string().min(10, "Téléphone requis"),
  notes: z.string().optional(),
});

type LivFields = z.infer<typeof livSchema>;

const TOTAL = 499000;

export function CheckoutPage() {
  const [etape, setEtape] = useState(0);
  const [modePaiement, setModePaiement] = useState<string | null>(null);
  const [creneau, setCreneau] = useState<string>("matin");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LivFields>({ resolver: zodResolver(livSchema) });

  const onLivraisonSubmit = () => setEtape(1);

  const onPayer = async () => {
    if (!modePaiement) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setEtape(2);
    toast.success("Commande validée !", {
      description: "Vous recevrez une confirmation par SMS.",
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Étapes */}
      <div className="flex items-center gap-0 mb-8">
        {ETAPES.map((e, i) => (
          <div key={e} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0",
                  i < etape
                    ? "bg-[--success] text-white"
                    : i === etape
                      ? "bg-[--primary] text-white ring-4 ring-[--primary]/20"
                      : "bg-[--border] text-[--foreground-muted]"
                )}
              >
                {i < etape ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium text-center",
                  i === etape ? "text-[--foreground]" : "text-[--foreground-muted]"
                )}
              >
                {e}
              </span>
            </div>
            {i < ETAPES.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2 sm:mx-3 mb-5 sm:mb-0", i < etape ? "bg-[--success]" : "bg-[--border]")} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Étape 0 : Livraison ── */}
        {etape === 0 && (
          <motion.div
            key="livraison"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
          >
            <form onSubmit={handleSubmit(onLivraisonSubmit)} className="space-y-6">
              <div className="rounded-2xl border border-[--card-border] bg-[--card] p-6 space-y-4">
                <h2 className="font-semibold text-[--foreground] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[--primary]" />
                  Adresse de livraison
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium">Adresse</label>
                    <Input
                      {...register("adresse")}
                      placeholder="N° lot, rue, immeuble..."
                      error={!!errors.adresse}
                    />
                    {errors.adresse && <p className="text-xs text-[--destructive]">{errors.adresse.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Quartier / Commune</label>
                    <Input
                      {...register("quartier")}
                      placeholder="Analakely, Behoririka..."
                      error={!!errors.quartier}
                    />
                    {errors.quartier && <p className="text-xs text-[--destructive]">{errors.quartier.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      {...register("telephone")}
                      placeholder="034 XX XXX XX"
                      error={!!errors.telephone}
                    />
                    {errors.telephone && <p className="text-xs text-[--destructive]">{errors.telephone.message}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium">Notes pour le livreur (optionnel)</label>
                    <Input {...register("notes")} placeholder="Bâtiment bleu, 2ème étage..." />
                  </div>
                </div>
              </div>

              {/* Créneau */}
              <div className="rounded-2xl border border-[--card-border] bg-[--card] p-6 space-y-4">
                <h2 className="font-semibold text-[--foreground] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[--primary]" />
                  Créneau de livraison
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CRENEAUX.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCreneau(c.id)}
                      className={cn(
                        "flex flex-col items-center p-4 rounded-xl border text-sm transition-all",
                        creneau === c.id
                          ? "border-[--primary] bg-[--primary]/5 text-[--foreground]"
                          : "border-[--border] hover:border-[--border-strong] text-[--foreground-muted]"
                      )}
                    >
                      <span className="font-medium">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Récap commande */}
              <div className="rounded-2xl border border-[--border] bg-[--background-subtle] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-[--foreground-muted]" />
                  <span className="text-sm text-[--foreground-muted]">Total commande</span>
                </div>
                <span className="font-bold text-[--foreground] text-mga">{formatMGA(TOTAL)}</span>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Continuer vers le paiement
                <ChevronRight className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}

        {/* ── Étape 1 : Paiement ── */}
        {etape === 1 && (
          <motion.div
            key="paiement"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-[--card-border] bg-[--card] p-6 space-y-4">
              <h2 className="font-semibold text-[--foreground]">Mode de paiement</h2>
              <div className="space-y-2">
                {MODES_PAIEMENT.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModePaiement(m.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                      modePaiement === m.id
                        ? "border-[--primary] bg-[--primary]/5"
                        : "border-[--border] hover:border-[--border-strong]"
                    )}
                  >
                    <m.icon className={cn("w-5 h-5 shrink-0", m.couleur)} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[--foreground]">{m.label}</p>
                      <p className="text-xs text-[--foreground-muted]">{m.desc}</p>
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-all",
                        modePaiement === m.id
                          ? "border-[--primary] bg-[--primary]"
                          : "border-[--border]"
                      )}
                    />
                  </button>
                ))}
              </div>

              {modePaiement && ["mvola", "orange_money", "airtel_money"].includes(modePaiement) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <Separator />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Numéro de téléphone</label>
                    <Input placeholder="034 XX XXX XX" />
                  </div>
                  <p className="text-xs text-[--foreground-muted] bg-[--background-subtle] p-3 rounded-lg">
                    Vous recevrez une demande de confirmation sur votre mobile.
                    Validez le paiement puis cliquez sur "Confirmer".
                  </p>
                </motion.div>
              )}
            </div>

            {/* Récap */}
            <div className="rounded-2xl border border-[--card-border] bg-[--card] p-5 space-y-2 text-sm">
              <div className="flex justify-between text-[--foreground-muted]">
                <span>Sous-total</span>
                <span className="text-mga">{formatMGA(TOTAL)}</span>
              </div>
              <div className="flex justify-between text-[--foreground-muted]">
                <span>Livraison</span>
                <span className="text-[--success] font-medium">Gratuite</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>À payer</span>
                <span className="text-[--primary] text-mga">{formatMGA(TOTAL)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setEtape(0)}>
                Retour
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={!modePaiement}
                loading={loading}
                onClick={onPayer}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmer la commande
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Étape 2 : Confirmation ── */}
        {etape === 2 && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-[--success]/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-[--success]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[--foreground]">Commande confirmée !</h2>
              <p className="text-[--foreground-muted] mt-2">
                CMD-2026-0852 · Livraison prévue aujourd'hui, créneau matin 8h–12h
              </p>
            </div>

            <div className="bg-[--background-subtle] rounded-2xl p-6 text-left space-y-3">
              <h3 className="font-semibold text-[--foreground] mb-3">Récapitulatif</h3>
              {[
                { label: "Montant total", val: formatMGA(TOTAL) },
                { label: "Mode de paiement", val: "Mvola" },
                { label: "Adresse", val: "Lot II B 45, Analakely" },
                { label: "Créneau", val: "Matin 8h–12h" },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-[--foreground-muted]">{r.label}</span>
                  <span className="font-medium text-[--foreground] text-mga">{r.val}</span>
                </div>
              ))}
            </div>

            <p className="text-sm text-[--foreground-muted]">
              Un SMS de confirmation a été envoyé à votre numéro.
              Suivez votre commande en temps réel dans votre espace client.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/compte/commandes">Suivre ma commande</Link>
              </Button>
              <Button size="lg" asChild>
                <Link href="/shop">
                  <Package className="w-4 h-4" />
                  Continuer mes achats
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
