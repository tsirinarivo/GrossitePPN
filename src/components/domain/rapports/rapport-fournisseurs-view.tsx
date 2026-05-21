"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import {
  Building2, Loader2, AlertTriangle, TrendingUp, Clock,
  CheckCircle2, AlertCircle, Trophy, Phone, MapPin, ShieldCheck,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Fournisseur = {
  id: string;
  nom: string;
  ville: string | null;
  contact: string | null;
  telephone: string | null;
  nbBC: number;
  totalAchats: number;
  totalRecu: number;
  delaiMoyenJours: number | null;
  tauxConformite: number | null;
  retardsCount: number;
  tauxRetard: number | null;
};

const PERIODES = [
  { key: "mois", label: "Ce mois" },
  { key: "3mois", label: "3 mois" },
  { key: "12mois", label: "12 mois" },
  { key: "annee", label: "Année en cours" },
] as const;

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
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
        {sub && <p className="text-[11px] mt-0.5 text-[--foreground-subtle]">{sub}</p>}
      </div>
    </div>
  );
}

export function RapportFournisseursView() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [periode, setPeriode] = useState<string>("3mois");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rapports/fournisseurs?periode=${periode}`);
      const data = await res.json();
      setFournisseurs(data.fournisseurs ?? []);
      setIsDemo(!!data.isDemo);
    } catch {
      toast.error("Impossible de charger le rapport");
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => {
    load();
  }, [load]);

  const totaux = fournisseurs.reduce(
    (acc, f) => ({
      nbBC: acc.nbBC + f.nbBC,
      totalAchats: acc.totalAchats + f.totalAchats,
      delaisCount: f.delaiMoyenJours !== null ? acc.delaisCount + 1 : acc.delaisCount,
      delaisSum: f.delaiMoyenJours !== null ? acc.delaisSum + f.delaiMoyenJours : acc.delaisSum,
      retards: acc.retards + f.retardsCount,
    }),
    { nbBC: 0, totalAchats: 0, delaisCount: 0, delaisSum: 0, retards: 0 }
  );

  const delaiMoyenGlobal = totaux.delaisCount > 0
    ? Math.round((totaux.delaisSum / totaux.delaisCount) * 10) / 10
    : null;

  // Top 6 pour le chart
  const topAchats = fournisseurs.slice(0, 6).map((f) => ({
    nom: f.nom.length > 22 ? f.nom.slice(0, 20) + "…" : f.nom,
    achats: f.totalAchats,
    conformite: f.tauxConformite ?? 100,
  }));

  // Alertes : retard > 30%
  const alertes = fournisseurs.filter((f) => (f.tauxRetard ?? 0) > 30);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <Building2 className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Rapport fournisseurs</h1>

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
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          {isDemo && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs rounded-lg px-4 py-2.5">
              Pas d&apos;achats sur la période — affichage de données de démonstration.
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Fournisseurs actifs"
              value={String(fournisseurs.length)}
              sub={`${totaux.nbBC} bons de commande`}
              icon={Building2}
              color="#3b82f6"
            />
            <KpiCard
              label="Total achats"
              value={formatMGA(totaux.totalAchats)}
              icon={TrendingUp}
              color="#22c55e"
            />
            <KpiCard
              label="Délai moyen"
              value={delaiMoyenGlobal !== null ? `${delaiMoyenGlobal} jours` : "—"}
              sub="Commande → réception"
              icon={Clock}
              color="#f59e0b"
            />
            <KpiCard
              label="Retards"
              value={String(totaux.retards)}
              sub={alertes.length > 0 ? `${alertes.length} fournisseur(s) à risque` : "Aucun à risque"}
              icon={AlertTriangle}
              color={alertes.length > 0 ? "#ef4444" : "#94a3b8"}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : (
            <>
              {/* Chart top achats */}
              {topAchats.length > 0 && (
                <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-sm">Top fournisseurs par volume d&apos;achat</h3>
                  </div>
                  <div style={{ width: "100%", height: 240 }}>
                    <ResponsiveContainer>
                      <BarChart data={topAchats}>
                        <XAxis
                          dataKey="nom"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={60}
                        />
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
                          formatter={(v) => [formatMGA(Number(v)), "Achats"]}
                        />
                        <Bar dataKey="achats" radius={[6, 6, 0, 0]}>
                          {topAchats.map((d, i) => (
                            <Cell
                              key={i}
                              fill={d.conformite >= 95 ? "#22c55e" : d.conformite >= 85 ? "#f59e0b" : "#ef4444"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-[--foreground-subtle]">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" />Conformité ≥ 95%</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" />85-95%</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" />&lt; 85%</div>
                  </div>
                </div>
              )}

              {/* Alertes */}
              {alertes.length > 0 && (
                <div className="bg-[--card] border-2 border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <h3 className="font-bold text-sm text-red-500">Fournisseurs à risque (taux retard &gt; 30%)</h3>
                  </div>
                  <div className="space-y-2">
                    {alertes.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-500/5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{f.nom}</div>
                          <div className="text-[11px] text-[--foreground-subtle]">
                            {f.retardsCount} retard(s) — taux {f.tauxRetard}%
                          </div>
                        </div>
                        <span className="text-xs font-bold text-red-500">{f.tauxRetard}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table classement complet */}
              <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[--border]">
                  <p className="text-xs font-medium text-[--foreground-subtle]">
                    Classement détaillé — {fournisseurs.length} fournisseur(s)
                  </p>
                </div>
                {fournisseurs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-[--foreground-subtle]">
                    <Building2 className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Aucun fournisseur sur la période.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[--border] bg-[--muted]/30">
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">#</th>
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Fournisseur</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">BCs</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Achats</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Délai</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Conformité</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Retard</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fournisseurs.map((f, i) => (
                          <motion.tr
                            key={f.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors"
                          >
                            <td className="px-3 py-2.5 text-xs font-mono">
                              {i + 1 <= 3 ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                                  style={{ backgroundColor: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32" }}>
                                  {i + 1}
                                </span>
                              ) : i + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-sm">{f.nom}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[--foreground-subtle]">
                                {f.ville && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{f.ville}</span>}
                                {f.telephone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{f.telephone}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-sm">{f.nbBC}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-sm">{formatMGA(f.totalAchats)}</td>
                            <td className="px-3 py-2.5 text-right hidden md:table-cell text-xs">
                              {f.delaiMoyenJours !== null ? `${f.delaiMoyenJours}j` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right hidden md:table-cell">
                              {f.tauxConformite !== null ? (
                                <span
                                  className="text-xs font-bold"
                                  style={{
                                    color: f.tauxConformite >= 95 ? "#22c55e" : f.tauxConformite >= 85 ? "#f59e0b" : "#ef4444",
                                  }}
                                >
                                  {f.tauxConformite}%
                                </span>
                              ) : (
                                <span className="text-[--foreground-subtle] text-xs">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {f.tauxRetard !== null ? (
                                <span
                                  className="text-xs font-bold"
                                  style={{
                                    color: f.tauxRetard === 0 ? "#22c55e" : f.tauxRetard <= 15 ? "#f59e0b" : "#ef4444",
                                  }}
                                >
                                  {f.tauxRetard}%
                                </span>
                              ) : (
                                <span className="text-[--foreground-subtle] text-xs">—</span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Légende */}
              <div className="text-[11px] text-[--foreground-subtle] flex flex-wrap items-center gap-4 px-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span>Conformité = ratio qté reçue / qté commandée</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Délai = j. entre commande et réception</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                  <span>Retard = reçu après la date prévue + 1j</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
