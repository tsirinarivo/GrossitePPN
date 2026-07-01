"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Package, DollarSign, BarChart2, Settings, Plus, Trash2, GripVertical, TrendingUp, Warehouse, History } from "lucide-react";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatMGA } from "@/lib/money";

type Analytics = {
  ventesHebdo: { semaine: string; qteBase: number; ca: number; nbCommandes: number }[];
  stocksDepots: { depotId: string; nomDepot: string; quantiteBase: number }[];
  mouvements: {
    id: string; type: string; quantiteBase: number; quantiteAvant: number;
    quantiteApres: number; reference: string | null; notes: string | null;
    createdAt: string; agentNom: string; nomDepot: string;
  }[];
  kpi30j: { qteTotale: number; caTotale: number; nbCommandes: number };
};

interface Categorie {
  id: string;
  nom: string;
}

interface UniteVente {
  id?: string;
  nom: string;
  facteurConversion: number;
  prixGros: number | null;
  prixSemiGros: number | null;
  prixDetail: number | null;
  prixAchat: number | null;
  codeBarres: string | null;
  estDefaut: boolean;
  ordre: number;
}

const UNITE_VIDE: Omit<UniteVente, "ordre"> = {
  nom: "",
  facteurConversion: 1,
  prixGros: null,
  prixSemiGros: null,
  prixDetail: null,
  prixAchat: null,
  codeBarres: null,
  estDefaut: false,
};

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
  const [activeTab, setActiveTab] = useState<"edit" | "analytics">("edit");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (analytics) return;
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/produits/${id}/analytics`);
      if (res.ok) setAnalytics(await res.json());
    } finally { setLoadingAnalytics(false); }
  }, [id, analytics]);
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
        setUnitesVente(
          (data.unitesVente ?? []).map((u: UniteVente, i: number) => ({ ...u, ordre: u.ordre ?? i }))
        );

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
        unitesVente: unitesVente.map((u, i) => ({ ...u, ordre: i })),
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
          {activeTab === "edit" && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          )}
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

      {/* Tabs */}
      <div className="flex border-b border-[--border] gap-1">
        {([
          { key: "edit",      label: "Édition",    icon: Settings },
          { key: "analytics", label: "Analytique", icon: BarChart2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); if (key === "analytics") loadAnalytics(); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === key
                ? "border-[--primary] text-[--primary]"
                : "border-transparent text-[--foreground-muted] hover:text-[--foreground]"
            )}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === "analytics" && (
        <ProduitAnalyticsPanel analytics={analytics} loading={loadingAnalytics} uniteBase={form.uniteBase} />
      )}

      {activeTab === "edit" && <>
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

      {/* Conditionnements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> Conditionnements
            </CardTitle>
            <button
              type="button"
              onClick={() => setUnitesVente((prev) => [...prev, { ...UNITE_VIDE, ordre: prev.length, estDefaut: prev.length === 0 }])}
              className="flex items-center gap-1.5 text-xs font-medium text-[--primary] hover:opacity-80 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
          <p className="text-xs text-[--foreground-muted] mt-0.5">
            Carton, pack, bidon, sac… avec facteur de conversion et prix par palier
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {unitesVente.length === 0 ? (
            <p className="text-sm text-[--foreground-muted] text-center py-4">
              Aucun conditionnement — cliquez <strong>Ajouter</strong> pour créer un carton, pack, etc.
            </p>
          ) : (
            unitesVente.map((u, i) => (
              <div key={i} className="border border-[--border] rounded-xl p-4 space-y-3 bg-[--muted]/30">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-[--foreground-muted] shrink-0" />
                  <span className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wide">
                    Conditionnement {i + 1}
                    {u.estDefaut && <span className="ml-2 text-[--primary]">· Défaut</span>}
                  </span>
                  <div className="flex-1" />
                  {!u.estDefaut && (
                    <button
                      type="button"
                      onClick={() => setUnitesVente((prev) => prev.map((x, j) => ({ ...x, estDefaut: j === i })))}
                      className="text-xs text-[--foreground-muted] hover:text-[--primary] transition-colors"
                    >
                      Définir défaut
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setUnitesVente((prev) => prev.filter((_, j) => j !== i))}
                    className="text-[--destructive] hover:opacity-70 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[--foreground-muted]">Nom *</label>
                    <Input
                      value={u.nom}
                      onChange={(e) => setUnitesVente((prev) => prev.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
                      placeholder="ex: Carton 24, Pack 6, Bidon 5L"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[--foreground-muted]">
                      Facteur ({form.uniteBase || "unité base"})
                    </label>
                    <Input
                      type="number"
                      min={1}
                      step={0.001}
                      value={u.facteurConversion}
                      onChange={(e) => setUnitesVente((prev) => prev.map((x, j) => j === i ? { ...x, facteurConversion: Number(e.target.value) } : x))}
                      placeholder="ex: 24"
                    />
                    {u.facteurConversion > 1 && (
                      <p className="text-xs text-[--foreground-muted]">
                        1 {u.nom || "…"} = {u.facteurConversion} {form.uniteBase || "unités"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[--foreground-muted]">Prix achat (Ar)</label>
                    <Input
                      type="number" min={0}
                      value={u.prixAchat ?? ""}
                      onChange={(e) => setUnitesVente((prev) => prev.map((x, j) => j === i ? { ...x, prixAchat: e.target.value === "" ? null : Number(e.target.value) } : x))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[--foreground-muted]">Prix gros (Ar)</label>
                    <Input
                      type="number" min={0}
                      value={u.prixGros ?? ""}
                      onChange={(e) => setUnitesVente((prev) => prev.map((x, j) => j === i ? { ...x, prixGros: e.target.value === "" ? null : Number(e.target.value) } : x))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[--foreground-muted]">Prix demi-gros (Ar)</label>
                    <Input
                      type="number" min={0}
                      value={u.prixSemiGros ?? ""}
                      onChange={(e) => setUnitesVente((prev) => prev.map((x, j) => j === i ? { ...x, prixSemiGros: e.target.value === "" ? null : Number(e.target.value) } : x))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[--foreground-muted]">Prix détail (Ar)</label>
                    <Input
                      type="number" min={0}
                      value={u.prixDetail ?? ""}
                      onChange={(e) => setUnitesVente((prev) => prev.map((x, j) => j === i ? { ...x, prixDetail: e.target.value === "" ? null : Number(e.target.value) } : x))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[--foreground-muted]">Code-barres</label>
                  <Input
                    value={u.codeBarres ?? ""}
                    onChange={(e) => setUnitesVente((prev) => prev.map((x, j) => j === i ? { ...x, codeBarres: e.target.value || null } : x))}
                    placeholder="EAN-13, QR…"
                    className="max-w-xs"
                  />
                </div>
              </div>
            ))
          )}
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
      </>}
    </div>
  );
}

const MOUVEMENT_COLORS: Record<string, string> = {
  "entrée": "#22C55E", "vente": "#3B82F6", "transfert": "#8B5CF6",
  "casse": "#EF4444", "inventaire": "#F59E0B", "réservation": "#6B7280",
};

function ProduitAnalyticsPanel({ analytics, loading, uniteBase }: { analytics: Analytics | null; loading: boolean; uniteBase: string }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[--primary]" /></div>
  );
  if (!analytics) return (
    <div className="py-16 text-center text-sm text-[--foreground-muted]">Aucune donnée analytique</div>
  );

  const { ventesHebdo, stocksDepots, mouvements, kpi30j } = analytics;
  const chartData = ventesHebdo.map((v) => ({
    label: v.semaine.replace(/^\d{4}-/, "S"),
    qteBase: v.qteBase,
    ca: v.ca,
  }));
  const stockTotal = stocksDepots.reduce((s, d) => s + d.quantiteBase, 0);

  return (
    <div className="space-y-6">
      {/* KPIs 30 jours */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Qté vendue (30j)", value: `${kpi30j.qteTotale.toLocaleString("fr-FR")} ${uniteBase}`, icon: TrendingUp, color: "#22C55E" },
          { label: "CA HT (30j)",      value: formatMGA(kpi30j.caTotale),                                    icon: BarChart2,  color: "#3B82F6" },
          { label: "Commandes (30j)",   value: String(kpi30j.nbCommandes),                                    icon: History,   color: "#F59E0B" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex gap-3 items-start">
              <div className="p-2 rounded-lg" style={{ backgroundColor: k.color + "20" }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-xs text-[--foreground-muted]">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphique ventes hebdomadaires */}
      {chartData.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[--primary]" /> Ventes hebdomadaires (quantité)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333744" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toLocaleString("fr-FR")} ${uniteBase}`, "Qté"]}
                  contentStyle={{ backgroundColor: "#232630", border: "1px solid #333744", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="qteBase" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-8 text-center text-sm text-[--foreground-muted]">Aucune vente sur les 13 dernières semaines</CardContent></Card>
      )}

      {/* Stock par dépôt */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-[--primary]" /> Stock par dépôt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stocksDepots.length === 0 ? (
            <p className="text-sm text-[--foreground-muted]">Aucun stock enregistré</p>
          ) : stocksDepots.map((s) => {
            const pct = stockTotal > 0 ? Math.round((s.quantiteBase / stockTotal) * 100) : 0;
            return (
              <div key={s.depotId} className="flex items-center gap-3">
                <span className="text-sm flex-1 text-[--foreground]">{s.nomDepot}</span>
                <div className="w-32 h-2 rounded-full bg-[--border]">
                  <div className="h-full rounded-full bg-[--primary]" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-mono w-24 text-right text-[--foreground]">
                  {s.quantiteBase.toLocaleString("fr-FR")} {uniteBase}
                </span>
              </div>
            );
          })}
          {stocksDepots.length > 0 && (
            <div className="flex items-center gap-3 pt-1 border-t border-[--border]">
              <span className="text-xs font-semibold text-[--foreground-muted] flex-1">Total</span>
              <span className="text-sm font-bold w-24 text-right">{stockTotal.toLocaleString("fr-FR")} {uniteBase}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique mouvements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-[--primary]" /> Derniers mouvements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mouvements.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[--foreground-muted]">Aucun mouvement enregistré</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[--border] bg-[--muted]/30 text-[--foreground-muted]">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Dépôt</th>
                    <th className="px-4 py-2 text-right">Qté</th>
                    <th className="px-4 py-2 text-right">Avant → Après</th>
                    <th className="px-4 py-2 text-left hidden sm:table-cell">Réf</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((m) => {
                    const color = MOUVEMENT_COLORS[m.type] ?? "#6B7280";
                    const signe = ["vente", "casse", "réservation"].includes(m.type) ? "-" : "+";
                    return (
                      <tr key={m.id} className="border-b border-[--border] hover:bg-[--muted]/20 transition-colors">
                        <td className="px-4 py-2 text-[--foreground-muted]">
                          {new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                          {" "}
                          {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                            style={{ backgroundColor: color + "20", color }}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[--foreground-muted]">{m.nomDepot}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold" style={{ color }}>
                          {signe}{Math.abs(m.quantiteBase).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[--foreground-muted]">
                          {m.quantiteAvant.toLocaleString("fr-FR")} → {m.quantiteApres.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-2 text-[--foreground-muted] hidden sm:table-cell">
                          {m.reference ?? m.agentNom ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
