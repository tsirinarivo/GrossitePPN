"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Package, BarChart2, Download,
  ChevronUp, ChevronDown, Minus, RefreshCw
} from "lucide-react";
import { formatMGA } from "@/lib/money";

type ProduitMarge = {
  produitId: string;
  nom: string;
  categorie: string;
  uniteBase: string;
  ca: number;
  caTTC: number;
  cogs: number;
  marge: number;
  tauxMarge: number;
  quantiteBase: number;
  nbVentes: number;
};

type RapportMarges = {
  periode: string;
  produits: ProduitMarge[];
  topMarges: ProduitMarge[];
  flopMarges: ProduitMarge[];
  totaux: { ca: number; cogs: number; marge: number; tauxMarge: number };
};

const PERIODES = [
  { value: "7jours", label: "7 jours" },
  { value: "mois",   label: "Ce mois" },
  { value: "annee",  label: "Cette année" },
];

type SortKey = "nom" | "ca" | "marge" | "tauxMarge" | "nbVentes";

function MargeBar({ taux }: { taux: number }) {
  const clamped = Math.max(0, Math.min(100, taux));
  const color = clamped >= 30 ? "#22C55E" : clamped >= 15 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#333744" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs w-10 text-right font-mono" style={{ color }}>{taux}%</span>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border p-4 flex gap-3 items-start" style={{ backgroundColor: "#232630", borderColor: "#333744" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <div className="text-xs mb-0.5" style={{ color: "#666" }}>{label}</div>
        <div className="text-lg font-bold text-white">{value}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "#555" }}>{sub}</div>}
      </div>
    </div>
  );
}

export function MargesProduits() {
  const [periode, setPeriode]   = useState("mois");
  const [data, setData]         = useState<RapportMarges | null>(null);
  const [loading, setLoading]   = useState(false);
  const [sortKey, setSortKey]   = useState<SortKey>("ca");
  const [sortAsc, setSortAsc]   = useState(false);
  const [search, setSearch]     = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rapports/marges-produits?periode=${periode}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [periode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <Minus className="w-3 h-3 opacity-30" />;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const produits = data?.produits ?? [];
  const filtered = produits
    .filter((p) => !search || p.nom.toLowerCase().includes(search.toLowerCase()) || p.categorie.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const m = sortAsc ? 1 : -1;
      if (sortKey === "nom") return m * a.nom.localeCompare(b.nom);
      return m * (a[sortKey] - b[sortKey]);
    });

  function exportCSV() {
    const rows = [
      ["Produit", "Catégorie", "CA HT", "COGS", "Marge", "Taux %", "Ventes", "Qté"].join(";"),
      ...produits.map((p) => [p.nom, p.categorie, p.ca, p.cogs, p.marge, p.tauxMarge, p.nbVentes, p.quantiteBase].join(";")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `marges-${periode}.csv`; a.click();
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6" style={{ color: "#FF4D00" }} />
            Marges par produit
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>Analyse de rentabilité par article vendu</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Période pills */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "#333744" }}>
            {PERIODES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriode(p.value)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: periode === p.value ? "#FF4D00" : "#232630",
                  color: periode === p.value ? "#fff" : "#888",
                }}
              >{p.label}</button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border transition-colors hover:border-[#FF4D00]/50"
            style={{ backgroundColor: "#232630", borderColor: "#333744", color: "#666" }}
          ><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:border-[#FF4D00]/50"
            style={{ backgroundColor: "#232630", borderColor: "#333744", color: "#888" }}
          ><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="CA total HT" value={formatMGA(data.totaux.ca)} icon={TrendingUp} color="#3B82F6" />
          <KpiCard label="Coût marchandises" value={formatMGA(data.totaux.cogs)} icon={Package} color="#F59E0B" />
          <KpiCard label="Marge brute" value={formatMGA(data.totaux.marge)} sub={`${data.totaux.tauxMarge}% du CA`} icon={BarChart2} color="#22C55E" />
          <KpiCard label="Produits analysés" value={String(data.produits.length)} sub={`Période : ${PERIODES.find(p => p.value === periode)?.label}`} icon={Package} color="#8B5CF6" />
        </div>
      )}

      {/* Top/Flop */}
      {data && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Top 5 */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: "#232630", borderColor: "#333744" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" style={{ color: "#22C55E" }} />
              <span className="text-sm font-semibold text-white">Top 5 meilleures marges</span>
            </div>
            <div className="space-y-2">
              {data.topMarges.map((p, i) => (
                <div key={p.produitId} className="flex items-center gap-3">
                  <span className="text-xs w-4 text-right font-mono" style={{ color: "#555" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{p.nom}</div>
                    <MargeBar taux={p.tauxMarge} />
                  </div>
                  <span className="text-xs font-mono shrink-0" style={{ color: "#22C55E" }}>{formatMGA(p.marge)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Flop 5 */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: "#232630", borderColor: "#333744" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4" style={{ color: "#EF4444" }} />
              <span className="text-sm font-semibold text-white">Flop 5 marges les plus faibles</span>
            </div>
            <div className="space-y-2">
              {data.flopMarges.map((p, i) => (
                <div key={p.produitId} className="flex items-center gap-3">
                  <span className="text-xs w-4 text-right font-mono" style={{ color: "#555" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{p.nom}</div>
                    <MargeBar taux={p.tauxMarge} />
                  </div>
                  <span className="text-xs font-mono shrink-0" style={{ color: "#EF4444" }}>{formatMGA(p.marge)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table complète */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#232630", borderColor: "#333744" }}>
        {/* Search */}
        <div className="p-3 border-b" style={{ borderColor: "#333744" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par produit ou catégorie…"
            className="w-full max-w-xs bg-transparent text-sm outline-none placeholder:text-[#555] text-white px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "#333744" }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider" style={{ color: "#555", backgroundColor: "#1B1D24" }}>
                {([
                  ["nom",       "Produit"],
                  ["ca",        "CA HT"],
                  ["marge",     "Marge"],
                  ["tauxMarge", "Taux marge"],
                  ["nbVentes",  "Ventes"],
                ] as [SortKey, string][]).map(([k, label]) => (
                  <th key={k} className="px-4 py-2.5 text-left cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort(k)}>
                    <span className="flex items-center gap-1">{label} <SortIcon k={k} /></span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left">Catégorie</th>
                <th className="px-4 py-2.5 text-left">COGS</th>
                <th className="px-4 py-2.5 text-left">Qté vendue</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.produitId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-t hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: "#333744" }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{p.nom}</div>
                      <div className="text-[10px]" style={{ color: "#555" }}>{p.uniteBase}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-white">{formatMGA(p.ca)}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: p.marge >= 0 ? "#22C55E" : "#EF4444" }}>
                      {formatMGA(p.marge)}
                    </td>
                    <td className="px-4 py-3 w-36"><MargeBar taux={p.tauxMarge} /></td>
                    <td className="px-4 py-3 font-mono text-white">{p.nbVentes}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#888" }}>{p.categorie}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#666" }}>{formatMGA(p.cogs)}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#666" }}>{p.quantiteBase}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: "#555" }}>
                  {search ? `Aucun produit pour "${search}"` : "Aucune donnée sur cette période"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
