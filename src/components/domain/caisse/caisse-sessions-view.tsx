"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, ChevronDown, ChevronUp, CalendarDays, TrendingUp, Banknote, Smartphone } from "lucide-react";
import { formatMGA } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SessionCaisse = {
  id: string;
  caissierID: string;
  depotId: string | null;
  fondCaisse: number;
  totalEncaisse: number;
  totalEspeces: number;
  totalMobileMoney: number;
  totalVirements: number;
  totalCheques: number;
  ouvertureAt: string;
  fermetureAt: string | null;
  rapportZ: unknown | null;
};

function formatDuree(debut: string, fin: string | null): string {
  if (!fin) return "En cours";
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  const totalMins = Math.floor(ms / 60000);
  const heures = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (heures === 0) return `${mins}min`;
  return `${heures}h ${mins}min`;
}

function RapportZPanel({ data }: { data: unknown }) {
  if (!data) return <p className="text-sm text-[--foreground-muted] py-2">Non disponible</p>;
  return (
    <pre className="text-xs text-[--foreground-muted] bg-[--background] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-64">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.ElementType; sub?: string }) {
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

export function CaisseSessionsView() {
  const [sessions, setSessions] = useState<SessionCaisse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/caisse/sessions")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Erreur");
        }
        return res.json() as Promise<{ sessions: SessionCaisse[] }>;
      })
      .then((data) => setSessions(data.sessions))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // KPIs
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsMois = sessions.filter((s) => new Date(s.ouvertureAt) >= debutMois);
  const caTotalEncaisse = sessions.reduce((sum, s) => sum + s.totalEncaisse, 0);
  const moyenneParSession = sessions.length > 0 ? Math.round(caTotalEncaisse / sessions.length) : 0;
  const totalEspeces = sessions.reduce((sum, s) => sum + s.totalEspeces, 0);
  const totalMobileMoney = sessions.reduce((sum, s) => sum + s.totalMobileMoney, 0);
  const tauxEspeces = caTotalEncaisse > 0 ? Math.round((totalEspeces / caTotalEncaisse) * 100) : 0;
  const tauxMobile = caTotalEncaisse > 0 ? Math.round((totalMobileMoney / caTotalEncaisse) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Historique sessions caisse</h1>
        <p className="text-sm text-[--foreground-muted] mt-1">Vos 20 dernières sessions</p>
      </div>

      {/* KPI Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Sessions ce mois"
            value={String(sessionsMois.length)}
            icon={CalendarDays}
          />
          <KpiCard
            label="CA total encaissé"
            value={formatMGA(caTotalEncaisse, { compact: true })}
            icon={TrendingUp}
          />
          <KpiCard
            label="Moyenne par session"
            value={formatMGA(moyenneParSession, { compact: true })}
            icon={Banknote}
            sub={`sur ${sessions.length} sessions`}
          />
          <KpiCard
            label="Espèces vs Mobile"
            value={`${tauxEspeces}% / ${tauxMobile}%`}
            icon={Smartphone}
          />
        </div>
      )}

      {/* States */}
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

      {!loading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-[--foreground-muted]">
          <CalendarDays className="w-10 h-10 opacity-30" />
          <p className="text-sm">Aucune session enregistrée</p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[--background-subtle]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">Date ouverture</th>
                    <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">Durée</th>
                    <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">Fond de caisse</th>
                    <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">Total encaissé</th>
                    <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">Espèces</th>
                    <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">Mobile Money</th>
                    <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border]">
                  {sessions.map((s) => (
                    <>
                      <tr key={s.id} className="hover:bg-[--accent]/40 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">
                              {new Date(s.ouvertureAt).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-xs text-[--foreground-muted]">
                              {new Date(s.ouvertureAt).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s.fermetureAt ? (
                            <span>{formatDuree(s.ouvertureAt, s.fermetureAt)}</span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/40">En cours</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{formatMGA(s.fondCaisse)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[--primary]">{formatMGA(s.totalEncaisse)}</td>
                        <td className="px-4 py-3 text-right">{formatMGA(s.totalEspeces)}</td>
                        <td className="px-4 py-3 text-right">{formatMGA(s.totalMobileMoney)}</td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                            className="h-7 gap-1 text-xs"
                          >
                            Rapport Z
                            {expanded === s.id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                      {expanded === s.id && (
                        <tr key={`${s.id}-rapport`}>
                          <td colSpan={7} className="px-4 py-3 bg-[--accent]/20">
                            <p className="text-xs font-semibold text-[--foreground-muted] mb-2">Rapport Z</p>
                            <RapportZPanel data={s.rapportZ} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
