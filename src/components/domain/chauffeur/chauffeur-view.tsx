"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, MapPin, Phone, CheckCircle2, X, Camera,
  Loader2, Wifi, WifiOff, ChevronDown, ChevronUp,
  Clock, AlertTriangle, Receipt, Image as ImageIcon,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Livraison = {
  id: string;
  ordre: number;
  statut: string;
  adresse: string;
  clientNom: string;
  clientTel: string | null;
  commandeNumero: string | null;
  totalTTC: number;
  livraisonAt: string | null;
};

type Tournee = {
  id: string;
  date: string;
  statut: string;
  notes: string | null;
};

function StatutBadge({ statut }: { statut: string }) {
  const meta = {
    en_attente: { label: "En attente", color: "#94a3b8" },
    preparee: { label: "Préparée", color: "#3b82f6" },
    chargee: { label: "Chargée", color: "#a855f7" },
    en_route: { label: "En route", color: "#f59e0b" },
    livree: { label: "Livrée ✓", color: "#22c55e" },
    refusee: { label: "Refusée", color: "#ef4444" },
    echec: { label: "Échec", color: "#dc2626" },
  }[statut] ?? { label: statut, color: "#94a3b8" };
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase" style={{ backgroundColor: meta.color + "20", color: meta.color }}>
      {meta.label}
    </span>
  );
}

function ActionDialog({ livraison, onClose, onSaved }: { livraison: Livraison; onClose: () => void; onSaved: () => void }) {
  const [statut, setStatut] = useState<"livree" | "refusee" | "echec">("livree");
  const [motif, setMotif] = useState("");
  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoB64(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (statut !== "livree" && !motif.trim()) {
      return toast.error("Motif requis");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/chauffeur", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          livraisonId: livraison.id,
          statut,
          motif: motif.trim() || undefined,
          photoPreuve: photoB64 ?? undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Livraison mise à jour");
      onSaved();
    } catch {
      toast.error("Erreur — sera synchronisée plus tard");
      // TODO: queue Dexie pour offline
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="relative bg-[--card] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="px-5 py-4 border-b border-[--border] flex items-center gap-3">
          <Truck className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">{livraison.clientNom}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-2 block font-medium">Résultat de la livraison</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setStatut("livree")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${statut === "livree" ? "border-green-500 bg-green-500/10" : "border-[--border] hover:bg-[--muted]/40"}`}
              >
                <CheckCircle2 className={`w-6 h-6 ${statut === "livree" ? "text-green-500" : "text-[--foreground-subtle]"}`} />
                <span className="text-xs font-semibold">Livrée</span>
              </button>
              <button
                onClick={() => setStatut("refusee")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${statut === "refusee" ? "border-amber-500 bg-amber-500/10" : "border-[--border] hover:bg-[--muted]/40"}`}
              >
                <AlertTriangle className={`w-6 h-6 ${statut === "refusee" ? "text-amber-500" : "text-[--foreground-subtle]"}`} />
                <span className="text-xs font-semibold">Refusée</span>
              </button>
              <button
                onClick={() => setStatut("echec")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${statut === "echec" ? "border-red-500 bg-red-500/10" : "border-[--border] hover:bg-[--muted]/40"}`}
              >
                <X className={`w-6 h-6 ${statut === "echec" ? "text-red-500" : "text-[--foreground-subtle]"}`} />
                <span className="text-xs font-semibold">Échec</span>
              </button>
            </div>
          </div>

          {statut !== "livree" && (
            <div>
              <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Motif *</label>
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={3}
                placeholder="Ex: Client absent, adresse introuvable..."
                className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] resize-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Photo preuve (optionnel)</label>
            <div className="border-2 border-dashed border-[--border] rounded-xl p-4 text-center">
              {photoB64 ? (
                <div className="relative">
                  <img src={photoB64} alt="preuve" className="max-h-40 mx-auto rounded-lg" />
                  <button onClick={() => setPhotoB64(null)} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                  <Camera className="w-8 h-8 mx-auto text-[--foreground-subtle] mb-2" />
                  <div className="text-xs text-[--foreground-subtle]">Prendre une photo</div>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[--border]">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3.5 text-base rounded-xl bg-[--primary] text-white font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ChauffeurView() {
  const [tournee, setTournee] = useState<Tournee | null>(null);
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<Livraison | null>(null);
  const [online, setOnline] = useState(typeof window !== "undefined" ? window.navigator.onLine : true);

  useEffect(() => {
    const onChange = () => setOnline(navigator.onLine);
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/chauffeur");
      const d = await r.json();
      setTournee(d.tournee ?? null);
      setLivraisons(d.livraisons ?? []);
    } catch {
      toast.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enAttente = livraisons.filter((l) => !["livree", "refusee", "echec"].includes(l.statut));
  const terminees = livraisons.filter((l) => ["livree", "refusee", "echec"].includes(l.statut));

  return (
    <div className="flex flex-col min-h-screen bg-[--background]">
      <div className="sticky top-0 z-30 bg-[--card] border-b border-[--border] px-4 py-3 flex items-center gap-3">
        <Truck className="w-5 h-5 text-[--primary]" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Ma tournée</div>
          <div className="text-[11px] text-[--foreground-subtle]">{tournee ? new Date(tournee.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" }) : "—"}</div>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${online ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? "En ligne" : "Hors-ligne"}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {loading ? (
          <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <>
            {/* Résumé */}
            <div className="bg-[--card] border border-[--border] rounded-2xl p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xl font-bold">{livraisons.length}</div>
                  <div className="text-[11px] text-[--foreground-subtle]">arrêts</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-amber-500">{enAttente.length}</div>
                  <div className="text-[11px] text-[--foreground-subtle]">à livrer</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-500">{terminees.length}</div>
                  <div className="text-[11px] text-[--foreground-subtle]">terminés</div>
                </div>
              </div>
            </div>

            {/* En attente */}
            {enAttente.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold text-[--foreground-subtle] uppercase tracking-wider px-1">À livrer ({enAttente.length})</div>
                {enAttente.map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-[--card] border border-[--border] rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                      className="w-full p-4 flex items-center gap-3 text-left hover:bg-[--muted]/20"
                    >
                      <div className="w-12 h-12 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center font-bold text-base shrink-0">{l.ordre}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{l.clientNom}</div>
                        <div className="text-xs text-[--foreground-subtle] truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.adresse}</div>
                        <div className="mt-1"><StatutBadge statut={l.statut} /></div>
                      </div>
                      {expanded === l.id ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {expanded === l.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 flex flex-col gap-3">
                            <div className="text-xs text-[--foreground-subtle] flex items-center gap-2">
                              <Receipt className="w-3 h-3" /> {l.commandeNumero} · {formatMGA(l.totalTTC)}
                            </div>
                            {l.clientTel && (
                              <a href={`tel:${l.clientTel}`} className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-xl text-sm font-semibold">
                                <Phone className="w-4 h-4" /> Appeler {l.clientTel}
                              </a>
                            )}
                            <button
                              onClick={() => setActionFor(l)}
                              className="py-3 rounded-xl bg-[--primary] text-white font-bold text-sm flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Marquer livré / refus
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Terminés */}
            {terminees.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-[--foreground-subtle] uppercase tracking-wider px-1 mt-4">Terminés ({terminees.length})</div>
                {terminees.map((l) => (
                  <div key={l.id} className="bg-[--card] border border-[--border] rounded-xl p-3 flex items-center gap-3 opacity-70">
                    <div className="w-8 h-8 rounded-full bg-[--muted] text-[--foreground-subtle] flex items-center justify-center font-bold text-xs">{l.ordre}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.clientNom}</div>
                      <div className="text-[10px] text-[--foreground-subtle] flex items-center gap-1">
                        {l.livraisonAt && <Clock className="w-3 h-3" />}
                        {l.livraisonAt ? new Date(l.livraisonAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </div>
                    <StatutBadge statut={l.statut} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {actionFor && (
          <ActionDialog
            livraison={actionFor}
            onClose={() => setActionFor(null)}
            onSaved={() => { setActionFor(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
