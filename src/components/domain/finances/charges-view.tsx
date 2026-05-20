"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  Loader2, X, Check, TrendingDown, TrendingUp,
  ReceiptText, LayoutList,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ["personnel", "loyer", "energie", "fournitures", "marketing", "maintenance", "autre"] as const;
type Categorie = typeof CATEGORIES[number];

const CAT_LABELS: Record<Categorie, string> = {
  personnel: "Personnel",
  loyer: "Loyer",
  energie: "Énergie",
  fournitures: "Fournitures",
  marketing: "Marketing",
  maintenance: "Maintenance",
  autre: "Autre",
};

const CAT_COLORS: Record<Categorie, string> = {
  personnel: "#6366f1",   // indigo
  loyer: "#3b82f6",       // blue
  energie: "#f59e0b",     // amber
  fournitures: "#22c55e", // green
  marketing: "#ec4899",   // pink
  maintenance: "#f97316", // orange
  autre: "#94a3b8",       // grey
};

const MOIS_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// ── Types ──────────────────────────────────────────────────────────────────────

type Charge = {
  id: string;
  libelle: string;
  categorie: string;
  montant: number;
  mois: string;
  notes?: string | null;
  createdAt: string;
};

type Totaux = { categorie: string; total: number }[];

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentMois(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function parseMois(mois: string): { y: number; m: number } {
  const parts = mois.split("-");
  return { y: parseInt(parts[0] ?? "2026", 10), m: parseInt(parts[1] ?? "01", 10) };
}

function prevMois(mois: string): string {
  const { y, m } = parseMois(mois);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMois(mois: string): string {
  const { y, m } = parseMois(mois);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function moisLabel(mois: string): string {
  const { y, m } = parseMois(mois);
  return `${MOIS_LABELS[m - 1] ?? ""} ${y}`;
}

function pct(val: number, total: number): number {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, subColor, icon: Icon, color }: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
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
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: subColor ?? "#94a3b8" }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Drawer Form ────────────────────────────────────────────────────────────────

function ChargesDrawer({ moisActif, onClose, onSaved }: {
  moisActif: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [libelle, setLibelle]     = useState("");
  const [categorie, setCategorie] = useState<Categorie>("personnel");
  const [montant, setMontant]     = useState("");
  const [mois, setMois]           = useState(moisActif);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    if (!libelle.trim() || !montant) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finances/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: libelle.trim(), categorie, montant: Number(montant), mois, notes: notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Charge ajoutée");
      onSaved();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0">
          <ReceiptText className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Nouvelle charge</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Libellé */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Libellé *</label>
            <input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] transition-colors"
              placeholder="Ex: Salaire vendeur"
              autoFocus
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Catégorie *</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as Categorie)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] transition-colors"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CAT_LABELS[c]}</option>
              ))}
            </select>
            {/* Color preview */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CAT_COLORS[categorie] }} />
              <span className="text-[11px] text-[--foreground-subtle]">{CAT_LABELS[categorie]}</span>
            </div>
          </div>

          {/* Montant */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Montant (Ar) *</label>
            <input
              type="number"
              min={0}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] transition-colors"
              placeholder="0"
            />
          </div>

          {/* Mois */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Mois *</label>
            <input
              type="month"
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Notes <span className="font-normal opacity-60">(optionnel)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] transition-colors resize-none"
              placeholder="Remarques, détails..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-[--border] shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted] transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !libelle.trim() || !montant}
            className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Ajouter
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Inline Edit Row ────────────────────────────────────────────────────────────

function EditRow({ charge, onSaved, onCancel }: {
  charge: Charge;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [libelle, setLibelle]     = useState(charge.libelle);
  const [categorie, setCategorie] = useState(charge.categorie);
  const [montant, setMontant]     = useState(String(charge.montant));
  const [notes, setNotes]         = useState(charge.notes ?? "");
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    if (!libelle.trim() || !montant) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/finances/charges/${charge.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: libelle.trim(), categorie, montant: Number(montant), mois: charge.mois, notes: notes.trim() || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Charge modifiée");
      onSaved();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "border border-[--border] rounded-md px-2 py-1 text-xs bg-[--background] focus:outline-none focus:border-[--primary] w-full";

  return (
    <tr className="bg-[--primary]/5 border-b border-[--border]">
      <td className="px-3 py-2">
        <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={inputCls} placeholder="Libellé" />
      </td>
      <td className="px-3 py-2 hidden sm:table-cell">
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={inputCls}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} className={inputCls + " text-right"} placeholder="0" />
      </td>
      <td className="px-3 py-2 hidden md:table-cell">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Notes" />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-end">
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ChargesView() {
  const [moisActif, setMoisActif] = useState(currentMois);
  const [charges, setCharges]     = useState<Charge[]>([]);
  const [totaux, setTotaux]       = useState<Totaux>([]);
  const [moisTotal, setMoisTotal] = useState(0);
  const [prevTotal, setPrevTotal] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);

  const load = useCallback(async (mois: string) => {
    setLoading(true);
    try {
      const [cur, prev] = await Promise.all([
        fetch(`/api/finances/charges?mois=${mois}`).then((r) => r.json()),
        fetch(`/api/finances/charges?mois=${prevMois(mois)}`).then((r) => r.json()),
      ]);
      setCharges(cur.charges ?? []);
      setTotaux(cur.totaux ?? []);
      setMoisTotal(cur.moisTotal ?? 0);
      setPrevTotal(prev.moisTotal ?? 0);
    } catch {
      toast.error("Impossible de charger les charges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(moisActif); }, [moisActif, load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/finances/charges/${id}`, { method: "DELETE" });
      toast.success("Charge supprimée");
      load(moisActif);
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // KPI computations
  const plusGrandeCat = totaux.reduce<{ categorie: string; total: number } | null>((acc, t) =>
    t.total > (acc?.total ?? 0) ? t : acc, null
  );

  const varMois = prevTotal > 0
    ? Math.round(((moisTotal - prevTotal) / prevTotal) * 100)
    : null;

  const nbLignes = charges.length;

  // Group charges by category
  const grouped: Record<string, Charge[]> = {};
  for (const c of charges) {
    const arr = grouped[c.categorie] ?? [];
    arr.push(c);
    grouped[c.categorie] = arr;
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <ReceiptText className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Charges opérationnelles</h1>

        {/* Month navigator */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMoisActif(prevMois(moisActif))}
            className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-[130px] text-center">{moisLabel(moisActif)}</span>
          <button
            onClick={() => setMoisActif(nextMois(moisActif))}
            className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle charge
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">

          {/* ── KPI Cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Total charges du mois"
              value={formatMGA(moisTotal)}
              icon={TrendingDown}
              color="#ef4444"
            />
            <KpiCard
              label="Plus grande catégorie"
              value={plusGrandeCat ? CAT_LABELS[plusGrandeCat.categorie as Categorie] ?? plusGrandeCat.categorie : "—"}
              sub={plusGrandeCat ? formatMGA(plusGrandeCat.total) : undefined}
              icon={LayoutList}
              color={plusGrandeCat ? (CAT_COLORS[plusGrandeCat.categorie as Categorie] ?? "#94a3b8") : "#94a3b8"}
            />
            <KpiCard
              label="vs mois précédent"
              value={varMois !== null ? `${varMois > 0 ? "+" : ""}${varMois}%` : "N/A"}
              sub={prevTotal > 0 ? formatMGA(prevTotal) : "Pas de données"}
              subColor={varMois !== null ? (varMois > 0 ? "#ef4444" : "#22c55e") : "#94a3b8"}
              icon={varMois !== null && varMois > 0 ? TrendingUp : TrendingDown}
              color={varMois !== null && varMois > 0 ? "#ef4444" : "#22c55e"}
            />
            <KpiCard
              label="Nombre de lignes"
              value={String(nbLignes)}
              sub={nbLignes === 1 ? "entrée" : "entrées"}
              icon={ReceiptText}
              color="#6366f1"
            />
          </div>

          {/* ── Breakdown par catégorie ─────────────────────────────────────── */}
          {totaux.length > 0 && (
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <p className="text-xs font-medium text-[--foreground-subtle] mb-4">Répartition par catégorie</p>
              <div className="flex flex-col gap-3">
                {totaux
                  .slice()
                  .sort((a, b) => b.total - a.total)
                  .map(({ categorie, total }) => {
                    const color = CAT_COLORS[categorie as Categorie] ?? "#94a3b8";
                    const label = CAT_LABELS[categorie as Categorie] ?? categorie;
                    const p = pct(total, moisTotal);
                    return (
                      <div key={categorie} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs text-[--foreground-subtle] w-24 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-[--muted] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${p}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right">{p}%</span>
                        <span className="text-xs text-[--foreground-subtle] w-28 text-right hidden sm:block">{formatMGA(total)}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Table des charges ───────────────────────────────────────────── */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border]">
              <p className="text-xs font-medium text-[--foreground-subtle]">
                Détail des charges — {moisLabel(moisActif)}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : charges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                <ReceiptText className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucune charge enregistrée pour ce mois.</p>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-xs text-[--primary] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter une charge
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Libellé</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden sm:table-cell">Catégorie</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Montant</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Notes</th>
                      <th className="px-3 py-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).map(([cat, rows]) => (
                      <>
                        {/* Category header row */}
                        <tr key={`hdr-${cat}`} className="bg-[--muted]/20">
                          <td colSpan={5} className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: CAT_COLORS[cat as Categorie] ?? "#94a3b8" }}
                              />
                              <span className="text-[11px] font-semibold uppercase tracking-wider"
                                style={{ color: CAT_COLORS[cat as Categorie] ?? "#94a3b8" }}>
                                {CAT_LABELS[cat as Categorie] ?? cat}
                              </span>
                              <span className="text-[11px] text-[--foreground-subtle] ml-auto">
                                {formatMGA(rows.reduce((s, r) => s + r.montant, 0))}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Charge rows */}
                        {rows.map((charge) =>
                          editingId === charge.id ? (
                            <EditRow
                              key={charge.id}
                              charge={charge}
                              onSaved={() => { setEditingId(null); load(moisActif); }}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <tr key={charge.id} className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-sm">{charge.libelle}</div>
                              </td>
                              <td className="px-3 py-2.5 hidden sm:table-cell">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: (CAT_COLORS[charge.categorie as Categorie] ?? "#94a3b8") + "20",
                                    color: CAT_COLORS[charge.categorie as Categorie] ?? "#94a3b8",
                                  }}
                                >
                                  {CAT_LABELS[charge.categorie as Categorie] ?? charge.categorie}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-sm">{formatMGA(charge.montant)}</td>
                              <td className="px-3 py-2.5 text-xs text-[--foreground-subtle] hidden md:table-cell max-w-[160px] truncate">
                                {charge.notes ?? "—"}
                              </td>
                              <td className="px-3 py-2.5">
                                {confirmDeleteId === charge.id ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Confirmer ?</span>
                                    <button
                                      onClick={() => handleDelete(charge.id)}
                                      disabled={deletingId === charge.id}
                                      className="p-1 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    >
                                      {deletingId === charge.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="p-1 rounded-md hover:bg-[--muted] text-[--foreground-subtle]"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      onClick={() => { setEditingId(charge.id); setConfirmDeleteId(null); }}
                                      className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(charge.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[--border] bg-[--muted]/30">
                      <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-[--foreground-subtle] hidden sm:table-cell">
                        TOTAL CHARGES
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-[--foreground-subtle] sm:hidden">
                        TOTAL
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-red-500">{formatMGA(moisTotal)}</td>
                      <td className="hidden md:table-cell" />
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Side Drawer ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <ChargesDrawer
            moisActif={moisActif}
            onClose={() => setDrawerOpen(false)}
            onSaved={() => { setDrawerOpen(false); load(moisActif); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
