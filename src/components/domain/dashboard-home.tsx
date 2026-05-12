"use client";

import { TrendingUp, ShoppingBag, Users, Package, ArrowUpRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMGA } from "@/lib/money";
import { cn } from "@/lib/utils";

const STATS = [
  {
    label: "CA du jour",
    value: 8_450_000,
    evolution: +12.4,
    icon: TrendingUp,
    couleur: "text-[--color-ocre-600]",
    bg: "bg-[--color-ocre-50] dark:bg-[--color-ocre-950]",
  },
  {
    label: "Commandes",
    value: 34,
    unite: "cmd",
    evolution: +8.2,
    icon: ShoppingBag,
    couleur: "text-[--color-vanille-600]",
    bg: "bg-[--color-vanille-50] dark:bg-[--color-vanille-950]",
  },
  {
    label: "Clients actifs",
    value: 18,
    unite: "clients",
    evolution: +3.1,
    icon: Users,
    couleur: "text-[--color-indigo-600]",
    bg: "bg-[--color-indigo-50] dark:bg-[--color-indigo-950]",
  },
  {
    label: "Alertes stock",
    value: 4,
    unite: "produits",
    evolution: -2,
    icon: Package,
    couleur: "text-[--destructive]",
    bg: "bg-[--destructive]/5",
    alert: true,
  },
];

const ACTIVITE_RECENTE = [
  { type: "commande", label: "Épicerie Rasoamanarivo", montant: 145000, source: "POS", heure: "14:32" },
  { type: "commande", label: "Supérette Analakely", montant: 890000, source: "WEB", heure: "14:18" },
  { type: "paiement", label: "Mvola — CLI-047", montant: 280000, source: "CAISSE", heure: "13:55" },
  { type: "commande", label: "Restaurant Colbert", montant: 320000, source: "WEB", heure: "13:41" },
  { type: "alerte", label: "Huile Tiko — Stock bas (8 cartons)", montant: null, source: "STOCK", heure: "13:20" },
];

export function DashboardHome() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Tableau de bord</h1>
          <p className="text-[--foreground-muted] mt-1">
            Lundi 12 mai 2026 · Antananarivo
          </p>
        </div>
        <Badge variant="live" className="mt-1">
          <Zap className="w-3 h-3" />
          En direct
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[--foreground-muted]">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight mt-1 text-mga">
                    {stat.unite
                      ? `${stat.value} ${stat.unite}`
                      : formatMGA(stat.value, { compact: true })}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium mt-1.5",
                      stat.evolution > 0 ? "text-[--success]" : "text-[--destructive]"
                    )}
                  >
                    <ArrowUpRight
                      className={cn(
                        "w-3.5 h-3.5",
                        stat.evolution < 0 && "rotate-180"
                      )}
                    />
                    {Math.abs(stat.evolution)}% vs hier
                  </div>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.couleur)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activité récente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[--border]">
            {ACTIVITE_RECENTE.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-[--accent] transition-colors">
                <span className="text-[11px] text-[--foreground-subtle] font-mono w-10 shrink-0">
                  {item.heure}
                </span>
                <Badge
                  variant={
                    item.source === "WEB"
                      ? "web"
                      : item.source === "POS"
                        ? "pos"
                        : "muted"
                  }
                  className="text-[10px] shrink-0"
                >
                  {item.source}
                </Badge>
                <span className="text-sm text-[--foreground] flex-1 truncate">{item.label}</span>
                {item.montant && (
                  <span className="text-sm font-semibold text-mga shrink-0">
                    {formatMGA(item.montant)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
