"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, Package, Loader2, AlertTriangle, BarChart2, Layers, FileText, Receipt, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Periode = "jour" | "7jours" | "mois" | "annee";

interface FinancesData {
  kpi: { caHT: number; caTTC: number; tva: number; remises: number; cogs: number; margeB: number; chargesOp: number; margeN: number; nbCommandes: number };
  margesCategorie: Array<{ id: string; nom: string; ca: number; cogs: number; margeB: number; tauxMarge: number }>;
  evolution: Array<{ date: string; ca: number; cogs: number; margeB: number }>;
  chargesParCat: Record<string, number>;
  charges: unknown[];
}

interface StockData {
  produits: Array<{ id: string; nom: string; code: string; stockBase: number; seuilAlerte: number; alerteRupture: boolean; valeurStock: number; prixAchat: number; categorie: string }>;
  stats: { valeurTotale: number; nbAlertes: number; totalMvt: number; totalEntrees: number; totalSorties: number };
}

function fmtDate(s: string) {
  try { const d = new Date(s); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`; } catch { return s; }
}

const PERIODES: { key: Periode; label: string }[] = [
  { key: "jour", label: "Aujourd'hui" },
  { key: "7jours", label: "7 jours" },
  { key: "mois", label: "Ce mois" },
  { key: "annee", label: "Cette année" },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold text-[--foreground-muted] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[--foreground-muted]">{p.name}</span>
          <span className="font-bold text-[--foreground] ml-auto">{formatMGA(p.value, { compact: true })}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, iconClass, bgClass }: {
  label: string; value: string; sub?: string; icon: React.ElementType; iconClass: string; bgClass: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[--foreground-muted] mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-[--foreground]">{value}</p>
            {sub && <p className="text-xs text-[--foreground-muted] mt-1">{sub}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
            <Icon className={cn("w-5 h-5", iconClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardAnalytics() {
  const [periode, setPeriode] = useState<Periode>("mois");
  const [finances, setFinances] = useState<FinancesData | null>(null);
  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [finRes, stockRes] = await Promise.all([
        fetch(`/api/finances?periode=${periode}`, { cache: "no-store" }),
        fetch("/api/stock", { cache: "no-store" }),
      ]);
      if (!finRes.ok || !stockRes.ok) throw new Error("Erreur de chargement");
      const [finData, stockData] = await Promise.all([finRes.json(), stockRes.json()]);
      setFinances(finData);
      setStock(stockData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setFinances(null);
      setStock(null);
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpi = finances?.kpi;
  const evolutionData = (finances?.evolution ?? []).map((d) => ({ ...d, date: fmtDate(d.date) }));
  const margesCategorie = finances?.margesCategorie ?? [];
  const stockStats = stock?.stats;
  const produitsRisque = (stock?.produits ?? []).filter((p) => p.alerteRupture).slice(0, 8);
  const tauxMargeB = kpi && kpi.caHT > 0 ? ((kpi.margeB / kpi.caHT) * 100).toFixed(1) : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
      {/* Header + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Rapports & Analytiques</h1>
          <p className="text-[--foreground-muted] text-sm mt-0.5">Données financières et stock en temps réel</p>
          <div className="flex items-center gap-2 mt-2">
            <Link
              href="/rapports/tva"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: "#333744", color: "#A0AEC0", border: "1px solid #414553" }}
            >
              <Receipt className="w-3.5 h-3.5" />
              Rapport TVA
            </Link>
            <Link
              href="/rapports/marges"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: "#333744", color: "#A0AEC0", border: "1px solid #414553" }}
            >
              <FileText className="w-3.5 h-3.5" />
              Marges produits
            </Link>
            <Link
              href="/rapports/comptable"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: "#333744", color: "#A0AEC0", border: "1px solid #414553" }}
            >
              <Calculator className="w-3.5 h-3.5" />
              Comptabilité
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[--muted] rounded-xl p-1">
          {PERIODES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriode(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                periode === p.key
                  ? "bg-[--card] text-[--foreground] shadow-sm"
                  : "text-[--foreground-muted] hover:text-[--foreground]"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[--primary]" />
        </div>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-[--destructive]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error} — Les données n'ont pas pu être chargées.</p>
          </CardContent>
        </Card>
      )}

      {!loading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="CA TTC"
              value={kpi ? formatMGA(kpi.caTTC, { compact: true }) : "—"}
              icon={TrendingUp}
              iconClass="text-[--primary]"
              bgClass="bg-[--primary]/10"
            />
            <KpiCard
              label="Marge brute"
              value={kpi ? formatMGA(kpi.margeB, { compact: true }) : "—"}
              sub={tauxMargeB ? `Taux : ${tauxMargeB}%` : undefined}
              icon={BarChart2}
              iconClass="text-[--success]"
              bgClass="bg-[--success]/10"
            />
            <KpiCard
              label="Marge nette"
              value={kpi ? formatMGA(kpi.margeN, { compact: true }) : "—"}
              icon={Layers}
              iconClass="text-[--color-indigo-600]"
              bgClass="bg-[--color-indigo-50] dark:bg-[--color-indigo-950]"
            />
            <KpiCard
              label="Nb commandes"
              value={kpi ? kpi.nbCommandes.toLocaleString("fr-FR") : "—"}
              icon={ShoppingBag}
              iconClass="text-[--color-vanille-600]"
              bgClass="bg-[--color-vanille-50] dark:bg-[--color-vanille-950]"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Evolution CA + Marge */}
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Évolution CA & Marge brute</CardTitle>
                <div className="flex items-center gap-4 text-xs text-[--foreground-muted]">
                  <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 rounded bg-[--primary]" />CA</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 rounded bg-[--success]" />Marge brute</span>
                </div>
              </CardHeader>
              <CardContent>
                {evolutionData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-[--foreground-muted] text-sm">
                    Aucune donnée pour cette période
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={evolutionData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradMarge" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1_000_000).toFixed(1)}M`} width={42} />
                      <Tooltip content={<ChartTooltip />} cursor={false} />
                      <Area type="monotone" dataKey="ca" name="CA" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gradCA)" dot={false} activeDot={{ r: 4, stroke: "white", strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="margeB" name="Marge brute" stroke="var(--success)" strokeWidth={2.5} fill="url(#gradMarge)" dot={false} activeDot={{ r: 4, stroke: "white", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Valeur du stock */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-[--primary]" />
                  Valeur du stock
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-[--foreground]">
                    {stockStats ? formatMGA(stockStats.valeurTotale, { compact: true }) : "—"}
                  </p>
                  <p className="text-xs text-[--foreground-muted] mt-1">Valeur totale en stock</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[--destructive]/8 rounded-xl p-3">
                    <p className="text-xl font-bold text-[--destructive]">{stockStats?.nbAlertes ?? "—"}</p>
                    <p className="text-xs text-[--foreground-muted] mt-0.5">Alertes actives</p>
                  </div>
                  <div className="bg-[--muted] rounded-xl p-3">
                    <p className="text-xl font-bold text-[--foreground]">{stockStats ? stockStats.totalMvt.toLocaleString("fr-FR") : "—"}</p>
                    <p className="text-xs text-[--foreground-muted] mt-0.5">Mouvements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Marges catégorie + Produits à risque */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Marges par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                {margesCategorie.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-[--foreground-muted] text-sm">Aucune donnée</div>
                ) : (
                  <div className="space-y-3">
                    {margesCategorie.map((cat) => (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-[--foreground] truncate max-w-[160px]">{cat.nom}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-[--foreground-muted]">{formatMGA(cat.ca, { compact: true })}</span>
                            <Badge variant={cat.tauxMarge >= 20 ? "success" : cat.tauxMarge >= 10 ? "warning" : "destructive"} className="text-xs">
                              {cat.tauxMarge.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="h-2 bg-[--border] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[--primary] transition-all duration-500"
                            style={{ width: `${Math.min(100, cat.tauxMarge * 2)}%`, opacity: 0.7 + (cat.tauxMarge / 100) * 0.3 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[--destructive]" />
                  Produits à risque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {produitsRisque.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <Package className="w-8 h-8 text-[--success] opacity-60" />
                    <p className="text-sm text-[--foreground-muted]">Aucune alerte de rupture</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {produitsRisque.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-[--border] last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[--foreground] truncate">{p.nom}</p>
                          <p className="text-xs text-[--foreground-muted]">Stock : {p.stockBase} · Seuil : {p.seuilAlerte}</p>
                        </div>
                        <Badge variant={p.stockBase === 0 ? "destructive" : "warning"} className="shrink-0 text-xs">
                          {p.stockBase === 0 ? "Rupture" : "Bas"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
