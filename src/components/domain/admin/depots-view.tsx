"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Warehouse, Plus, Edit3, Trash2, Loader2, Save, X, Star,
  Package, MapPin, Phone, History, ArrowRightLeft, Check, Box,
  TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Depot = {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string | null;
  actif: boolean;
  estPrincipal: boolean;
  nbProduits: number;
  totalQuantite: number;
  valeur: number;
};

type Transfert = {
  reference: string;
  produitNom: string;
  produitCode: string;
  quantite: number;
  sourceDepotNom: string | null;
  destDepotNom: string | null;
  notes: string | null;
  createdAt: string;
};

type ProduitOption = {
  id: string;
  code: string;
  nom: string;
};

const DEMO_DEPOTS: Depot[] = [
  {
    id: "demo-1",
    nom: "Dépôt central — Tana",
    adresse: "Avenue de l'Indépendance, Antananarivo",
    telephone: "+261 20 12 345 67",
    actif: true,
    estPrincipal: true,
    nbProduits: 247,
    totalQuantite: 12450,
    valeur: 185_200_000,
  },
  {
    id: "demo-2",
    nom: "Dépôt nord — Antsiranana",
    adresse: "Rue Colbert, Antsiranana",
    telephone: "+261 32 04 567 89",
    actif: true,
    estPrincipal: false,
    nbProduits: 92,
    totalQuantite: 3120,
    valeur: 42_500_000,
  },
  {
    id: "demo-3",
    nom: "Dépôt côtier — Mahajanga",
    adresse: "Bord de mer, Mahajanga",
    telephone: "+261 33 78 901 23",
    actif: true,
    estPrincipal: false,
    nbProduits: 64,
    totalQuantite: 2080,
    valeur: 28_900_000,
  },
];

const DEMO_TRANSFERTS: Transfert[] = [
  {
    reference: "TRF-20260520-A1B2",
    produitNom: "Riz Makalioka 25kg",
    produitCode: "RIZ-MK-25",
    quantite: 50,
    sourceDepotNom: "Dépôt central — Tana",
    destDepotNom: "Dépôt nord — Antsiranana",
    notes: "Approvisionnement mensuel",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    reference: "TRF-20260518-C3D4",
    produitNom: "Huile palme 5L",
    produitCode: "HUI-PA-5",
    quantite: 24,
    sourceDepotNom: "Dépôt central — Tana",
    destDepotNom: "Dépôt côtier — Mahajanga",
    notes: null,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

// ── Drawer Création/édition ───────────────────────────────────────────────────
function DepotDrawer({
  depot,
  onClose,
  onSaved,
}: {
  depot: Depot | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState(depot?.nom ?? "");
  const [adresse, setAdresse] = useState(depot?.adresse ?? "");
  const [telephone, setTelephone] = useState(depot?.telephone ?? "");
  const [estPrincipal, setEstPrincipal] = useState(depot?.estPrincipal ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nom.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSaving(true);
    try {
      const url = depot ? `/api/depots/${depot.id}` : "/api/depots";
      const method = depot ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          adresse: adresse.trim() || null,
          telephone: telephone.trim() || null,
          estPrincipal,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(depot ? "Dépôt modifié" : "Dépôt créé");
      onSaved();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0">
          <Warehouse className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">{depot ? "Modifier le dépôt" : "Nouveau dépôt"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Nom du dépôt *</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Dépôt central — Tana"
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Adresse</label>
            <textarea
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              rows={2}
              placeholder="Adresse complète"
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Téléphone</label>
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+261 …"
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
            />
          </div>
          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[--border] hover:bg-[--muted]/20 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={estPrincipal}
              onChange={(e) => setEstPrincipal(e.target.checked)}
              className="w-4 h-4 accent-[--primary]"
            />
            <div className="flex-1">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-500" />
                Dépôt principal
              </div>
              <div className="text-[10px] text-[--foreground-subtle] mt-0.5">
                Utilisé par défaut pour les ventes POS et les commandes
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[--border] shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !nom.trim()}
            className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {depot ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Drawer Transfert ──────────────────────────────────────────────────────────
function TransfertDrawer({
  depots,
  onClose,
  onSaved,
}: {
  depots: Depot[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [produits, setProduits] = useState<ProduitOption[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [produitChoisi, setProduitChoisi] = useState<ProduitOption | null>(null);
  const [sourceDepotId, setSourceDepotId] = useState("");
  const [destDepotId, setDestDepotId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/produits")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.produits ?? d ?? []) as Array<{ id: string; code: string; nom: string }>;
        setProduits(list.slice(0, 200));
      })
      .catch(() => setProduits([]));
  }, []);

  const filteredProduits = produits.filter((p) => {
    if (!searchProduit.trim()) return true;
    const q = searchProduit.toLowerCase();
    return p.nom.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  }).slice(0, 50);

  const handleSave = async () => {
    if (!produitChoisi || !sourceDepotId || !destDepotId || !quantite) {
      toast.error("Tous les champs requis");
      return;
    }
    if (sourceDepotId === destDepotId) {
      toast.error("Source et destination identiques");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/stock/transferts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produitId: produitChoisi.id,
          sourceDepotId,
          destinationDepotId: destDepotId,
          quantiteBase: Number(quantite),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Erreur");
      }
      toast.success("Transfert enregistré");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors du transfert");
    } finally {
      setSaving(false);
    }
  };

  const depotsActifs = depots.filter((d) => d.actif);

  return (
    <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0">
          <ArrowRightLeft className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Nouveau transfert</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Produit */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Produit *</label>
            {produitChoisi ? (
              <div className="border border-[--border] rounded-lg px-3 py-2 bg-[--background] flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-[--foreground-subtle]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{produitChoisi.nom}</div>
                  <div className="text-[10px] text-[--foreground-subtle] font-mono">{produitChoisi.code}</div>
                </div>
                <button
                  onClick={() => setProduitChoisi(null)}
                  className="p-1 rounded hover:bg-[--muted] text-[--foreground-subtle]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={searchProduit}
                  onChange={(e) => setSearchProduit(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] mb-2"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto border border-[--border] rounded-lg">
                  {filteredProduits.length === 0 ? (
                    <div className="p-3 text-xs text-[--foreground-subtle] text-center">Aucun produit</div>
                  ) : (
                    filteredProduits.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProduitChoisi(p)}
                        className="w-full text-left px-3 py-2 hover:bg-[--muted]/30 transition-colors border-b border-[--border] last:border-0"
                      >
                        <div className="text-sm font-medium truncate">{p.nom}</div>
                        <div className="text-[10px] text-[--foreground-subtle] font-mono">{p.code}</div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Source */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Dépôt source *</label>
            <select
              value={sourceDepotId}
              onChange={(e) => setSourceDepotId(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
            >
              <option value="">— Sélectionner —</option>
              {depotsActifs.map((d) => (
                <option key={d.id} value={d.id}>{d.nom}</option>
              ))}
            </select>
          </div>

          {/* Dest */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Dépôt destination *</label>
            <select
              value={destDepotId}
              onChange={(e) => setDestDepotId(e.target.value)}
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
            >
              <option value="">— Sélectionner —</option>
              {depotsActifs.filter((d) => d.id !== sourceDepotId).map((d) => (
                <option key={d.id} value={d.id}>{d.nom}</option>
              ))}
            </select>
          </div>

          {/* Quantité */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Quantité (unité de base) *</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="0"
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">
              Notes <span className="font-normal opacity-60">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Motif du transfert..."
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
            disabled={saving || !produitChoisi || !sourceDepotId || !destDepotId || !quantite}
            className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
            Transférer
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────
export function DepotsView() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [editing, setEditing] = useState<Depot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transfertOpen, setTransfertOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showHistorique, setShowHistorique] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        fetch("/api/depots/stock-consolide").then((r) => r.json()),
        fetch("/api/stock/transferts/historique").then((r) => r.json()),
      ]);
      const depotsList: Depot[] = d.depots ?? [];
      if (depotsList.length === 0) {
        setDepots(DEMO_DEPOTS);
        setTransferts(DEMO_TRANSFERTS);
        setUsingDemo(true);
      } else {
        setDepots(depotsList);
        setTransferts(t.transferts ?? []);
        setUsingDemo(false);
      }
    } catch {
      setDepots(DEMO_DEPOTS);
      setTransferts(DEMO_TRANSFERTS);
      setUsingDemo(true);
      toast.error("Impossible de charger les dépôts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/depots/${id}`, { method: "DELETE" });
      toast.success("Dépôt désactivé");
      setConfirmDelete(null);
      load();
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  const totaux = depots.reduce(
    (acc, d) => ({
      nbProduits: acc.nbProduits + d.nbProduits,
      totalQuantite: acc.totalQuantite + d.totalQuantite,
      valeur: acc.valeur + d.valeur,
    }),
    { nbProduits: 0, totalQuantite: 0, valeur: 0 }
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <Warehouse className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Dépôts</h1>

        <button
          onClick={() => setTransfertOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-[--border] text-sm rounded-lg font-medium hover:bg-[--muted] transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Transférer
        </button>
        <button
          onClick={() => { setEditing(null); setDrawerOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau dépôt
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">
          {usingDemo && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs rounded-lg px-4 py-2.5">
              Aucun dépôt en base — affichage de données de démonstration.
            </div>
          )}

          {/* Totaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><Warehouse className="w-4 h-4 text-blue-500" /></div>
              <div>
                <p className="text-xs text-[--foreground-subtle]">Dépôts actifs</p>
                <p className="text-base font-bold">{depots.filter((d) => d.actif).length}</p>
              </div>
            </div>
            <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><Box className="w-4 h-4 text-green-500" /></div>
              <div>
                <p className="text-xs text-[--foreground-subtle]">Total produits</p>
                <p className="text-base font-bold">{totaux.nbProduits.toLocaleString("fr-FR")}</p>
              </div>
            </div>
            <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20"><Package className="w-4 h-4 text-amber-500" /></div>
              <div>
                <p className="text-xs text-[--foreground-subtle]">Unités en stock</p>
                <p className="text-base font-bold">{totaux.totalQuantite.toLocaleString("fr-FR")}</p>
              </div>
            </div>
            <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20"><TrendingUp className="w-4 h-4 text-purple-500" /></div>
              <div className="min-w-0">
                <p className="text-xs text-[--foreground-subtle]">Valeur totale</p>
                <p className="text-base font-bold truncate">{formatMGA(totaux.valeur)}</p>
              </div>
            </div>
          </div>

          {/* Liste dépôts */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {depots.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-[--card] border rounded-xl p-4 ${d.actif ? "border-[--border]" : "border-[--border] opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Warehouse className="w-4 h-4 text-[--primary] shrink-0" />
                      <h3 className="font-bold text-sm truncate">{d.nom}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {d.estPrincipal && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      )}
                      {!d.actif && (
                        <span className="text-[10px] uppercase font-bold text-[--foreground-subtle] bg-[--muted] px-1.5 py-0.5 rounded">
                          Inactif
                        </span>
                      )}
                    </div>
                  </div>

                  {d.adresse && (
                    <div className="flex items-start gap-1.5 text-xs text-[--foreground-subtle] mb-1.5">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{d.adresse}</span>
                    </div>
                  )}
                  {d.telephone && (
                    <div className="flex items-center gap-1.5 text-xs text-[--foreground-subtle] mb-3">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span className="font-mono">{d.telephone}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-[--border]">
                    <div>
                      <div className="text-[10px] text-[--foreground-subtle] uppercase">Produits</div>
                      <div className="text-sm font-bold">{d.nbProduits}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[--foreground-subtle] uppercase">Unités</div>
                      <div className="text-sm font-bold">{d.totalQuantite.toLocaleString("fr-FR")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[--foreground-subtle] uppercase">Valeur</div>
                      <div className="text-xs font-bold truncate">{formatMGA(d.valeur)}</div>
                    </div>
                  </div>

                  {confirmDelete === d.id ? (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[--border]">
                      <span className="text-xs text-red-500 font-medium flex-1">Désactiver ?</span>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="p-1.5 rounded-md hover:bg-[--muted] text-[--foreground-subtle]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-[--border]">
                      <button
                        onClick={() => { setEditing(d); setDrawerOpen(true); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md hover:bg-[--muted] text-[--foreground-subtle]"
                      >
                        <Edit3 className="w-3 h-3" />
                        Modifier
                      </button>
                      {!d.estPrincipal && (
                        <button
                          onClick={() => setConfirmDelete(d.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Historique transferts */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowHistorique(!showHistorique)}
              className="w-full px-4 py-3 border-b border-[--border] flex items-center gap-2 hover:bg-[--muted]/10 transition-colors"
            >
              <History className="w-4 h-4 text-[--foreground-subtle]" />
              <h3 className="font-bold text-sm flex-1 text-left">Historique des transferts</h3>
              <span className="text-xs text-[--foreground-subtle]">{transferts.length} transfert(s)</span>
              {showHistorique ? <ChevronUp className="w-4 h-4 text-[--foreground-subtle]" /> : <ChevronDown className="w-4 h-4 text-[--foreground-subtle]" />}
            </button>

            {showHistorique && (
              <div>
                {transferts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[--foreground-subtle]">
                    Aucun transfert sur les 90 derniers jours
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[--border] bg-[--muted]/30">
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Date</th>
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Produit</th>
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Trajet</th>
                          <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Quantité</th>
                          <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Référence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferts.map((t) => (
                          <tr key={t.reference} className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10 transition-colors">
                            <td className="px-3 py-2.5 text-xs text-[--foreground-subtle]">
                              {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="text-sm font-medium">{t.produitNom}</div>
                              <div className="text-[10px] text-[--foreground-subtle] font-mono">{t.produitCode}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-[--foreground-subtle]">{t.sourceDepotNom ?? "?"}</span>
                                <ArrowRightLeft className="w-3 h-3 text-[--primary]" />
                                <span>{t.destDepotNom ?? "?"}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-sm">
                              {Number(t.quantite).toLocaleString("fr-FR")}
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-[--foreground-subtle] font-mono hidden md:table-cell">
                              {t.reference}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <DepotDrawer
            depot={editing}
            onClose={() => setDrawerOpen(false)}
            onSaved={() => { setDrawerOpen(false); setEditing(null); load(); }}
          />
        )}
        {transfertOpen && (
          <TransfertDrawer
            depots={depots}
            onClose={() => setTransfertOpen(false)}
            onSaved={() => { setTransfertOpen(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
