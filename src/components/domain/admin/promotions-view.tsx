"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, Zap, Layers, Plus, X, Check, Trash2, Loader2,
  ToggleLeft, ToggleRight, Calendar, TrendingUp, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMGA } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Promotion {
  id: string;
  nom: string;
  code: string | null;
  type: string;
  valeur: number;
  typeValeur: string;
  minCommande: number;
  nbUtilisationsMax: number | null;
  nbUtilisations: number;
  debutAt: string;
  finAt: string;
  actif: boolean;
  createdAt: string;
}

interface FormData {
  nom: string;
  type: string;
  code: string;
  valeur: string;
  typeValeur: string;
  minCommande: string;
  nbUtilisationsMax: string;
  debutAt: string;
  finAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatValeur(valeur: number, typeValeur: string) {
  if (typeValeur === "pct") return `${valeur}%`;
  return formatMGA(valeur);
}

function formatPeriode(debut: string, fin: string) {
  const d = new Date(debut);
  const f = new Date(fin);
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${dd(d.getDate())}/${dd(d.getMonth() + 1)} → ${dd(f.getDate())}/${dd(f.getMonth() + 1)}/${f.getFullYear()}`;
}

function typeBadge(type: string) {
  switch (type) {
    case "code_promo":
      return <Badge variant="web">Code promo</Badge>;
    case "remise_palier":
      return <Badge variant="success">Remise palier</Badge>;
    case "vente_flash":
      return <Badge variant="warning">Vente flash</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function toDateInput(iso: string) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 flex gap-3 items-start">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "20" }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[--foreground-muted] mb-0.5">{label}</p>
        <p className="text-lg font-bold text-[--foreground]">{value}</p>
        {sub && <p className="text-xs text-[--foreground-muted] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  nom: "", type: "code_promo", code: "", valeur: "",
  typeValeur: "pct", minCommande: "", nbUtilisationsMax: "",
  debutAt: "", finAt: "",
};

export function PromotionsView() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, startSubmit] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions");
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── KPI calculations ──────────────────────────────────────────────────────

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const total = promotions.length;
  const actives = promotions.filter(p => p.actif && new Date(p.finAt) >= now).length;
  const codesActifs = promotions.filter(
    p => p.actif && p.type === "code_promo" && p.code && new Date(p.finAt) >= now
  ).length;
  const utilisationsMois = promotions.reduce((acc, p) => {
    // approximation: sum all utilisations for promos created/active this month
    const created = new Date(p.createdAt);
    if (created.getMonth() === thisMonth && created.getFullYear() === thisYear) {
      return acc + p.nbUtilisations;
    }
    return acc + p.nbUtilisations;
  }, 0);

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function toggleActif(promo: Promotion) {
    setToggling(promo.id);
    try {
      const res = await fetch(`/api/admin/promotions/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !promo.actif }),
      });
      if (res.ok) {
        setPromotions(prev =>
          prev.map(p => p.id === promo.id ? { ...p, actif: !p.actif } : p)
        );
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } finally {
      setToggling(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function confirmDelete(id: string) {
    const res = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPromotions(prev => prev.filter(p => p.id !== id));
      setDeleteId(null);
      toast.success("Promotion supprimée");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!form.nom.trim() || !form.valeur || !form.debutAt || !form.finAt) {
      toast.error("Veuillez remplir les champs requis");
      return;
    }
    startSubmit(async () => {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: form.nom,
          type: form.type,
          code: form.code || undefined,
          valeur: parseFloat(form.valeur),
          typeValeur: form.typeValeur,
          minCommande: form.minCommande ? parseInt(form.minCommande) : 0,
          nbUtilisationsMax: form.nbUtilisationsMax ? parseInt(form.nbUtilisationsMax) : undefined,
          debutAt: form.debutAt,
          finAt: form.finAt,
        }),
      });
      if (res.ok) {
        toast.success("Promotion créée");
        setDrawerOpen(false);
        setForm(EMPTY_FORM);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erreur lors de la création");
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Promotions</h1>
          <p className="text-[--foreground-muted] mt-1">Gérez les codes promo, remises et ventes flash</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }}>
          <Plus className="w-4 h-4" /> Nouvelle promotion
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total promotions" value={total} icon={Tag} color="#FF4D00" />
        <KpiCard label="Actives" value={actives} sub="en cours" icon={TrendingUp} color="#22C55E" />
        <KpiCard label="Codes actifs" value={codesActifs} sub="codes promo" icon={Hash} color="#3B82F6" />
        <KpiCard label="Utilisations" value={utilisationsMois} sub="total" icon={Layers} color="#F59E0B" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement...
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-10 h-10 opacity-20 mx-auto mb-3 text-[--foreground-muted]" />
            <p className="text-sm text-[--foreground-muted]">Aucune promotion créée</p>
            <Button size="sm" className="mt-3" onClick={() => setDrawerOpen(true)}>
              <Plus className="w-4 h-4" /> Créer la première
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[--accent]/50 border-b border-[--border]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Code</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Valeur</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Période</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Utilisations</th>
                  <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Actif</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                <AnimatePresence initial={false}>
                  {promotions.map((promo, i) => (
                    <motion.tr
                      key={promo.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className="hover:bg-[--accent]/30"
                    >
                      <td className="px-4 py-3 font-medium text-[--foreground]">{promo.nom}</td>
                      <td className="px-4 py-3">{typeBadge(promo.type)}</td>
                      <td className="px-4 py-3">
                        {promo.code
                          ? <span className="font-mono text-xs bg-[--accent] border border-[--border] px-2 py-0.5 rounded">{promo.code}</span>
                          : <span className="text-[--foreground-muted]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[--foreground]">
                        {formatValeur(promo.valeur, promo.typeValeur)}
                      </td>
                      <td className="px-4 py-3 text-[--foreground-muted] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatPeriode(promo.debutAt, promo.finAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[--foreground-muted]">
                        {promo.nbUtilisations}
                        {promo.nbUtilisationsMax != null && (
                          <span className="text-[--foreground-subtle]">/{promo.nbUtilisationsMax}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActif(promo)}
                          disabled={toggling === promo.id}
                          className="transition-opacity"
                          title={promo.actif ? "Désactiver" : "Activer"}
                        >
                          {toggling === promo.id ? (
                            <Loader2 className="w-5 h-5 animate-spin text-[--foreground-muted]" />
                          ) : promo.actif ? (
                            <ToggleRight className="w-6 h-6 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-[--foreground-muted]" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        {deleteId === promo.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive" size="icon-sm"
                              onClick={() => confirmDelete(promo.id)}
                              title="Confirmer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon-sm"
                              onClick={() => setDeleteId(null)}
                              title="Annuler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setDeleteId(promo.id)}
                            className="text-[--foreground-muted] hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-[--background] border-l border-[--border] flex flex-col shadow-2xl"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[--border] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[--primary]/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[--primary]" />
                  </div>
                  <h2 className="font-semibold text-[--foreground]">Nouvelle promotion</h2>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Nom */}
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                    Nom <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex: Soldes été 2026"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className={cn(
                      "w-full h-10 px-3 text-sm rounded-lg border border-[--border]",
                      "bg-[--background] text-[--foreground]",
                      "focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                    )}
                  >
                    <option value="code_promo">Code promo</option>
                    <option value="remise_palier">Remise palier</option>
                    <option value="vente_flash">Vente flash</option>
                  </select>
                </div>

                {/* Code (optional) */}
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                    Code promo <span className="text-[--foreground-muted]">(optionnel)</span>
                  </label>
                  <Input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="Ex: ETE20"
                    className="font-mono"
                  />
                </div>

                {/* Valeur + typeValeur */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                      Valeur <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="number"
                      value={form.valeur}
                      onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))}
                      placeholder="Ex: 10"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Type de valeur</label>
                    <select
                      value={form.typeValeur}
                      onChange={e => setForm(f => ({ ...f, typeValeur: e.target.value }))}
                      className={cn(
                        "w-full h-10 px-3 text-sm rounded-lg border border-[--border]",
                        "bg-[--background] text-[--foreground]",
                        "focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                      )}
                    >
                      <option value="pct">Pourcentage (%)</option>
                      <option value="montant">Montant (MGA)</option>
                    </select>
                  </div>
                </div>

                {/* Min commande */}
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                    Commande minimum (MGA)
                  </label>
                  <Input
                    type="number"
                    value={form.minCommande}
                    onChange={e => setForm(f => ({ ...f, minCommande: e.target.value }))}
                    placeholder="0 = aucun minimum"
                    min={0}
                  />
                </div>

                {/* Nb utilisations max */}
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                    Utilisations maximum <span className="text-[--foreground-muted]">(optionnel)</span>
                  </label>
                  <Input
                    type="number"
                    value={form.nbUtilisationsMax}
                    onChange={e => setForm(f => ({ ...f, nbUtilisationsMax: e.target.value }))}
                    placeholder="Illimité si vide"
                    min={1}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                      Début <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="date"
                      value={form.debutAt}
                      onChange={e => setForm(f => ({ ...f, debutAt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                      Fin <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="date"
                      value={form.finAt}
                      onChange={e => setForm(f => ({ ...f, finAt: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Drawer footer */}
              <div className="px-5 py-4 border-t border-[--border] flex justify-end gap-2 shrink-0">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!form.nom.trim() || !form.valeur || !form.debutAt || !form.finAt}
                >
                  <Check className="w-4 h-4" /> Créer la promotion
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
