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
import { Loader2, AlertCircle, Trophy, TrendingUp, ShoppingCart, BarChart2 } from "lucide-react";
import { formatMGA } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Periode = "7jours" | "mois" | "annee";

type Vendeur = {
  userId: string | null;
  nom: string | null;
  email: string;
  nbCommandes: number;
  caTTC: number;
  caHT: number;
  panierMoyen: number;
};

type RapportVendeurs = {
  vendeurs: Vendeur[];
  periode: string;
  totaux: { caTTC: number; nbCommandes: number };
  demo?: boolean;
};

const PERIODES: { id: Periode; label: string }[] = [
  { id: "7jours", label: "7 jours" },
  { id: "mois", label: "Ce mois" },
  { id: "annee", label: "Cette année" },
];

const RANG_COLORS = ["#FFB800", "#94A3B8", "#CD7F32"] as const;
const RANG_LABELS = ["1er", "2ème", "3ème"] as const;

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
        {sub && <p className="text-xs text-[--foreground-muted] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PodiumCard({
  vendeur,
  rang,
}: {
  vendeur: Vendeur;
  rang: number;
}) {
  const isFirst = rang === 0;
  return (
    <div
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center ${
        isFirst
          ? "border-yellow-500/40 bg-yellow-500/5 scale-105"
          : "border-[--border] bg-[--card]"
      }`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: RANG_COLORS[rang] }}
      >
        {RANG_LABELS[rang]}
      </div>
      <div>
        <p className={`font-bold ${isFirst ? "text-base" : "text-sm"} text-[--foreground]`}>
          {vendeur.nom ?? vendeur.email}
        </p>
        <p className="text-xs text-[--foreground-muted]">{vendeur.email}</p>
      </div>
      <p className={`font-bold text-[--primary] ${isFirst ? "text-lg" : "text-sm"}`}>
        {formatMGA(Number(vendeur.caTTC), { compact: true })}
      </p>
      <Badge variant="muted" className="text-[10px]">
        {vendeur.nbCommandes} commandes
      </Badge>
    </div>
  );
}

export function RapportVendeursView() {
  const [periode, setPeriode] = useState<Periode>("mois");
  const [data, setData] = useState<RapportVendeurs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/rapports/vendeurs?periode=${periode}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Erreur");
        }
        return res.json() as Promise<RapportVendeurs>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [periode]);

  const vendeurs = data?.vendeurs ?? [];
  const totaux = data?.totaux ?? { caTTC: 0, nbCommandes: 0 };
  const meilleur = vendeurs[0] ?? null;
  const panierMoyenGlobal =
    totaux.nbCommandes > 0 ? Math.round(totaux.caTTC / totaux.nbCommandes) : 0;

  // Chart data: top 10
  const chartData = vendeurs.slice(0, 10).map((v) => ({
    nom: v.nom ?? v.email.split("@")[0],
    caTTC: Number(v.caTTC),
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Performance vendeurs</h1>
          <p className="text-sm text-[--foreground-muted] mt-1">
            Classement des agents par chiffre d&apos;affaires
          </p>
        </div>
        {data?.demo && (
          <Badge variant="muted" className="text-xs">Données démo</Badge>
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
              label="CA total"
              value={formatMGA(totaux.caTTC, { compact: true })}
              icon={TrendingUp}
            />
            <KpiCard
              label="Meilleur vendeur"
              value={meilleur?.nom ?? meilleur?.email ?? "—"}
              sub={meilleur ? formatMGA(Number(meilleur.caTTC), { compact: true }) : undefined}
              icon={Trophy}
            />
            <KpiCard
              label="Nb commandes"
              value={String(totaux.nbCommandes)}
              icon={ShoppingCart}
            />
            <KpiCard
              label="Panier moyen"
              value={formatMGA(panierMoyenGlobal, { compact: true })}
              icon={BarChart2}
            />
          </div>

          {/* Podium top 3 */}
          {vendeurs.length >= 1 && (
            <div>
              <h2 className="text-sm font-semibold text-[--foreground-muted] mb-3 uppercase tracking-wider">
                Podium
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {vendeurs.slice(0, 3).map((v, i) => (
                  <PodiumCard key={v.userId ?? v.email} vendeur={v} rang={i} />
                ))}
              </div>
            </div>
          )}

          {/* Horizontal bar chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CA par vendeur</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 0, right: 32, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => formatMGA(v, { compact: true })}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="nom"
                      type="category"
                      width={110}
                      tick={{ fontSize: 12 }}
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
                    <Bar dataKey="caTTC" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Full table */}
          {vendeurs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Classement détaillé</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[--background-subtle]">
                      <tr>
                        <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium w-14">Rang</th>
                        <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">Vendeur</th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">Nb cmd</th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">CA HT</th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">CA TTC</th>
                        <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">Panier moyen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border]">
                      {vendeurs.map((v, i) => (
                        <tr key={v.userId ?? v.email} className="hover:bg-[--accent]/40 transition-colors">
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold"
                              style={{
                                backgroundColor:
                                  i < 3 ? `${RANG_COLORS[i]}20` : "var(--accent)",
                                color: i < 3 ? RANG_COLORS[i] : "var(--foreground-muted)",
                              }}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[--foreground]">{v.nom ?? v.email}</p>
                            <p className="text-xs text-[--foreground-muted]">{v.email}</p>
                          </td>
                          <td className="px-4 py-3 text-right">{Number(v.nbCommandes)}</td>
                          <td className="px-4 py-3 text-right">{formatMGA(Number(v.caHT))}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[--primary]">
                            {formatMGA(Number(v.caTTC))}
                          </td>
                          <td className="px-4 py-3 text-right">{formatMGA(Number(v.panierMoyen))}</td>
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
