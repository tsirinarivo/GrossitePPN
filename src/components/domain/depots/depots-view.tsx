"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Warehouse, Plus, Loader2, X, Package, ArrowLeftRight,
  Boxes, AlertTriangle, MapPin, Star, History, Search,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Depot = {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string | null;
  estPrincipal: boolean;
  actif: boolean;
  nbProduits?: number;
  stockTotal?: number;
};

type StockLine = {
  id: string;
  produitId: string;
  produitNom: string;
  quantite: number;
  seuil: number;
  valeur: number;
};

type Transfert = {
  id: string;
  date: string;
  reference: string;
  produitNom: string;
  depotSourceNom: string;
  depotDestNom: string;
  quantite: number;
  notes: string | null;
};

// ── Drawer transfert ─────────────────────────────────────────────────────────

function TransfertDrawer({ depots, onClose, onSaved }: { depots: Depot[]; onClose: () => void; onSaved: () => void }) {
  const [depotSourceId, setDepotSourceId] = useState(depots[0]?.id ?? "");
  const [depotDestId, setDepotDestId] = useState(depots[1]?.id ?? "");
  const [stockSrc, setStockSrc] = useState<StockLine[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StockLine | null>(null);
  const [quantite, setQuantite] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!depotSourceId) return;
    setLoading(true);
    fetch(`/api/depots/${depotSourceId}/stock`)
      .then((r) => r.json())
      .then((d) => setStockSrc(d.stock ?? []))
      .finally(() => setLoading(false));
  }, [depotSourceId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return stockSrc.slice(0, 20);
    return stockSrc.filter((s) => s.produitNom.toLowerCase().includes(search.toLowerCase())).slice(0, 20);
  }, [stockSrc, search]);

  const save = async () => {
    if (!selected || !quantite || Number(quantite) <= 0) return toast.error("Quantité invalide");
    if (depotSourceId === depotDestId) return toast.error("Choisir des dépôts différents");
    setSaving(true);
    try {
      const res = await fetch("/api/depots/transferts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produitId: selected.produitId,
          depotSourceId,
          depotDestId,
          quantite: Number(quantite),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Transfert effectué");
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border]">
          <ArrowLeftRight className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Transfert inter-dépôts</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Dépôt source *</label>
              <select value={depotSourceId} onChange={(e) => { setDepotSourceId(e.target.value); setSelected(null); }} className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]">
                {depots.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Dépôt destination *</label>
              <select value={depotDestId} onChange={(e) => setDepotDestId(e.target.value)} className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]">
                {depots.filter((d) => d.id !== depotSourceId).map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Produit à transférer *</label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]" />
            </div>
            <div className="border border-[--border] rounded-lg max-h-64 overflow-y-auto divide-y divide-[--border]">
              {loading && <div className="p-4 text-center text-xs text-[--foreground-subtle]"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Chargement...</div>}
              {!loading && filtered.length === 0 && <div className="p-4 text-center text-xs text-[--foreground-subtle]">Aucun produit</div>}
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full p-2.5 text-left flex items-center gap-3 hover:bg-[--muted]/30 ${selected?.id === s.id ? "bg-[--primary]/10" : ""}`}
                >
                  <Package className="w-4 h-4 text-[--foreground-subtle]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.produitNom}</div>
                    <div className="text-[11px] text-[--foreground-subtle]">Disponible : {s.quantite}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <>
              <div>
                <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Quantité à transférer (max {selected.quantite}) *</label>
                <input type="number" min={0} max={selected.quantite} value={quantite} onChange={(e) => setQuantite(e.target.value)} className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]" />
              </div>
              <div>
                <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Notes (optionnel)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] resize-none" />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-[--border]">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">Annuler</button>
          <button onClick={save} disabled={saving || !selected || !quantite} className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            Transférer
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export function DepotsView() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [stockSelected, setStockSelected] = useState<{ depotId: string; depotNom: string; stock: StockLine[] } | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transfertOpen, setTransfertOpen] = useState(false);

  const loadDepots = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/depots");
      const d = await r.json();
      setDepots(d.depots ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransferts = useCallback(async () => {
    try {
      const r = await fetch("/api/depots/transferts");
      const d = await r.json();
      setTransferts(d.transferts ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadDepots(); loadTransferts(); }, [loadDepots, loadTransferts]);

  const openStock = async (depot: Depot) => {
    setStockLoading(true);
    setStockSelected({ depotId: depot.id, depotNom: depot.nom, stock: [] });
    try {
      const r = await fetch(`/api/depots/${depot.id}/stock`);
      const d = await r.json();
      setStockSelected({ depotId: depot.id, depotNom: depot.nom, stock: d.stock ?? [] });
    } finally {
      setStockLoading(false);
    }
  };

  const kpis = useMemo(() => ({
    total: depots.length,
    valeur: 0,
    transferts: transferts.length,
  }), [depots, transferts]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] flex-wrap gap-y-2">
        <Warehouse className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Gestion dépôts</h1>
        <button onClick={() => setTransfertOpen(true)} disabled={depots.length < 2} className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
          <ArrowLeftRight className="w-3.5 h-3.5" /> Nouveau transfert
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="text-xs text-[--foreground-subtle]">Dépôts actifs</div>
              <div className="text-lg font-bold mt-0.5">{depots.filter((d) => d.actif).length} / {depots.length}</div>
            </div>
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="text-xs text-[--foreground-subtle]">Stock total (qté base)</div>
              <div className="text-lg font-bold mt-0.5 text-[--primary]">
                {depots.reduce((s, d) => s + (d.stockTotal ?? 0), 0).toLocaleString("fr-FR")}
              </div>
            </div>
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="text-xs text-[--foreground-subtle]">Transferts récents</div>
              <div className="text-lg font-bold mt-0.5 text-blue-500">{kpis.transferts}</div>
            </div>
          </div>

          {/* Grille de dépôts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-16 text-[--foreground-subtle]"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Chargement...</div>
            ) : depots.map((d, i) => (
              <motion.button
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => openStock(d)}
                className="bg-[--card] border border-[--border] rounded-xl p-4 text-left hover:border-[--primary] transition-colors"
              >
                <div className="flex items-start gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-[--primary]/10"><Warehouse className="w-4 h-4 text-[--primary]" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm flex items-center gap-1 truncate">
                      {d.nom}
                      {d.estPrincipal && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                    </div>
                    {d.adresse && <div className="text-[11px] text-[--foreground-subtle] truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {d.adresse}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[--muted]/30 rounded p-2">
                    <div className="text-[10px] text-[--foreground-subtle]">Produits</div>
                    <div className="font-bold">{d.nbProduits ?? 0}</div>
                  </div>
                  <div className="bg-[--muted]/30 rounded p-2">
                    <div className="text-[10px] text-[--foreground-subtle]">Qté base</div>
                    <div className="font-bold">{(d.stockTotal ?? 0).toLocaleString("fr-FR")}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Vue stock détaillée */}
          {stockSelected && (
            <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[--primary]" />
                <p className="text-sm font-semibold flex-1">Stock détaillé — {stockSelected.depotNom}</p>
                <button onClick={() => setStockSelected(null)} className="p-1 hover:bg-[--muted] rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
              {stockLoading ? (
                <div className="py-10 text-center text-xs text-[--foreground-subtle]"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Chargement...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[--border] bg-[--muted]/30">
                        <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Produit</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Stock</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden sm:table-cell">Seuil</th>
                        <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockSelected.stock.slice(0, 50).map((s) => (
                        <tr key={s.id} className="border-b border-[--border] last:border-0">
                          <td className="px-3 py-2.5 text-sm">{s.produitNom}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">
                            <span className="inline-flex items-center gap-1">
                              {s.quantite < s.seuil && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                              {s.quantite.toLocaleString("fr-FR")}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-[--foreground-subtle] hidden sm:table-cell">{s.seuil}</td>
                          <td className="px-3 py-2.5 text-right text-xs">{formatMGA(s.valeur)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Historique transferts */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
              <History className="w-4 h-4 text-[--primary]" />
              <p className="text-sm font-semibold">Historique transferts</p>
            </div>
            {transferts.length === 0 ? (
              <div className="py-10 text-center text-xs text-[--foreground-subtle]">Aucun transfert</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Réf</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Produit</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Source → Destination</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Qté</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferts.map((t) => (
                      <tr key={t.id} className="border-b border-[--border] last:border-0">
                        <td className="px-3 py-2 text-xs text-[--foreground-subtle]">{new Date(t.date).toLocaleDateString("fr-FR")}</td>
                        <td className="px-3 py-2 text-xs font-mono">{t.reference}</td>
                        <td className="px-3 py-2 text-sm">{t.produitNom}</td>
                        <td className="px-3 py-2 text-xs text-[--foreground-subtle] hidden md:table-cell">
                          {t.depotSourceNom} <ArrowLeftRight className="w-3 h-3 inline mx-1" /> {t.depotDestNom}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{t.quantite.toLocaleString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {transfertOpen && depots.length >= 2 && (
          <TransfertDrawer
            depots={depots.filter((d) => d.actif)}
            onClose={() => setTransfertOpen(false)}
            onSaved={() => { setTransfertOpen(false); loadDepots(); loadTransferts(); if (stockSelected) openStock(depots.find((d) => d.id === stockSelected.depotId)!); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
