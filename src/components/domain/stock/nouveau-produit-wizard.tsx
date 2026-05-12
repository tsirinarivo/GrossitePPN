"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Package,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { verifierCoherencePrix } from "@/lib/tax";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type UniteVenteFields = {
  nom: string;
  facteurConversion: number;
  prixGros?: number;
  prixSemiGros?: number;
  prixDetail?: number;
  codeBarres?: string;
  estDefaut: boolean;
};

type FormData = {
  nom: string;
  nomMG?: string;
  code: string;
  categorieId: string;
  marque?: string;
  description?: string;
  uniteBase: string;
  seuilAlerte: number;
  aDLC: boolean;
  tauxTVA: number;
  unitesVente: UniteVenteFields[];
  visibleEcommerce: boolean;
  prixEcommerce?: number;
};

const ETAPES = [
  { titre: "Infos générales", icon: Package },
  { titre: "Unité de base", icon: Package },
  { titre: "Unités de vente", icon: Package },
  { titre: "E-commerce", icon: Package },
  { titre: "Récapitulatif", icon: CheckCircle2 },
];

const CATEGORIES_OPTIONS = [
  { id: "riz", label: "Riz" },
  { id: "huile", label: "Huile" },
  { id: "sucre", label: "Sucre" },
  { id: "savon", label: "Savon" },
  { id: "lait", label: "Lait" },
  { id: "farine", label: "Farine" },
  { id: "sel", label: "Sel" },
  { id: "conserves", label: "Conserves" },
  { id: "autre", label: "Autre" },
];

const UNITES_BASE_SUGGESTIONS = ["kg", "L", "pièce", "bouteille", "boîte", "sachet", "paquet", "unité"];

export function NouveauProduitWizard() {
  const [etape, setEtape] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<FormData>({
    defaultValues: {
      unitesVente: [
        { nom: "", facteurConversion: 1, prixGros: undefined, prixSemiGros: undefined, prixDetail: undefined, estDefaut: true },
      ],
      tauxTVA: 0,
      seuilAlerte: 0,
      aDLC: false,
      visibleEcommerce: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "unitesVente" });
  const watchedValues = watch();

  const goNext = async () => {
    const valid = await trigger();
    if (valid || etape < 3) setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitting(false);
    toast.success(`Produit "${data.nom}" créé avec succès`, {
      description: `${data.unitesVente.length} unité(s) de vente configurée(s)`,
    });
  };

  const uniteBase = watchedValues.uniteBase ?? "unité";

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[--foreground-muted] mb-6">
        <span>Stock</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[--foreground]">Nouveau produit</span>
      </div>

      <div className="mb-8">
        <h1 className="text-display-sm text-[--foreground]">Nouveau produit</h1>
        <p className="text-[--foreground-muted] mt-1">
          Configurez le produit et ses unités de vente (carton, sac, kg, pièce…)
        </p>
      </div>

      {/* Étapes */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
        {ETAPES.map((e, i) => (
          <div key={e.titre} className="flex items-center shrink-0">
            <button
              onClick={() => i < etape && setEtape(i)}
              className="flex items-center gap-1.5"
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  i < etape
                    ? "bg-[--success] text-white cursor-pointer"
                    : i === etape
                      ? "bg-[--primary] text-white ring-4 ring-[--primary]/20"
                      : "bg-[--border] text-[--foreground-muted]"
                )}
              >
                {i < etape ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block whitespace-nowrap",
                i === etape ? "text-[--foreground]" : i < etape ? "text-[--success]" : "text-[--foreground-muted]"
              )}>
                {e.titre}
              </span>
            </button>
            {i < ETAPES.length - 1 && (
              <div className={cn("w-6 sm:w-8 h-0.5 mx-1", i < etape ? "bg-[--success]" : "bg-[--border]")} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {/* ── Étape 0 : Infos générales ── */}
          {etape === 0 && (
            <motion.div key="e0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Nom du produit *</label>
                      <Input {...register("nom")} placeholder="Ex: Riz Makalioka" error={!!errors.nom} />
                      {errors.nom && <p className="text-xs text-[--destructive]">{errors.nom.message}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Nom en Malagasy</label>
                      <Input {...register("nomMG")} placeholder="Ex: Vary Makalioka" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Code produit *</label>
                      <Input {...register("code")} placeholder="Ex: RIZ-MAKA-001" error={!!errors.code} className="font-mono" />
                      {errors.code && <p className="text-xs text-[--destructive]">{errors.code.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Catégorie *</label>
                      <select
                        {...register("categorieId")}
                        className={cn(
                          "w-full h-9 rounded-lg border px-3 text-sm bg-[--input] text-[--foreground] border-[--border]",
                          "focus:outline-none focus:ring-2 focus:ring-[--ring]",
                          errors.categorieId && "border-[--destructive]"
                        )}
                      >
                        <option value="">Sélectionner...</option>
                        {CATEGORIES_OPTIONS.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      {errors.categorieId && <p className="text-xs text-[--destructive]">{errors.categorieId.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Marque</label>
                      <Input {...register("marque")} placeholder="Ex: Tiko, Madar..." />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        {...register("description")}
                        rows={3}
                        placeholder="Description du produit..."
                        className="w-full rounded-lg border border-[--border] bg-[--input] text-sm text-[--foreground] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[--ring]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Étape 1 : Unité de base ── */}
          {etape === 1 && (
            <motion.div key="e1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <div className="bg-[--primary]/5 border border-[--primary]/20 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-[--primary] shrink-0 mt-0.5" />
                <div className="text-sm text-[--foreground]">
                  <strong>L'unité de base</strong> est la plus petite mesure indivisible du produit.
                  Le stock est toujours géré dans cette unité. Les conditionnements (sacs, cartons…)
                  seront définis à l'étape suivante.
                </div>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Unité de base *</label>
                    <Input {...register("uniteBase")} placeholder="kg, L, pièce, bouteille..." error={!!errors.uniteBase} />
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {UNITES_BASE_SUGGESTIONS.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            const el = document.querySelector<HTMLInputElement>('[name="uniteBase"]');
                            if (el) {
                              el.value = u;
                              el.dispatchEvent(new Event("input", { bubbles: true }));
                            }
                          }}
                          className="text-xs px-2 py-0.5 rounded-full bg-[--background-muted] text-[--foreground-muted] hover:bg-[--accent] hover:text-[--foreground] transition-all"
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                    {errors.uniteBase && <p className="text-xs text-[--destructive]">{errors.uniteBase.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Seuil d'alerte (en {uniteBase || "unité"})</label>
                      <Input {...register("seuilAlerte")} type="number" min={0} placeholder="Ex: 500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Taux TVA (%)</label>
                      <Input {...register("tauxTVA")} type="number" min={0} max={100} placeholder="0" />
                      <p className="text-xs text-[--foreground-muted]">0 si non assujetti</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" {...register("aDLC")} id="aDLC" className="rounded" />
                    <label htmlFor="aDLC" className="text-sm">
                      Ce produit a une date limite de consommation (DLC/DLUO)
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Étape 2 : Unités de vente ── */}
          {etape === 2 && (
            <motion.div key="e2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <div className="bg-[--background-subtle] border border-[--border] rounded-xl p-4 text-sm text-[--foreground-muted]">
                Unité de base : <strong className="text-[--foreground]">{uniteBase || "?"}</strong> — Le stock sera
                toujours exprimé dans cette unité. Chaque conditionnement ci-dessous est converti automatiquement.
              </div>

              <div className="space-y-3">
                {fields.map((field, i) => {
                  const facteur = watchedValues.unitesVente?.[i]?.facteurConversion ?? 1;
                  const prixDetail = watchedValues.unitesVente?.[i]?.prixDetail;
                  const prixGros = watchedValues.unitesVente?.[i]?.prixGros;

                  // Vérifier cohérence si unité parent existe
                  let alerte = false;
                  if (i > 0 && prixDetail && prixGros && facteur > 1) {
                    const baseDetail = watchedValues.unitesVente?.[0]?.prixDetail ?? 0;
                    const { alerteSuspicion } = verifierCoherencePrix(baseDetail, facteur, prixGros);
                    alerte = alerteSuspicion;
                  }

                  return (
                    <Card key={field.id} className={cn("overflow-hidden", alerte && "border-[--warning]")}>
                      {alerte && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-[--warning]/10 text-[--warning-foreground] text-xs">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Prix gros supérieur au prix unitaire × facteur — vérifiez la saisie
                        </div>
                      )}
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[--foreground]">
                            Unité {i + 1}
                            {i === 0 && <span className="text-[--foreground-muted] font-normal ml-2">(unité de base)</span>}
                          </h3>
                          {i > 0 && (
                            <button
                              type="button"
                              onClick={() => remove(i)}
                              className="text-[--foreground-subtle] hover:text-[--destructive] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[--foreground-muted] uppercase tracking-wide">Nom</label>
                            <Input
                              {...register(`unitesVente.${i}.nom`)}
                              placeholder={i === 0 ? `${uniteBase || "kg"}` : "Sac 50 kg, Carton 12..."}
                              error={!!errors.unitesVente?.[i]?.nom}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[--foreground-muted] uppercase tracking-wide">
                              Facteur ({uniteBase || "unité"})
                            </label>
                            <Input
                              {...register(`unitesVente.${i}.facteurConversion`)}
                              type="number"
                              min={0.001}
                              step={0.001}
                              placeholder="1"
                              disabled={i === 0}
                              className={i === 0 ? "opacity-50" : ""}
                            />
                            {facteur > 1 && (
                              <p className="text-[10px] text-[--foreground-subtle]">
                                1 {watchedValues.unitesVente?.[i]?.nom || "conditionnement"} = {facteur} {uniteBase}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Prix par palier */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "prixGros" as const, label: "Prix Gros", color: "text-[--success]" },
                            { key: "prixSemiGros" as const, label: "Semi-gros", color: "text-[--color-indigo-600]" },
                            { key: "prixDetail" as const, label: "Détail", color: "text-[--foreground-muted]" },
                          ].map((pal) => (
                            <div key={pal.key} className="space-y-1.5">
                              <label className={cn("text-[10px] font-semibold uppercase tracking-wide", pal.color)}>
                                {pal.label}
                              </label>
                              <Input
                                {...register(`unitesVente.${i}.${pal.key}`)}
                                type="number"
                                min={0}
                                placeholder="Ar"
                                className="text-sm text-mga"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Code-barres */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[--foreground-muted] uppercase tracking-wide">
                            Code-barres (optionnel)
                          </label>
                          <Input
                            {...register(`unitesVente.${i}.codeBarres`)}
                            placeholder="Ex: 6111234567890"
                            className="font-mono text-sm"
                          />
                        </div>

                        {/* Aperçu prix/unité base */}
                        {(watchedValues.unitesVente?.[i]?.prixGros ?? 0) > 0 && facteur > 1 && (
                          <div className="text-xs text-[--foreground-muted] bg-[--background-subtle] rounded-lg px-3 py-2">
                            Prix gros au {uniteBase} :{" "}
                            <strong className="text-[--foreground] text-mga">
                              {formatMGA((watchedValues.unitesVente?.[i]?.prixGros ?? 0) / facteur)}
                            </strong>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    append({
                      nom: "",
                      facteurConversion: 1,
                      prixGros: undefined,
                      prixSemiGros: undefined,
                      prixDetail: undefined,
                      estDefaut: false,
                    })
                  }
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed",
                    "border-[--border] text-[--foreground-muted] text-sm font-medium",
                    "hover:border-[--primary]/50 hover:text-[--primary] transition-all"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un conditionnement
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Étape 3 : E-commerce ── */}
          {etape === 3 && (
            <motion.div key="e3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[--foreground]">Visible sur la boutique en ligne</p>
                      <p className="text-sm text-[--foreground-muted]">Le produit apparaîtra dans le catalogue B2B</p>
                    </div>
                    <input type="checkbox" {...register("visibleEcommerce")} className="w-5 h-5 rounded" />
                  </div>

                  {watchedValues.visibleEcommerce && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 pt-3 border-t border-[--border]">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Prix spécifique e-commerce (optionnel)</label>
                        <Input {...register("prixEcommerce")} type="number" placeholder="Laisser vide pour utiliser le prix standard" className="text-mga" />
                        <p className="text-xs text-[--foreground-muted]">
                          Si vide, le prix du palier du client s'applique automatiquement.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Étape 4 : Récapitulatif ── */}
          {etape === 4 && (
            <motion.div key="e4" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-[--foreground]">Récapitulatif produit</h3>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Nom", val: watchedValues.nom },
                      { label: "Code", val: watchedValues.code },
                      { label: "Unité de base", val: watchedValues.uniteBase },
                      { label: "Taux TVA", val: `${watchedValues.tauxTVA ?? 0}%` },
                      { label: "Seuil alerte", val: `${watchedValues.seuilAlerte ?? 0} ${watchedValues.uniteBase}` },
                      { label: "DLC/DLUO", val: watchedValues.aDLC ? "Oui" : "Non" },
                    ].map((r) => (
                      <div key={r.label} className="bg-[--background-subtle] rounded-lg px-3 py-2">
                        <p className="text-[11px] text-[--foreground-muted] uppercase tracking-wide">{r.label}</p>
                        <p className="font-semibold text-[--foreground] mt-0.5">{r.val || "—"}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[--foreground] mb-3">
                      {watchedValues.unitesVente?.length ?? 0} unité(s) de vente configurée(s) :
                    </p>
                    <div className="space-y-2">
                      {watchedValues.unitesVente?.map((u, i) => (
                        <div key={i} className="flex items-center justify-between bg-[--background-subtle] rounded-lg px-3 py-2.5 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant={i === 0 ? "default" : "outline"} className="text-[10px]">
                              {u.facteurConversion}× {watchedValues.uniteBase}
                            </Badge>
                            <span className="font-medium text-[--foreground]">{u.nom || `Unité ${i + 1}`}</span>
                          </div>
                          <div className="text-right">
                            {u.prixGros && (
                              <span className="text-xs text-[--success] font-medium text-mga">
                                Gros: {formatMGA(u.prixGros)}
                              </span>
                            )}
                            {u.prixDetail && (
                              <span className="text-xs text-[--foreground-muted] ml-2 text-mga">
                                Détail: {formatMGA(u.prixDetail)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {watchedValues.visibleEcommerce && (
                    <div className="flex items-center gap-2 text-sm text-[--success] bg-[--success]/8 rounded-lg px-3 py-2.5 border border-[--success]/20">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Produit visible sur la boutique e-commerce
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEtape((e) => Math.max(0, e - 1))}
            disabled={etape === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Button>

          {etape < ETAPES.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="submit" loading={submitting} size="lg">
              <CheckCircle2 className="w-4 h-4" />
              Créer le produit
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
