"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw, Plus, Loader2, Receipt, FileText,
  ChevronRight, TrendingDown, ArrowUpRight, Wallet, ShoppingBag,
  Filter, Search, X,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Retour = {
  id: string;
  numero: string;
  clientId: string | null;
  clientNom: string | null;
  factureId: string | null;
  factureNumero: string | null;
  motif: string;
  motifDetail: string | null;
  modeRemboursement: string;
  statut: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  createdAt: string;
};

type Stats = {
  total: number;
  totalRembourse: number;
  totalAvoir: number;
  totalEspeces: number;
};

const MOTIF_LABELS: Record<string, string> = {
  defectueux: "Défectueux",
  non_conforme: "Non conforme",
  erreur_livraison: "Erreur livraison",
  date_peremption: "Péremption",
  geste_commercial: "Geste commercial",
  autre: "Autre",
};

const MOTIF_COLORS: Record<string, string> = {
  defectueux: "#ef4444",
  non_conforme: "#f97316",
  erreur_livraison: "#3b82f6",
  date_peremption: "#f59e0b",
  geste_commercial: "#22c55e",
  autre: "#94a3b8",
};

const MODE_LABELS: Record<string, string> = {
  avoir_credit: "Avoir crédité",
  remboursement_especes: "Espèces",
  remboursement_virement: "Virement",
  remboursement_mobile: "Mobile Money",
};

const DEMO_RETOURS: Retour[] = [
  {
    id: "demo-1",
    numero: "RET-2026-0003",
    clientId: null,
    clientNom: "Épicerie Soa - Antananarivo",
    factureId: null,
    factureNumero: "F-2026-0142",
    motif: "defectueux",
    motifDetail: "Sacs de riz humides",
    modeRemboursement: "avoir_credit",
    statut: "valide",
    totalHT: 280000,
    totalTVA: 0,
    totalTTC: 280000,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "demo-2",
    numero: "RET-2026-0002",
    clientId: null,
    clientNom: "Boutique Hasina",
    factureId: null,
    factureNumero: "F-2026-0138",
    motif: "non_conforme",
    motifDetail: null,
    modeRemboursement: "remboursement_especes",
    statut: "valide",
    totalHT: 65000,
    totalTVA: 0,
    totalTTC: 65000,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "demo-3",
    numero: "RET-2026-0001",
    clientId: null,
    clientNom: "Restaurant Coco Beach",
    factureId: null,
    factureNumero: "F-2026-0124",
    motif: "date_peremption",
    motifDetail: "Sauce tomate proche péremption",
    modeRemboursement: "avoir_credit",
    statut: "valide",
    totalHT: 120000,
    totalTVA: 0,
    totalTTC: 120000,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingDown;
  color: string;
}) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-subtle] truncate">{label}</p>
        <p className="text-base font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] mt-0.5 text-[--foreground-subtle]">{sub}</p>}
      </div>
    </div>
  );
}

export function RetoursView() {
  const [loading, setLoading] = useState(true);
  const [retours, setRetours] = useState<Retour[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalRembourse: 0,
    totalAvoir: 0,
    totalEspeces: 0,
  });
  const [filtreMotif, setFiltreMotif] = useState<string>("");
  const [search, setSearch] = useState("");
  const [usingDemo, setUsingDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/retours");
      const data = await res.json();
      const items: Retour[] = data.retours ?? [];
      if (items.length === 0) {
        setRetours(DEMO_RETOURS);
        const demoStats: Stats = {
          total: DEMO_RETOURS.length,
          totalRembourse: DEMO_RETOURS.reduce((s, r) => s + r.totalTTC, 0),
          totalAvoir: DEMO_RETOURS.filter((r) => r.modeRemboursement === "avoir_credit")
            .reduce((s, r) => s + r.totalTTC, 0),
          totalEspeces: DEMO_RETOURS.filter((r) => r.modeRemboursement !== "avoir_credit")
            .reduce((s, r) => s + r.totalTTC, 0),
        };
        setStats(demoStats);
        setUsingDemo(true);
      } else {
        setRetours(items);
        setStats(data.stats ?? stats);
        setUsingDemo(false);
      }
    } catch {
      setRetours(DEMO_RETOURS);
      setUsingDemo(true);
      toast.error("Impossible de charger les retours");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = retours.filter((r) => {
    if (filtreMotif && r.motif !== filtreMotif) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const blob = `${r.numero} ${r.clientNom ?? ""} ${r.factureNumero ?? ""}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <RotateCcw className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Retours & avoirs</h1>

        <Link
          href="/retours/nouveau"
          className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau retour
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          {usingDemo && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs rounded-lg px-4 py-2.5">
              Aucun retour en base — affichage de données de démonstration.
            </div>
          )}

          {/* ── KPI Cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Nombre de retours"
              value={String(stats.total)}
              sub={stats.total === 1 ? "retour" : "retours enregistrés"}
              icon={RotateCcw}
              color="#ef4444"
            />
            <KpiCard
              label="Total remboursé"
              value={formatMGA(stats.totalRembourse)}
              icon={TrendingDown}
              color="#f97316"
            />
            <KpiCard
              label="Avoirs émis"
              value={formatMGA(stats.totalAvoir)}
              sub="À valoir sur prochaines commandes"
              icon={Wallet}
              color="#3b82f6"
            />
            <KpiCard
              label="Remboursements directs"
              value={formatMGA(stats.totalEspeces)}
              sub="Espèces / virement / mobile"
              icon={ArrowUpRight}
              color="#22c55e"
            />
          </div>

          {/* ── Filtres ────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (n° retour, client, facture)"
                className="w-full pl-9 pr-3 py-2 border border-[--border] rounded-lg bg-[--card] text-sm focus:outline-none focus:border-[--primary] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[--foreground-subtle]" />
              <select
                value={filtreMotif}
                onChange={(e) => setFiltreMotif(e.target.value)}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] focus:outline-none focus:border-[--primary] transition-colors"
              >
                <option value="">Tous motifs</option>
                {Object.entries(MOTIF_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {(filtreMotif || search) && (
                <button
                  onClick={() => {
                    setFiltreMotif("");
                    setSearch("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
                  title="Effacer les filtres"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────────────────────── */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border]">
              <p className="text-xs font-medium text-[--foreground-subtle]">
                {filtered.length} {filtered.length === 1 ? "retour" : "retours"}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                <RotateCcw className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucun retour trouvé.</p>
                <Link
                  href="/retours/nouveau"
                  className="text-xs text-[--primary] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Créer un retour
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">N°</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Client</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Facture</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Motif</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Mode</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Montant</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold">{r.numero}</td>
                        <td className="px-3 py-2.5 text-xs text-[--foreground-subtle]">
                          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                          {r.clientNom ?? <span className="text-[--foreground-subtle] italic">Comptoir</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[--foreground-subtle] hidden md:table-cell font-mono">
                          {r.factureNumero ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: (MOTIF_COLORS[r.motif] ?? "#94a3b8") + "20",
                              color: MOTIF_COLORS[r.motif] ?? "#94a3b8",
                            }}
                          >
                            {MOTIF_LABELS[r.motif] ?? r.motif}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs hidden md:table-cell">
                          {MODE_LABELS[r.modeRemboursement] ?? r.modeRemboursement}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-sm">{formatMGA(r.totalTTC)}</td>
                        <td className="px-3 py-2.5">
                          {usingDemo ? (
                            <ChevronRight className="w-3.5 h-3.5 text-[--foreground-subtle]/40" />
                          ) : (
                            <a
                              href={`/api/retours/${r.id}/avoir-pdf`}
                              target="_blank"
                              rel="noopener"
                              className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle] inline-flex"
                              title="Télécharger le PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </motion.tr>
                    ))}
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
