"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Route, Plus, Loader2, Calendar, User, Truck, MapPin,
  ChevronRight, Clock, CheckCircle2, AlertCircle, X, Save,
  PlayCircle, Flag, ListChecks,
} from "lucide-react";
import { toast } from "sonner";

type Tournee = {
  id: string;
  date: string;
  chauffeurId: string | null;
  chauffeurName: string | null;
  vehiculeId: string | null;
  vehiculeImmat: string | null;
  vehiculeModele: string | null;
  statut: string;
  notes: string | null;
  nbLivraisons: number;
  nbLivrees: number;
  nbEchecs: number;
};

type Ressource = {
  chauffeurs: { id: string; name: string; email: string }[];
  vehicules: { id: string; immatriculation: string; modele: string | null; capaciteKg: number | null }[];
};

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  planifiee: { label: "Planifiée", color: "#3b82f6", bg: "#3b82f620", icon: Calendar },
  en_cours: { label: "En cours", color: "#f59e0b", bg: "#f59e0b20", icon: PlayCircle },
  terminee: { label: "Terminée", color: "#22c55e", bg: "#22c55e20", icon: Flag },
};

const DEMO: Tournee[] = [
  {
    id: "demo-1",
    date: new Date(Date.now() + 86400000).toISOString(),
    chauffeurId: null,
    chauffeurName: "Rakoto Jean",
    vehiculeId: null,
    vehiculeImmat: "TAN-3245-AA",
    vehiculeModele: "Mitsubishi Canter",
    statut: "planifiee",
    notes: "Route Tana-nord",
    nbLivraisons: 7,
    nbLivrees: 0,
    nbEchecs: 0,
  },
  {
    id: "demo-2",
    date: new Date().toISOString(),
    chauffeurId: null,
    chauffeurName: "Rasoa Anita",
    vehiculeId: null,
    vehiculeImmat: "TAN-1820-BB",
    vehiculeModele: "Toyota Hiace",
    statut: "en_cours",
    notes: null,
    nbLivraisons: 5,
    nbLivrees: 3,
    nbEchecs: 0,
  },
  {
    id: "demo-3",
    date: new Date(Date.now() - 86400000).toISOString(),
    chauffeurId: null,
    chauffeurName: "Hery Mamy",
    vehiculeId: null,
    vehiculeImmat: "TAN-5512-CC",
    vehiculeModele: "Isuzu Elf",
    statut: "terminee",
    notes: "Route périphérique sud",
    nbLivraisons: 9,
    nbLivrees: 8,
    nbEchecs: 1,
  },
];

// ── Drawer Création ────────────────────────────────────────────────────────────
function CreateTourneeDrawer({
  ressources,
  onClose,
  onSaved,
}: {
  ressources: Ressource;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [chauffeurId, setChauffeurId] = useState("");
  const [vehiculeId, setVehiculeId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) {
      toast.error("Date requise");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tournees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          chauffeurId: chauffeurId || undefined,
          vehiculeId: vehiculeId || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tournée créée");
      onSaved();
    } catch {
      toast.error("Erreur lors de la création");
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0">
          <Route className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Nouvelle tournée</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Chauffeur</label>
            <select
              value={chauffeurId}
              onChange={(e) => setChauffeurId(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
            >
              <option value="">— Non assigné —</option>
              {ressources.chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {ressources.chauffeurs.length === 0 && (
              <p className="text-[10px] text-[--foreground-subtle] mt-1">
                Aucun chauffeur enregistré. Créez un utilisateur avec le rôle &quot;chauffeur&quot;.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Véhicule</label>
            <select
              value={vehiculeId}
              onChange={(e) => setVehiculeId(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
            >
              <option value="">— Non assigné —</option>
              {ressources.vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.modele ? `${v.modele} — ` : ""}{v.immatriculation}
                  {v.capaciteKg ? ` (${v.capaciteKg} kg)` : ""}
                </option>
              ))}
            </select>
            {ressources.vehicules.length === 0 && (
              <p className="text-[10px] text-[--foreground-subtle] mt-1">
                Aucun véhicule enregistré.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">
              Notes <span className="font-normal opacity-60">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Itinéraire prévu, contraintes..."
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[--border] shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Créer
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────
export function TourneesView() {
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [ressources, setRessources] = useState<Ressource>({ chauffeurs: [], vehicules: [] });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        fetch("/api/tournees").then((res) => res.json()),
        fetch("/api/tournees/ressources").then((res) => res.json()),
      ]);
      const items: Tournee[] = t.tournees ?? [];
      setRessources({ chauffeurs: r.chauffeurs ?? [], vehicules: r.vehicules ?? [] });
      if (items.length === 0) {
        setTournees(DEMO);
        setUsingDemo(true);
      } else {
        setTournees(items);
        setUsingDemo(false);
      }
    } catch {
      setTournees(DEMO);
      setUsingDemo(true);
      toast.error("Impossible de charger les tournées");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tournees.filter((t) => !filtreStatut || t.statut === filtreStatut);

  // Grouper par date
  const grouped: Record<string, Tournee[]> = {};
  for (const t of filtered) {
    const d = new Date(t.date).toISOString().slice(0, 10);
    grouped[d] = grouped[d] ?? [];
    grouped[d].push(t);
  }
  const datesSorted = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <Route className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Tournées logistiques</h1>

        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] focus:outline-none focus:border-[--primary]"
        >
          <option value="">Tous statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
        </select>

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle tournée
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-4">
          {usingDemo && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs rounded-lg px-4 py-2.5">
              Aucune tournée en base — affichage de données de démonstration.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-[--card] border border-[--border] rounded-xl flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
              <Route className="w-8 h-8 opacity-30" />
              <p className="text-sm">Aucune tournée pour ces filtres.</p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-xs text-[--primary] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Créer une tournée
              </button>
            </div>
          ) : (
            datesSorted.map((date) => (
              <div key={date}>
                <div className="text-xs font-semibold text-[--foreground-subtle] mb-2 uppercase tracking-wider">
                  {new Date(date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {grouped[date]!.map((t, i) => {
                    const conf = STATUT_CONFIG[t.statut] ?? STATUT_CONFIG.planifiee!;
                    const StatutIcon = conf.icon;
                    const progress = t.nbLivraisons > 0
                      ? Math.round(((t.nbLivrees + t.nbEchecs) / t.nbLivraisons) * 100)
                      : 0;

                    const cardClass = usingDemo
                      ? "block bg-[--card] border border-[--border] rounded-xl p-4 opacity-90"
                      : "block bg-[--card] border border-[--border] rounded-xl p-4 hover:border-[--primary] transition-colors cursor-pointer group";

                    const cardContent = (
                        <>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg" style={{ backgroundColor: conf.bg }}>
                                <StatutIcon className="w-3.5 h-3.5" style={{ color: conf.color }} />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: conf.color }}>
                                {conf.label}
                              </span>
                            </div>
                            {!usingDemo && (
                              <ChevronRight className="w-4 h-4 text-[--foreground-subtle] group-hover:text-[--primary] transition-colors" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 mb-1.5">
                            <User className="w-3.5 h-3.5 text-[--foreground-subtle]" />
                            <span className="text-sm font-medium truncate">{t.chauffeurName ?? "Non assigné"}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Truck className="w-3.5 h-3.5 text-[--foreground-subtle]" />
                            <span className="text-xs text-[--foreground-subtle] truncate">
                              {t.vehiculeImmat
                                ? `${t.vehiculeModele ? t.vehiculeModele + " — " : ""}${t.vehiculeImmat}`
                                : "Pas de véhicule"}
                            </span>
                          </div>

                          {/* Progression */}
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3 h-3 text-[--foreground-subtle]" />
                            <span className="text-xs text-[--foreground-subtle] flex-1">
                              {t.nbLivraisons} {t.nbLivraisons <= 1 ? "livraison" : "livraisons"}
                            </span>
                            {t.nbLivraisons > 0 && (
                              <span className="text-[10px] font-semibold" style={{ color: conf.color }}>
                                {progress}%
                              </span>
                            )}
                          </div>

                          {t.nbLivraisons > 0 && (
                            <div className="h-1.5 bg-[--muted] rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all duration-500"
                                style={{ width: `${progress}%`, backgroundColor: conf.color }}
                              />
                            </div>
                          )}

                          {(t.nbLivrees > 0 || t.nbEchecs > 0) && (
                            <div className="flex items-center gap-3 mt-2 text-[10px]">
                              {t.nbLivrees > 0 && (
                                <span className="flex items-center gap-1 text-green-500">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {t.nbLivrees} livrées
                                </span>
                              )}
                              {t.nbEchecs > 0 && (
                                <span className="flex items-center gap-1 text-red-500">
                                  <AlertCircle className="w-3 h-3" />
                                  {t.nbEchecs} échecs
                                </span>
                              )}
                            </div>
                          )}

                          {t.notes && (
                            <div className="mt-2 pt-2 border-t border-[--border] text-[11px] text-[--foreground-subtle] line-clamp-2">
                              {t.notes}
                            </div>
                          )}
                        </>
                    );

                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        {usingDemo ? (
                          <div className={cardClass}>{cardContent}</div>
                        ) : (
                          <Link href={`/tournees/${t.id}`} className={cardClass}>
                            {cardContent}
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <CreateTourneeDrawer
            ressources={ressources}
            onClose={() => setDrawerOpen(false)}
            onSaved={() => {
              setDrawerOpen(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
