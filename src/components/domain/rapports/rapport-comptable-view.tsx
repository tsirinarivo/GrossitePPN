"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calculator, TrendingUp, TrendingDown, Receipt, ShoppingBag,
  Loader2, FileText, FileSpreadsheet, FileDown, Info, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMGA } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Charge { categorie: string; libelle: string; montant: number }
interface CompteResultat {
  mois: string; label: string;
  caHT: number; tvaCollectee: number; achatsHT: number; tvaDeductible: number;
  margeBrute: number; charges: Charge[]; totalCharges: number;
  resultat: number; tvaNette: number; demo: boolean;
}

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-muted] mb-0.5">{label}</p>
        <p className="text-lg font-bold text-[--foreground] truncate">{value}</p>
        {sub && <p className="text-xs text-[--foreground-muted] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function LigneResultat({ label, compte, montant, negatif, total }: {
  label: string; compte?: string; montant: number; negatif?: boolean; total?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2.5 px-3",
      total ? "border-t-2 border-[--foreground]/30 font-bold text-[--foreground]" : "border-b border-[--border]"
    )}>
      <span className={cn("text-sm", total ? "" : "text-[--foreground-muted]")}>
        {label}
        {compte && <span className="text-[--foreground-subtle] text-xs ml-1.5 font-mono">({compte})</span>}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", negatif && "text-red-400")}>
        {negatif ? "− " : ""}{formatMGA(montant)}
      </span>
    </div>
  );
}

export function RapportComptableView() {
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [moisIdx, setMoisIdx] = useState(now.getMonth());
  const [data, setData] = useState<CompteResultat | null>(null);
  const [loading, setLoading] = useState(true);

  const mois = `${annee}-${String(moisIdx + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rapports/comptable?mois=${mois}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mois]);

  useEffect(() => { load(); }, [load]);

  function openExport(path: string, label: string) {
    window.open(path, "_blank");
    toast.success(`${label} lancé`);
  }

  const annees = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const selectCls = "h-10 px-3 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Comptabilité</h1>
          <p className="text-[--foreground-muted] mt-1">Compte de résultat mensuel &amp; exports comptables (FEC, Sage/EBP)</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={moisIdx} onChange={(e) => setMoisIdx(Number(e.target.value))} className={selectCls}>
            {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className={selectCls}>
            {annees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {data?.demo && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0" /> Données de démonstration — aucune écriture réelle sur cette période.
        </div>
      )}

      {loading || !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[--foreground-muted]">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Chiffre d'affaires HT" value={formatMGA(data.caHT, { compact: true })} icon={Receipt} color="#FF4D00" />
            <KpiCard label="Achats HT" value={formatMGA(data.achatsHT, { compact: true })} icon={ShoppingBag} color="#3B82F6" />
            <KpiCard label="Marge brute" value={formatMGA(data.margeBrute, { compact: true })} sub={`${data.caHT > 0 ? Math.round((data.margeBrute / data.caHT) * 100) : 0}% du CA`} icon={TrendingUp} color="#22C55E" />
            <KpiCard
              label="Résultat net"
              value={formatMGA(data.resultat, { compact: true })}
              sub={data.resultat >= 0 ? "Bénéfice" : "Perte"}
              icon={data.resultat >= 0 ? TrendingUp : TrendingDown}
              color={data.resultat >= 0 ? "#22C55E" : "#EF4444"}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Compte de résultat */}
            <div className="rounded-xl border border-[--border] bg-[--card] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-[--primary]" />
                <h2 className="font-semibold text-[--foreground]">Compte de résultat — {data.label}</h2>
              </div>
              <LigneResultat label="Chiffre d'affaires" compte="707" montant={data.caHT} />
              <LigneResultat label="Achats de marchandises" compte="607" montant={data.achatsHT} negatif />
              <LigneResultat label="Marge brute" montant={data.margeBrute} total />
              <div className="h-4" />
              {data.charges.map((c) => (
                <LigneResultat key={c.categorie} label={c.libelle} montant={c.montant} negatif />
              ))}
              <LigneResultat label="Total charges" montant={data.totalCharges} negatif total />
              <div className={cn(
                "mt-5 rounded-xl p-4 text-center",
                data.resultat >= 0 ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
              )}>
                <p className="text-xs text-[--foreground-muted] mb-1">Résultat net de la période</p>
                <p className={cn("text-2xl font-black tabular-nums", data.resultat >= 0 ? "text-green-400" : "text-red-400")}>
                  {data.resultat < 0 ? "− " : ""}{formatMGA(Math.abs(data.resultat))}
                </p>
              </div>
            </div>

            {/* TVA + Exports */}
            <div className="space-y-6">
              <div className="rounded-xl border border-[--border] bg-[--card] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 text-[--primary]" />
                  <h2 className="font-semibold text-[--foreground]">Récapitulatif TVA</h2>
                </div>
                <LigneResultat label="TVA collectée" compte="44571" montant={data.tvaCollectee} />
                <LigneResultat label="TVA déductible" compte="44566" montant={data.tvaDeductible} negatif />
                <LigneResultat label={`TVA nette à ${data.tvaNette >= 0 ? "décaisser" : "récupérer"}`} montant={Math.abs(data.tvaNette)} total />
              </div>

              <div className="rounded-xl border border-[--border] bg-[--card] p-5">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-[--primary]" />
                  <h2 className="font-semibold text-[--foreground]">Exports comptables</h2>
                </div>
                <p className="text-xs text-[--foreground-muted] mb-4">Le FEC et l'export Sage couvrent l'année entière {annee}.</p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => openExport(`/api/rapports/comptable/pdf?mois=${mois}`, "Rapport PDF")}>
                    <FileDown className="w-4 h-4" /> Rapport mensuel PDF
                    <Badge variant="outline" className="ml-auto text-[10px]">{data.label}</Badge>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => openExport(`/api/rapports/comptable/fec?annee=${annee}`, "Export FEC")}>
                    <FileText className="w-4 h-4" /> Fichier FEC (DGFiP)
                    <Badge variant="outline" className="ml-auto text-[10px]">{annee}</Badge>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => openExport(`/api/rapports/comptable/sage?annee=${annee}`, "Export Sage")}>
                    <FileSpreadsheet className="w-4 h-4" /> Export Sage / EBP (CSV)
                    <Badge variant="outline" className="ml-auto text-[10px]">{annee}</Badge>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
