"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Globe,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Données synthétiques ──────────────────────────────

const CA_7JOURS = [
  { jour: "Lun", pos: 3200000, web: 1800000 },
  { jour: "Mar", pos: 4100000, web: 2200000 },
  { jour: "Mer", pos: 2800000, web: 3100000 },
  { jour: "Jeu", pos: 5200000, web: 1900000 },
  { jour: "Ven", pos: 6100000, web: 4200000 },
  { jour: "Sam", pos: 7800000, web: 5100000 },
  { jour: "Dim", pos: 4500000, web: 2800000 },
];

const TOP_PRODUITS = [
  { nom: "Riz Makalioka", ventes: 185, ca: 8900000, unite: "sacs 50kg" },
  { nom: "Huile Tiko 1L", ventes: 312, ca: 3744000, unite: "cartons" },
  { nom: "Sucre Blanc", ventes: 94, ca: 2068000, unite: "sacs 50kg" },
  { nom: "Savon Madar", ventes: 248, ca: 1240000, unite: "cartons" },
  { nom: "Lait Gloria", ventes: 67, ca: 1206000, unite: "cartons" },
];

const HEATMAP_HEURES = Array.from({ length: 12 }, (_, h) => ({
  heure: `${8 + h}h`,
  lun: Math.floor(Math.random() * 10),
  mar: Math.floor(Math.random() * 10),
  mer: Math.floor(Math.random() * 10),
  jeu: Math.floor(Math.random() * 10),
  ven: Math.floor(Math.random() * 15),
  sam: Math.floor(Math.random() * 20),
}));

const VENTILATION_CANAL = [
  { name: "POS Agent", value: 62, couleur: "oklch(0.60 0.19 47)" },
  { name: "E-commerce", value: 38, couleur: "oklch(0.54 0.22 270)" },
];

const TOP_AGENTS = [
  { nom: "Hery R.", commandes: 48, ca: 12400000 },
  { nom: "Nivo M.", commandes: 41, ca: 9800000 },
  { nom: "Faly T.", commandes: 35, ca: 8200000 },
];

// ── Composant tooltip custom ──────────────────────────

function TooltipCustom({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold text-[--foreground-muted] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-[--foreground-muted]">{p.name}</span>
          <span className="font-bold text-[--foreground] ml-auto text-mga">
            {formatMGA(p.value, { compact: true })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────

const KPI = [
  {
    label: "CA semaine",
    valeur: 33_700_000,
    evolution: +18.4,
    icon: TrendingUp,
    couleur: "text-[--primary]",
    bg: "bg-[--primary]/8",
    format: true,
  },
  {
    label: "Commandes",
    valeur: 247,
    unite: "cmd",
    evolution: +12.1,
    icon: ShoppingBag,
    couleur: "text-[--color-vanille-600]",
    bg: "bg-[--color-vanille-50] dark:bg-[--color-vanille-950]",
  },
  {
    label: "Clients actifs",
    valeur: 94,
    unite: "clients",
    evolution: +6.8,
    icon: Users,
    couleur: "text-[--color-indigo-600]",
    bg: "bg-[--color-indigo-50] dark:bg-[--color-indigo-950]",
  },
  {
    label: "Taux web",
    valeur: 38,
    unite: "%",
    evolution: +4.2,
    icon: Globe,
    couleur: "text-[--success]",
    bg: "bg-[--success]/8",
  },
];

export function DashboardAnalytics() {
  const totalSemaine = useMemo(
    () => CA_7JOURS.reduce((s, d) => s + d.pos + d.web, 0),
    []
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-display-sm text-[--foreground]">Tableau de bord</h1>
            <Badge variant="live">
              <Zap className="w-3 h-3" />
              Temps réel
            </Badge>
          </div>
          <p className="text-[--foreground-muted]">
            Semaine du 6 au 12 mai 2026 · Antananarivo
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[--foreground-muted] mb-1">{k.label}</p>
                    <p className="text-2xl font-bold tracking-tight text-[--foreground] text-mga">
                      {k.format
                        ? formatMGA(k.valeur, { compact: true })
                        : `${k.valeur.toLocaleString("fr-FR")}${k.unite ? ` ${k.unite}` : ""}`}
                    </p>
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-medium mt-1.5",
                        k.evolution > 0 ? "text-[--success]" : "text-[--destructive]"
                      )}
                    >
                      {k.evolution > 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {Math.abs(k.evolution)}% vs sem. précédente
                    </div>
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
                    <k.icon className={cn("w-5 h-5", k.couleur)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* CA 7 jours — Area chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Chiffre d'affaires — 7 derniers jours</CardTitle>
              <div className="flex items-center gap-3 text-xs text-[--foreground-muted]">
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-3 h-3 text-[--color-ocre-500]" />
                  POS
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-[--color-indigo-500]" />
                  Web
                </span>
              </div>
            </div>
            <p className="text-sm font-semibold text-[--foreground] text-mga">
              Total : {formatMGA(totalSemaine)}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={CA_7JOURS} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.60 0.19 47)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.60 0.19 47)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.54 0.22 270)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.54 0.22 270)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.9 0.01 55)"
                  vertical={false}
                />
                <XAxis
                  dataKey="jour"
                  tick={{ fontSize: 12, fill: "oklch(0.55 0.01 40)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.55 0.01 40)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`}
                />
                <Tooltip content={<TooltipCustom />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="pos"
                  name="POS Agent"
                  stroke="oklch(0.60 0.19 47)"
                  strokeWidth={2.5}
                  fill="url(#gradPos)"
                  dot={false}
                  activeDot={{ r: 5, fill: "oklch(0.60 0.19 47)", stroke: "white", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="web"
                  name="E-commerce"
                  stroke="oklch(0.54 0.22 270)"
                  strokeWidth={2.5}
                  fill="url(#gradWeb)"
                  dot={false}
                  activeDot={{ r: 5, fill: "oklch(0.54 0.22 270)", stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ventilation POS vs Web — Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventilation par canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={VENTILATION_CANAL}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {VENTILATION_CANAL.map((entry, i) => (
                    <Cell key={i} fill={entry.couleur} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v}%`, ""]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {VENTILATION_CANAL.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: c.couleur }} />
                    <span className="text-[--foreground-muted]">{c.name}</span>
                  </div>
                  <span className="font-bold text-[--foreground]">{c.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ligne 2 : Top produits + Agents + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top produits */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top produits — semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TOP_PRODUITS.map((p, i) => {
                const pct = (p.ca / TOP_PRODUITS[0]!.ca) * 100;
                return (
                  <div key={p.nom}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center text-[--foreground-muted] font-mono text-xs">
                          #{i + 1}
                        </span>
                        <span className="font-medium text-[--foreground]">{p.nom}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-mga text-[--foreground]">
                          {formatMGA(p.ca, { compact: true })}
                        </span>
                        <span className="text-[--foreground-muted] text-xs ml-1.5">
                          ({p.ventes} {p.unite})
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[--border] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: `oklch(${0.60 - i * 0.05} ${0.19 - i * 0.02} ${47 + i * 15})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top agents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Agents — semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {TOP_AGENTS.map((a, i) => (
                <div key={a.nom} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    i === 0 ? "bg-[--warning]/20 text-[--warning-foreground]"
                      : i === 1 ? "bg-[--foreground-subtle]/20 text-[--foreground-muted]"
                        : "bg-[--primary]/10 text-[--primary]"
                  )}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[--foreground]">{a.nom}</p>
                    <p className="text-xs text-[--foreground-muted]">{a.commandes} commandes</p>
                  </div>
                  <p className="text-sm font-bold text-mga shrink-0">{formatMGA(a.ca, { compact: true })}</p>
                </div>
              ))}
            </div>

            {/* Bar chart simplifié */}
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={TOP_AGENTS} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Bar
                    dataKey="ca"
                    radius={[6, 6, 0, 0]}
                    fill="oklch(0.60 0.19 47)"
                  />
                  <XAxis
                    dataKey="nom"
                    tick={{ fontSize: 10, fill: "oklch(0.55 0.01 40)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
