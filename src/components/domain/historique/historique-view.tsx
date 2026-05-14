"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, History, CheckCircle2, XCircle, Clock,
  TrendingUp, ShoppingBag, Loader2, Printer, ChevronDown,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Periode = "jour" | "semaine" | "mois";

type Commande = {
  id: string;
  numero: string;
  statut: "soumise" | "validee" | "annulee";
  totalTTC: number;
  client: string;
  agent: string;
  source: string;
  nbArticles: number;
  soumiseAt: string | null;
  valideeAt: string | null;
};

type Stats = { commandes: Commande[]; totalEncaisse: number; panierMoyen: number; nbEncaissees: number };

const BADGE: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  validee:  { label: "Encaissée", color: "#22c55e", icon: CheckCircle2 },
  annulee:  { label: "Annulée",   color: "#ef4444", icon: XCircle },
  soumise:  { label: "En attente", color: "#f59e0b", icon: Clock },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) +
    " · " + d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function HistoriqueView() {
  const [periode, setPeriode]   = useState<Periode>("jour");
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState<Stats>({ commandes: [], totalEncaisse: 0, panierMoyen: 0, nbEncaissees: 0 });
  const [filtre, setFiltre]     = useState<"tous" | "validee" | "annulee" | "soumise">("tous");
  const [reimprId, setReimprId] = useState<string | null>(null);

  const charger = useCallback(async (p: Periode) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historique?periode=${p}`);
      const data = await res.json();
      setStats(data);
    } catch {
      toast.error("Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(periode); }, [periode, charger]);

  const commandes = filtre === "tous"
    ? stats.commandes
    : stats.commandes.filter((c) => c.statut === filtre);

  const handleReimp = async (cmd: Commande) => {
    if (cmd.statut !== "validee") return;
    setReimprId(cmd.id);
    try {
      // Charger les lignes puis réimprimer
      const res = await fetch(`/api/caisse/commandes/${cmd.id}`);
      const data = await res.json();
      await fetch("/api/print/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: cmd.numero,
          client: cmd.client,
          commandeId: cmd.id,
          lignes: (data.lignes ?? []).map((l: { nom: string; unite: string; qte: number; prix: number; total: number }) => ({
            nom: l.nom, unite: l.unite, qte: l.qte, prix: l.prix, total: l.total,
          })),
          totalHT: data.commande?.totalHT ?? 0,
          totalTVA: data.commande?.totalTVA ?? 0,
          totalTTC: cmd.totalTTC,
          modePaiement: "Especes",
          assujettieTV: false,
        }),
      });
      toast.success("Ticket réimprimé");
    } catch {
      toast.error("Erreur réimpression");
    } finally {
      setReimprId(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0">
        <History className="w-5 h-5 text-[--primary]" />
        <h1 className="text-lg font-bold flex-1">Historique des ventes</h1>
        <button
          onClick={() => charger(periode)}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6 flex flex-col gap-6">

          {/* Filtres période */}
          <div className="flex gap-2 flex-wrap">
            {(["jour", "semaine", "mois"] as Periode[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriode(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periode === p
                    ? "bg-[--primary] text-white"
                    : "bg-[--card] border border-[--border] text-[--foreground-subtle] hover:border-[--primary]/50"
                }`}
              >
                {p === "jour" ? "Aujourd'hui" : p === "semaine" ? "7 derniers jours" : "Ce mois"}
              </button>
            ))}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Total encaissé", value: formatMGA(stats.totalEncaisse), icon: TrendingUp, color: "#22c55e" },
              { label: "Commandes encaissées", value: String(stats.nbEncaissees), icon: CheckCircle2, color: "#3b82f6" },
              { label: "Panier moyen", value: formatMGA(stats.panierMoyen), icon: ShoppingBag, color: "#f59e0b" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3 items-start">
                <div className="p-2 rounded-lg" style={{ backgroundColor: kpi.color + "20" }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <div>
                  <p className="text-xs text-[--foreground-subtle]">{kpi.label}</p>
                  <p className="text-lg font-bold">{loading ? "…" : kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filtre statut */}
          <div className="flex gap-2 flex-wrap">
            {(["tous", "validee", "annulee", "soumise"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  filtre === f
                    ? "bg-[--primary]/10 border-[--primary]/50 text-[--primary]"
                    : "border-[--border] text-[--foreground-subtle] hover:border-[--primary]/30"
                }`}
              >
                {f === "tous" ? "Toutes" : BADGE[f]?.label}
                {f !== "tous" && (
                  <span className="ml-1.5 opacity-60">
                    {stats.commandes.filter((c) => c.statut === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-[--foreground-subtle]">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : commandes.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2 text-[--foreground-subtle]">
                <History className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucune commande sur cette période</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/40">
                      <th className="text-left px-4 py-3 text-xs text-[--foreground-subtle] font-medium">N°</th>
                      <th className="text-left px-4 py-3 text-xs text-[--foreground-subtle] font-medium">Heure</th>
                      <th className="text-left px-4 py-3 text-xs text-[--foreground-subtle] font-medium">Client</th>
                      <th className="text-left px-4 py-3 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Agent</th>
                      <th className="text-left px-4 py-3 text-xs text-[--foreground-subtle] font-medium hidden sm:table-cell">Art.</th>
                      <th className="text-right px-4 py-3 text-xs text-[--foreground-subtle] font-medium">Montant</th>
                      <th className="text-center px-4 py-3 text-xs text-[--foreground-subtle] font-medium">Statut</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.map((cmd, i) => {
                      const badge = BADGE[cmd.statut];
                      return (
                        <tr
                          key={cmd.id}
                          className={`border-b border-[--border] last:border-0 hover:bg-[--muted]/30 transition-colors ${i % 2 === 0 ? "" : "bg-[--muted]/10"}`}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-[--foreground-subtle]">{cmd.numero}</td>
                          <td className="px-4 py-3 text-xs text-[--foreground-subtle]">{fmt(cmd.soumiseAt)}</td>
                          <td className="px-4 py-3 font-medium truncate max-w-[140px]">{cmd.client}</td>
                          <td className="px-4 py-3 text-xs text-[--foreground-subtle] hidden md:table-cell">{cmd.agent || "—"}</td>
                          <td className="px-4 py-3 text-xs text-[--foreground-subtle] hidden sm:table-cell">{cmd.nbArticles}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMGA(cmd.totalTTC)}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ backgroundColor: badge.color + "20", color: badge.color }}
                            >
                              <badge.icon className="w-3 h-3" />
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cmd.statut === "validee" && (
                              <button
                                onClick={() => handleReimp(cmd)}
                                disabled={reimprId === cmd.id}
                                title="Réimprimer le ticket"
                                className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle] disabled:opacity-40"
                              >
                                {reimprId === cmd.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Printer className="w-3.5 h-3.5" />
                                }
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
