"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Plus, Loader2, X, Truck, User, Calendar,
  ChevronUp, ChevronDown, Printer, Trash2,
  CheckCircle2, Clock, PlayCircle, Route, MapPin,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

const STATUTS = [
  { value: "planifiee", label: "Planifiée", color: "#94a3b8", icon: Clock },
  { value: "en_cours", label: "En cours", color: "#3b82f6", icon: PlayCircle },
  { value: "terminee", label: "Terminée", color: "#22c55e", icon: CheckCircle2 },
] as const;

const DEFAULT_STATUT = STATUTS[0];

function getStatutMeta(s: string) {
  return STATUTS.find((x) => x.value === s) ?? DEFAULT_STATUT;
}

type Tournee = {
  id: string;
  date: string;
  statut: string;
  chauffeurId: string | null;
  chauffeurNom: string | null;
  immatriculation: string | null;
  notes: string | null;
  nbLivraisons: number;
};

type LivraisonTournee = {
  id: string;
  ordre: number;
  adresseLivraison: string;
  statut: string;
  commandeNumero: string | null;
  clientNom: string;
  clientTel: string | null;
  totalTTC: number;
};

type Detail = {
  tournee: Tournee;
  livraisons: LivraisonTournee[];
  libres: { id: string; adresse: string; commandeNumero: string | null; clientNom: string; totalTTC: number }[];
};

function CreateDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [chauffeurNom, setChauffeurNom] = useState("");
  const [immat, setImmat] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tournees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          notes: [chauffeurNom && `Chauffeur: ${chauffeurNom}`, immat && `Véhicule: ${immat}`, notes].filter(Boolean).join(" · ") || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tournée créée");
      onSaved();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0">
          <Route className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Nouvelle tournée</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]" />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Chauffeur</label>
            <input value={chauffeurNom} onChange={(e) => setChauffeurNom(e.target.value)} placeholder="Ex: Rakoto Jean" className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]" />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Immatriculation véhicule</label>
            <input value={immat} onChange={(e) => setImmat(e.target.value)} placeholder="Ex: TAA-123-A" className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]" />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] resize-none" />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-[--border]">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Créer
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function TourneeDetail({ tourneeId, onClose, onChanged }: { tourneeId: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tournees/${tourneeId}`);
      const d = await r.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [tourneeId]);

  useEffect(() => { load(); }, [load]);

  const move = (idx: number, dir: -1 | 1) => {
    if (!data) return;
    const arr = [...data.livraisons];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target]!, arr[idx]!];
    setData({ ...data, livraisons: arr });
    saveOrder(arr.map((l) => l.id));
  };

  const saveOrder = async (order: string[]) => {
    try {
      await fetch(`/api/tournees/${tourneeId}/livraisons`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
    } catch {}
  };

  const affecter = async (livraisonId: string) => {
    try {
      await fetch(`/api/tournees/${tourneeId}/livraisons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ livraisonId }),
      });
      toast.success("Livraison ajoutée");
      load();
      onChanged();
    } catch {
      toast.error("Erreur");
    }
  };

  const detacher = async (livraisonId: string) => {
    try {
      await fetch(`/api/tournees/${tourneeId}/livraisons?livraisonId=${livraisonId}`, { method: "DELETE" });
      load();
      onChanged();
    } catch {}
  };

  const changerStatut = async (statut: string) => {
    try {
      await fetch(`/api/tournees/${tourneeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      toast.success(`Tournée : ${statut}`);
      load();
      onChanged();
    } catch {}
  };

  return (
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-3xl bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0 flex-wrap gap-y-2">
          <Route className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Détail tournée</h2>
          {data && (
            <>
              <button onClick={() => window.open(`/api/tournees/${tourneeId}/feuille-route`, "_blank")} className="px-2.5 py-1.5 text-xs rounded-lg border border-[--border] hover:bg-[--muted] flex items-center gap-1">
                <Printer className="w-3 h-3" /> Feuille route
              </button>
              {data.tournee.statut === "planifiee" && (
                <button onClick={() => changerStatut("en_cours")} className="px-2.5 py-1.5 text-xs rounded-lg bg-blue-500 text-white hover:opacity-90 flex items-center gap-1">
                  <PlayCircle className="w-3 h-3" /> Démarrer
                </button>
              )}
              {data.tournee.statut === "en_cours" && (
                <button onClick={() => changerStatut("terminee")} className="px-2.5 py-1.5 text-xs rounded-lg bg-green-500 text-white hover:opacity-90 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Terminer
                </button>
              )}
            </>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {loading || !data ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[--foreground-subtle]" /></div>
          ) : (
            <>
              <div className="bg-[--muted]/30 rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div><div className="text-[--foreground-subtle] text-[11px]">Date</div><div className="font-semibold mt-0.5">{new Date(data.tournee.date).toLocaleDateString("fr-FR")}</div></div>
                  <div><div className="text-[--foreground-subtle] text-[11px]">Statut</div><div className="font-semibold mt-0.5 capitalize">{data.tournee.statut.replace("_", " ")}</div></div>
                  <div><div className="text-[--foreground-subtle] text-[11px]">Arrêts</div><div className="font-semibold mt-0.5">{data.livraisons.length}</div></div>
                  {data.tournee.notes && <div className="col-span-full"><div className="text-[--foreground-subtle] text-[11px]">Notes</div><div className="mt-0.5">{data.tournee.notes}</div></div>}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[--foreground-subtle] mb-2 uppercase tracking-wider">Arrêts de la tournée</h3>
                {data.livraisons.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[--foreground-subtle]">Aucun arrêt — ajoute des livraisons ci-dessous</div>
                ) : (
                  <div className="border border-[--border] rounded-lg divide-y divide-[--border]">
                    {data.livraisons.map((l, i) => (
                      <div key={l.id} className="p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{l.clientNom}</div>
                          <div className="text-[11px] text-[--foreground-subtle] truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {l.adresseLivraison}
                          </div>
                        </div>
                        <div className="text-xs font-semibold whitespace-nowrap">{formatMGA(l.totalTTC)}</div>
                        <div className="flex flex-col">
                          <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-30 hover:text-[--primary]"><ChevronUp className="w-3.5 h-3.5" /></button>
                          <button onClick={() => move(i, 1)} disabled={i === data.livraisons.length - 1} className="p-0.5 disabled:opacity-30 hover:text-[--primary]"><ChevronDown className="w-3.5 h-3.5" /></button>
                        </div>
                        <button onClick={() => detacher(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[--foreground-subtle] mb-2 uppercase tracking-wider">Livraisons libres ({data.libres.length})</h3>
                {data.libres.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[--foreground-subtle]">Aucune livraison à affecter</div>
                ) : (
                  <div className="border border-[--border] rounded-lg divide-y divide-[--border] max-h-[40vh] overflow-y-auto">
                    {data.libres.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => affecter(l.id)}
                        className="w-full p-3 text-left hover:bg-[--muted]/40 flex items-center gap-3"
                      >
                        <Plus className="w-4 h-4 text-[--primary] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{l.clientNom}</div>
                          <div className="text-[11px] text-[--foreground-subtle] truncate">{l.adresse}</div>
                        </div>
                        <div className="text-xs font-semibold whitespace-nowrap">{formatMGA(l.totalTTC)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

export function TourneesView() {
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/tournees");
      const d = await r.json();
      setTournees(d.tournees ?? []);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette tournée ?")) return;
    try {
      await fetch(`/api/tournees/${id}`, { method: "DELETE" });
      toast.success("Tournée supprimée");
      load();
    } catch {}
  };

  const kpis = useMemo(() => ({
    total: tournees.length,
    actives: tournees.filter((t) => t.statut === "en_cours" || t.statut === "planifiee").length,
    arrets: tournees.reduce((s, t) => s + (t.nbLivraisons ?? 0), 0),
  }), [tournees]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <Route className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Tournées logistiques</h1>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Nouvelle tournée
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="text-xs text-[--foreground-subtle]">Total tournées</div>
              <div className="text-lg font-bold">{kpis.total}</div>
            </div>
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="text-xs text-[--foreground-subtle]">Actives / planifiées</div>
              <div className="text-lg font-bold text-blue-500">{kpis.actives}</div>
            </div>
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="text-xs text-[--foreground-subtle]">Total arrêts</div>
              <div className="text-lg font-bold text-[--primary]">{kpis.arrets}</div>
            </div>
          </div>

          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]"><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</div>
            ) : tournees.length === 0 ? (
              <div className="py-16 text-center text-[--foreground-subtle] text-sm">
                <Map className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucune tournée
              </div>
            ) : (
              <div className="divide-y divide-[--border]">
                {tournees.map((t, i) => {
                  const sMeta = getStatutMeta(t.statut);
                  const SIcon = sMeta.icon;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 hover:bg-[--muted]/20 flex items-center gap-4"
                    >
                      <button
                        onClick={() => setSelected(t.id)}
                        className="flex-1 flex items-center gap-4 text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[--primary]/10 text-[--primary] flex items-center justify-center"><Calendar className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{new Date(t.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}</div>
                          <div className="text-[11px] text-[--foreground-subtle] flex items-center gap-2 mt-0.5">
                            {t.chauffeurNom && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t.chauffeurNom}</span>}
                            {t.immatriculation && <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {t.immatriculation}</span>}
                            <span>{t.nbLivraisons ?? 0} arrêt{(t.nbLivraisons ?? 0) > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1" style={{ backgroundColor: sMeta.color + "20", color: sMeta.color }}>
                          <SIcon className="w-3 h-3" /> {sMeta.label}
                        </span>
                      </button>
                      <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {createOpen && <CreateDrawer onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); }} />}
        {selected && <TourneeDetail tourneeId={selected} onClose={() => setSelected(null)} onChanged={load} />}
      </AnimatePresence>
    </div>
  );
}
