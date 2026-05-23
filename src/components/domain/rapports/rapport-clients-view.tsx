"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Loader2,
  AlertCircle,
  Users,
  TrendingUp,
  ShoppingCart,
  Star,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Periode = "mois" | "trimestre" | "annee";

type ClientRFM = {
  clientId: string | null;
  raisonSociale: string;
  code: string;
  palier: string | null;
  ville: string | null;
  nbCommandes: number;
  caTTC: number;
  panierMoyen: number;
  derniereCommande: string;
  rfmScore: number;
  recence: number;
  frequence: number;
  montant: number;
  segment: "Champions" | "Fidèles" | "Potentiel" | "À risque";
  daysSinceLastOrder: number;
};

type RapportClients = {
  clients: ClientRFM[];
  totaux: { nbClients: number; caTTC: number; panierMoyen: number };
  periode: string;
  pctChampions: number;
  demo?: boolean;
};

const PERIODES: { id: Periode; label: string }[] = [
  { id: "mois", label: "Ce mois" },
  { id: "trimestre", label: "Ce trimestre" },
  { id: "annee", label: "Cette année" },
];

const SEGMENT_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  Champions: {
    color: "#B45309",
    bg: "#FEF3C7",
    border: "#FDE68A",
    label: "Champions",
  },
  "Fidèles": {
    color: "#15803D",
    bg: "#DCFCE7",
    border: "#BBF7D0",
    label: "Fidèles",
  },
  Potentiel: {
    color: "#1D4ED8",
    bg: "#DBEAFE",
    border: "#BFDBFE",
    label: "Potentiel",
  },
  "À risque": {
    color: "#B91C1C",
    bg: "#FEE2E2",
    border: "#FECACA",
    label: "À risque",
  },
};

const PALIER_LABELS: Record<string, string> = {
  gros: "Gros",
  semi_gros: "Semi-gros",
  demi_gros: "Demi-gros",
  detail: "Détail",
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-[--primary]" />
          <p className="text-xs text-[--foreground-muted]">{label}</p>
        </div>
        <p className="text-xl font-bold text-[--foreground]">{value}</p>
        {sub && (
          <p className="text-xs text-[--foreground-muted] mt-0.5">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SegmentBadge({ segment }: { segment: string }) {
  const cfg = SEGMENT_CONFIG[segment] ?? SEGMENT_CONFIG["À risque"]!;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function PalierBadge({ palier }: { palier: string | null }) {
  if (!palier) return null;
  return (
    <Badge variant="muted" className="text-[10px] capitalize">
      {PALIER_LABELS[palier] ?? palier}
    </Badge>
  );
}

export function RapportClientsView() {
  const [periode, setPeriode] = useState<Periode>("mois");
  const [data, setData] = useState<RapportClients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/rapports/clients?periode=${periode}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? "Erreur serveur"
          );
        }
        return res.json() as Promise<RapportClients>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [periode]);

  const clients = data?.clients ?? [];
  const totaux = data?.totaux ?? { nbClients: 0, caTTC: 0, panierMoyen: 0 };

  // Segment breakdown
  const segments = ["Champions", "Fidèles", "Potentiel", "À risque"] as const;
  const segmentStats = segments.map((seg) => {
    const group = clients.filter((c) => c.segment === seg);
    return {
      segment: seg,
      count: group.length,
      caTTC: group.reduce((s, c) => s + Number(c.caTTC), 0),
    };
  });

  // Top 10 for chart + cards
  const top10 = clients.slice(0, 10);
  const chartData = top10.map((c) => ({
    nom:
      c.raisonSociale.length > 20
        ? c.raisonSociale.slice(0, 18) + "…"
        : c.raisonSociale,
    caTTC: Number(c.caTTC),
  }));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">
            Top clients
          </h1>
          <p className="text-sm text-[--foreground-muted] mt-1">
            Analyse RFM — Récence, Fréquence, Montant
          </p>
        </div>
        {data?.demo && (
          <Badge variant="muted" className="text-xs">
            Données démo
          </Badge>
        )}
      </div>

      {/* Period pills */}
      <div className="flex gap-2 flex-wrap">
        {PERIODES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriode(p.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              periode === p.id
                ? "bg-[--primary] text-white border-[--primary]"
                : "border-[--border] text-[--foreground-muted] hover:border-[--border-strong]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[--foreground-muted]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Clients actifs"
              value={String(totaux.nbClients)}
              icon={Users}
            />
            <KpiCard
              label="CA total"
              value={formatMGA(totaux.caTTC, { compact: true })}
              icon={TrendingUp}
            />
            <KpiCard
              label="Panier moyen"
              value={formatMGA(totaux.panierMoyen, { compact: true })}
              icon={ShoppingCart}
            />
            <KpiCard
              label="% Champions"
              value={`${data.pctChampions ?? 0}%`}
              sub={`${clients.filter((c) => c.segment === "Champions").length} clients`}
              icon={Star}
            />
          </div>

          {/* Segment breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {segmentStats.map((s) => {
              const cfg = SEGMENT_CONFIG[s.segment]!;
              return (
                <div
                  key={s.segment}
                  className="rounded-xl border p-4"
                  style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: cfg.color }}
                  >
                    {s.segment}
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: cfg.color }}
                  >
                    {s.count}
                  </p>
                  <p className="text-xs mt-1" style={{ color: cfg.color }}>
                    {formatMGA(s.caTTC, { compact: true })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Top 10 client cards */}
          {top10.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[--foreground-muted] mb-3 uppercase tracking-wider">
                Top 10 clients
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
                {top10.map((c, i) => (
                  <div
                    key={c.clientId ?? i}
                    className="flex-shrink-0 w-52 lg:w-auto rounded-xl border border-[--border] bg-[--card] p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="w-6 h-6 rounded-full bg-[--accent] text-[--foreground-muted] text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <SegmentBadge segment={c.segment} />
                    </div>
                    <p className="text-sm font-semibold text-[--foreground] leading-tight line-clamp-2">
                      {c.raisonSociale}
                    </p>
                    <PalierBadge palier={c.palier} />
                    <p className="text-base font-bold text-[--primary]">
                      {formatMGA(Number(c.caTTC), { compact: true })}
                    </p>
                    <p className="text-xs text-[--foreground-muted]">
                      {c.nbCommandes} commandes
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[--foreground-muted]">
                        RFM
                      </span>
                      <span className="text-xs font-bold text-[--foreground]">
                        {c.rfmScore}/15
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar chart: top 10 by CA */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CA par client (top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(240, chartData.length * 38)}
                >
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 0, right: 32, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) =>
                        formatMGA(v, { compact: true })
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="nom"
                      type="category"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [formatMGA(Number(value)), "CA TTC"]}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="caTTC"
                      fill="var(--primary)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Full table */}
          {clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Classement complet ({clients.length} clients)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[--background-subtle]">
                      <tr>
                        <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium w-14">
                          Rang
                        </th>
                        <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">
                          Client
                        </th>
                        <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">
                          Ville
                        </th>
                        <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">
                          Palier
                        </th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">
                          Nb cdes
                        </th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">
                          CA TTC
                        </th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">
                          Panier moy.
                        </th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">
                          Dernière cde
                        </th>
                        <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">
                          Segment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border]">
                      {clients.map((c, i) => (
                        <tr
                          key={c.clientId ?? i}
                          className="hover:bg-[--accent]/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold bg-[--accent] text-[--foreground-muted]">
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[--foreground]">
                              {c.raisonSociale}
                            </p>
                            <p className="text-xs text-[--foreground-muted]">
                              {c.code}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[--foreground-muted]">
                            {c.ville ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <PalierBadge palier={c.palier} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {Number(c.nbCommandes)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[--primary]">
                            {formatMGA(Number(c.caTTC))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatMGA(Number(c.panierMoyen))}
                          </td>
                          <td className="px-4 py-3 text-right text-[--foreground-muted] text-xs">
                            {c.derniereCommande
                              ? new Date(c.derniereCommande).toLocaleDateString(
                                  "fr-FR",
                                  { day: "2-digit", month: "short", year: "numeric" }
                                )
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <SegmentBadge segment={c.segment} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
