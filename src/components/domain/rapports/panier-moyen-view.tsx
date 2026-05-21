"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import {
  ShoppingBasket, Loader2, TrendingUp, Activity, Link as LinkIcon,
  ArrowRight, Lightbulb,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Tranche = { tranche: string; nbCommandes: number; ttcSum: number };
type Duo = { produitA: string; produitB: string; cooccurrences: number; pctCoOcc: number };
type Stats = {
  total: number;
  panierMoyen: number;
  panierMedian: number;
  panierMin: number;
  panierMax: number;
};

const PERIODES = [
  { key: "mois", label: "Ce mois" },
  { key: "3mois", label: "3 mois" },
  { key: "12mois", label: "12 mois" },
  { key: "annee", label: "Année" },
] as const;

const TRANCHE_COLORS = ["#94a3b8", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];

function KpiCard({
  label, value, sub, icon: Icon, color,
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

export function PanierMoyenView() {
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [duos, setDuos] = useState<Duo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [periode, setPeriode] = useState<string>("3mois");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rapports/panier-moyen?periode=${periode}`);
      const data = await res.json();
      setTranches(data.tranches ?? []);
      setDuos(data.duos ?? []);
      setStats(data.stats ?? null);
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

  const maxTranche = tranches.reduce((m, t) => Math.max(m, t.nbCommandes), 0);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <ShoppingBasket className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Analyse panier moyen</h1>

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
              Aucune commande sur la période — affichage de données de démonstration.
            </div>
          )}

          {/* KPI */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Commandes analysées"
                value={stats.total.toLocaleString("fr-FR")}
                icon={ShoppingBasket}
                color="#3b82f6"
              />
              <KpiCard
                label="Panier moyen"
                value={formatMGA(stats.panierMoyen)}
                sub={`Médiane : ${formatMGA(stats.panierMedian)}`}
                icon={TrendingUp}
                color="#22c55e"
              />
              <KpiCard
                label="Panier max"
                value={formatMGA(stats.panierMax)}
                sub="Plus grosse commande"
                icon={Activity}
                color="#f59e0b"
              />
              <KpiCard
                label="Panier min"
                value={formatMGA(stats.panierMin)}
                sub="Plus petite commande"
                icon={Activity}
                color="#94a3b8"
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
              {/* Distribution */}
              <div className="bg-[--card] border border-[--border] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-[--primary]" />
                  <h3 className="font-bold text-sm">Distribution par tranche de montant</h3>
                </div>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={tranches}>
                      <XAxis dataKey="tranche" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: number) => String(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E1E2E",
                          border: "1px solid #2E2E3E",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        formatter={(v, n, item) => {
                          if (n === "nbCommandes") return [`${v} commande(s)`, "Volume"];
                          return [String(v), String(n)];
                        }}
                      />
                      <Bar dataKey="nbCommandes" radius={[6, 6, 0, 0]}>
                        {tranches.map((_, i) => (
                          <Cell key={i} fill={TRANCHE_COLORS[i % TRANCHE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 text-xs">
                  {tranches.map((t, i) => {
                    const pct = maxTranche > 0 ? Math.round((t.nbCommandes / maxTranche) * 100) : 0;
                    return (
                      <div key={t.tranche} className="flex items-center gap-2 p-2 rounded-lg bg-[--muted]/20">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TRANCHE_COLORS[i % TRANCHE_COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium">{t.tranche}</div>
                          <div className="text-[10px] text-[--foreground-subtle]">
                            {t.nbCommandes} cmd · {formatMGA(t.ttcSum)}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[--foreground-subtle]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top duos produits */}
              <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[--primary]" />
                  <h3 className="font-bold text-sm">Produits fréquemment commandés ensemble</h3>
                </div>
                {duos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-[--foreground-subtle]">
                    <LinkIcon className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Pas assez de données pour identifier des associations.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[--border]">
                    {duos.map((d, i) => (
                      <motion.div
                        key={`${d.produitA}-${d.produitB}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="px-4 py-3 hover:bg-[--muted]/10 transition-colors flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center text-[10px] font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium truncate">{d.produitA}</span>
                            <ArrowRight className="w-3 h-3 text-[--foreground-subtle] shrink-0" />
                            <span className="font-medium truncate">{d.produitB}</span>
                          </div>
                          <div className="text-[11px] text-[--foreground-subtle] mt-0.5">
                            Achetés ensemble {d.cooccurrences} fois
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-[--primary]">{d.pctCoOcc}%</div>
                          <div className="text-[9px] text-[--foreground-subtle] uppercase tracking-wider">co-achat</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestion cross-sell */}
              {duos.length > 0 && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-blue-500 mb-1">Suggestion cross-sell</h4>
                    <p className="text-xs text-[--foreground-subtle]">
                      Configurez le POS pour proposer automatiquement <strong className="text-[--foreground]">{duos[0]?.produitB}</strong>
                      {" "}quand un client ajoute <strong className="text-[--foreground]">{duos[0]?.produitA}</strong>
                      {" "}à son panier (corrélation {duos[0]?.pctCoOcc}%).
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
