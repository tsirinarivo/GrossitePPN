"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calculator, Loader2, TrendingUp, TrendingDown, ShoppingBag, Receipt, FileDown, Wallet } from "lucide-react";
import { formatMGA } from "@/lib/money";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const CAT_LABELS: Record<string, string> = {
  personnel: "Personnel",
  loyer: "Loyer",
  energie: "Énergie",
  fournitures: "Fournitures",
  marketing: "Marketing",
  maintenance: "Maintenance",
  autre: "Autre",
};

type Bilan = {
  mois: string;
  caHT: number;
  caTTC: number;
  tva: number;
  achats: number;
  margeBrute: number;
  chargesTotales: number;
  chargesParCategorie: { categorie: string; montant: number }[];
  resultat: number;
  nbCommandes: number;
  demo?: boolean;
};

function currentMois(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function parseMois(s: string) { const [y, m] = s.split("-").map(Number); return { y: y!, m: m! }; }

function navMois(mois: string, dir: -1 | 1): string {
  const { y, m } = parseMois(mois);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function moisLabel(mois: string) { const { y, m } = parseMois(mois); return `${MOIS[m - 1]} ${y}`; }

function csvEscape(s: string): string {
  if (s.includes(";") || s.includes("\"")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCSV(bilan: Bilan) {
  const rows = [
    ["Compte de résultat", moisLabel(bilan.mois)],
    [],
    ["Chiffre d'affaires HT", String(bilan.caHT)],
    ["Chiffre d'affaires TTC", String(bilan.caTTC)],
    ["TVA collectée", String(bilan.tva)],
    [],
    ["Achats HT", String(bilan.achats)],
    ["MARGE BRUTE", String(bilan.margeBrute)],
    [],
    ["Charges opérationnelles", ""],
    ...bilan.chargesParCategorie.map((c) => [CAT_LABELS[c.categorie] ?? c.categorie, String(c.montant)]),
    ["TOTAL CHARGES", String(bilan.chargesTotales)],
    [],
    ["RESULTAT", String(bilan.resultat)],
  ];
  const csv = rows.map((r) => r.map((c) => csvEscape(String(c))).join(";")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `bilan-${bilan.mois}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function RapportBilanView() {
  const [mois, setMois] = useState(currentMois());
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/rapports/bilan?mois=${m}`);
      const d = await r.json();
      setBilan(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(mois); }, [mois, load]);

  const tauxMarge = bilan && bilan.caHT > 0 ? Math.round((bilan.margeBrute / bilan.caHT) * 100) : 0;
  const tauxResultat = bilan && bilan.caHT > 0 ? Math.round((bilan.resultat / bilan.caHT) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] flex-wrap gap-y-2">
        <Calculator className="w-5 h-5 text-[--primary]" />
        <h1 className="text-lg font-bold flex-1">Bilan simplifié</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setMois(navMois(mois, -1))} className="p-1.5 rounded-lg hover:bg-[--muted]"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold min-w-[130px] text-center">{moisLabel(mois)}</span>
          <button onClick={() => setMois(navMois(mois, 1))} className="p-1.5 rounded-lg hover:bg-[--muted]"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => bilan && exportCSV(bilan)} disabled={!bilan} className="px-3 py-2 bg-[--primary] text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
          <FileDown className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
        {loading || !bilan ? (
          <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-6">

            {/* KPIs résumé */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><Receipt className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs text-[--foreground-subtle]">CA HT</span></div>
                <div className="text-lg font-bold">{formatMGA(bilan.caHT)}</div>
                <div className="text-[11px] text-[--foreground-subtle]">{bilan.nbCommandes} commandes</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs text-[--foreground-subtle]">Achats HT</span></div>
                <div className="text-lg font-bold">{formatMGA(bilan.achats)}</div>
                <div className="text-[11px] text-[--foreground-subtle]">{bilan.caHT > 0 ? Math.round((bilan.achats / bilan.caHT) * 100) : 0}% du CA</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-[--foreground-subtle]">Charges</span></div>
                <div className="text-lg font-bold">{formatMGA(bilan.chargesTotales)}</div>
                <div className="text-[11px] text-[--foreground-subtle]">{bilan.caHT > 0 ? Math.round((bilan.chargesTotales / bilan.caHT) * 100) : 0}% du CA</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><Wallet className={`w-3.5 h-3.5 ${bilan.resultat >= 0 ? "text-green-500" : "text-red-500"}`} /><span className="text-xs text-[--foreground-subtle]">Résultat</span></div>
                <div className={`text-lg font-bold ${bilan.resultat >= 0 ? "text-green-500" : "text-red-500"}`}>{formatMGA(bilan.resultat)}</div>
                <div className="text-[11px] text-[--foreground-subtle]">Marge nette : {tauxResultat}%</div>
              </div>
            </div>

            {/* Compte de résultat */}
            <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[--border] bg-[--muted]/30 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[--primary]" />
                <span className="text-sm font-semibold">Compte de résultat — {moisLabel(bilan.mois)}</span>
                {bilan.demo && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold">DÉMO</span>}
              </div>

              <div className="divide-y divide-[--border]">
                {/* Produits */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
                  <div className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-2">+ Produits</div>
                  <div className="flex justify-between py-1 text-sm"><span>Chiffre d&apos;affaires HT</span><span className="font-bold">{formatMGA(bilan.caHT)}</span></div>
                  <div className="flex justify-between py-1 text-xs text-[--foreground-subtle]"><span>TVA collectée</span><span>{formatMGA(bilan.tva)}</span></div>
                  <div className="flex justify-between py-1 text-xs text-[--foreground-subtle]"><span>Total TTC encaissé</span><span>{formatMGA(bilan.caTTC)}</span></div>
                </motion.div>

                {/* Achats */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="p-4">
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">− Achats marchandises</div>
                  <div className="flex justify-between py-1 text-sm"><span>Achats fournisseurs HT</span><span className="font-bold text-red-500">−{formatMGA(bilan.achats)}</span></div>
                </motion.div>

                {/* Marge */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="p-4 bg-blue-50 dark:bg-blue-500/5">
                  <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">= Marge brute</div>
                  <div className="flex justify-between py-1 text-base font-bold">
                    <span>Marge brute</span>
                    <span className="text-blue-500">{formatMGA(bilan.margeBrute)}</span>
                  </div>
                  <div className="text-[11px] text-[--foreground-subtle]">Taux de marge brute : {tauxMarge}%</div>
                </motion.div>

                {/* Charges */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="p-4">
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">− Charges opérationnelles</div>
                  {bilan.chargesParCategorie.length === 0 && (
                    <div className="text-xs text-[--foreground-subtle] py-2">Aucune charge enregistrée pour ce mois</div>
                  )}
                  {bilan.chargesParCategorie.map((c) => (
                    <div key={c.categorie} className="flex justify-between py-0.5 text-xs text-[--foreground-subtle]">
                      <span className="pl-3">{CAT_LABELS[c.categorie] ?? c.categorie}</span>
                      <span>−{formatMGA(c.montant)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 text-sm border-t border-[--border] mt-2 pt-2 font-medium">
                    <span>Total charges</span><span className="text-red-500">−{formatMGA(bilan.chargesTotales)}</span>
                  </div>
                </motion.div>

                {/* Résultat */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`p-4 ${bilan.resultat >= 0 ? "bg-green-50 dark:bg-green-500/10" : "bg-red-50 dark:bg-red-500/10"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${bilan.resultat >= 0 ? "text-green-500" : "text-red-500"}`}>= Résultat net</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold flex items-center gap-2">
                      {bilan.resultat >= 0 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                      Résultat du mois
                    </span>
                    <span className={`text-2xl font-bold ${bilan.resultat >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {formatMGA(bilan.resultat)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[--foreground-subtle] mt-1">Marge nette : {tauxResultat}% du CA HT</div>
                </motion.div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
