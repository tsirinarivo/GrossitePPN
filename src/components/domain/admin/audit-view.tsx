"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ScrollText, Search, Download, Loader2, Filter,
  User, Globe, Clock, FileWarning, FileDown, Trash2, X, Check,
  AlertTriangle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  userId: string | null;
  userNom: string | null;
  userRole: string | null;
  action: string;
  entite: string;
  entiteId: string | null;
  description: string;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Facets {
  actions: { value: string; count: number }[];
  entites: { value: string; count: number }[];
  users: { id: string; nom: string }[];
}

interface ClientLite {
  id: string;
  code: string;
  raisonSociale: string;
  email: string | null;
  telephone: string | null;
  actif: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "outline" | "web"> = {
  creation: "success",
  modification: "web",
  suppression: "destructive",
  annulation: "destructive",
  remise: "warning",
  export: "outline",
  acces: "outline",
  anonymisation: "warning",
  connexion: "outline",
};

const ACTION_LABEL: Record<string, string> = {
  creation: "Création",
  modification: "Modification",
  suppression: "Suppression",
  annulation: "Annulation",
  remise: "Remise",
  export: "Export",
  acces: "Accès",
  anonymisation: "Anonymisation",
  connexion: "Connexion",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function parseMeta(metadata: string | null): [string, string][] {
  if (!metadata) return [];
  try {
    const obj = JSON.parse(metadata) as Record<string, unknown>;
    return Object.entries(obj).map(([k, v]) => [k, String(v)]);
  } catch {
    return [];
  }
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[--foreground-muted] mb-0.5">{label}</p>
        <p className="text-lg font-bold text-[--foreground]">{value}</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = "journal" | "rgpd";

export function AuditView() {
  const [tab, setTab] = useState<Tab>("journal");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Audit &amp; conformité</h1>
          <p className="text-[--foreground-muted] mt-1">Traçabilité des actions et gestion des données personnelles (RGPD)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[--border]">
        {([
          { id: "journal", label: "Journal d'audit", icon: ScrollText },
          { id: "rgpd", label: "RGPD — données client", icon: ShieldCheck },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === t.id
                ? "border-[--primary] text-[--primary]"
                : "border-transparent text-[--foreground-muted] hover:text-[--foreground]"
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "journal" ? <JournalTab /> : <RgpdTab />}
    </div>
  );
}

// ── Journal Tab ────────────────────────────────────────────────────────────────

function JournalTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [facets, setFacets] = useState<Facets>({ actions: [], entites: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entite, setEntite] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (action) params.set("action", action);
      if (entite) params.set("entite", entite);
      if (userId) params.set("userId", userId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setFacets(data.facets ?? { actions: [], entites: [], users: [] });
        setIsDemo(!!data.demo);
      }
    } finally {
      setLoading(false);
    }
  }, [q, action, entite, userId, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (action) params.set("action", action);
    if (entite) params.set("entite", entite);
    if (userId) params.set("userId", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/admin/audit/export?${params.toString()}`, "_blank");
    toast.success("Export CSV lancé");
  }

  function resetFilters() {
    setQ(""); setAction(""); setEntite(""); setUserId(""); setFrom(""); setTo("");
  }

  const hasFilters = q || action || entite || userId || from || to;

  // KPIs
  const today = new Date().toDateString();
  const nbAujourdhui = entries.filter((e) => new Date(e.createdAt).toDateString() === today).length;
  const nbSensibles = entries.filter((e) =>
    ["suppression", "annulation", "anonymisation", "remise"].includes(e.action)
  ).length;
  const nbActeurs = new Set(entries.map((e) => e.userId)).size;

  const selectCls = cn(
    "h-10 px-3 text-sm rounded-lg border border-[--border]",
    "bg-[--background] text-[--foreground]",
    "focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
  );

  return (
    <div className="space-y-5">
      {isDemo && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Données de démonstration — le journal réel se remplira au fil des actions des utilisateurs.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Entrées affichées" value={entries.length} icon={ScrollText} color="#FF4D00" />
        <KpiCard label="Aujourd'hui" value={nbAujourdhui} icon={Clock} color="#3B82F6" />
        <KpiCard label="Actions sensibles" value={nbSensibles} icon={FileWarning} color="#EF4444" />
        <KpiCard label="Utilisateurs actifs" value={nbActeurs} icon={User} color="#22C55E" />
      </div>

      {/* Filtres */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[--foreground]">
          <Filter className="w-4 h-4 text-[--foreground-muted]" /> Filtres
          {hasFilters && (
            <button onClick={resetFilters} className="ml-auto text-xs text-[--foreground-muted] hover:text-[--foreground] inline-flex items-center gap-1">
              <X className="w-3 h-3" /> Réinitialiser
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-muted]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans la description…" className="pl-9" />
          </div>
          <select value={action} onChange={(e) => setAction(e.target.value)} className={selectCls}>
            <option value="">Toutes les actions</option>
            {facets.actions.map((a) => (
              <option key={a.value} value={a.value}>{ACTION_LABEL[a.value] ?? a.value} ({a.count})</option>
            ))}
          </select>
          <select value={entite} onChange={(e) => setEntite(e.target.value)} className={selectCls}>
            <option value="">Toutes les entités</option>
            {facets.entites.map((en) => (
              <option key={en.value} value={en.value}>{en.value} ({en.count})</option>
            ))}
          </select>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={selectCls}>
            <option value="">Tous les utilisateurs</option>
            {facets.users.map((u) => (
              <option key={u.id} value={u.id}>{u.nom}</option>
            ))}
          </select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Du" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Au" />
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4" /> Exporter CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText className="w-10 h-10 opacity-20 mx-auto mb-3 text-[--foreground-muted]" />
            <p className="text-sm text-[--foreground-muted]">Aucune entrée ne correspond aux filtres</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[--accent]/50 border-b border-[--border]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Horodatage</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Entité</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {entries.map((e, i) => {
                  const meta = parseMeta(e.metadata);
                  const isOpen = expanded === e.id;
                  return (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.2 }}
                      className={cn("hover:bg-[--accent]/30", meta.length > 0 && "cursor-pointer")}
                      onClick={() => meta.length > 0 && setExpanded(isOpen ? null : e.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[--foreground-muted]">{formatDateTime(e.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[--foreground]">{e.userNom ?? "—"}</div>
                        {e.userRole && <div className="text-[11px] text-[--foreground-muted] capitalize">{e.userRole}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ACTION_VARIANT[e.action] ?? "outline"}>{ACTION_LABEL[e.action] ?? e.action}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-[--accent] border border-[--border] px-2 py-0.5 rounded capitalize">{e.entite}</span>
                      </td>
                      <td className="px-4 py-3 text-[--foreground] max-w-md">
                        {e.description}
                        {isOpen && meta.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {meta.map(([k, v]) => (
                              <span key={k} className="text-[11px] bg-[--background] border border-[--border] rounded px-1.5 py-0.5 text-[--foreground-muted]">
                                <span className="text-[--foreground-subtle]">{k}:</span> {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[--foreground-muted]">{e.ipAddress ?? "—"}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RGPD Tab ───────────────────────────────────────────────────────────────────

function RgpdTab() {
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportClient(c: ClientLite) {
    window.open(`/api/admin/rgpd/client/${c.id}`, "_blank");
    toast.success(`Export des données de ${c.raisonSociale}`);
  }

  async function anonymize(c: ClientLite) {
    setWorking(c.id);
    try {
      const res = await fetch(`/api/admin/rgpd/client/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (res.ok) {
        toast.success(`${c.raisonSociale} anonymisé`);
        setConfirmId(null);
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Erreur lors de l'anonymisation");
      }
    } finally {
      setWorking(null);
    }
  }

  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.raisonSociale.toLowerCase().includes(s) ||
      c.code.toLowerCase().includes(s) ||
      (c.email ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[--border] bg-[--card] p-4 flex gap-3 items-start">
        <ShieldCheck className="w-5 h-5 text-[--primary] shrink-0 mt-0.5" />
        <div className="text-sm text-[--foreground-muted]">
          <p className="text-[--foreground] font-medium mb-0.5">Droits des personnes concernées</p>
          <p>
            <strong className="text-[--foreground]">Exporter</strong> fournit l'ensemble des données détenues sur un client
            (droit d'accès &amp; portabilité). <strong className="text-[--foreground]">Anonymiser</strong> efface
            définitivement les données personnelles (droit à l'effacement) tout en conservant l'historique comptable obligatoire.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-muted]" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client…" className="pl-9" />
      </div>

      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[--foreground-muted]">
            <User className="w-10 h-10 opacity-20 mx-auto mb-3" />
            <p className="text-sm">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="flex items-center gap-3 p-3.5 hover:bg-[--accent]/30"
                >
                  <div className="w-9 h-9 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0 font-bold text-xs text-[--primary]">
                    {c.raisonSociale.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[--foreground] truncate">{c.raisonSociale}</span>
                      <span className="font-mono text-[11px] text-[--foreground-muted]">{c.code}</span>
                      {!c.actif && <Badge variant="outline" className="text-[10px]">Inactif</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[--foreground-muted] mt-0.5">
                      {c.email && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{c.email}</span>}
                      {c.telephone && <span className="font-mono">{c.telephone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {confirmId === c.id ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-400">Confirmer ?</span>
                        <Button variant="destructive" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => anonymize(c)} loading={working === c.id}>
                          <Check className="w-3.5 h-3.5" /> Oui
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setConfirmId(null)}>
                          Non
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportClient(c)}>
                          <FileDown className="w-3.5 h-3.5" /> Exporter
                        </Button>
                        <Button variant="ghost" size="sm"
                          className="h-8 text-xs text-[--foreground-muted] hover:text-red-400"
                          onClick={() => setConfirmId(c.id)}
                          disabled={c.raisonSociale.startsWith("Client anonymisé")}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Anonymiser
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
