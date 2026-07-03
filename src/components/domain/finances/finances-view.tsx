"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Minus,
  BarChart2, LineChart as LineChartIcon, Plus, Pencil, Trash2,
  Loader2, RefreshCw, ChevronDown, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type Periode = "jour" | "7jours" | "mois" | "annee" | "custom";

type Kpi = {
  caHT: number; caTTC: number; tva: number; remises: number;
  cogs: number; margeB: number; chargesOp: number; margeN: number;
  nbCommandes: number;
};

type CatMarge = { id: string; nom: string; ca: number; cogs: number; margeB: number; tauxMarge: number };
type EvoPoint = { date: string; ca: number; cogs: number; margeB: number };
type Charge = { id: string; libelle: string; categorie: string; montant: number; mois: string; notes?: string | null };

type Data = {
  kpi: Kpi;
  margesCategorie: CatMarge[];
  evolution: EvoPoint[];
  chargesParCat: Record<string, number>;
  charges: Charge[];
};

const CATEGORIES_CHARGE = ["personnel", "loyer", "energie", "fournitures", "marketing", "maintenance", "autre"];
const CAT_LABELS: Record<string, string> = {
  personnel: "Personnel", loyer: "Loyer", energie: "Énergie",
  fournitures: "Fournitures", marketing: "Marketing", maintenance: "Maintenance", autre: "Autre",
};
const CAT_COLORS: Record<string, string> = {
  personnel: "#3b82f6", loyer: "#8b5cf6", energie: "#f59e0b",
  fournitures: "#06b6d4", marketing: "#ec4899", maintenance: "#64748b", autre: "#94a3b8",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(val: number, base: number) {
  if (!base) return 0;
  return Math.round(val / base * 100);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function currentMois() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon: Icon, positive }:
  { label: string; value: number; sub?: string; color: string; icon: typeof TrendingUp; positive?: boolean }) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-subtle] truncate">{label}</p>
        <p className="text-base font-bold leading-tight">{formatMGA(value)}</p>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: positive === false ? "#ef4444" : positive ? "#22c55e" : "#94a3b8" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Charge Form Modal ─────────────────────────────────────────────────────────

function ChargeModal({ mois, charge, onSave, onClose }: {
  mois: string;
  charge?: Charge;
  onSave: () => void;
  onClose: () => void;
}) {
  const [libelle, setLibelle]     = useState(charge?.libelle ?? "");
  const [categorie, setCategorie] = useState(charge?.categorie ?? "personnel");
  const [montant, setMontant]     = useState(charge?.montant ? String(charge.montant) : "");
  const [notes, setNotes]         = useState(charge?.notes ?? "");
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    if (!libelle || !montant) return;
    setSaving(true);
    try {
      const url  = charge ? `/api/finances/charges/${charge.id}` : "/api/finances/charges";
      const meth = charge ? "PUT" : "POST";
      const res  = await fetch(url, {
        method: meth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle, categorie, montant: Number(montant), mois, notes }),
      });
      if (!res.ok) throw new Error();
      toast.success(charge ? "Charge modifiée" : "Charge ajoutée");
      onSave();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[--card] border border-[--border] rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <h3 className="font-bold text-base">{charge ? "Modifier la charge" : "Ajouter une charge"}</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block">Libellé *</label>
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
              placeholder="Ex: Salaire vendeur" />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block">Catégorie *</label>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]">
              {CATEGORIES_CHARGE.map((c) => (
                <option key={c} value={c}>{CAT_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block">Montant (Ar) *</label>
            <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
              placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
              placeholder="Optionnel" />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">Annuler</button>
          <button onClick={handleSave} disabled={saving || !libelle || !montant}
            className="px-4 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {charge ? "Modifier" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

const EMPTY_KPI: Kpi = { caHT: 0, caTTC: 0, tva: 0, remises: 0, cogs: 0, margeB: 0, chargesOp: 0, margeN: 0, nbCommandes: 0 };
const EMPTY_DATA: Data = { kpi: EMPTY_KPI, margesCategorie: [], evolution: [], chargesParCat: {}, charges: [] };

export function FinancesView() {
  const [periode, setPeriode]     = useState<Periode>("mois");
  const [annee, setAnnee]         = useState(new Date().getFullYear());
  const [moisNum, setMoisNum]     = useState(new Date().getMonth() + 1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [data, setData]           = useState<Data>(EMPTY_DATA);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [chargeModal, setChargeModal] = useState<{ open: boolean; charge?: Charge }>({ open: false });
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const moisActuel = `${annee}-${String(moisNum).padStart(2, "0")}`;

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams({ periode });
    if (periode === "mois") { p.set("annee", String(annee)); p.set("moisNum", String(moisNum)); }
    if (periode === "custom" && customFrom && customTo) { p.set("from", customFrom); p.set("to", customTo); }
    return p.toString();
  }, [periode, annee, moisNum, customFrom, customTo]);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/finances?${buildQuery()}`);
      const json = await res.json();
      if (json?.kpi) {
        setData(json);
      } else {
        toast.error("Erreur serveur", { description: json?.error ?? "Vérifier la base de données" });
      }
    } catch {
      toast.error("Impossible de charger les finances");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { charger(); }, [charger]);

  const handleDeleteCharge = async (id: string) => {
    if (!confirm("Supprimer cette charge ?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/finances/charges/${id}`, { method: "DELETE" });
      toast.success("Charge supprimée");
      charger();
    } catch {
      toast.error("Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  const { kpi, margesCategorie, evolution, chargesParCat, charges } = data;
  const caBase = kpi.caHT || 1;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <DollarSign className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Finances</h1>
        <button onClick={charger} disabled={loading} className="p-2 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">

          {/* ── Sélecteur période ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 items-center">
            {(["jour", "7jours", "mois", "annee", "custom"] as Periode[]).map((p) => (
              <button key={p} onClick={() => setPeriode(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  periode === p ? "bg-[--primary] text-white border-[--primary]"
                  : "border-[--border] text-[--foreground-subtle] hover:border-[--primary]/50"
                }`}>
                {{ jour: "Aujourd'hui", "7jours": "7 jours", mois: "Mois", annee: "Année", custom: "Personnalisé" }[p]}
              </button>
            ))}
            {periode === "mois" && (
              <div className="flex gap-2 items-center">
                <select value={moisNum} onChange={(e) => setMoisNum(Number(e.target.value))}
                  className="border border-[--border] rounded-lg px-2 py-1.5 text-sm bg-[--card] focus:outline-none focus:border-[--primary]">
                  {["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}
                  className="border border-[--border] rounded-lg px-2 py-1.5 text-sm bg-[--card] focus:outline-none focus:border-[--primary]">
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {periode === "custom" && (
              <div className="flex gap-2 items-center flex-wrap">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="border border-[--border] rounded-lg px-2 py-1.5 text-sm bg-[--card] focus:outline-none" />
                <span className="text-xs text-[--foreground-subtle]">→</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="border border-[--border] rounded-lg px-2 py-1.5 text-sm bg-[--card] focus:outline-none" />
                <button onClick={charger} className="px-3 py-1.5 bg-[--primary] text-white text-sm rounded-lg">OK</button>
              </div>
            )}
          </div>

          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Chiffre d'affaires HT" value={kpi.caHT} icon={TrendingUp}
              color="#3b82f6" sub={`${kpi.nbCommandes} commandes`} />
            <KpiCard label="Coût des ventes (COGS)" value={kpi.cogs} icon={ShoppingCart}
              color="#f59e0b" sub={`${pct(kpi.cogs, kpi.caHT)}% du CA`} positive={false} />
            <KpiCard label="Marge brute" value={kpi.margeB} icon={TrendingUp}
              color="#22c55e" sub={`${pct(kpi.margeB, kpi.caHT)}% du CA`} positive={kpi.margeB >= 0} />
            <KpiCard label="Charges opérationnelles" value={kpi.chargesOp} icon={Minus}
              color="#ef4444" sub={`${pct(kpi.chargesOp, kpi.caHT)}% du CA`} positive={false} />
            <KpiCard label="Marge nette" value={kpi.margeN} icon={kpi.margeN >= 0 ? TrendingUp : TrendingDown}
              color={kpi.margeN >= 0 ? "#22c55e" : "#ef4444"}
              sub={`${pct(kpi.margeN, kpi.caHT)}% du CA`} positive={kpi.margeN >= 0} />
          </div>

          {/* ── Barre décomposition CA ────────────────────────────────────── */}
          {kpi.caHT > 0 && (
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <p className="text-xs text-[--foreground-subtle] mb-3 font-medium">Décomposition du CA HT</p>
              <div className="flex rounded-lg overflow-hidden h-8 text-[10px] font-semibold text-white">
                {kpi.cogs > 0 && (
                  <div style={{ width: `${pct(kpi.cogs, caBase)}%`, backgroundColor: "#f59e0b" }}
                    className="flex items-center justify-center overflow-hidden whitespace-nowrap px-1">
                    COGS {pct(kpi.cogs, caBase)}%
                  </div>
                )}
                {kpi.chargesOp > 0 && (
                  <div style={{ width: `${pct(kpi.chargesOp, caBase)}%`, backgroundColor: "#ef4444" }}
                    className="flex items-center justify-center overflow-hidden whitespace-nowrap px-1">
                    Charges {pct(kpi.chargesOp, caBase)}%
                  </div>
                )}
                {kpi.margeN > 0 && (
                  <div style={{ flex: 1, backgroundColor: "#22c55e" }}
                    className="flex items-center justify-center overflow-hidden whitespace-nowrap px-1">
                    Marge {pct(kpi.margeN, caBase)}%
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-2 flex-wrap">
                {[
                  { label: "COGS", color: "#f59e0b", val: kpi.cogs },
                  { label: "Charges", color: "#ef4444", val: kpi.chargesOp },
                  { label: "Marge nette", color: "#22c55e", val: kpi.margeN },
                ].map((x) => (
                  <div key={x.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: x.color }} />
                    <span className="text-xs text-[--foreground-subtle]">{x.label}</span>
                    <span className="text-xs font-semibold">{formatMGA(x.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Détail CA ─────────────────────────────────────────────────── */}
          <div className="bg-[--card] border border-[--border] rounded-xl p-4">
            <p className="text-xs text-[--foreground-subtle] mb-3 font-medium">Détail chiffre d&apos;affaires</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Sous-total HT", val: kpi.caHT + kpi.remises },
                { label: "Remises accordées", val: -kpi.remises, neg: true },
                { label: "TVA collectée", val: kpi.tva },
                { label: "Total TTC", val: kpi.caTTC, bold: true },
              ].map(({ label, val, neg, bold }) => (
                <div key={label} className={`flex flex-col gap-0.5 ${bold ? "border-l-2 border-[--primary] pl-2" : ""}`}>
                  <span className="text-[11px] text-[--foreground-subtle]">{label}</span>
                  <span className={`text-sm font-semibold ${neg ? "text-red-500" : bold ? "text-[--primary]" : ""}`}>
                    {neg ? "- " : ""}{formatMGA(Math.abs(val))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Graphique évolution ──────────────────────────────────────── */}
          <div className="bg-[--card] border border-[--border] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[--foreground-subtle] font-medium">Évolution</p>
              <div className="flex gap-1">
                <button onClick={() => setChartType("bar")}
                  className={`p-1.5 rounded-lg ${chartType === "bar" ? "bg-[--primary]/10 text-[--primary]" : "text-[--foreground-subtle] hover:bg-[--muted]"}`}>
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button onClick={() => setChartType("line")}
                  className={`p-1.5 rounded-lg ${chartType === "line" ? "bg-[--primary]/10 text-[--primary]" : "text-[--foreground-subtle] hover:bg-[--muted]"}`}>
                  <LineChartIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            {evolution.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-[--foreground-subtle]">
                Aucune donnée sur cette période
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                {chartType === "bar" ? (
                  <BarChart data={evolution} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatMGA(Number(v))} labelFormatter={(l) => fmtDate(String(l))} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ca"    name="CA HT"      fill="#3b82f6" radius={[2,2,0,0]} />
                    <Bar dataKey="cogs"  name="COGS"       fill="#f59e0b" radius={[2,2,0,0]} />
                    <Bar dataKey="margeB" name="Marge brute" fill="#22c55e" radius={[2,2,0,0]} />
                  </BarChart>
                ) : (
                  <LineChart data={evolution} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatMGA(Number(v))} labelFormatter={(l) => fmtDate(String(l))} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line dataKey="ca"     name="CA HT"       stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line dataKey="cogs"   name="COGS"        stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    <Line dataKey="margeB" name="Marge brute" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Marge par catégorie ──────────────────────────────────────── */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border]">
              <p className="text-xs font-medium text-[--foreground-subtle]">Marge par catégorie de produit</p>
            </div>
            {margesCategorie.length === 0 ? (
              <p className="text-sm text-[--foreground-subtle] text-center py-8">Aucune donnée</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-4 py-2 text-xs text-[--foreground-subtle] font-medium">Catégorie</th>
                      <th className="text-right px-4 py-2 text-xs text-[--foreground-subtle] font-medium hidden sm:table-cell">CA HT</th>
                      <th className="text-right px-4 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">COGS</th>
                      <th className="text-right px-4 py-2 text-xs text-[--foreground-subtle] font-medium">Marge brute</th>
                      <th className="text-left px-4 py-2 text-xs text-[--foreground-subtle] font-medium w-24 hidden sm:table-cell">Taux %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margesCategorie.map((c, i) => (
                      <tr key={c.id} className={`border-b border-[--border] last:border-0 ${i % 2 ? "bg-[--muted]/10" : ""}`}>
                        <td className="px-4 py-2.5 font-medium">{c.nom}</td>
                        <td className="px-4 py-2.5 text-right text-sm hidden sm:table-cell">{formatMGA(c.ca)}</td>
                        <td className="px-4 py-2.5 text-right text-sm text-[--foreground-subtle] hidden md:table-cell">{formatMGA(c.cogs)}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-semibold" style={{ color: c.margeB >= 0 ? "#22c55e" : "#ef4444" }}>
                          {formatMGA(c.margeB)}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[--muted] rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${Math.max(0, c.tauxMarge)}%`, backgroundColor: c.tauxMarge >= 20 ? "#22c55e" : c.tauxMarge >= 10 ? "#f59e0b" : "#ef4444" }} />
                            </div>
                            <span className="text-xs font-semibold w-8 text-right" style={{ color: c.tauxMarge >= 20 ? "#22c55e" : c.tauxMarge >= 10 ? "#f59e0b" : "#ef4444" }}>
                              {c.tauxMarge}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Flux trésorerie & Prévision fin de mois ─────────────────── */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Flux : recettes vs charges */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <p className="text-xs font-medium text-[--foreground-subtle] mb-3">Flux trésorerie (mois courant)</p>
              <div className="space-y-3">
                {[
                  { label: "Recettes TTC", val: kpi.caTTC, color: "#22c55e", bg: "#22c55e20" },
                  { label: "COGS", val: -kpi.cogs, color: "#f59e0b", bg: "#f59e0b20" },
                  { label: "Charges opérat.", val: -kpi.chargesOp, color: "#ef4444", bg: "#ef444420" },
                ].map(({ label, val, color, bg }) => {
                  const abs = Math.abs(val);
                  const max = Math.max(kpi.caTTC, kpi.cogs + kpi.chargesOp, 1);
                  const pct = Math.round((abs / max) * 100);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[--foreground-muted]">{label}</span>
                        <span className="text-xs font-semibold" style={{ color }}>
                          {val >= 0 ? "+" : "−"}{formatMGA(abs)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: "#333744" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 border-t border-[--border]">
                  <span className="text-sm font-semibold text-[--foreground]">Résultat net</span>
                  <span className="text-base font-bold" style={{ color: kpi.margeN >= 0 ? "#22c55e" : "#ef4444" }}>
                    {kpi.margeN >= 0 ? "+" : ""}{formatMGA(kpi.margeN)}
                  </span>
                </div>
              </div>
            </div>

            {/* Prévision fin de mois */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <p className="text-xs font-medium text-[--foreground-subtle] mb-3">Prévision fin de mois</p>
              {(() => {
                const now = new Date();
                const joursEcoules = now.getDate();
                const joursTotal = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const caJourMoyen = joursEcoules > 0 ? kpi.caTTC / joursEcoules : 0;
                const caPrevu = Math.round(caJourMoyen * joursTotal);
                const margePrevu = caPrevu > 0 ? Math.round((kpi.margeN / kpi.caTTC) * caPrevu) : 0;
                const avancement = Math.round((joursEcoules / joursTotal) * 100);
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[--foreground-muted]">Avancement du mois</span>
                        <span className="text-xs font-mono text-[--foreground]">{joursEcoules}j / {joursTotal}j</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: "#333744" }}>
                        <div className="h-full rounded-full bg-[--primary]" style={{ width: `${avancement}%` }} />
                      </div>
                    </div>
                    {[
                      { label: "CA/jour moyen", val: caJourMoyen, color: "#3b82f6" },
                      { label: "CA prévu fin mois", val: caPrevu, color: "#FF4D00" },
                      { label: "Résultat prévu", val: margePrevu, color: margePrevu >= 0 ? "#22c55e" : "#ef4444" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-[--foreground-muted]">{label}</span>
                        <span className="text-sm font-bold" style={{ color }}>{formatMGA(Math.round(val))}</span>
                      </div>
                    ))}
                    <div className="text-[10px] text-[--foreground-subtle] mt-1">
                      * Basé sur la vélocité des {joursEcoules} premiers jours
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Charges opérationnelles ───────────────────────────────────── */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[--border]">
              <div className="flex-1 flex items-center gap-3">
                <p className="text-xs font-medium text-[--foreground-subtle]">
                  Charges opérationnelles — {moisActuel}
                </p>
                <Link
                  href="/finances/charges"
                  className="flex items-center gap-1 text-[11px] text-[--primary] hover:underline opacity-80 hover:opacity-100 transition-opacity"
                >
                  Gérer les charges <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <button onClick={() => setChargeModal({ open: true })}
                className="flex items-center gap-1 px-3 py-1.5 bg-[--primary] text-white text-xs rounded-lg font-medium hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {/* Récap par catégorie */}
            {Object.keys(chargesParCat).length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[--border] bg-[--muted]/20">
                {Object.entries(chargesParCat).map(([cat, total]) => (
                  <div key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{ backgroundColor: (CAT_COLORS[cat] ?? "#94a3b8") + "20", color: CAT_COLORS[cat] ?? "#94a3b8" }}>
                    <span className="font-medium">{CAT_LABELS[cat] ?? cat}</span>
                    <span>{formatMGA(total)}</span>
                  </div>
                ))}
              </div>
            )}

            {charges.length === 0 ? (
              <p className="text-sm text-[--foreground-subtle] text-center py-8">Aucune charge ce mois-ci</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-4 py-2 text-xs text-[--foreground-subtle] font-medium">Libellé</th>
                      <th className="text-left px-4 py-2 text-xs text-[--foreground-subtle] font-medium hidden sm:table-cell">Catégorie</th>
                      <th className="text-right px-4 py-2 text-xs text-[--foreground-subtle] font-medium">Montant</th>
                      <th className="px-4 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.map((c, i) => (
                      <tr key={c.id} className={`border-b border-[--border] last:border-0 ${i % 2 ? "bg-[--muted]/10" : ""}`}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{c.libelle}</div>
                          {c.notes && <div className="text-xs text-[--foreground-subtle]">{c.notes}</div>}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: (CAT_COLORS[c.categorie] ?? "#94a3b8") + "20", color: CAT_COLORS[c.categorie] ?? "#94a3b8" }}>
                            {CAT_LABELS[c.categorie] ?? c.categorie}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{formatMGA(c.montant)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setChargeModal({ open: true, charge: c })}
                              className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteCharge(c.id)} disabled={deletingId === c.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-40">
                              {deletingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[--border] bg-[--muted]/30">
                      <td colSpan={1} className="px-4 py-2.5 text-xs font-semibold text-[--foreground-subtle]">TOTAL CHARGES</td>
                      <td className="hidden sm:table-cell" />
                      <td className="px-4 py-2.5 text-right font-bold text-red-500">{formatMGA(kpi.chargesOp)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal charge */}
      {chargeModal.open && (
        <ChargeModal
          mois={moisActuel}
          charge={chargeModal.charge}
          onSave={() => { setChargeModal({ open: false }); charger(); }}
          onClose={() => setChargeModal({ open: false })}
        />
      )}
    </div>
  );
}
