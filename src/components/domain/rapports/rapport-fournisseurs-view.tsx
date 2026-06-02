"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, Loader2, TrendingUp, Clock, AlertTriangle, Award, MapPin, BarChart3 } from "lucide-react";
import { formatMGA } from "@/lib/money";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Fournisseur = {
  id: string;
  nom: string;
  ville: string | null;
  nbBC: number;
  volumeAchat: number;
  delaiMoyen: number;
  tauxConformite: number;
  tauxRetard: number;
};

export function RapportFournisseursView() {
  const [data, setData] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"volume" | "delai" | "conformite">("volume");

  useEffect(() => {
    fetch("/api/rapports/fournisseurs").then((r) => r.json()).then((d) => setData(d.fournisseurs ?? [])).finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const arr = [...data];
    if (sortBy === "volume") arr.sort((a, b) => b.volumeAchat - a.volumeAchat);
    else if (sortBy === "delai") arr.sort((a, b) => a.delaiMoyen - b.delaiMoyen);
    else arr.sort((a, b) => b.tauxConformite - a.tauxConformite);
    return arr;
  }, [data, sortBy]);

  const alertes = data.filter((f) => f.tauxRetard > 30);
  const totalVolume = data.reduce((s, f) => s + f.volumeAchat, 0);
  const champion = sorted[0];

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card]">
        <Truck className="w-5 h-5 text-[--primary]" />
        <h1 className="text-lg font-bold flex-1">Rapport fournisseurs</h1>
        <div className="flex items-center gap-1 bg-[--muted]/40 rounded-lg p-0.5">
          {(["volume", "delai", "conformite"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)} className={`px-2.5 py-1 text-[11px] rounded-md font-medium ${sortBy === s ? "bg-[--card] shadow-sm" : "text-[--foreground-subtle]"}`}>
              {s === "volume" ? "Volume" : s === "delai" ? "Délai" : "Conformité"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">

          {loading ? (
            <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-3.5 h-3.5 text-[--primary]" /><span className="text-xs text-[--foreground-subtle]">Fournisseurs actifs</span></div>
                  <div className="text-lg font-bold">{data.length}</div>
                </div>
                <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-[--foreground-subtle]">Volume total achats</span></div>
                  <div className="text-lg font-bold text-[--primary]">{formatMGA(totalVolume)}</div>
                </div>
                <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><Award className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-[--foreground-subtle]">Champion volume</span></div>
                  <div className="text-sm font-bold truncate">{champion?.nom ?? "—"}</div>
                </div>
                <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-[--foreground-subtle]">Fournisseurs à risque</span></div>
                  <div className="text-lg font-bold text-red-500">{alertes.length}</div>
                </div>
              </div>

              {/* Alertes */}
              {alertes.length > 0 && (
                <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-sm font-bold text-red-700 dark:text-red-400">Fournisseurs avec taux retard &gt; 30 %</span></div>
                  <div className="flex flex-wrap gap-2">
                    {alertes.map((f) => (
                      <span key={f.id} className="px-2.5 py-1 bg-white dark:bg-[--card] border border-red-200 dark:border-red-500/30 rounded-full text-xs">
                        {f.nom} <span className="font-bold text-red-600">{f.tauxRetard}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart volume */}
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-4">Volume d&apos;achats par fournisseur</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sorted.slice(0, 10).map((f) => ({ nom: f.nom.length > 18 ? f.nom.slice(0, 18) + "…" : f.nom, volume: f.volumeAchat / 1_000_000 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                    <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "M Ar", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)} M Ar`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="volume" fill="#FF4D00" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tableau */}
              <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[--border]">
                  <p className="text-xs font-semibold text-[--foreground-subtle]">Classement détaillé</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[--border] bg-[--muted]/30">
                        <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Rang</th>
                        <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Fournisseur</th>
                        <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Ville</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">BC</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Volume</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden lg:table-cell">Délai</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden lg:table-cell">Conformité</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Retard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((f, i) => (
                        <motion.tr key={f.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10">
                          <td className="px-3 py-2.5"><span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-amber-500/20 text-amber-500" : i === 1 ? "bg-slate-400/20 text-slate-500" : i === 2 ? "bg-orange-700/20 text-orange-700" : "bg-[--muted] text-[--foreground-subtle]"}`}>{i + 1}</span></td>
                          <td className="px-3 py-2.5 font-medium text-sm">{f.nom}</td>
                          <td className="px-3 py-2.5 text-xs text-[--foreground-subtle] hidden md:table-cell"><span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{f.ville ?? "—"}</span></td>
                          <td className="px-3 py-2.5 text-right text-xs">{f.nbBC}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-xs">{formatMGA(f.volumeAchat)}</td>
                          <td className="px-3 py-2.5 text-right text-xs hidden lg:table-cell">
                            <span className={`inline-flex items-center gap-1 ${f.delaiMoyen > 7 ? "text-red-500" : f.delaiMoyen > 5 ? "text-amber-500" : "text-green-500"}`}>
                              <Clock className="w-3 h-3" /> {f.delaiMoyen}j
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs hidden lg:table-cell">
                            <span className={f.tauxConformite < 90 ? "text-red-500" : f.tauxConformite < 95 ? "text-amber-500" : "text-green-500"}>{f.tauxConformite}%</span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs">
                            <span className={f.tauxRetard > 30 ? "text-red-500 font-bold" : f.tauxRetard > 15 ? "text-amber-500" : "text-[--foreground-subtle]"}>{f.tauxRetard}%</span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
