"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie,
} from "recharts";
import {
  Truck, Loader2, CheckCircle2, AlertCircle, MapPin, Clock,
  Wallet, Trophy, ChevronRight, TrendingUp,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Chauffeur = {
  chauffeurId: string;
  nom: string;
  nbLivraisons: number;
  nbLivrees: number;
  nbEchecs: number;
  tauxPonctualite: number;
  tauxReussite: number;
  kmParcourus: number;
  coutMoyenParLivraison: number;
};

type MotifEchec = { motif: string; count: number };

type Synthese = {
  total: number;
  livrees: number;
  echecs: number;
  tauxReussite: number;
  tauxPonctualite: number;
  kmTotal: number;
  coutTotal: number;
  coutMoyenLivraison: number;
};

const PERIODES = [
  { key: "semaine", label: "7 jours" },
  { key: "mois", label: "Ce mois" },
  { key: "trimestre", label: "3 mois" },
  { key: "annee", label: "Année" },
] as const;

const MOTIF_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#94a3b8"];

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof CheckCircle2;
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

export function RapportLivraisonsView() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [motifs, setMotifs] = useState<MotifEchec[]>([]);
  const [synthese, setSynthese] = useState<Synthese | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [periode, setPeriode] = useState<string>("mois");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rapports/livraisons?periode=${periode}`);
      const data = await res.json();
      setChauffeurs(data.chauffeurs ?? []);
      setMotifs(data.motifsEchecs ?? []);
      setSynthese(data.synthese ?? null);
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

  const chartPonctualite = chauffeurs.slice(0, 6).map((c) => ({
    nom: c.nom.length > 16 ? c.nom.slice(0, 14) + "…" : c.nom,
    ponctualite: c.tauxPonctualite,
    reussite: c.tauxReussite,
  }));

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <Truck className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Rapport livraisons</h1>

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
              Aucune livraison sur la période — affichage de données de démonstration.
            </div>
          )}

          {synthese && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Livraisons totales"
                value={synthese.total.toLocaleString("fr-FR")}
                sub={`${synthese.livrees} livrées · ${synthese.echecs} échecs`}
                icon={Truck}
                color="#3b82f6"
              />
              <KpiCard
                label="Taux de réussite"
                value={`${synthese.tauxReussite}%`}
                sub={synthese.tauxReussite >= 90 ? "Très bon niveau" : "À améliorer"}
                icon={CheckCircle2}
                color={synthese.tauxReussite >= 90 ? "#22c55e" : "#f59e0b"}
              />
              <KpiCard
                label="Ponctualité moyenne"
                value={`${synthese.tauxPonctualite}%`}
                sub="Livraison dans la journée prévue"
                icon={Clock}
                color={synthese.tauxPonctualite >= 85 ? "#22c55e" : "#f59e0b"}
              />
              <KpiCard
                label="Coût total estimé"
                value={formatMGA(synthese.coutTotal)}
                sub={`${synthese.kmTotal.toLocaleString("fr-FR")} km · ${formatMGA(synthese.coutMoyenLivraison)}/livraison`}
                icon={Wallet}
                color="#8b5cf6"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : (
            <>
              {/* Charts row */}
              <div className="grid lg:grid-cols-3 gap-4">
                {/* Ponctualité par chauffeur */}
                <div className="lg:col-span-2 bg-[--card] border border-[--border] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-sm">Performance par chauffeur</h3>
                  </div>
                  {chartPonctualite.length === 0 ? (
                    <div className="text-xs text-[--foreground-subtle] text-center py-12">Aucune donnée</div>
                  ) : (
                    <div style={{ width: "100%", height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartPonctualite}>
                          <XAxis dataKey="nom" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1E1E2E",
                              border: "1px solid #2E2E3E",
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                            formatter={(v) => `${v}%`}
                          />
                          <Bar dataKey="ponctualite" name="Ponctualité" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="reussite" name="Réussite" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-[--foreground-subtle]">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" />Ponctualité</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" />Réussite</div>
                  </div>
                </div>

                {/* Motifs échecs */}
                <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <h3 className="font-bold text-sm">Motifs d&apos;échec</h3>
                  </div>
                  {motifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-[--foreground-subtle]">
                      <CheckCircle2 className="w-8 h-8 opacity-30 text-green-500" />
                      <p className="text-xs">Aucun échec sur la période</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: "100%", height: 180 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={motifs}
                              dataKey="count"
                              nameKey="motif"
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              innerRadius={35}
                            >
                              {motifs.map((_, i) => (
                                <Cell key={i} fill={MOTIF_COLORS[i % MOTIF_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1E1E2E",
                                border: "1px solid #2E2E3E",
                                borderRadius: 8,
                                fontSize: 11,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        {motifs.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MOTIF_COLORS[i % MOTIF_COLORS.length] }} />
                            <span className="flex-1 truncate text-[--foreground-subtle]">{m.motif}</span>
                            <span className="font-bold">{m.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Table chauffeurs */}
              <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[--border]">
                  <p className="text-xs font-medium text-[--foreground-subtle]">
                    Détail par chauffeur — {chauffeurs.length} chauffeur(s)
                  </p>
                </div>
                {chauffeurs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-[--foreground-subtle]">
                    <Truck className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Aucun chauffeur actif sur la période.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[--border] bg-[--muted]/30">
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">#</th>
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Chauffeur</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Livraisons</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Réussite</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Ponctualité</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Km</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Coût/liv.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chauffeurs.map((c, i) => (
                          <motion.tr
                            key={c.chauffeurId}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors"
                          >
                            <td className="px-3 py-2.5 text-xs">
                              {i < 3 ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                                  style={{ backgroundColor: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32" }}>
                                  {i + 1}
                                </span>
                              ) : i + 1}
                            </td>
                            <td className="px-3 py-2.5 font-medium">{c.nom}</td>
                            <td className="px-3 py-2.5 text-right font-semibold">
                              {c.nbLivraisons}
                              <span className="text-[10px] text-[--foreground-subtle] ml-1">
                                ({c.nbLivrees}✓ {c.nbEchecs}✗)
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span
                                className="font-bold"
                                style={{
                                  color: c.tauxReussite >= 95 ? "#22c55e" : c.tauxReussite >= 85 ? "#f59e0b" : "#ef4444",
                                }}
                              >
                                {c.tauxReussite}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right hidden md:table-cell">
                              <span
                                className="font-bold"
                                style={{
                                  color: c.tauxPonctualite >= 90 ? "#22c55e" : c.tauxPonctualite >= 75 ? "#f59e0b" : "#ef4444",
                                }}
                              >
                                {c.tauxPonctualite}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right hidden md:table-cell text-xs text-[--foreground-subtle]">
                              {c.kmParcourus.toLocaleString("fr-FR")}
                            </td>
                            <td className="px-3 py-2.5 text-right hidden md:table-cell text-xs">
                              {formatMGA(c.coutMoyenParLivraison)}
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
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>Ponctualité = livraison dans la journée prévue (±12h)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-amber-500" />
                  <span>Km estimés à 25 km par tournée</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3 h-3 text-purple-500" />
                  <span>Coût base 8 500 MGA/livraison (carburant + main-d&apos;œuvre)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
