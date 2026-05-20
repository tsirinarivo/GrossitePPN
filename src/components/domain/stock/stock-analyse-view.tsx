"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, TrendingUp, AlertTriangle, ArrowLeft, Download,
  RefreshCw, ChevronUp, ChevronDown, Minus, ShoppingCart,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { cn } from "@/lib/utils";

type ProduitStock = {
  produitId: string; code: string; nom: string; uniteBase: string; categorie: string;
  stock: number; seuilAlerte: number; sousAlerte: boolean;
  ventes30j: number; vMoyJour: number; rotation: number;
  joursStock: number | null; stockCible: number; qteReappro: number;
  valeurStock: number; prixAchat: number;
};

type Analyse = {
  produits: ProduitStock[];
  stockParDepot: { depotId: string; nomDepot: string; valeur: number; qteTotale: number }[];
  totaux: { valeurStock: number; nbProduits: number; nbSousAlerte: number; nbAReappro: number };
};

type SortKey = "nom" | "stock" | "rotation" | "joursStock" | "qteReappro" | "valeurStock";
type Filtre = "tous" | "alerte" | "reappro" | "rupture";

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border p-4 flex gap-3 items-start" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E" }}>
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

function JoursBar({ jours }: { jours: number | null }) {
  if (jours === null) return <span className="text-xs" style={{ color: "#555" }}>—</span>;
  const color = jours <= 7 ? "#EF4444" : jours <= 15 ? "#F59E0B" : "#22C55E";
  const width = Math.min(100, (jours / 30) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: "#1E1E2E" }}>
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{jours}j</span>
    </div>
  );
}

export function StockAnalyse() {
  const [data, setData]       = useState<Analyse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtre, setFiltre]   = useState<Filtre>("tous");
  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("valeurStock");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stock/analyse");
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <Minus className="w-3 h-3 opacity-30" />;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const produits = (data?.produits ?? [])
    .filter((p) => {
      if (filtre === "alerte") return p.sousAlerte;
      if (filtre === "reappro") return p.qteReappro > 0;
      if (filtre === "rupture") return p.stock === 0;
      return true;
    })
    .filter((p) => !search || p.nom.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const m = sortAsc ? 1 : -1;
      if (sortKey === "nom") return m * a.nom.localeCompare(b.nom);
      if (sortKey === "joursStock") {
        if (a.joursStock === null) return 1;
        if (b.joursStock === null) return -1;
        return m * (a.joursStock - b.joursStock);
      }
      return m * (a[sortKey] - b[sortKey]);
    });

  function exportCSV() {
    const rows = [
      ["Code", "Produit", "Catégorie", "Stock", "Unité", "Alerte", "Ventes 30j", "Rotation", "Jours restants", "Stock cible", "À réappro", "Valeur"].join(";"),
      ...produits.map((p) => [
        p.code, p.nom, p.categorie, p.stock, p.uniteBase,
        p.sousAlerte ? "OUI" : "", p.ventes30j, p.rotation,
        p.joursStock ?? "", p.stockCible, p.qteReappro, p.valeurStock,
      ].join(";")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `stock-analyse-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="text-sm flex items-center gap-1" style={{ color: "#666" }}>
            <ArrowLeft className="w-4 h-4" /> Stock
          </Link>
          <span style={{ color: "#333" }}>/</span>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#FF4D00" }} /> Analyse de stock
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg border transition-colors" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E", color: "#666" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E", color: "#888" }}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Valeur totale stock" value={formatMGA(data.totaux.valeurStock, { compact: true })} sub={`${data.totaux.nbProduits} produits`} icon={Package} color="#3B82F6" />
          <KpiCard label="Sous alerte" value={String(data.totaux.nbSousAlerte)} sub="En dessous du seuil" icon={AlertTriangle} color="#EF4444" />
          <KpiCard label="À réapprovisionner" value={String(data.totaux.nbAReappro)} sub="Stock < 30j de vente" icon={ShoppingCart} color="#F59E0B" />
          <KpiCard label="Dépôts actifs" value={String(data.stockParDepot.length)} sub={`Valeur totale répartie`} icon={TrendingUp} color="#22C55E" />
        </div>
      )}

      {/* Valeur par dépôt */}
      {data && data.stockParDepot.length > 0 && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#555" }}>Valeur stock par dépôt</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.stockParDepot.map((d) => (
              <div key={d.depotId} className="rounded-lg p-3" style={{ backgroundColor: "#0d0d14" }}>
                <p className="text-xs font-medium text-white truncate">{d.nomDepot}</p>
                <p className="text-lg font-bold mt-1" style={{ color: "#3B82F6" }}>{formatMGA(d.valeur, { compact: true })}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#555" }}>{d.qteTotale.toLocaleString("fr-FR")} unités</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E" }}>
        {/* Toolbar */}
        <div className="p-3 border-b flex gap-3 flex-wrap" style={{ borderColor: "#1E1E2E" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer…"
            className="bg-transparent text-sm outline-none placeholder:text-[#555] text-white px-3 py-1.5 rounded-lg border w-44"
            style={{ borderColor: "#1E1E2E" }}
          />
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "#1E1E2E" }}>
            {([["tous", "Tous"], ["alerte", "Alerte"], ["reappro", "Réappro"], ["rupture", "Rupture"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setFiltre(k)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ backgroundColor: filtre === k ? "#FF4D00" : "#111118", color: filtre === k ? "#fff" : "#888" }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider" style={{ color: "#555", backgroundColor: "#0d0d14" }}>
                <th className="px-4 py-2.5 text-left cursor-pointer" onClick={() => toggleSort("nom")}>
                  <span className="flex items-center gap-1">Produit <SortIcon k="nom" /></span>
                </th>
                <th className="px-4 py-2.5 text-right cursor-pointer" onClick={() => toggleSort("stock")}>
                  <span className="flex items-center justify-end gap-1">Stock <SortIcon k="stock" /></span>
                </th>
                <th className="px-4 py-2.5 text-left cursor-pointer hidden sm:table-cell" onClick={() => toggleSort("joursStock")}>
                  <span className="flex items-center gap-1">Jours restants <SortIcon k="joursStock" /></span>
                </th>
                <th className="px-4 py-2.5 text-right cursor-pointer hidden md:table-cell" onClick={() => toggleSort("rotation")}>
                  <span className="flex items-center justify-end gap-1">Rotation <SortIcon k="rotation" /></span>
                </th>
                <th className="px-4 py-2.5 text-right cursor-pointer" onClick={() => toggleSort("qteReappro")}>
                  <span className="flex items-center justify-end gap-1">À réappro <SortIcon k="qteReappro" /></span>
                </th>
                <th className="px-4 py-2.5 text-right cursor-pointer hidden lg:table-cell" onClick={() => toggleSort("valeurStock")}>
                  <span className="flex items-center justify-end gap-1">Valeur <SortIcon k="valeurStock" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {produits.map((p, i) => (
                  <motion.tr
                    key={p.produitId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className="border-t hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: "#1E1E2E" }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/stock/produits/${p.produitId}`} className="hover:text-[#FF4D00] transition-colors">
                        <div className="flex items-center gap-2">
                          {p.sousAlerte && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                          <div>
                            <div className="font-medium text-white">{p.nom}</div>
                            <div className="text-[10px]" style={{ color: "#555" }}>{p.code} · {p.categorie}</div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-mono font-bold", p.stock === 0 ? "text-red-400" : p.sousAlerte ? "text-amber-400" : "text-white")}>
                        {p.stock.toLocaleString("fr-FR")}
                      </span>
                      <span className="text-[10px] ml-1" style={{ color: "#555" }}>{p.uniteBase}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <JoursBar jours={p.joursStock} />
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="font-mono text-white">{p.rotation}×</span>
                      <div className="text-[10px]" style={{ color: "#555" }}>{p.ventes30j} vendus/mois</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.qteReappro > 0 ? (
                        <span className="font-mono font-bold" style={{ color: "#F59E0B" }}>
                          +{p.qteReappro.toLocaleString("fr-FR")} {p.uniteBase}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "#22C55E" }}>OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell font-mono text-xs" style={{ color: "#888" }}>
                      {formatMGA(p.valeurStock)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {produits.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "#555" }}>
                  Aucun produit {filtre !== "tous" ? `en "${filtre}"` : ""}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
