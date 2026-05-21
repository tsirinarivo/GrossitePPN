"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Bar, Line, Legend, Cell,
} from "recharts";
import {
  BookOpen, Loader2, TrendingUp, TrendingDown, Download, ChevronLeft, ChevronRight,
  DollarSign, ShoppingBag, Receipt, BarChart3,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type MoisBilan = {
  mois: string;
  label: string;
  caHT: number;
  caTTC: number;
  nbCommandes: number;
  achatsHT: number;
  achatsTTC: number;
  charges: number;
  resultat: number;
  margeBrute: number;
  margeBrutePct: number;
};

function KpiCard({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon: typeof TrendingUp;
  color: string;
}) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-subtle] truncate">{label}</p>
        <p className="text-base font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: subColor ?? "#94a3b8" }}>{sub}</p>}
      </div>
    </div>
  );
}

export function BilanView() {
  const [mois, setMois] = useState<MoisBilan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rapports/bilan?annee=${annee}`);
      const data = await res.json();
      setMois(data.mois ?? []);
      setIsDemo(!!data.isDemo);
    } catch {
      toast.error("Impossible de charger le bilan");
    } finally {
      setLoading(false);
    }
  }, [annee]);

  useEffect(() => {
    load();
  }, [load]);

  // Totaux annuels
  const totaux = mois.reduce(
    (acc, m) => ({
      caHT: acc.caHT + m.caHT,
      caTTC: acc.caTTC + m.caTTC,
      achatsHT: acc.achatsHT + m.achatsHT,
      achatsTTC: acc.achatsTTC + m.achatsTTC,
      charges: acc.charges + m.charges,
      margeBrute: acc.margeBrute + m.margeBrute,
      resultat: acc.resultat + m.resultat,
      nbCommandes: acc.nbCommandes + m.nbCommandes,
    }),
    { caHT: 0, caTTC: 0, achatsHT: 0, achatsTTC: 0, charges: 0, margeBrute: 0, resultat: 0, nbCommandes: 0 }
  );

  const margeAnnuelle = totaux.caHT > 0 ? Math.round((totaux.margeBrute / totaux.caHT) * 100) : 0;
  const tauxResultat = totaux.caHT > 0 ? Math.round((totaux.resultat / totaux.caHT) * 100) : 0;

  // Chart data
  const chartData = mois.map((m) => ({
    mois: m.label.split(" ")[0]?.slice(0, 3) ?? m.mois,
    "CA HT": m.caHT,
    "Achats": m.achatsHT,
    "Charges": m.charges,
    "Résultat": m.resultat,
  }));

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <BookOpen className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Bilan simplifié</h1>

        {/* Navigation année */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAnnee(annee - 1)}
            className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-[60px] text-center">{annee}</span>
          <button
            onClick={() => setAnnee(annee + 1)}
            className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
            disabled={annee >= new Date().getFullYear()}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <a
          href={`/api/rapports/bilan/export?annee=${annee}`}
          className="flex items-center gap-1.5 px-3 py-2 border border-[--border] text-sm rounded-lg hover:bg-[--muted] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </a>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          {isDemo && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs rounded-lg px-4 py-2.5">
              Aucune donnée comptable sur {annee} — affichage de données de démonstration.
            </div>
          )}

          {/* KPIs annuels */}
          <div>
            <h3 className="text-xs font-semibold text-[--foreground-subtle] uppercase tracking-wider mb-3">
              Synthèse {annee}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Chiffre d'affaires HT"
                value={formatMGA(totaux.caHT)}
                sub={`${totaux.nbCommandes.toLocaleString("fr-FR")} commandes`}
                icon={DollarSign}
                color="#22c55e"
              />
              <KpiCard
                label="Achats HT"
                value={formatMGA(totaux.achatsHT)}
                sub="Marchandises reçues"
                icon={ShoppingBag}
                color="#3b82f6"
              />
              <KpiCard
                label="Charges"
                value={formatMGA(totaux.charges)}
                sub="Personnel, loyer, énergie..."
                icon={Receipt}
                color="#f59e0b"
              />
              <KpiCard
                label="Résultat net"
                value={formatMGA(totaux.resultat)}
                sub={`${tauxResultat >= 0 ? "+" : ""}${tauxResultat}% du CA`}
                subColor={totaux.resultat >= 0 ? "#22c55e" : "#ef4444"}
                icon={totaux.resultat >= 0 ? TrendingUp : TrendingDown}
                color={totaux.resultat >= 0 ? "#22c55e" : "#ef4444"}
              />
            </div>
          </div>

          {/* Compte de résultat synthétique */}
          <div className="bg-[--card] border border-[--border] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-[--primary]" />
              <h3 className="font-bold text-sm">Compte de résultat annuel</h3>
            </div>
            <div className="space-y-2 max-w-xl">
              <div className="flex justify-between text-sm py-2">
                <span className="text-[--foreground-subtle]">Chiffre d&apos;affaires HT</span>
                <span className="font-bold">{formatMGA(totaux.caHT)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-t border-[--border]">
                <span className="text-[--foreground-subtle]">− Achats HT</span>
                <span className="font-bold text-red-400">−{formatMGA(totaux.achatsHT)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-t border-[--border]">
                <span className="font-semibold">= Marge brute</span>
                <span className="font-bold text-green-500">
                  {formatMGA(totaux.margeBrute)} <span className="text-xs font-normal opacity-70">({margeAnnuelle}%)</span>
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-t border-[--border]">
                <span className="text-[--foreground-subtle]">− Charges opérationnelles</span>
                <span className="font-bold text-red-400">−{formatMGA(totaux.charges)}</span>
              </div>
              <div className="flex justify-between text-base py-3 border-t-2 border-[--primary]/30 mt-2">
                <span className="font-bold text-[--primary]">= Résultat net</span>
                <span className="font-bold text-[--primary]">
                  {totaux.resultat >= 0 ? "+" : ""}{formatMGA(totaux.resultat)}
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          {!loading && chartData.length > 0 && (
            <div className="bg-[--card] border border-[--border] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-[--primary]" />
                <h3 className="font-bold text-sm">Évolution mensuelle</h3>
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData}>
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E1E2E",
                        border: "1px solid #2E2E3E",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(v) => formatMGA(Number(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="CA HT" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Achats" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Charges" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Résultat" stroke="#FF4D00" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table détail mensuel */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border]">
              <p className="text-xs font-medium text-[--foreground-subtle]">Détail mois par mois</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-[--foreground-subtle]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Mois</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Cmdes</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">CA HT</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Achats</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Charges</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Marge%</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mois.map((m, i) => (
                      <motion.tr
                        key={m.mois}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">{m.label}</td>
                        <td className="px-3 py-2 text-right text-xs text-[--foreground-subtle] hidden md:table-cell">
                          {m.nbCommandes}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{formatMGA(m.caHT)}</td>
                        <td className="px-3 py-2 text-right text-xs hidden md:table-cell text-red-400">
                          −{formatMGA(m.achatsHT)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs hidden md:table-cell text-amber-500">
                          −{formatMGA(m.charges)}
                        </td>
                        <td className="px-3 py-2 text-right hidden md:table-cell">
                          <span
                            className="text-xs font-bold"
                            style={{
                              color: m.margeBrutePct >= 20 ? "#22c55e" : m.margeBrutePct >= 10 ? "#f59e0b" : "#ef4444",
                            }}
                          >
                            {m.margeBrutePct}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className="font-bold"
                            style={{ color: m.resultat >= 0 ? "#22c55e" : "#ef4444" }}
                          >
                            {m.resultat >= 0 ? "+" : ""}{formatMGA(m.resultat)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[--primary]/30 bg-[--muted]/40 font-bold">
                      <td className="px-3 py-3 text-xs uppercase tracking-wider">Total {annee}</td>
                      <td className="px-3 py-3 text-right text-xs hidden md:table-cell">
                        {totaux.nbCommandes.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-3 py-3 text-right">{formatMGA(totaux.caHT)}</td>
                      <td className="px-3 py-3 text-right text-red-400 text-xs hidden md:table-cell">
                        −{formatMGA(totaux.achatsHT)}
                      </td>
                      <td className="px-3 py-3 text-right text-amber-500 text-xs hidden md:table-cell">
                        −{formatMGA(totaux.charges)}
                      </td>
                      <td className="px-3 py-3 text-right hidden md:table-cell text-sm">
                        <span style={{ color: margeAnnuelle >= 20 ? "#22c55e" : "#f59e0b" }}>{margeAnnuelle}%</span>
                      </td>
                      <td className="px-3 py-3 text-right text-base" style={{ color: totaux.resultat >= 0 ? "#22c55e" : "#ef4444" }}>
                        {totaux.resultat >= 0 ? "+" : ""}{formatMGA(totaux.resultat)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[--foreground-subtle] text-center">
            Bilan simplifié pour suivi interne — ne remplace pas le bilan comptable officiel.
          </p>
        </div>
      </div>
    </div>
  );
}
