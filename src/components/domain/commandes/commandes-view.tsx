"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  List, LayoutGrid, Search, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, FileText,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type Statut =
  | "brouillon" | "soumise" | "validee" | "preparee"
  | "en_livraison" | "livree" | "annulee" | "refusee";

type Source = "pos_agent" | "ecommerce" | "telephone" | "import";

type Commande = {
  id: string;
  reference: string;
  statut: Statut;
  source: Source;
  totalTTC: number;
  createdAt: string;
  clientNom: string | null;
  clientZone: string | null;
  agentNom: string | null;
};

type Counts = Record<string, number>;

// ── Constants ────────────────────────────────────────────────────────────────

const STATUT_META: Record<Statut, { label: string; color: string; bg: string; text: string }> = {
  brouillon:    { label: "Brouillon",      color: "#6B7280", bg: "#F3F4F6", text: "#374151" },
  soumise:      { label: "Soumise",        color: "#3B82F6", bg: "#EFF6FF", text: "#1D4ED8" },
  validee:      { label: "Validée",        color: "#22C55E", bg: "#F0FDF4", text: "#15803D" },
  preparee:     { label: "En préparation", color: "#F59E0B", bg: "#FFFBEB", text: "#D97706" },
  en_livraison: { label: "En livraison",   color: "#8B5CF6", bg: "#F5F3FF", text: "#7C3AED" },
  livree:       { label: "Livrée",         color: "#10B981", bg: "#ECFDF5", text: "#059669" },
  annulee:      { label: "Annulée",        color: "#EF4444", bg: "#FEF2F2", text: "#DC2626" },
  refusee:      { label: "Refusée",        color: "#EF4444", bg: "#FEF2F2", text: "#DC2626" },
};

const SOURCE_META: Record<Source, { label: string; color: string }> = {
  pos_agent:  { label: "POS",        color: "#FF4D00" },
  ecommerce:  { label: "E-commerce", color: "#3B82F6" },
  telephone:  { label: "Téléphone",  color: "#8B5CF6" },
  import:     { label: "Import",     color: "#6B7280" },
};

const KANBAN_COLS: Statut[] = ["soumise", "validee", "preparee", "en_livraison", "livree"];

const NEXT_ACTION: Partial<Record<Statut, { label: string; nextStatut: Statut }>> = {
  soumise:      { label: "Valider",   nextStatut: "validee" },
  validee:      { label: "Préparer",  nextStatut: "preparee" },
  preparee:     { label: "Expédier",  nextStatut: "en_livraison" },
  en_livraison: { label: "Livré",     nextStatut: "livree" },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: Statut }) {
  const m = STATUT_META[statut];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: m.bg, color: m.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

function SourceBadge({ source }: { source: Source }) {
  const m = SOURCE_META[source] ?? { label: source, color: "#6B7280" };
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${m.color}18`, color: m.color }}
    >
      {m.label}
    </span>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommandesView() {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const LIMIT = 20;

  const fetchCommandes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statutFilter) params.set("statut", statutFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/commandes?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur chargement commandes");
      const data = await res.json();
      setCommandes(data.commandes ?? []);
      setTotal(data.total ?? 0);
      setCounts(data.counts ?? {});
    } catch {
      toast.error("Impossible de charger les commandes");
    } finally {
      setLoading(false);
    }
  }, [page, statutFilter, sourceFilter, search]);

  useEffect(() => {
    fetchCommandes();
  }, [fetchCommandes]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statutFilter, sourceFilter, search]);

  const changeStatut = async (id: string, statut: Statut) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/commandes/${id}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error("Erreur changement statut");
      toast.success("Statut mis à jour");
      await fetchCommandes();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ── KPI bar ──────────────────────────────────────────────────────────────

  const KPI_ITEMS: Array<{ key: string; label: string }> = [
    { key: "soumise",      label: "Soumises" },
    { key: "validee",      label: "Validées" },
    { key: "preparee",     label: "En préparation" },
    { key: "en_livraison", label: "En livraison" },
    { key: "livree",       label: "Livrées" },
    { key: "annulee",      label: "Annulées" },
  ];

  // ── List view ─────────────────────────────────────────────────────────────

  const renderList = () => (
    <div>
      {/* KPI bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        {KPI_ITEMS.map(({ key, label }) => {
          const m = STATUT_META[key as Statut];
          return (
            <div
              key={key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-opacity"
              style={{ backgroundColor: `${m.color}14`, opacity: statutFilter && statutFilter !== key ? 0.5 : 1 }}
              onClick={() => setStatutFilter(statutFilter === key ? "" : key)}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="font-semibold" style={{ color: m.color }}>{counts[key] ?? 0}</span>
              <span style={{ color: m.text }} className="text-xs">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#333744" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#232630", borderBottom: "1px solid #333744" }}>
              {["Référence", "Client", "Zone", "Agent", "Total TTC", "Statut", "Source", "Date", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-brand-muted uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {commandes.map((c, i) => {
                const action = NEXT_ACTION[c.statut];
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-white/3"
                    style={{ borderColor: "#333744" }}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold" style={{ color: "#FF4D00" }}>
                      {c.reference}
                    </td>
                    <td className="px-3 py-2.5 text-white font-medium max-w-[140px] truncate">
                      {c.clientNom ?? <span className="text-brand-muted italic">Comptoir</span>}
                    </td>
                    <td className="px-3 py-2.5 text-brand-muted text-xs">{c.clientZone ?? "—"}</td>
                    <td className="px-3 py-2.5 text-brand-muted text-xs">{c.agentNom ?? "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">
                      {formatMGA(c.totalTTC)}
                    </td>
                    <td className="px-3 py-2.5"><StatutBadge statut={c.statut} /></td>
                    <td className="px-3 py-2.5"><SourceBadge source={c.source} /></td>
                    <td className="px-3 py-2.5 text-brand-muted text-xs whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {c.statut === "brouillon" && (
                          <button
                            onClick={() => window.open(`/api/commandes/${c.id}/devis-pdf`, "_blank")}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                            style={{ backgroundColor: "#333744", color: "#9CA3AF" }}
                            title="PDF Devis"
                          >
                            <FileText className="w-3 h-3" />
                            PDF
                          </button>
                        )}
                        {action && (
                          <button
                            onClick={() => changeStatut(c.id, action.nextStatut)}
                            disabled={actionLoading === c.id}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-opacity disabled:opacity-50"
                            style={{
                              backgroundColor: STATUT_META[action.nextStatut].color,
                              color: "white",
                            }}
                          >
                            {actionLoading === c.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : null}
                            {action.label}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {!loading && commandes.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-brand-muted">
                  Aucune commande trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-brand-muted">
            {total} commande{total > 1 ? "s" : ""} · Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg disabled:opacity-30 transition-opacity"
              style={{ backgroundColor: "#333744" }}
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg disabled:opacity-30 transition-opacity"
              style={{ backgroundColor: "#333744" }}
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Kanban view ───────────────────────────────────────────────────────────

  const renderKanban = () => {
    const byStatut = new Map<Statut, Commande[]>(KANBAN_COLS.map((c) => [c, []]));
    for (const c of commandes) {
      if (KANBAN_COLS.includes(c.statut)) byStatut.get(c.statut)!.push(c);
    }

    return (
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {KANBAN_COLS.map((col) => {
          const m = STATUT_META[col];
          const cards = byStatut.get(col) ?? [];
          const action = NEXT_ACTION[col];
          return (
            <div
              key={col}
              className="shrink-0 w-64 flex flex-col rounded-xl overflow-hidden"
              style={{ backgroundColor: "#232630", border: "1px solid #333744", borderTop: `3px solid ${m.color}` }}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{m.label}</span>
                <span
                  className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${m.color}22`, color: m.color }}
                >
                  {counts[col] ?? cards.length}
                </span>
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg p-3 space-y-2"
                    style={{ backgroundColor: "#1B1D24", border: "1px solid #333744" }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-mono text-xs font-semibold" style={{ color: "#FF4D00" }}>
                        {c.reference}
                      </span>
                      <SourceBadge source={c.source} />
                    </div>
                    <div className="text-sm font-medium text-white truncate">
                      {c.clientNom ?? "Comptoir"}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{formatMGA(c.totalTTC)}</span>
                      <span className="text-xs text-brand-muted">{fmtDate(c.createdAt)}</span>
                    </div>
                    {action && (
                      <button
                        onClick={() => changeStatut(c.id, action.nextStatut)}
                        disabled={actionLoading === c.id}
                        className="w-full flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: m.color, color: "white" }}
                      >
                        {actionLoading === c.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        {action.label} →
                      </button>
                    )}
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="text-center py-6 text-xs text-brand-muted">Vide</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Commandes</h1>
          <p className="text-sm text-brand-muted">{total} commande{total !== 1 ? "s" : ""} au total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#333744" }}>
            <button
              onClick={() => setView("list")}
              className="px-3 py-2 flex items-center gap-1.5 text-sm transition-colors"
              style={{
                backgroundColor: view === "list" ? "#333744" : "transparent",
                color: view === "list" ? "white" : "#6B7280",
              }}
            >
              <List className="w-4 h-4" />
              Liste
            </button>
            <button
              onClick={() => setView("kanban")}
              className="px-3 py-2 flex items-center gap-1.5 text-sm transition-colors"
              style={{
                backgroundColor: view === "kanban" ? "#333744" : "transparent",
                color: view === "kanban" ? "white" : "#6B7280",
              }}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
          </div>
          <button
            onClick={fetchCommandes}
            disabled={loading}
            className="p-2 rounded-lg transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#333744" }}
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input
            type="text"
            placeholder="Rechercher référence, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-brand-muted bg-transparent border focus:outline-none"
            style={{ borderColor: "#333744", backgroundColor: "#232630" }}
          />
        </div>

        {/* Statut filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "", label: "Tout" },
            { key: "soumise", label: "Soumise" },
            { key: "validee", label: "Validée" },
            { key: "preparee", label: "Préparation" },
            { key: "en_livraison", label: "Livraison" },
            { key: "livree", label: "Livrée" },
            { key: "annulee", label: "Annulée" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatutFilter(key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                backgroundColor: statutFilter === key ? "#FF4D00" : "#333744",
                color: statutFilter === key ? "white" : "#9CA3AF",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="flex gap-1.5">
          {[
            { key: "", label: "Tout" },
            { key: "pos_agent", label: "POS" },
            { key: "ecommerce", label: "E-comm" },
            { key: "telephone", label: "Tél" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                backgroundColor: sourceFilter === key ? "#8B5CF6" : "#333744",
                color: sourceFilter === key ? "white" : "#9CA3AF",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && commandes.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-muted" />
        </div>
      ) : view === "list" ? (
        renderList()
      ) : (
        renderKanban()
      )}
    </div>
  );
}
