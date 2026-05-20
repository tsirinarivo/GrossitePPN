"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, ShoppingBag, Users, Package, ArrowUpRight, Zap, Clock, RefreshCw, AlertTriangle, Receipt, Truck, BarChart2, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMGA } from "@/lib/money";
import { cn } from "@/lib/utils";

type DashboardStats = {
  caJour: number;
  caHier: number;
  evolution: number | null;
  nbCommandes: number;
  nbClientsActifs: number;
  nbAlertes: number;
  nbEnAttente: number;
  activiteRecente: {
    id: string;
    type: string;
    label: string;
    montant: number;
    source: string;
    heure: string;
  }[];
};

export function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch {
      // keep previous data if available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60_000); // rafraîchissement auto 1 min
    return () => clearInterval(interval);
  }, [fetchStats]);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const cartes = [
    {
      label: "CA du jour",
      valeur: stats ? formatMGA(stats.caJour, { compact: true }) : "—",
      evolution: stats?.evolution ?? null,
      evolutionLabel: stats?.evolution != null ? `${stats.evolution > 0 ? "+" : ""}${stats.evolution}% vs hier` : null,
      icon: TrendingUp,
      couleur: "text-[--color-ocre-600]",
      bg: "bg-[--color-ocre-50] dark:bg-[--color-ocre-950]",
      href: "/rapports",
    },
    {
      label: "Commandes validées",
      valeur: stats ? `${stats.nbCommandes}` : "—",
      sous: stats?.nbEnAttente ? `${stats.nbEnAttente} en attente caisse` : "Aucune en attente",
      icon: ShoppingBag,
      couleur: "text-[--color-vanille-600]",
      bg: "bg-[--color-vanille-50] dark:bg-[--color-vanille-950]",
      href: "/pos/caisse",
    },
    {
      label: "Clients actifs",
      valeur: stats ? `${stats.nbClientsActifs}` : "—",
      sous: "Ce mois",
      icon: Users,
      couleur: "text-[--color-indigo-600]",
      bg: "bg-[--color-indigo-50] dark:bg-[--color-indigo-950]",
      href: "/clients",
    },
    {
      label: "Alertes stock",
      valeur: stats ? `${stats.nbAlertes}` : "—",
      sous: stats?.nbAlertes === 0 ? "Aucune alerte" : `${stats?.nbAlertes} produit(s)`,
      icon: Package,
      couleur: "text-[--destructive]",
      bg: "bg-[--destructive]/5",
      alert: (stats?.nbAlertes ?? 0) > 0,
      href: "/stock",
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground] capitalize">{dateLabel}</h1>
          <p className="text-[--foreground-muted] mt-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            {lastUpdated
              ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Chargement…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="live" className="mt-1">
            <Zap className="w-3 h-3" />
            En direct
          </Badge>
          <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading} className="mt-0.5">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Alerte caisse */}
      {(stats?.nbEnAttente ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[--color-vanille-50] dark:bg-[--color-vanille-950] border border-[--color-vanille-200] dark:border-[--color-vanille-800]">
          <AlertTriangle className="w-4 h-4 text-[--color-vanille-600] shrink-0" />
          <p className="text-sm text-[--foreground]">
            <span className="font-semibold">{stats?.nbEnAttente} commande{(stats?.nbEnAttente ?? 0) > 1 ? "s" : ""}</span>{" "}
            en attente à la caisse
          </p>
          <Button asChild size="sm" variant="outline" className="ml-auto shrink-0">
            <Link href="/pos/caisse">Traiter</Link>
          </Button>
        </div>
      )}

      {/* Stats cards — horizontal scroll on mobile, grid on lg */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 snap-x snap-mandatory">
        {cartes.map((carte) => (
          <Link key={carte.label} href={carte.href} className="block shrink-0 w-[72vw] sm:w-auto lg:w-auto snap-start">
            <Card className={cn("overflow-hidden h-full hover:shadow-md transition-shadow", carte.alert && "border-[--destructive]/30")}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[--foreground-muted]">{carte.label}</p>
                    <p className="text-2xl font-bold tracking-tight mt-1 text-mga">
                      {loading && !stats ? <span className="opacity-30">—</span> : carte.valeur}
                    </p>
                    {carte.evolution != null ? (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-medium mt-1.5",
                        carte.evolution >= 0 ? "text-[--success]" : "text-[--destructive]"
                      )}>
                        <ArrowUpRight className={cn("w-3.5 h-3.5", carte.evolution < 0 && "rotate-180")} />
                        {carte.evolutionLabel}
                      </div>
                    ) : carte.sous ? (
                      <p className="text-xs text-[--foreground-muted] mt-1.5">{carte.sous}</p>
                    ) : null}
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", carte.bg)}>
                    <carte.icon className={cn("w-5 h-5", carte.couleur)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Accès rapides mobile (visibles < lg uniquement) */}
      <div className="grid grid-cols-4 gap-3 lg:hidden">
        {[
          { href: "/pos/agent",  label: "POS",        icon: ShoppingCart, color: "#FF4D00" },
          { href: "/pos/caisse", label: "Caisse",      icon: Receipt,      color: "#8B5CF6" },
          { href: "/livraisons", label: "Livraisons",  icon: Truck,        color: "#3B82F6" },
          { href: "/rapports",   label: "Rapports",    icon: BarChart2,    color: "#22C55E" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[--border] bg-[--card] hover:border-[--primary]/50 transition-colors text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: a.color + "20" }}>
              <a.icon className="w-5 h-5" style={{ color: a.color }} />
            </div>
            <span className="text-[10px] font-medium text-[--foreground-muted]">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Activité récente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activité du jour</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !stats ? (
            <div className="px-6 py-8 text-center text-sm text-[--foreground-muted]">Chargement…</div>
          ) : (stats?.activiteRecente ?? []).length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[--foreground-muted]">Aucune activité aujourd&apos;hui</div>
          ) : (
            <div className="divide-y divide-[--border]">
              {(stats?.activiteRecente ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-3 hover:bg-[--accent] transition-colors">
                  <span className="text-[11px] text-[--foreground-subtle] font-mono w-10 shrink-0">
                    {item.heure}
                  </span>
                  <Badge
                    variant={item.source === "WEB" ? "web" : item.source === "POS" ? "pos" : "muted"}
                    className="text-[10px] shrink-0"
                  >
                    {item.source}
                  </Badge>
                  <span className="text-sm text-[--foreground] flex-1 truncate">{item.label}</span>
                  {item.montant > 0 && (
                    <span className="text-sm font-semibold text-mga shrink-0">
                      {formatMGA(item.montant)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
