"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBasket, Loader2, ArrowRight, BarChart3, Sparkles } from "lucide-react";
import { formatMGA } from "@/lib/money";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

type Tranche = { tranche: string; nb: number };
type Paire = { produitA: string; produitB: string; cooccurrence: number };

const TRANCHE_COLORS: Record<string, string> = {
  "< 50K": "#94a3b8",
  "50K-100K": "#3b82f6",
  "100K-250K": "#22c55e",
  "250K-500K": "#f59e0b",
  "500K-1M": "#ef4444",
  "> 1M": "#a855f7",
};

export function RapportPanierView() {
  const [distribution, setDistribution] = useState<Tranche[]>([]);
  const [paires, setPaires] = useState<Paire[]>([]);
  const [panierMoyen, setPanierMoyen] = useState(0);
  const [panierMedian, setPanierMedian] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rapports/panier").then((r) => r.json()).then((d) => {
      setDistribution(d.distribution ?? []);
      setPaires(d.paires ?? []);
      setPanierMoyen(d.panierMoyen ?? 0);
      setPanierMedian(d.panierMedian ?? 0);
    }).finally(() => setLoading(false));
  }, []);

  const totalCommandes = distribution.reduce((s, t) => s + t.nb, 0);
  const trancheMode = distribution.reduce((acc, t) => t.nb > (acc?.nb ?? 0) ? t : acc, null as Tranche | null);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card]">
        <ShoppingBasket className="w-5 h-5 text-[--primary]" />
        <h1 className="text-lg font-bold flex-1">Analyse panier moyen</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 flex flex-col gap-6">
        {loading ? (
          <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--foreground-subtle]">Total commandes analysées</div>
                <div className="text-lg font-bold">{totalCommandes}</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--foreground-subtle]">Panier moyen</div>
                <div className="text-lg font-bold text-[--primary]">{formatMGA(panierMoyen)}</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--foreground-subtle]">Panier médian</div>
                <div className="text-lg font-bold">{formatMGA(panierMedian)}</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="text-xs text-[--foreground-subtle]">Tranche dominante</div>
                <div className="text-base font-bold" style={{ color: TRANCHE_COLORS[trancheMode?.tranche ?? ""] ?? "#FF4D00" }}>{trancheMode?.tranche ?? "—"}</div>
              </div>
            </div>

            {/* Distribution */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[--primary]" /> Distribution des montants de commande</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                  <XAxis dataKey="tranche" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="nb" radius={[6, 6, 0, 0]}>
                    {distribution.map((d) => (
                      <Cell key={d.tranche} fill={TRANCHE_COLORS[d.tranche] ?? "#FF4D00"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Paires fréquemment commandées */}
            <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">Produits fréquemment commandés ensemble</span>
              </div>
              <p className="px-4 py-2 text-xs text-[--foreground-subtle] bg-amber-50 dark:bg-amber-500/10 border-b border-[--border]">
                💡 Utilisez ces associations dans le POS pour proposer du cross-sell.
              </p>
              {paires.length === 0 ? (
                <div className="text-center py-10 text-xs text-[--foreground-subtle]">Pas assez de données</div>
              ) : (
                <div className="divide-y divide-[--border]">
                  {paires.map((p, i) => (
                    <motion.div
                      key={`${p.produitA}-${p.produitB}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-[--muted]/20"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">{i + 1}</div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{p.produitA}</span>
                        <ArrowRight className="w-3 h-3 text-[--foreground-subtle]" />
                        <span className="text-sm font-medium">{p.produitB}</span>
                      </div>
                      <div className="text-xs font-bold whitespace-nowrap"><span className="text-[--primary]">{p.cooccurrence}</span> <span className="text-[--foreground-subtle] font-normal">commandes</span></div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
