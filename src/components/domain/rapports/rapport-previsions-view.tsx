"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  BarChart2,
  Star,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---- Types ----------------------------------------------------------------

type HistoriqueRow = {
  mois: string;
  label: string;
  ca: number;
  nb: number;
};

type PrevisionRow = {
  mois: string;
  label: string;
  caPrevision: number;
  facteurSaisonnier: number;
  confiance: "haute" | "moyenne" | "faible";
};

type TopProduit = {
  designation: string;
  qteTotal: number;
  caTotal: number;
};

type Tendance = {
  croissance3m: number;
  croissance12m: number;
  moyenneMensuelle: number;
  meilleurMois: { label: string; ca: number } | null;
};

type ApiData = {
  historique: HistoriqueRow[];
  previsions: PrevisionRow[];
  topProduits: TopProduit[];
  tendance: Tendance;
  annee: number;
  demo?: boolean;
};

// ---- Seasonal factors reference -------------------------------------------

const SAISONNALITE = [1.2, 1.15, 1.1, 1.0, 1.1, 1.15, 1.2, 1.25, 1.15, 1.0, 1.05, 1.3];
const MOIS_ABBREV = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

// ---- Chart data type ------------------------------------------------------

type ChartRow = {
  label: string;
  shortLabel: string;
  caHisto?: number;
  caPrevision?: number;
  caLine?: number;
  type: "historique" | "prevision";
};

// ---- Sub-components --------------------------------------------------------

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate mb-1">{label}</p>
            <p className="text-xl font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div
            className={`rounded-full p-2 shrink-0 ${
              trend === "up"
                ? "bg-emerald-100 text-emerald-600"
                : trend === "down"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ confiance }: { confiance: "haute" | "moyenne" | "faible" }) {
  if (confiance === "haute") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Haute</Badge>;
  if (confiance === "moyenne") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Moyenne</Badge>;
  return <Badge variant="secondary">Faible</Badge>;
}

function FacteurCell({ abbrev, facteur }: { abbrev: string; facteur: number }) {
  const color =
    facteur > 1.2 ? "bg-orange-400" : facteur > 1.1 ? "bg-amber-300" : "bg-blue-300";
  const barWidth = Math.round(((facteur - 0.8) / 0.7) * 100);
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
      <span className="text-xs font-semibold text-muted-foreground">{abbrev}</span>
      <span className="text-sm font-bold">{facteur.toFixed(2)}</span>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(barWidth, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ---- Custom Tooltip -------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatMGA(p.value, { compact: true })}
        </p>
      ))}
    </div>
  );
}

// ---- Main component -------------------------------------------------------

export function RapportPrevisionsView() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annee] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rapports/previsions?annee=${annee}`)
      .then((r) => r.json())
      .then((d: ApiData & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [annee]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="animate-spin w-5 h-5" />
        <span>Chargement des prévisions…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-destructive">
        <AlertCircle className="w-5 h-5" />
        <span>{error ?? "Erreur inconnue"}</span>
      </div>
    );
  }

  // Build chart data: merge historique + previsions
  const currentMoisStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const chartData: ChartRow[] = [
    ...data.historique.map((h) => ({
      label: h.label,
      shortLabel: h.label.split(" ")[0] ?? h.label,
      caHisto: h.ca,
      caLine: h.ca,
      type: "historique" as const,
    })),
    ...data.previsions.map((p) => ({
      label: p.label,
      shortLabel: p.label.split(" ")[0] ?? p.label,
      caPrevision: p.caPrevision,
      caLine: p.caPrevision,
      type: "prevision" as const,
    })),
  ];

  // Find today reference line index
  const todayIndex = chartData.findIndex(
    (r) =>
      data.historique.find((h) => h.label === r.label && h.mois >= currentMoisStr) ||
      data.previsions.find((p) => p.label === r.label && p.mois === currentMoisStr)
  );
  const todayLabel = todayIndex >= 0 ? chartData[todayIndex]?.label : undefined;

  const { tendance } = data;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Prévisions &amp; Saisonnalité</h1>
          <p className="text-sm text-muted-foreground">
            Analyse des tendances et prévisions pour les 6 prochains mois
          </p>
        </div>
        {data.demo && (
          <Badge variant="secondary" className="text-xs">
            Données démo
          </Badge>
        )}
      </div>

      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Tendance 3 mois"
          value={`${tendance.croissance3m >= 0 ? "+" : ""}${tendance.croissance3m}%`}
          sub="vs 3 mois précédents"
          icon={tendance.croissance3m >= 0 ? TrendingUp : TrendingDown}
          trend={tendance.croissance3m >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Croissance 12 mois"
          value={`${tendance.croissance12m >= 0 ? "+" : ""}${tendance.croissance12m}%`}
          sub="vs 12 mois précédents"
          icon={tendance.croissance12m >= 0 ? TrendingUp : TrendingDown}
          trend={tendance.croissance12m >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="CA moyen mensuel"
          value={formatMGA(tendance.moyenneMensuelle, { compact: true })}
          sub="24 derniers mois"
          icon={BarChart2}
          trend="neutral"
        />
        <KpiCard
          label="Meilleur mois prévu"
          value={
            tendance.meilleurMois
              ? formatMGA(tendance.meilleurMois.ca, { compact: true })
              : "—"
          }
          sub={tendance.meilleurMois?.label ?? ""}
          icon={Star}
          trend="up"
        />
      </div>

      {/* 2. Main chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique &amp; Prévisions CA (24+6 mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatMGA(v, { compact: true })}
                width={72}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {todayLabel && (
                <ReferenceLine
                  x={todayLabel.split(" ")[0] ?? todayLabel}
                  stroke="#6B7280"
                  strokeDasharray="4 4"
                  label={{ value: "Aujourd'hui", position: "top", fontSize: 11, fill: "#6B7280" }}
                />
              )}
              <Bar
                dataKey="caHisto"
                name="CA historique"
                fill="#3B82F6"
                radius={[3, 3, 0, 0]}
              />
              {/* Solid line for history */}
              <Line
                dataKey="caHisto"
                name="Tendance"
                stroke="#F59E0B"
                dot={false}
                strokeWidth={2}
                legendType="none"
              />
              {/* Dashed line for forecast */}
              <Line
                dataKey="caPrevision"
                name="CA prévu"
                stroke="#F59E0B"
                strokeDasharray="6 3"
                dot={{ r: 4, fill: "#F59E0B" }}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Facteurs saisonniers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facteurs saisonniers — Madagascar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {SAISONNALITE.map((f, i) => (
              <FacteurCell key={i} abbrev={String(MOIS_ABBREV[i] ?? "—")} facteur={f} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Orange: &gt;1.2 (haute saison) · Ambre: &gt;1.1 (saison intermédiaire) · Bleu: ≤1.0 (basse saison)
          </p>
        </CardContent>
      </Card>

      {/* 4. Tableau prévisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prévisions — 6 prochains mois</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Mois</th>
                  <th className="text-right py-2 font-medium">CA prévu</th>
                  <th className="text-right py-2 font-medium">Facteur</th>
                  <th className="text-center py-2 font-medium">Confiance</th>
                </tr>
              </thead>
              <tbody>
                {data.previsions.map((p) => (
                  <tr key={p.mois} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{p.label}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatMGA(p.caPrevision)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      ×{p.facteurSaisonnier.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-center">
                      <ConfidenceBadge confiance={p.confiance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Top produits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Top produits — 90 derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium w-10">Rang</th>
                  <th className="text-left py-2 font-medium">Produit</th>
                  <th className="text-right py-2 font-medium">Volume (u.)</th>
                  <th className="text-right py-2 font-medium">CA (90j)</th>
                </tr>
              </thead>
              <tbody>
                {data.topProduits.map((p, i) => (
                  <tr key={p.designation} className="border-b last:border-0">
                    <td className="py-2.5 font-bold text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="py-2.5 font-medium">{p.designation}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {p.qteTotal.toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatMGA(p.caTotal, { compact: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
