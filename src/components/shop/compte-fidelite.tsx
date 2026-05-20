"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Star, TrendingUp, Award, Gift, Clock } from "lucide-react";
import { formatMGA } from "@/lib/money";

type Transaction = {
  id: string;
  type: string;
  points: number;
  soldeApres: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

type FideliteData = {
  client: { raisonSociale: string; pointsFidelite: number; statutFidelite: string; totalAchats: number };
  tier: { current: string; next: string | null; progressPct: number; pointsVersNextTier: number };
  transactions: Transaction[];
};

const TIER_CONFIG = {
  bronze:  { label: "Bronze",  color: "#CD7F32", bg: "#CD7F3220", icon: "🥉", minPoints: 0 },
  argent:  { label: "Argent",  color: "#9CA3AF", bg: "#9CA3AF20", icon: "🥈", minPoints: 10_000 },
  or:      { label: "Or",      color: "#F59E0B", bg: "#F59E0B20", icon: "🥇", minPoints: 50_000 },
  platine: { label: "Platine", color: "#8B5CF6", bg: "#8B5CF620", icon: "💎", minPoints: 200_000 },
};

const TX_LABELS: Record<string, { label: string; color: string }> = {
  gain:       { label: "Points gagnés",    color: "#22C55E" },
  utilisation:{ label: "Points utilisés",  color: "#EF4444" },
  expiration: { label: "Points expirés",   color: "#6B7280" },
  ajustement: { label: "Ajustement",       color: "#F59E0B" },
};

export function CompteFidelite() {
  const [data, setData] = useState<FideliteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/clients/fidelite")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-[--primary] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-[--foreground-muted]">Programme fidélité non disponible ou compte non lié.</p>
        <Link href="/compte" className="text-[--primary] text-sm mt-2 block">← Retour au compte</Link>
      </div>
    );
  }

  const { client, tier, transactions } = data;
  const tierConf = TIER_CONFIG[tier.current as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.bronze;
  const nextConf = tier.next ? TIER_CONFIG[tier.next as keyof typeof TIER_CONFIG] : null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/compte" className="text-[--foreground-muted] hover:text-[--foreground] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-[--foreground]">Programme fidélité</h1>
      </div>

      {/* Carte tier */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: tierConf.bg, borderColor: tierConf.color + "40" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: tierConf.color }}>
              {tierConf.icon} Statut {tierConf.label}
            </p>
            <p className="text-3xl font-bold text-[--foreground]">
              {client.pointsFidelite.toLocaleString("fr-FR")}
              <span className="text-base font-normal text-[--foreground-muted] ml-1">points</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[--foreground-muted]">Total achats</p>
            <p className="text-lg font-bold text-[--foreground]">{formatMGA(client.totalAchats, { compact: true })}</p>
          </div>
        </div>

        {/* Barre progression vers prochain tier */}
        {nextConf && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: tierConf.color }}>{tierConf.label}</span>
              <span className="text-xs text-[--foreground-muted]">
                {tier.pointsVersNextTier.toLocaleString("fr-FR")} pts vers {nextConf.label} {nextConf.icon}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tier.progressPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: tierConf.color }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Avantages par tier */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-4">
        <p className="text-sm font-semibold text-[--foreground] mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-[--primary]" /> Avantages de votre statut
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Points par achat", value: "1 pt / 1 000 MGA", icon: Star },
            { label: "Priorité livraison", value: tier.current !== "bronze" ? "Oui" : "Non", icon: TrendingUp },
            { label: "Remise spéciale", value: tier.current === "platine" ? "5%" : tier.current === "or" ? "3%" : tier.current === "argent" ? "1%" : "—", icon: Gift },
            { label: "Statut actuel", value: tierConf.label + " " + tierConf.icon, icon: Award },
          ].map((a) => (
            <div key={a.label} className="flex items-start gap-2 p-3 rounded-lg bg-[--accent]">
              <a.icon className="w-4 h-4 text-[--primary] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-[--foreground-muted]">{a.label}</p>
                <p className="text-sm font-semibold text-[--foreground]">{a.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historique transactions */}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[--foreground-muted]" />
          <p className="text-sm font-semibold text-[--foreground]">Historique des points</p>
        </div>
        {transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[--foreground-muted]">
            Aucune transaction enregistrée
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            {transactions.map((tx, i) => {
              const conf = TX_LABELS[tx.type] ?? { label: tx.type, color: "#6B7280" };
              const isGain = ["gain", "ajustement"].includes(tx.type) && tx.points > 0;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[--accent] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: conf.color + "20" }}>
                    <Star className="w-3.5 h-3.5" style={{ color: conf.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[--foreground]">{conf.label}</p>
                    <p className="text-xs text-[--foreground-muted]">
                      {new Date(tx.createdAt).toLocaleDateString("fr-FR")}
                      {tx.reference && ` · ${tx.reference}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: conf.color }}>
                      {isGain ? "+" : "−"}{Math.abs(tx.points).toLocaleString("fr-FR")} pts
                    </p>
                    <p className="text-[10px] text-[--foreground-muted]">
                      Solde : {tx.soldeApres.toLocaleString("fr-FR")}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tiers disponibles */}
      <div>
        <p className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider mb-3">Niveaux du programme</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(TIER_CONFIG) as [string, typeof TIER_CONFIG.bronze][]).map(([key, conf]) => {
            const isCurrent = key === tier.current;
            return (
              <div key={key}
                className="rounded-xl p-3 border text-center transition-all"
                style={{
                  borderColor: isCurrent ? conf.color : "var(--border)",
                  backgroundColor: isCurrent ? conf.bg : "var(--card)",
                }}
              >
                <div className="text-2xl mb-1">{conf.icon}</div>
                <p className="text-sm font-bold" style={{ color: isCurrent ? conf.color : "var(--foreground-muted)" }}>{conf.label}</p>
                <p className="text-[10px] text-[--foreground-muted] mt-0.5">{conf.minPoints.toLocaleString("fr-FR")} pts</p>
                {isCurrent && <p className="text-[10px] font-bold mt-1" style={{ color: conf.color }}>✓ Actuel</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
