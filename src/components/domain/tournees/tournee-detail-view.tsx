"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Route, Loader2, User, Truck, Save, ArrowUp, ArrowDown,
  Plus, X, FileText, Trash2, Calendar, Phone, MapPin, Check,
  PlayCircle, Flag, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Livraison = {
  id: string;
  ordre: number | null;
  statut: string;
  adresseLivraison: string;
  commandeId: string;
  commandeNumero: string | null;
  commandeTotalTTC: number | null;
  clientNom: string | null;
  clientTelephone?: string | null;
};

type Tournee = {
  id: string;
  date: string;
  chauffeurId: string | null;
  vehiculeId: string | null;
  statut: string;
  notes: string | null;
};

type Chauffeur = { id: string; name: string; email: string };
type Vehicule = { id: string; immatriculation: string; modele: string | null; capaciteKg?: number | null };

type LivraisonLibre = {
  id: string;
  adresseLivraison: string;
  statut: string;
  commandeId: string;
  commandeNumero: string | null;
  commandeTotalTTC: number | null;
  clientNom: string | null;
};

const STATUT_LIV_LABELS: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "#94a3b8" },
  preparee: { label: "Préparée", color: "#3b82f6" },
  chargee: { label: "Chargée", color: "#8b5cf6" },
  en_route: { label: "En route", color: "#f59e0b" },
  livree: { label: "Livrée", color: "#22c55e" },
  refusee: { label: "Refusée", color: "#ef4444" },
  echec: { label: "Échec", color: "#ef4444" },
};

export function TourneeDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tournee, setTournee] = useState<Tournee | null>(null);
  const [chauffeur, setChauffeur] = useState<Chauffeur | null>(null);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [ressources, setRessources] = useState<{ chauffeurs: Chauffeur[]; vehicules: Vehicule[]; livraisonsLibres: LivraisonLibre[] }>({
    chauffeurs: [],
    vehicules: [],
    livraisonsLibres: [],
  });

  // Form edit
  const [editChauffeur, setEditChauffeur] = useState("");
  const [editVehicule, setEditVehicule] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatut, setEditStatut] = useState("planifiee");

  const [addPickerOpen, setAddPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        fetch(`/api/tournees/${id}`).then((res) => res.json()),
        fetch("/api/tournees/ressources").then((res) => res.json()),
      ]);
      if (t.error) {
        toast.error(t.error);
        router.push("/tournees");
        return;
      }
      setTournee(t.tournee);
      setChauffeur(t.chauffeur);
      setVehicule(t.vehicule);
      setLivraisons(t.livraisons ?? []);
      setEditChauffeur(t.tournee?.chauffeurId ?? "");
      setEditVehicule(t.tournee?.vehiculeId ?? "");
      setEditNotes(t.tournee?.notes ?? "");
      setEditStatut(t.tournee?.statut ?? "planifiee");
      setRessources({
        chauffeurs: r.chauffeurs ?? [],
        vehicules: r.vehicules ?? [],
        livraisonsLibres: r.livraisonsLibres ?? [],
      });
    } catch {
      toast.error("Impossible de charger la tournée");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // ── Update tournée meta ─────────────────────────────────────────────────────
  const updateTournee = async (changes: Partial<{ chauffeurId: string | null; vehiculeId: string | null; statut: string; notes: string }>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tournees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) throw new Error();
      toast.success("Tournée mise à jour");
      await load();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = () => {
    updateTournee({
      chauffeurId: editChauffeur || null,
      vehiculeId: editVehicule || null,
      statut: editStatut,
      notes: editNotes,
    });
  };

  // ── Réordonner ──────────────────────────────────────────────────────────────
  const move = async (index: number, direction: -1 | 1) => {
    const newList = [...livraisons];
    const target = index + direction;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target]!, newList[index]!];
    setLivraisons(newList);
    await persistOrder(newList.map((l) => l.id));
  };

  const persistOrder = async (ids: string[]) => {
    try {
      await fetch(`/api/tournees/${id}/affecter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ livraisonIds: ids }),
      });
    } catch {
      toast.error("Erreur de réordonnancement");
    }
  };

  const removeLivraison = async (livId: string) => {
    const newIds = livraisons.filter((l) => l.id !== livId).map((l) => l.id);
    await persistOrder(newIds);
    await load();
    toast.success("Livraison détachée");
  };

  const addLivraisons = async (newIds: string[]) => {
    const ids = [...livraisons.map((l) => l.id), ...newIds];
    await persistOrder(ids);
    setAddPickerOpen(false);
    await load();
    toast.success(`${newIds.length} livraison(s) ajoutée(s)`);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const nbLivrees = livraisons.filter((l) => l.statut === "livree").length;
  const nbEchecs = livraisons.filter((l) => l.statut === "echec" || l.statut === "refusee").length;
  const totalValeur = livraisons.reduce((s, l) => s + (l.commandeTotalTTC ?? 0), 0);
  const progress = livraisons.length > 0
    ? Math.round(((nbLivrees + nbEchecs) / livraisons.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[--foreground-subtle] gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Chargement...</span>
      </div>
    );
  }

  if (!tournee) return null;

  const statutLabels: Record<string, string> = {
    planifiee: "Planifiée",
    en_cours: "En cours",
    terminee: "Terminée",
  };

  const statutIcons: Record<string, typeof Clock> = {
    planifiee: Calendar,
    en_cours: PlayCircle,
    terminee: Flag,
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0">
        <Link href="/tournees" className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Route className="w-5 h-5 text-[--primary] shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">
            Tournée du {new Date(tournee.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          </h1>
          <p className="text-[11px] text-[--foreground-subtle]">
            {livraisons.length} {livraisons.length <= 1 ? "livraison" : "livraisons"} · {formatMGA(totalValeur)}
          </p>
        </div>

        <a
          href={`/api/tournees/${id}/bordereau-chargement`}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 px-3 py-2 border border-[--border] text-sm rounded-lg hover:bg-[--muted] transition-colors"
          title="Bordereau de chargement (consolidé pour le magasinier)"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chargement</span>
        </a>
        <a
          href={`/api/tournees/${id}/feuille-route-pdf`}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 px-3 py-2 border border-[--border] text-sm rounded-lg hover:bg-[--muted] transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Feuille de route</span>
        </a>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-6xl mx-auto grid gap-4 lg:grid-cols-3">
          {/* ── Panneau infos ────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Statut */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[--foreground-subtle] mb-3">Statut</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(["planifiee", "en_cours", "terminee"] as const).map((s) => {
                  const Icon = statutIcons[s]!;
                  const active = editStatut === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setEditStatut(s)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        active ? "bg-[--primary]/10 border-[--primary]" : "border-[--border] hover:bg-[--muted]/30"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: active ? "#FF4D00" : "var(--foreground-subtle)" }} />
                      <span className="text-[10px] font-semibold">{statutLabels[s]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chauffeur */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[--foreground-subtle] mb-3">Chauffeur</h3>
              <select
                value={editChauffeur}
                onChange={(e) => setEditChauffeur(e.target.value)}
                className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
              >
                <option value="">— Non assigné —</option>
                {ressources.chauffeurs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {chauffeur && (
                <div className="mt-2 text-[11px] text-[--foreground-subtle] flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  {chauffeur.email}
                </div>
              )}
            </div>

            {/* Véhicule */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[--foreground-subtle] mb-3">Véhicule</h3>
              <select
                value={editVehicule}
                onChange={(e) => setEditVehicule(e.target.value)}
                className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
              >
                <option value="">— Non assigné —</option>
                {ressources.vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.modele ? `${v.modele} — ` : ""}{v.immatriculation}
                  </option>
                ))}
              </select>
              {vehicule?.capaciteKg && (
                <div className="mt-2 text-[11px] text-[--foreground-subtle] flex items-center gap-1.5">
                  <Truck className="w-3 h-3" />
                  Capacité : {vehicule.capaciteKg} kg
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-[--card] border border-[--border] rounded-xl p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[--foreground-subtle] mb-3">Notes</h3>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                placeholder="Observations, contraintes..."
                className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] resize-none"
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full py-2.5 bg-[--primary] text-white text-sm rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Enregistrer les modifications
            </button>

            {/* Progress */}
            {livraisons.length > 0 && (
              <div className="bg-[--card] border border-[--border] rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[--foreground-subtle]">Progression</h3>
                  <span className="text-lg font-bold">{progress}%</span>
                </div>
                <div className="h-2 bg-[--muted] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-[--primary] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <CheckCircle2 className="w-4 h-4 mx-auto text-green-500 mb-0.5" />
                    <div className="text-xs font-bold">{nbLivrees}</div>
                    <div className="text-[10px] text-[--foreground-subtle]">Livrées</div>
                  </div>
                  <div>
                    <AlertCircle className="w-4 h-4 mx-auto text-red-500 mb-0.5" />
                    <div className="text-xs font-bold">{nbEchecs}</div>
                    <div className="text-[10px] text-[--foreground-subtle]">Échecs</div>
                  </div>
                  <div>
                    <Clock className="w-4 h-4 mx-auto text-amber-500 mb-0.5" />
                    <div className="text-xs font-bold">{livraisons.length - nbLivrees - nbEchecs}</div>
                    <div className="text-[10px] text-[--foreground-subtle]">Restantes</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Liste livraisons ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-bold text-sm">Arrêts de la tournée</h3>
                <button
                  onClick={() => setAddPickerOpen(true)}
                  disabled={ressources.livraisonsLibres.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[--primary] text-white text-xs rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3 h-3" />
                  Affecter ({ressources.livraisonsLibres.length})
                </button>
              </div>

              {livraisons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[--foreground-subtle]">
                  <MapPin className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Aucune livraison affectée.</p>
                  <button
                    onClick={() => setAddPickerOpen(true)}
                    className="text-xs text-[--primary] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Affecter des livraisons
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {livraisons.map((l, i) => {
                    const statutInfo = STATUT_LIV_LABELS[l.statut] ?? STATUT_LIV_LABELS.en_attente!;
                    return (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border border-[--border] rounded-lg p-3 hover:bg-[--muted]/10 transition-colors flex items-start gap-3"
                      >
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: statutInfo.color }}
                          >
                            {i + 1}
                          </div>
                          <button
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="p-0.5 rounded hover:bg-[--muted] text-[--foreground-subtle] disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === livraisons.length - 1}
                            className="p-0.5 rounded hover:bg-[--muted] text-[--foreground-subtle] disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">{l.clientNom ?? "Client comptoir"}</span>
                            <span
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
                              style={{ backgroundColor: statutInfo.color + "20", color: statutInfo.color }}
                            >
                              {statutInfo.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-[--foreground-subtle] font-mono mb-1">
                            {l.commandeNumero ?? "—"}
                          </div>
                          <div className="text-xs flex items-start gap-1.5">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-[--foreground-subtle]" />
                            <span className="truncate">{l.adresseLivraison}</span>
                          </div>
                          {l.clientTelephone && (
                            <div className="text-xs flex items-center gap-1.5 mt-0.5">
                              <Phone className="w-3 h-3 text-[--foreground-subtle]" />
                              <span className="font-mono text-[--foreground-subtle]">{l.clientTelephone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-sm font-bold">{formatMGA(l.commandeTotalTTC ?? 0)}</span>
                          <button
                            onClick={() => removeLivraison(l.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-red-400"
                            title="Retirer de la tournée"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add picker ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {addPickerOpen && (
          <AddLivraisonsPicker
            disponibles={ressources.livraisonsLibres}
            onClose={() => setAddPickerOpen(false)}
            onAdd={addLivraisons}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Picker affectation ─────────────────────────────────────────────────────────
function AddLivraisonsPicker({
  disponibles,
  onClose,
  onAdd,
}: {
  disponibles: LivraisonLibre[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0">
          <Plus className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Affecter des livraisons</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {disponibles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[--foreground-subtle]">
              <AlertCircle className="w-8 h-8 opacity-30" />
              <p className="text-sm">Aucune livraison libre.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {disponibles.map((l) => {
                const isSel = selected.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggle(l.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSel ? "bg-[--primary]/10 border-[--primary]" : "border-[--border] hover:bg-[--muted]/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                          isSel ? "bg-[--primary] border-[--primary]" : "border-[--border]"
                        }`}
                      >
                        {isSel && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium truncate">{l.clientNom ?? "Client comptoir"}</span>
                          <span className="text-[10px] font-mono text-[--foreground-subtle]">
                            {l.commandeNumero ?? "—"}
                          </span>
                        </div>
                        <div className="text-xs text-[--foreground-subtle] flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="truncate">{l.adresseLivraison}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{formatMGA(l.commandeTotalTTC ?? 0)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[--border] shrink-0 flex items-center gap-3">
          <span className="text-xs text-[--foreground-subtle]">
            {selected.length} sélectionnée{selected.length > 1 ? "s" : ""}
          </span>
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">
            Annuler
          </button>
          <button
            onClick={() => onAdd(selected)}
            disabled={selected.length === 0}
            className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 hover:opacity-90"
          >
            Affecter
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}
