"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatMGA } from "@/lib/money";

// ── Types ────────────────────────────────────────────────────────────────────

interface LigneTVA {
  mois: string;
  label: string;
  nbCommandes: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
}

interface RapportTVA {
  annee: number;
  trimestre: number | null;
  lignes: LigneTVA[];
  totaux: {
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    nbCommandes: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function exportCSV(lignes: LigneTVA[], annee: number, trimestre: number | null) {
  const label = trimestre ? `T${trimestre}-${annee}` : String(annee);
  const header = "Mois;Nb commandes;Base HT;TVA 20%;Total TTC\n";
  const rows = lignes.map(
    (l) =>
      `${l.label};${l.nbCommandes};${l.totalHT};${l.totalTVA};${l.totalTTC}`
  );
  const blob = new Blob([header + rows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-tva-${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Composants UI légers ──────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: "var(--card, #161622)", border: "1px solid #333744" }}
    >
      <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
        {label}
      </span>
      <span className="text-lg font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ── Tooltip Recharts personnalisé ─────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-3 text-sm shadow-xl"
      style={{ backgroundColor: "#1A1A28", border: "1px solid #414553", color: "#E5E7EB" }}
    >
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {formatMGA(entry.value, { compact: true })}
        </p>
      ))}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function RapportTVAView() {
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);
  const [trimestre, setTrimestre] = useState<number | null>(null);
  const [data, setData] = useState<RapportTVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ annee: String(annee) });
      if (trimestre) params.set("trimestre", String(trimestre));
      const res = await fetch(`/api/rapports/tva?${params}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json: RapportTVA = await res.json();
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [annee, trimestre]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lignes = data?.lignes ?? [];
  const totaux = data?.totaux;

  // Données pour Recharts (label court)
  const chartData = lignes.map((l) => ({
    name: l.label.slice(0, 4), // "Janv" etc.
    "Base HT": l.totalHT,
    TVA: l.totalTVA,
  }));

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ backgroundColor: "#1B1D24", color: "var(--foreground, #E5E7EB)" }}
    >
      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Rapport TVA</h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            TVA collectée par période — taux standard 20 %
          </p>
        </div>

        {/* Export CSV */}
        <button
          onClick={() => lignes.length && exportCSV(lignes, annee, trimestre)}
          disabled={!lignes.length}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          style={{ backgroundColor: "#333744", color: "#A0AEC0", border: "1px solid #414553" }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        {/* Sélecteur année */}
        <select
          value={annee}
          onChange={(e) => setAnnee(Number(e.target.value))}
          className="rounded-lg px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: "#333744", color: "#E5E7EB", border: "1px solid #414553" }}
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Pills trimestre */}
        {([null, 1, 2, 3, 4] as (number | null)[]).map((t) => (
          <button
            key={t ?? "tout"}
            onClick={() => setTrimestre(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: trimestre === t ? "#FF4D00" : "#333744",
              color: trimestre === t ? "#fff" : "#A0AEC0",
              border: `1px solid ${trimestre === t ? "#FF4D00" : "#414553"}`,
            }}
          >
            {t === null ? "Tout" : `T${t}`}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "#2D1B1B", color: "#F87171", border: "1px solid #5B2121" }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="CA HT total"
          value={totaux ? formatMGA(totaux.totalHT, { compact: true }) : "—"}
          color="#3B82F6"
        />
        <KPICard
          label="TVA collectée"
          value={totaux ? formatMGA(totaux.totalTVA, { compact: true }) : "—"}
          color="#F59E0B"
        />
        <KPICard
          label="CA TTC"
          value={totaux ? formatMGA(totaux.totalTTC, { compact: true }) : "—"}
          color="#10B981"
        />
        <KPICard
          label="Nb factures"
          value={totaux ? String(totaux.nbCommandes) : "—"}
          color="#8B5CF6"
        />
      </div>

      {/* Graphique */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{ backgroundColor: "var(--card, #161622)", border: "1px solid #333744" }}
      >
        <h2 className="text-sm font-semibold text-white mb-4">
          Base HT et TVA par mois
        </h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center" style={{ color: "#6B7280" }}>
            Chargement…
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center" style={{ color: "#6B7280" }}>
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333744" />
              <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#6B7280", fontSize: 11 }}
                tickFormatter={(v: number) => formatMGA(v, { compact: true })}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
              <Bar dataKey="Base HT" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="TVA" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tableau */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card, #161622)", border: "1px solid #333744" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #333744" }}>
                {["Mois", "Nb commandes", "Base HT", "TVA (20 %)", "Total TTC"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold"
                      style={{ color: "#6B7280" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading && !lignes.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "#6B7280" }}>
                    Chargement…
                  </td>
                </tr>
              ) : lignes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "#6B7280" }}>
                    Aucune donnée pour cette période
                  </td>
                </tr>
              ) : (
                lignes.map((l) => (
                  <tr
                    key={l.mois}
                    className="transition-colors hover:bg-white/5"
                    style={{ borderBottom: "1px solid #333744" }}
                  >
                    <td className="px-4 py-3 font-medium text-white">{l.label}</td>
                    <td className="px-4 py-3" style={{ color: "#9CA3AF" }}>{l.nbCommandes}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#3B82F6" }}>
                      {formatMGA(l.totalHT)}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#F59E0B" }}>
                      {formatMGA(l.totalTVA)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-white">
                      {formatMGA(l.totalTTC)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {totaux && lignes.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "2px solid #414553" }}>
                  <td className="px-4 py-3 font-bold text-white">Total</td>
                  <td className="px-4 py-3 font-bold" style={{ color: "#9CA3AF" }}>
                    {totaux.nbCommandes}
                  </td>
                  <td className="px-4 py-3 font-bold font-mono" style={{ color: "#3B82F6" }}>
                    {formatMGA(totaux.totalHT)}
                  </td>
                  <td className="px-4 py-3 font-bold font-mono" style={{ color: "#F59E0B" }}>
                    {formatMGA(totaux.totalTVA)}
                  </td>
                  <td className="px-4 py-3 font-bold font-mono text-white">
                    {formatMGA(totaux.totalTTC)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
