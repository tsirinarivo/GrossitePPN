"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  History, Search, Filter, Download, Loader2, X,
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, AlertTriangle,
  ClipboardCheck, Lock, Package, Calendar, Warehouse, User,
  TrendingUp, TrendingDown, FileText,
} from "lucide-react";
import { toast } from "sonner";

type Mouvement = {
  id: string;
  type: string;
  quantiteBase: number;
  quantiteAvant: number;
  quantiteApres: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  produitId: string;
  produitNom: string | null;
  produitCode: string | null;
  produitUnite: string | null;
  depotId: string;
  depotNom: string | null;
  agentNom: string;
};

type Stats = {
  total: number;
  parType: Record<string, number>;
  totalEntrees: number;
  totalSorties: number;
};

type Depot = { id: string; nom: string };

const PERIODES = [
  { key: "jour", label: "Aujourd'hui" },
  { key: "semaine", label: "7 jours" },
  { key: "mois", label: "Ce mois" },
  { key: "trimestre", label: "3 mois" },
  { key: "annee", label: "Année" },
] as const;

const TYPES = [
  { key: "all", label: "Tous types", icon: History, color: "#94a3b8" },
  { key: "entree", label: "Entrées", icon: ArrowDownToLine, color: "#22c55e" },
  { key: "vente", label: "Ventes", icon: ArrowUpFromLine, color: "#3b82f6" },
  { key: "transfert", label: "Transferts", icon: ArrowRightLeft, color: "#8b5cf6" },
  { key: "casse", label: "Casse", icon: AlertTriangle, color: "#ef4444" },
  { key: "inventaire", label: "Inventaire", icon: ClipboardCheck, color: "#f59e0b" },
  { key: "reservation", label: "Réservation", icon: Lock, color: "#6b7280" },
] as const;

function typeInfo(t: string) {
  return TYPES.find((x) => x.key === t) ?? TYPES[0];
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: typeof History; color: string;
}) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-subtle] truncate">{label}</p>
        <p className="text-base font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] mt-0.5 text-[--foreground-subtle]">{sub}</p>}
      </div>
    </div>
  );
}

export function HistoriqueStockView() {
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, parType: {}, totalEntrees: 0, totalSorties: 0 });
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);

  const [periode, setPeriode] = useState<string>("mois");
  const [filtreType, setFiltreType] = useState<string>("all");
  const [filtreDepot, setFiltreDepot] = useState<string>("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periode,
        type: filtreType,
      });
      if (filtreDepot) params.set("depot", filtreDepot);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/stock/historique?${params}`);
      const data = await res.json();
      setMouvements(data.mouvements ?? []);
      setStats(data.stats ?? { total: 0, parType: {}, totalEntrees: 0, totalSorties: 0 });
      setDepots(data.depots ?? []);
    } catch {
      toast.error("Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  }, [periode, filtreType, filtreDepot, search]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const exportUrl = (() => {
    const params = new URLSearchParams({ periode, type: filtreType });
    if (filtreDepot) params.set("depot", filtreDepot);
    if (search.trim()) params.set("q", search.trim());
    return `/api/stock/historique/export?${params}`;
  })();

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <History className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Historique des articles</h1>

        <div className="flex items-center gap-1 bg-[--muted] rounded-xl p-1">
          {PERIODES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriode(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periode === p.key
                  ? "bg-[--card] text-[--foreground] shadow-sm"
                  : "text-[--foreground-subtle] hover:text-[--foreground]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <a
          href={exportUrl}
          className="flex items-center gap-1.5 px-3 py-2 border border-[--border] text-sm rounded-lg hover:bg-[--muted] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </a>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Mouvements totaux"
              value={stats.total.toLocaleString("fr-FR")}
              sub="Sur la période"
              icon={History}
              color="#3b82f6"
            />
            <KpiCard
              label="Entrées"
              value={stats.totalEntrees.toLocaleString("fr-FR")}
              sub="Unités reçues"
              icon={TrendingUp}
              color="#22c55e"
            />
            <KpiCard
              label="Sorties"
              value={stats.totalSorties.toLocaleString("fr-FR")}
              sub="Ventes + casse"
              icon={TrendingDown}
              color="#ef4444"
            />
            <KpiCard
              label="Inventaires"
              value={String(stats.parType.inventaire ?? 0)}
              sub={`${stats.parType.transfert ?? 0} transferts`}
              icon={ClipboardCheck}
              color="#f59e0b"
            />
          </div>

          {/* Filtres types */}
          <div className="flex flex-wrap items-center gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = filtreType === t.key;
              const count = t.key === "all" ? stats.total : (stats.parType[t.key] ?? 0);
              return (
                <button
                  key={t.key}
                  onClick={() => setFiltreType(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    active
                      ? "bg-[--primary]/10 border-[--primary] text-[--primary]"
                      : "border-[--border] text-[--foreground-subtle] hover:bg-[--muted]"
                  }`}
                >
                  <Icon className="w-3 h-3" style={{ color: active ? "#FF4D00" : t.color }} />
                  {t.label}
                  {count > 0 && (
                    <span className="ml-1 px-1 py-0.5 rounded-full bg-[--muted] text-[10px]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Recherche + filtre dépôt */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher produit, code, référence..."
                className="w-full pl-9 pr-3 py-2 border border-[--border] rounded-lg bg-[--card] text-sm focus:outline-none focus:border-[--primary]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Warehouse className="w-3.5 h-3.5 text-[--foreground-subtle]" />
              <select
                value={filtreDepot}
                onChange={(e) => setFiltreDepot(e.target.value)}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] focus:outline-none focus:border-[--primary]"
              >
                <option value="">Tous dépôts</option>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>{d.nom}</option>
                ))}
              </select>
              {(search || filtreDepot || filtreType !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFiltreDepot("");
                    setFiltreType("all");
                  }}
                  className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
                  title="Effacer les filtres"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
              <p className="text-xs font-medium text-[--foreground-subtle] flex-1">
                {loading ? "Chargement..." : `${mouvements.length} mouvement(s)`}
              </p>
              {mouvements.length >= 200 && (
                <span className="text-[10px] text-amber-500">Limité à 200 entrées — affinez les filtres</span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : mouvements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                <History className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucun mouvement trouvé.</p>
                <p className="text-xs">Modifiez la période ou les filtres.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Type</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Produit</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Dépôt</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Quantité</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden lg:table-cell">Avant → Après</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Référence</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden lg:table-cell">Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mouvements.map((m, i) => {
                      const info = typeInfo(m.type);
                      const Icon = info.icon;
                      const isPositive = m.type === "entree" || (m.type === "transfert" && m.quantiteApres > m.quantiteAvant);
                      const isNegative = m.type === "vente" || m.type === "casse";
                      return (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5) }}
                          className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <div className="text-xs">{new Date(m.createdAt).toLocaleDateString("fr-FR")}</div>
                            <div className="text-[10px] text-[--foreground-subtle] font-mono">
                              {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ backgroundColor: info.color + "20", color: info.color }}
                            >
                              <Icon className="w-3 h-3" />
                              {info.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {m.produitId ? (
                              <Link
                                href={`/stock/produits/${m.produitId}`}
                                className="hover:text-[--primary] transition-colors"
                              >
                                <div className="text-sm font-medium truncate max-w-[200px]">{m.produitNom ?? "—"}</div>
                                <div className="text-[10px] text-[--foreground-subtle] font-mono">{m.produitCode ?? ""}</div>
                              </Link>
                            ) : (
                              <span className="text-[--foreground-subtle]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <span className="text-xs text-[--foreground-subtle]">{m.depotNom ?? "—"}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span
                              className="font-bold"
                              style={{
                                color: isPositive ? "#22c55e" : isNegative ? "#ef4444" : "#94a3b8",
                              }}
                            >
                              {isPositive && "+"}{isNegative && "−"}
                              {Number(m.quantiteBase).toLocaleString("fr-FR")}
                            </span>
                            <div className="text-[10px] text-[--foreground-subtle]">{m.produitUnite ?? ""}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right hidden lg:table-cell text-[10px] text-[--foreground-subtle] font-mono">
                            {Number(m.quantiteAvant).toLocaleString("fr-FR")} → {Number(m.quantiteApres).toLocaleString("fr-FR")}
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <span className="text-[11px] font-mono text-[--foreground-subtle]">{m.reference ?? "—"}</span>
                          </td>
                          <td className="px-3 py-2.5 hidden lg:table-cell">
                            <span className="text-xs text-[--foreground-subtle]">{m.agentNom || "—"}</span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
