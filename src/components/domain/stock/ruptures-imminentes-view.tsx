"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, Loader2, Clock, Package, TrendingDown, ChevronRight,
  Flame, AlertCircle, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

type Produit = {
  id: string;
  code: string;
  nom: string;
  uniteBase: string;
  categorieId: string | null;
};

type Rupture = {
  produit: Produit;
  stockActuel: number;
  vitesseVente: number;
  joursRestants: number;
  criticite: "critique" | "urgent" | "alerte";
};

type Stats = {
  total: number;
  criticite_3j: number;
  criticite_7j: number;
  criticite_14j: number;
};

const SEUILS = [
  { value: 3, label: "< 3 jours (critique)" },
  { value: 7, label: "< 7 jours (urgent)" },
  { value: 14, label: "< 14 jours (alerte)" },
  { value: 30, label: "< 30 jours (préventif)" },
];

const CRITICITE_CONF: Record<Rupture["criticite"], { label: string; color: string; icon: typeof Flame }> = {
  critique: { label: "Critique", color: "#ef4444", icon: Flame },
  urgent: { label: "Urgent", color: "#f97316", icon: AlertCircle },
  alerte: { label: "Alerte", color: "#f59e0b", icon: AlertTriangle },
};

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: typeof AlertTriangle;
}) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-subtle] truncate">{label}</p>
        <p className="text-base font-bold leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-[--foreground-subtle] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function RupturesImminentesView() {
  const [ruptures, setRuptures] = useState<Rupture[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, criticite_3j: 0, criticite_7j: 0, criticite_14j: 0 });
  const [loading, setLoading] = useState(true);
  const [seuil, setSeuil] = useState(14);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/ruptures-imminentes?seuil=${seuil}&limit=100`);
      const data = await res.json();
      setRuptures(data.ruptures ?? []);
      setStats(data.stats ?? { total: 0, criticite_3j: 0, criticite_7j: 0, criticite_14j: 0 });
    } catch {
      toast.error("Impossible de charger les ruptures");
    } finally {
      setLoading(false);
    }
  }, [seuil]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <AlertTriangle className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Ruptures imminentes</h1>

        <select
          value={seuil}
          onChange={(ev) => setSeuil(Number(ev.target.value))}
          className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] focus:outline-none focus:border-[--primary]"
        >
          {SEUILS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <Link
          href="/achats"
          className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Créer un BC
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          <div className="bg-blue-500/5 border border-blue-500/20 text-blue-500 text-xs rounded-lg px-4 py-2.5 flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>Calcul :</strong> jours_restants = stock_actuel ÷ vitesse_moyenne_vente
              (basée sur les 30 derniers jours). Anticipe les ruptures avant qu&apos;elles n&apos;arrivent.
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Critique (<3j)"
              value={stats.criticite_3j}
              sub="À commander aujourd'hui"
              color="#ef4444"
              icon={Flame}
            />
            <KpiCard
              label="Urgent (<7j)"
              value={stats.criticite_7j}
              sub="À commander cette semaine"
              color="#f97316"
              icon={AlertCircle}
            />
            <KpiCard
              label="Alerte (<14j)"
              value={stats.criticite_14j}
              sub="À planifier"
              color="#f59e0b"
              icon={AlertTriangle}
            />
            <KpiCard
              label="Total filtré"
              value={ruptures.length}
              sub={`Sur seuil ${seuil}j`}
              color="#3b82f6"
              icon={Package}
            />
          </div>

          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border]">
              <p className="text-xs font-medium text-[--foreground-subtle]">
                {loading ? "Chargement..." : `${ruptures.length} produit(s) en risque de rupture`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Calcul des vitesses de vente...</span>
              </div>
            ) : ruptures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                <Package className="w-8 h-8 opacity-30 text-green-500" />
                <p className="text-sm font-semibold text-green-500">Aucune rupture imminente</p>
                <p className="text-xs">Tous les produits ont un stock suffisant pour {seuil} jours.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Criticité</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Produit</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Stock actuel</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Vitesse vente</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Jours restants</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruptures.map((r, i) => {
                      const conf = CRITICITE_CONF[r.criticite];
                      const Icon = conf.icon;
                      return (
                        <motion.tr
                          key={r.produit.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5) }}
                          className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ backgroundColor: conf.color + "20", color: conf.color }}
                            >
                              <Icon className="w-3 h-3" />
                              {conf.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/stock/produits/${r.produit.id}`}
                              className="hover:text-[--primary] transition-colors"
                            >
                              <div className="text-sm font-medium truncate max-w-[280px]">{r.produit.nom}</div>
                              <div className="text-[10px] text-[--foreground-subtle] font-mono">{r.produit.code}</div>
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="font-bold">{r.stockActuel.toLocaleString("fr-FR")}</div>
                            <div className="text-[10px] text-[--foreground-subtle]">{r.produit.uniteBase}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right hidden md:table-cell text-xs">
                            <div className="font-semibold">{r.vitesseVente.toLocaleString("fr-FR")}</div>
                            <div className="text-[10px] text-[--foreground-subtle]">/ jour</div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-bold"
                              style={{ backgroundColor: conf.color + "15", color: conf.color }}
                            >
                              <TrendingDown className="w-3 h-3" />
                              {r.joursRestants} j
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <ChevronRight className="w-3.5 h-3.5 text-[--foreground-subtle]" />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[--foreground-subtle] flex items-center gap-3 px-1 flex-wrap">
            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-red-500" />Critique : &lt;3 jours</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-orange-500" />Urgent : &lt;7 jours</span>
            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" />Alerte : &lt;14 jours</span>
            <span>· Source : ventes statut validée/préparée/en_livraison/livrée sur 30j</span>
          </div>
        </div>
      </div>
    </div>
  );
}
