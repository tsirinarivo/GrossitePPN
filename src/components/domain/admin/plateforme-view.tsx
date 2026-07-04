"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building, Play, CalendarClock, Pause, Wallet, TrendingUp,
  AlertTriangle, Loader2, ArrowRight, Package,
} from "lucide-react";
import { formatMGA } from "@/lib/money";

interface Stats {
  nbTenants: number;
  parStatut: Record<string, number>;
  parPlan: Record<string, number>;
  mrrEstime: number;
  totalCA: number;
  essaisExpirant: { id: string; nom: string; slug: string; finEssaiAt: string | null; joursRestants: number }[];
  caParTenant: { id: string; nom: string; slug: string; plan: string; ca: number; nbCommandes: number }[];
}

const PLAN_LABEL: Record<string, string> = {
  essai: "Essai", standard: "Standard", pro: "Pro", entreprise: "Entreprise",
};

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-muted] mb-0.5">{label}</p>
        <p className="text-lg font-bold text-[--foreground] truncate">{value}</p>
      </div>
    </div>
  );
}

export function PlateformeView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/plateforme")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[--foreground-muted]">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement des statistiques…
      </div>
    );
  }

  if (!stats) {
    return <div className="p-6 text-[--foreground-muted]">Statistiques indisponibles.</div>;
  }

  const maxCA = Math.max(1, ...stats.caParTenant.map((t) => t.ca));
  const PLANS: { key: string; color: string }[] = [
    { key: "standard", color: "#3B82F6" },
    { key: "pro", color: "#FF4D00" },
    { key: "entreprise", color: "#8B5CF6" },
    { key: "essai", color: "#F59E0B" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-display-sm text-[--foreground]">Tableau de bord plateforme</h1>
        <p className="text-[--foreground-muted] mt-1">Vue d&apos;ensemble des tenants, abonnements et activité</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total tenants" value={stats.nbTenants} icon={Building} color="#FF4D00" />
        <KpiCard label="Actifs" value={stats.parStatut.actif ?? 0} icon={Play} color="#22C55E" />
        <KpiCard label="MRR estimé" value={`${formatMGA(stats.mrrEstime)} /mois`} icon={Wallet} color="#8B5CF6" />
        <KpiCard label="CA cumulé (tous tenants)" value={formatMGA(stats.totalCA)} icon={TrendingUp} color="#10B981" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Répartition par plan */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-5">
          <h2 className="font-semibold text-[--foreground] mb-4 inline-flex items-center gap-2">
            <Package className="w-4 h-4 text-[--primary]" /> Répartition par plan
          </h2>
          <div className="space-y-3">
            {PLANS.map(({ key, color }) => {
              const n = stats.parPlan[key] ?? 0;
              const pct = stats.nbTenants > 0 ? Math.round((n / stats.nbTenants) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[--foreground]">{PLAN_LABEL[key]}</span>
                    <span className="text-[--foreground-muted]">{n} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[--background-subtle] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[--border] flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[--foreground-muted]">
            <span className="inline-flex items-center gap-1.5"><Play className="w-3 h-3 text-green-500" />{stats.parStatut.actif ?? 0} actifs</span>
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3 h-3 text-amber-500" />{stats.parStatut.essai ?? 0} en essai</span>
            <span className="inline-flex items-center gap-1.5"><Pause className="w-3 h-3 text-red-500" />{stats.parStatut.suspendu ?? 0} suspendus</span>
            <span className="inline-flex items-center gap-1.5">{stats.parStatut.resilie ?? 0} résiliés</span>
          </div>
        </div>

        {/* Essais qui expirent */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-5">
          <h2 className="font-semibold text-[--foreground] mb-4 inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Essais qui expirent (≤ 30 j)
          </h2>
          {stats.essaisExpirant.length === 0 ? (
            <p className="text-sm text-[--foreground-muted] py-6 text-center">Aucun essai n&apos;expire dans les 30 prochains jours.</p>
          ) : (
            <div className="space-y-2">
              {stats.essaisExpirant.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-[--border] bg-[--accent]/20 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[--foreground] truncate">{t.nom}</p>
                    <p className="text-[11px] font-mono text-[--foreground-muted] truncate">/{t.slug}</p>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${t.joursRestants <= 3 ? "text-red-400" : t.joursRestants <= 7 ? "text-amber-400" : "text-[--foreground-muted]"}`}>
                    {t.joursRestants > 0 ? `J-${t.joursRestants}` : "expiré"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CA cumulé par tenant */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[--foreground] inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#10B981]" /> CA cumulé par tenant
          </h2>
          <Link href="/admin/tenants" className="text-xs text-[--primary] hover:underline inline-flex items-center gap-1">
            Gérer les tenants <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {stats.caParTenant.every((t) => t.ca === 0) ? (
          <p className="text-sm text-[--foreground-muted] py-6 text-center">Aucune vente enregistrée pour l&apos;instant.</p>
        ) : (
          <div className="space-y-2.5">
            {stats.caParTenant.map((t, i) => (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center gap-3">
                <div className="w-32 shrink-0 min-w-0">
                  <p className="text-sm text-[--foreground] truncate">{t.nom}</p>
                  <p className="text-[10px] text-[--foreground-muted]">{PLAN_LABEL[t.plan] ?? t.plan} · {t.nbCommandes} cmd</p>
                </div>
                <div className="flex-1 h-6 rounded-md bg-[--background-subtle] overflow-hidden relative">
                  <div className="h-full rounded-md bg-gradient-to-r from-[#10B981] to-[#22C55E]" style={{ width: `${Math.max(2, (t.ca / maxCA) * 100)}%` }} />
                </div>
                <span className="w-28 text-right text-sm font-semibold text-[--foreground] shrink-0">{formatMGA(t.ca)}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
