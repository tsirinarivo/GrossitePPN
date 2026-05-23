"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2, Search, X, User, Globe, Clock } from "lucide-react";
import { toast } from "sonner";

type AuditLog = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entite: string | null;
  entiteId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  "commande.valider": "#22c55e",
  "commande.annuler": "#ef4444",
  "retour.creer": "#f97316",
  "depot.desactiver": "#94a3b8",
  "promotion.creer": "#3b82f6",
  "promotion.modifier": "#3b82f6",
  "promotion.supprimer": "#ef4444",
};

const PERIODES = [
  { key: "jour", label: "Aujourd'hui" },
  { key: "semaine", label: "7 jours" },
  { key: "mois", label: "Ce mois" },
  { key: "annee", label: "Année" },
] as const;

export function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<string>("semaine");
  const [filtreAction, setFiltreAction] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ periode });
      if (filtreAction) params.set("action", filtreAction);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      toast.error("Impossible de charger le journal");
    } finally {
      setLoading(false);
    }
  }, [periode, filtreAction, search]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const actionsUniques = Array.from(new Set(logs.map((l) => l.action))).sort();

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <Shield className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Journal d&apos;audit</h1>

        <div className="flex items-center gap-1 bg-[--muted] rounded-xl p-1">
          {PERIODES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriode(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periode === p.key
                  ? "bg-[--card] text-[--foreground] shadow-sm"
                  : "text-[--foreground-subtle] hover:text-[--foreground]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-4">
          <div className="bg-blue-500/5 border border-blue-500/20 text-blue-500 text-xs rounded-lg px-4 py-2.5 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Trace des actions sensibles (validations, suppressions, modifications de paramètres).
              Consultable uniquement par les rôles admin et gérant.
            </span>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher action, email, ID entité..."
                className="w-full pl-9 pr-3 py-2 border border-[--border] rounded-lg bg-[--card] text-sm focus:outline-none focus:border-[--primary]"
              />
            </div>
            <select
              value={filtreAction}
              onChange={(e) => setFiltreAction(e.target.value)}
              className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] focus:outline-none focus:border-[--primary]"
            >
              <option value="">Toutes actions</option>
              {actionsUniques.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            {(search || filtreAction) && (
              <button
                onClick={() => { setSearch(""); setFiltreAction(""); }}
                className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border]">
              <p className="text-xs font-medium text-[--foreground-subtle]">
                {loading ? "Chargement..." : `${logs.length} entrée(s)`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                <Shield className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucune action enregistrée sur la période.</p>
              </div>
            ) : (
              <div className="divide-y divide-[--border]">
                {logs.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="px-4 py-3 hover:bg-[--muted]/10 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-end shrink-0 text-right min-w-[80px]">
                        <div className="text-xs text-[--foreground-subtle]">
                          {new Date(log.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                        <div className="text-[10px] text-[--foreground-subtle] font-mono">
                          {new Date(log.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono"
                            style={{
                              backgroundColor: (ACTION_COLORS[log.action] ?? "#94a3b8") + "20",
                              color: ACTION_COLORS[log.action] ?? "#94a3b8",
                            }}
                          >
                            {log.action}
                          </span>
                          {log.entite && (
                            <span className="text-[10px] text-[--foreground-subtle]">
                              {log.entite}{log.entiteId ? ` · ${log.entiteId.slice(0, 8)}…` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[--foreground-subtle]">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.userEmail ?? "anonyme"}
                            {log.userRole && <span className="opacity-60">({log.userRole})</span>}
                          </span>
                          {log.ip && (
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Globe className="w-3 h-3" />
                              {log.ip}
                            </span>
                          )}
                        </div>

                        {expanded === log.id && log.details && (
                          <pre className="mt-2 p-2 bg-[--background] rounded text-[10px] font-mono overflow-x-auto text-[--foreground-subtle]">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
