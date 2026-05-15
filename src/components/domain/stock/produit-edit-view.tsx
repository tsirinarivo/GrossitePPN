"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Package, DollarSign, BarChart2, Settings } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Categorie {
  id: string;
  nom: string;
}

interface UniteVente {
  id: string;
  nom: string;
  facteurConversion: number;
  prixGros: number | null;
  prixSemiGros: number | null;
  prixDetail: number | null;
  prixAchat: number | null;
  codeBarres: string | null;
}

interface ProduitData {
  id: string;
  code: string;
  nom: string;
  nomMG: string | null;
  description: string | null;
  descriptionMG: string | null;
  categorieId: string | null;
  categorieNom: string | null;
  marque: string | null;
  uniteBase: string;
  prixAchatMoyenPondere: number | null;
  prixVenteGros: number | null;
  prixVenteSemiGros: number | null;
  prixVenteDetail: number | null;
  tauxTVA: number;
  exonereTVA: boolean;
  seuilAlerte: number | null;
  actif: boolean;
  visibleEcommerce: boolean;
  prixEcommerce: number | null;
}

interface FormState {
  nom: string;
  nomMG: string;
  code: string;
  description: string;
  descriptionMG: string;
  categorieId: string;
  marque: string;
  uniteBase: string;
  prixAchatMoyenPondere: string;
  prixVenteGros: string;
  prixVenteSemiGros: string;
  prixVenteDetail: string;
  tauxTVA: string;
  exonereTVA: boolean;
  seuilAlerte: string;
  actif: boolean;
  visibleEcommerce: boolean;
  prixEcommerce: string;
}

export function ProduitEditView({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [unitesVente, setUnitesVente] = useState<UniteVente[]>([]);
  const [form, setForm] = useState<FormState>({
    nom: "", nomMG: "", code: "", description: "", descriptionMG: "",
    categorieId: "", marque: "", uniteBase: "",
    prixAchatMoyenPondere: "", prixVenteGros: "", prixVenteSemiGros: "", prixVenteDetail: "",
    tauxTVA: "0", exonereTVA: false, seuilAlerte: "0",
    actif: true, visibleEcommerce: false, prixEcommerce: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [produitRes, produitsRes] = await Promise.all([
          fetch(`/api/produits/${id}`),
          fetch("/api/produits"),
        ]);

        if (produitsRes.ok) {
          const data = await produitsRes.json();
          setCategories(data.categories ?? []);
        }

        if (!produitRes.ok) {
          toast.error("Produit introuvable");
          return;
        }

        const data = await produitRes.json();
        const p: ProduitData = data.produit;
        setUnitesVente(data.unitesVente ?? []);

        setForm({
          nom: p.nom ?? "",
          nomMG: p.nomMG ?? "",
          code: p.code ?? "",
          description: p.description ?? "",
          descriptionMG: p.descriptionMG ?? "",
          categorieId: p.categorieId ?? "",
          marque: p.marque ?? "",
          uniteBase: p.uniteBase ?? "",
          prixAchatMoyenPondere: p.prixAchatMoyenPondere != null ? String(p.prixAchatMoyenPondere) : "",
          prixVenteGros: p.prixVenteGros != null ? String(p.prixVenteGros) : "",
          prixVenteSemiGros: p.prixVenteSemiGros != null ? String(p.prixVenteSemiGros) : "",
          prixVenteDetail: p.prixVenteDetail != null ? String(p.prixVenteDetail) : "",
          tauxTVA: String(p.tauxTVA ?? 0),
          exonereTVA: p.exonereTVA ?? false,
          seuilAlerte: p.seuilAlerte != null ? String(p.seuilAlerte) : "0",
          actif: p.actif ?? true,
          visibleEcommerce: p.visibleEcommerce ?? false,
          prixEcommerce: p.prixEcommerce != null ? String(p.prixEcommerce) : "",
        });
      } catch {
        toast.error("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nom: form.nom,
        nomMG: form.nomMG || null,
        code: form.code,
        description: form.description || null,
        descriptionMG: form.descriptionMG || null,
        categorieId: form.categorieId || null,
        marque: form.marque || null,
        uniteBase: form.uniteBase,
        prixAchatMoyenPondere: form.prixAchatMoyenPondere !== "" ? Number(form.prixAchatMoyenPondere) : null,
        prixVenteGros: form.prixVenteGros !== "" ? Number(form.prixVenteGros) : null,
        prixVenteSemiGros: form.prixVenteSemiGros !== "" ? Number(form.prixVenteSemiGros) : null,
        prixVenteDetail: form.prixVenteDetail !== "" ? Number(form.prixVenteDetail) : null,
        tauxTVA: Number(form.tauxTVA),
        exonereTVA: form.exonereTVA,
        seuilAlerte: Number(form.seuilAlerte),
        actif: form.actif,
        visibleEcommerce: form.visibleEcommerce,
        prixEcommerce: form.prixEcommerce !== "" ? Number(form.prixEcommerce) : null,
      };

      const res = await fetch(`/api/produits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Erreur lors de la sauvegarde");
        return;
      }

      toast.success("Produit mis à jour");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[--primary]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/stock"
            className="flex items-center gap-1.5 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Stock
          </Link>
          <span className="text-[--border]">/</span>
          <span className="text-sm font-mono text-[--foreground]">{form.code || id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={form.actif ? "default" : "secondary"}>
            {form.actif ? "Actif" : "Inactif"}
          </Badge>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--foreground]">{form.nom || "Modifier produit"}</h1>
          {unitesVente.length > 0 && (
            <p className="text-sm text-[--foreground-muted]">{unitesVente.length} unité(s) de vente</p>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Nom *</label>
            <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Nom du produit" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Nom MG</label>
            <Input value={form.nomMG} onChange={(e) => set("nomMG", e.target.value)} placeholder="Anarana malagasy" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Code *</label>
            <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="SKU / code" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Marque</label>
            <Input value={form.marque} onChange={(e) => set("marque", e.target.value)} placeholder="Marque" />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-[--foreground-muted]">Catégorie</label>
            <select
              value={form.categorieId}
              onChange={(e) => set("categorieId", e.target.value)}
              className={cn(
                "w-full rounded-md border border-[--border] bg-[--background] px-3 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              )}
            >
              <option value="">— Sans catégorie —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-[--foreground-muted]">Description</label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Description" />
          </div>
        </CardContent>
      </Card>

      {/* Prix de vente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Prix de vente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Prix gros (Ar)</label>
            <Input type="number" min={0} value={form.prixVenteGros} onChange={(e) => set("prixVenteGros", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Prix demi-gros (Ar)</label>
            <Input type="number" min={0} value={form.prixVenteSemiGros} onChange={(e) => set("prixVenteSemiGros", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Prix détail (Ar)</label>
            <Input type="number" min={0} value={form.prixVenteDetail} onChange={(e) => set("prixVenteDetail", e.target.value)} placeholder="0" />
          </div>
        </CardContent>
      </Card>

      {/* Prix & Stock */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Prix & Stock
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Prix achat moyen (Ar)</label>
            <Input type="number" min={0} value={form.prixAchatMoyenPondere} onChange={(e) => set("prixAchatMoyenPondere", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Seuil alerte</label>
            <Input type="number" min={0} value={form.seuilAlerte} onChange={(e) => set("seuilAlerte", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Unité de base</label>
            <Input value={form.uniteBase} onChange={(e) => set("uniteBase", e.target.value)} placeholder="kg, pièce…" />
          </div>
        </CardContent>
      </Card>

      {/* Fiscalité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Fiscalité
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[--foreground-muted]">Taux TVA (%)</label>
            <Input type="number" min={0} max={100} value={form.tauxTVA} onChange={(e) => set("tauxTVA", e.target.value)} placeholder="0" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input
              id="exonereTVA"
              type="checkbox"
              checked={form.exonereTVA}
              onChange={(e) => set("exonereTVA", e.target.checked)}
              className="w-4 h-4 rounded border-[--border] accent-[--primary]"
            />
            <label htmlFor="exonereTVA" className="text-sm font-medium cursor-pointer">
              Exonéré de TVA
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Statut */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Statut
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              id="actif"
              type="checkbox"
              checked={form.actif}
              onChange={(e) => set("actif", e.target.checked)}
              className="w-4 h-4 rounded border-[--border] accent-[--primary]"
            />
            <label htmlFor="actif" className="text-sm font-medium cursor-pointer">
              Produit actif
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="visibleEcommerce"
              type="checkbox"
              checked={form.visibleEcommerce}
              onChange={(e) => set("visibleEcommerce", e.target.checked)}
              className="w-4 h-4 rounded border-[--border] accent-[--primary]"
            />
            <label htmlFor="visibleEcommerce" className="text-sm font-medium cursor-pointer">
              Visible en ligne (e-commerce)
            </label>
          </div>
          {form.visibleEcommerce && (
            <div className="space-y-1 ml-7">
              <label className="text-xs font-medium text-[--foreground-muted]">Prix e-commerce (Ar)</label>
              <Input type="number" min={0} value={form.prixEcommerce} onChange={(e) => set("prixEcommerce", e.target.value)} placeholder="0" className="max-w-xs" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save footer */}
      <div className="flex justify-end pt-2 pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
