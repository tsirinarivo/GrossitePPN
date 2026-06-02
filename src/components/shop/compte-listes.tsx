"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListChecks, Plus, Loader2, X, Trash2,
  ShoppingCart, Repeat, Package, Calendar, Eye,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";
import { useShopCart } from "@/store/shop-cart.store";
import { useRouter } from "next/navigation";

type Liste = {
  id: string;
  nom: string;
  frequence: string | null;
  nbProduits: number;
  totalEstime?: number;
  createdAt: string;
  derniereCommandeAt: string | null;
};

type Ligne = {
  id: string;
  produitId: string;
  produitNom: string;
  quantite: number;
  prixUnit: number;
  emoji?: string;
};

const FREQUENCES = [
  { value: "", label: "Aucune" },
  { value: "hebdo", label: "Hebdomadaire" },
  { value: "bimensuel", label: "Bimensuel" },
  { value: "mensuel", label: "Mensuel" },
];

function freqLabel(f: string | null) {
  return FREQUENCES.find((x) => x.value === (f ?? ""))?.label ?? "Aucune";
}

function ListeDetailDrawer({ listeId, onClose, onCommanded }: { listeId: string; onClose: () => void; onCommanded: () => void }) {
  const [data, setData] = useState<{ liste: Liste | null; lignes: Ligne[] }>({ liste: null, lignes: [] });
  const [loading, setLoading] = useState(true);
  const ajouterArticle = useShopCart((s) => s.ajouterArticle);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/listes-achat/${listeId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [listeId]);

  const ajouterToutAuPanier = () => {
    for (const l of data.lignes) {
      ajouterArticle({
        produitId: l.produitId,
        nom: l.produitNom,
        unite: "unité",
        emoji: l.emoji ?? "📦",
        prixUnit: l.prixUnit,
        qte: l.quantite,
      });
    }
    fetch(`/api/listes-achat/${listeId}`, { method: "PATCH" }).catch(() => {});
    toast.success(`${data.lignes.length} articles ajoutés au panier`);
    onCommanded();
    setTimeout(() => router.push("/panier"), 600);
  };

  const total = data.lignes.reduce((s, l) => s + l.quantite * l.prixUnit, 0);

  return (
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border]">
          <ListChecks className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">{data.liste?.nom ?? "Liste"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-12 text-[--foreground-subtle]"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : (
            <>
              <div className="text-xs text-[--foreground-subtle] mb-3">{data.lignes.length} articles · {formatMGA(total)} estimé</div>
              <div className="border border-[--border] rounded-lg divide-y divide-[--border]">
                {data.lignes.map((l) => (
                  <div key={l.id} className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[--muted] flex items-center justify-center text-lg">{l.emoji ?? "📦"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.produitNom}</div>
                      <div className="text-[11px] text-[--foreground-subtle]">{l.quantite} × {formatMGA(l.prixUnit)}</div>
                    </div>
                    <div className="text-xs font-semibold">{formatMGA(l.quantite * l.prixUnit)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-[--border]">
          <button
            onClick={ajouterToutAuPanier}
            disabled={loading || data.lignes.length === 0}
            className="w-full py-2.5 text-sm rounded-lg bg-[--primary] text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Ajouter au panier (commande rapide)
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function CreateDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nom, setNom] = useState("");
  const [frequence, setFrequence] = useState("");
  const [saving, setSaving] = useState(false);
  const lignes = useShopCart((s) => s.lignes);

  const save = async () => {
    if (!nom.trim()) return toast.error("Nom requis");
    if (lignes.length === 0) return toast.error("Votre panier est vide");
    setSaving(true);
    try {
      const res = await fetch("/api/listes-achat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          frequence: frequence || undefined,
          lignes: lignes.map((l) => ({ produitId: l.produitId, quantite: l.qte })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Liste créée");
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
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border]">
          <ListChecks className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Nouvelle liste d&apos;achat</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Nom de la liste *</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Réappro hebdomadaire" className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]" autoFocus />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Fréquence de rappel</label>
            <select value={frequence} onChange={(e) => setFrequence(e.target.value)} className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]">
              {FREQUENCES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="bg-[--muted]/30 rounded-lg p-3">
            <div className="text-xs font-semibold mb-1">Contenu de la liste</div>
            <div className="text-xs text-[--foreground-subtle]">
              {lignes.length === 0 ? "Panier vide — ajoutez d'abord des produits au panier" : `${lignes.length} article${lignes.length > 1 ? "s" : ""} depuis votre panier`}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-[--border]">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">Annuler</button>
          <button onClick={save} disabled={saving || !nom.trim() || lignes.length === 0} className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Créer
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

export function CompteListes() {
  const [listes, setListes] = useState<Liste[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/listes-achat");
      const d = await r.json();
      setListes(d.listes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer cette liste ?")) return;
    try {
      await fetch(`/api/listes-achat/${id}`, { method: "DELETE" });
      toast.success("Liste supprimée");
      load();
    } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <ListChecks className="w-6 h-6 text-[--primary]" />
        <h1 className="text-2xl font-bold flex-1">Mes listes d&apos;achat</h1>
        <button onClick={() => setCreateOpen(true)} className="px-3 py-2 bg-[--primary] text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Nouvelle liste
        </button>
      </div>

      <p className="text-sm text-[--foreground-muted] mb-6">
        Sauvegardez vos paniers types et passez commande en 1 clic. Idéal pour les commandes récurrentes.
      </p>

      {loading ? (
        <div className="text-center py-16 text-[--foreground-subtle]"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : listes.length === 0 ? (
        <div className="text-center py-16 bg-[--card] rounded-xl border border-[--card-border]">
          <ListChecks className="w-12 h-12 mx-auto mb-3 text-[--foreground-subtle] opacity-40" />
          <p className="text-sm text-[--foreground-muted] mb-3">Aucune liste enregistrée</p>
          <button onClick={() => setCreateOpen(true)} className="text-sm text-[--primary] hover:underline">Créer ma première liste</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listes.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-[--card] border border-[--card-border] rounded-xl p-4 hover:border-[--primary] transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[--primary]/10"><Package className="w-4 h-4 text-[--primary]" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{l.nom}</div>
                  <div className="text-[11px] text-[--foreground-subtle] flex items-center gap-2 mt-0.5">
                    <span>{l.nbProduits} articles</span>
                    {l.frequence && <span className="flex items-center gap-0.5"><Repeat className="w-3 h-3" /> {freqLabel(l.frequence)}</span>}
                  </div>
                  {l.derniereCommandeAt && (
                    <div className="text-[11px] text-[--foreground-subtle] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> Dernière : {new Date(l.derniereCommandeAt).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </div>
                <button onClick={() => supprimer(l.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(l.id)} className="flex-1 py-2 text-xs rounded-lg border border-[--border] hover:bg-[--muted] flex items-center justify-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Voir détail
                </button>
                <button onClick={() => setSelected(l.id)} className="flex-1 py-2 text-xs rounded-lg bg-[--primary] text-white hover:opacity-90 flex items-center justify-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5" /> Commander
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {createOpen && <CreateDrawer onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); }} />}
        {selected && <ListeDetailDrawer listeId={selected} onClose={() => setSelected(null)} onCommanded={() => { setSelected(null); load(); }} />}
      </AnimatePresence>
    </div>
  );
}
