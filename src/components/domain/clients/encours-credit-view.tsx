"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard, AlertTriangle, TrendingDown, Users, ArrowLeft,
  ChevronRight, Clock, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ClientEncours = {
  id: string;
  code: string;
  raisonSociale: string;
  telephone: string | null;
  palier: "gros" | "semi_gros" | "detail";
  plafondCredit: number;
  encoursCourant: number;
  creditDisponible: number;
  utilisationPct: number;
  dernierAchat: string | null;
  joursDepuis: number | null;
  tranche: "0-30" | "31-60" | "61-90" | "90+";
  agentNom: string;
};

type Stats = {
  totalEncours: number;
  nbClients: number;
  par0_30: number;
  par31_60: number;
  par61_90: number;
  par90plus: number;
};

const TRANCHE_LABELS = { "0-30": "0–30 jours", "31-60": "31–60 jours", "61-90": "61–90 jours", "90+": "> 90 jours" };
const TRANCHE_COLORS = { "0-30": "text-[--success]", "31-60": "text-[--warning]", "61-90": "text-orange-500", "90+": "text-[--destructive]" };
const TRANCHE_BG = { "0-30": "bg-[--success]/10", "31-60": "bg-[--warning]/10", "61-90": "bg-orange-500/10", "90+": "bg-[--destructive]/10" };
const PALIER_LABELS = { gros: "Gros", semi_gros: "Semi-gros", detail: "Détail" };

export function EncoursCreditView() {
  const [clients, setClients] = useState<ClientEncours[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [trancheFiltre, setTrancheFiltre] = useState<string>("tous");

  useEffect(() => {
    fetch("/api/clients/encours")
      .then((r) => r.json())
      .then((d) => {
        setClients(d.clients ?? []);
        setStats(d.stats ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clientsFiltres = trancheFiltre === "tous"
    ? clients
    : clients.filter((c) => c.tranche === trancheFiltre);

  function exportCSV() {
    const rows = [
      ["Code", "Client", "Palier", "Encours", "Plafond", "Dispo", "Utilisation %", "Dernier achat", "Jours", "Tranche", "Agent"],
      ...clients.map((c) => [
        c.code, c.raisonSociale, c.palier,
        c.encoursCourant, c.plafondCredit, c.creditDisponible,
        c.utilisationPct,
        c.dernierAchat ? new Date(c.dernierAchat).toLocaleDateString("fr-FR") : "",
        c.joursDepuis ?? "",
        TRANCHE_LABELS[c.tranche],
        c.agentNom,
      ]),
    ].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `encours-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/clients"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-display-sm text-[--foreground]">Encours clients</h1>
            <p className="text-[--foreground-muted] mt-0.5 text-sm">Tableau de bord créances commerciales</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={clients.length === 0}>
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* KPI cards — aging buckets */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="col-span-2 lg:col-span-1 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[--primary]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[--primary]" />
                </div>
                <div>
                  <p className="text-xs text-[--foreground-muted]">Total encours</p>
                  <p className="text-xl font-bold">{formatMGA(stats.totalEncours, { compact: true })}</p>
                  <p className="text-xs text-[--foreground-muted]">{stats.nbClients} client(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(["0-30", "31-60", "61-90", "90+"] as const).map((tranche) => {
            const key = tranche.replace("-", "_").replace("+", "plus") as keyof Stats;
            const val = stats[`par${key.startsWith("0") ? "0_30" : key.startsWith("31") ? "31_60" : key.startsWith("61") ? "61_90" : "90plus"}` as keyof Stats] as number;
            return (
              <Card key={tranche} className={cn("cursor-pointer transition-all overflow-hidden", trancheFiltre === tranche && "ring-2 ring-[--primary]")}
                onClick={() => setTrancheFiltre(trancheFiltre === tranche ? "tous" : tranche)}>
                <CardContent className="p-4">
                  <p className={cn("text-xs font-medium mb-1", TRANCHE_COLORS[tranche])}>{TRANCHE_LABELS[tranche]}</p>
                  <p className="text-xl font-bold">{formatMGA(val, { compact: true })}</p>
                  <p className="text-xs text-[--foreground-muted]">
                    {clients.filter((c) => c.tranche === tranche).length} clients
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filtres tranche */}
      <div className="flex gap-2 flex-wrap">
        {["tous", "0-30", "31-60", "61-90", "90+"].map((t) => (
          <button
            key={t}
            onClick={() => setTrancheFiltre(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              trancheFiltre === t
                ? "bg-[--primary] text-white"
                : "bg-[--accent] text-[--foreground-muted] hover:text-[--foreground]"
            )}
          >
            {t === "tous" ? "Tous" : TRANCHE_LABELS[t as keyof typeof TRANCHE_LABELS]}
          </button>
        ))}
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="py-12 text-center text-[--foreground-muted] text-sm">Chargement…</div>
      ) : clientsFiltres.length === 0 ? (
        <div className="py-16 text-center">
          <CreditCard className="w-10 h-10 opacity-20 mx-auto mb-3" />
          <p className="text-[--foreground-muted] text-sm">
            {trancheFiltre === "tous" ? "Aucun client avec encours actif" : `Aucun client en tranche ${TRANCHE_LABELS[trancheFiltre as keyof typeof TRANCHE_LABELS]}`}
          </p>
        </div>
      ) : (
        <div className="bg-[--card] border border-[--border] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--border] bg-[--muted]/30">
                <th className="text-left px-4 py-3 text-[--foreground-muted] font-medium">Client</th>
                <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium hidden sm:table-cell">Plafond</th>
                <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium">Encours</th>
                <th className="text-center px-4 py-3 text-[--foreground-muted] font-medium hidden md:table-cell">Utilisation</th>
                <th className="text-center px-4 py-3 text-[--foreground-muted] font-medium">Ancienneté</th>
                <th className="text-right px-4 py-3 text-[--foreground-muted] font-medium hidden lg:table-cell">Agent</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {clientsFiltres.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-[--accent]/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[--foreground]">{c.raisonSociale}</div>
                    <div className="text-xs text-[--foreground-muted] font-mono">{c.code} · {PALIER_LABELS[c.palier]}</div>
                  </td>
                  <td className="text-right px-4 py-3 hidden sm:table-cell text-[--foreground-muted]">
                    {formatMGA(c.plafondCredit, { compact: true })}
                  </td>
                  <td className="text-right px-4 py-3">
                    <span className={cn("font-bold", c.utilisationPct >= 90 ? "text-[--destructive]" : c.utilisationPct >= 75 ? "text-orange-500" : "text-[--foreground]")}>
                      {formatMGA(c.encoursCourant, { compact: true })}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-24 h-2 bg-[--border] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all",
                            c.utilisationPct >= 90 ? "bg-[--destructive]" :
                            c.utilisationPct >= 75 ? "bg-orange-500" : "bg-[--success]"
                          )}
                          style={{ width: `${Math.min(100, c.utilisationPct)}%` }}
                        />
                      </div>
                      <span className="text-xs text-[--foreground-muted] w-9 text-right">{c.utilisationPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg", TRANCHE_BG[c.tranche], TRANCHE_COLORS[c.tranche])}>
                      <Clock className="w-3 h-3" />
                      {c.joursDepuis !== null ? `${c.joursDepuis}j` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[--foreground-muted] text-xs text-right">
                    {c.agentNom || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clients`} className="p-1.5 rounded-lg hover:bg-[--accent] transition-colors block">
                      <ChevronRight className="w-4 h-4 text-[--foreground-muted]" />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
