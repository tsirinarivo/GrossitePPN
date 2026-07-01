"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListChecks, Plus, Loader2, Trash2, ShoppingCart, X, Save,
  Package, Calendar, Edit3, Check, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useShopCart } from "@/store/shop-cart.store";

type Liste = {
  id: string;
  nom: string;
  frequence: string | null;
  createdAt: string;
  derniereCommandeAt: string | null;
  nbArticles: number;
  quantiteTotale: number;
};

type LigneListe = {
  id: string;
  produitId: string;
  uniteVenteId: string | null;
  quantite: number;
  produitNom: string | null;
  produitCode: string | null;
  prixDetail: number | null;
  prixGros: number | null;
  prixSemiGros: number | null;
};

const FREQUENCES = [
  { key: "hebdo", label: "Hebdomadaire" },
  { key: "bimensuel", label: "Bimensuelle" },
  { key: "mensuel", label: "Mensuelle" },
] as const;

function PALETTE(i: number): string {
  const colors = ["#FF4D00", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];
  return colors[i % colors.length]!;
}

// ── Drawer création ───────────────────────────────────────────────────────────
function CreateListeDrawer({
  cartLignes,
  onClose,
  onSaved,
}: {
  cartLignes: { produitId: string; nom: string; qte: number }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState("");
  const [frequence, setFrequence] = useState<string>("");
  const [importPanier, setImportPanier] = useState(cartLignes.length > 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nom.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nom: nom.trim(),
        frequence: frequence || undefined,
      };
      if (importPanier && cartLignes.length > 0) {
        payload.lignes = cartLignes.map((l) => ({
          produitId: l.produitId,
          nom: l.nom,
          quantite: l.qte,
        }));
      }
      const res = await fetch("/api/shop/listes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Liste créée");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[--card] border-l border-[--card-border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--card-border] shrink-0">
          <ListChecks className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Nouvelle liste d&apos;achat</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--accent] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[--foreground-muted] mb-1 block font-medium">Nom de la liste *</label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Réappro mensuel, Panier semaine..."
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-[--foreground-muted] mb-1 block font-medium">
              Fréquence <span className="font-normal opacity-60">(optionnel)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFrequence(frequence === f.key ? "" : f.key)}
                  className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                    frequence === f.key
                      ? "bg-[--primary]/10 border-[--primary] text-[--primary]"
                      : "border-[--card-border] text-[--foreground-muted] hover:bg-[--accent]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {cartLignes.length > 0 && (
            <label className="flex items-start gap-3 p-3 rounded-lg border border-[--card-border] hover:bg-[--accent] transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={importPanier}
                onChange={(e) => setImportPanier(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[--primary]"
              />
              <div className="flex-1">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <ShoppingCart className="w-3 h-3" />
                  Importer mon panier actuel
                </div>
                <div className="text-[10px] text-[--foreground-muted] mt-0.5">
                  {cartLignes.length} article(s) sera{cartLignes.length > 1 ? "ont" : ""} ajouté(s) à cette liste
                </div>
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[--card-border] shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !nom.trim()} className="flex-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Créer
          </Button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Drawer détail ─────────────────────────────────────────────────────────────
function DetailListeDrawer({
  listeId,
  onClose,
  onChanged,
}: {
  listeId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [lignes, setLignes] = useState<LigneListe[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { ajouterArticle } = useShopCart();

  useEffect(() => {
    fetch(`/api/shop/listes/${listeId}`)
      .then((r) => r.json())
      .then((d) => setLignes(d.lignes ?? []))
      .catch(() => toast.error("Impossible de charger la liste"))
      .finally(() => setLoading(false));
  }, [listeId]);

  const handleAddToCart = () => {
    setAdding(true);
    let count = 0;
    for (const l of lignes) {
      if (!l.produitId || !l.produitNom) continue;
      const prix = l.prixDetail ?? l.prixSemiGros ?? l.prixGros ?? 0;
      ajouterArticle({
        produitId: l.produitId,
        nom: l.produitNom,
        unite: "unité",
        emoji: "📦",
        prixUnit: prix,
        qte: l.quantite,
      });
      count++;
    }
    setAdding(false);
    toast.success(`${count} article(s) ajouté(s) au panier`);
    onChanged();
    onClose();
  };

  const removeLigne = async (ligneId: string) => {
    const newLignes = lignes.filter((l) => l.id !== ligneId);
    setLignes(newLignes);
    try {
      await fetch(`/api/shop/listes/${listeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lignes: newLignes.map((l) => ({
            produitId: l.produitId,
            uniteVenteId: l.uniteVenteId,
            quantite: l.quantite,
          })),
        }),
      });
      toast.success("Article retiré");
      onChanged();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[--card] border-l border-[--card-border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--card-border] shrink-0">
          <ListChecks className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Articles de la liste</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--accent] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-muted]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : lignes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-muted]">
              <Package className="w-8 h-8 opacity-30" />
              <p className="text-sm">Aucun article dans cette liste.</p>
              <p className="text-xs">Ajoutez des produits depuis le catalogue puis enregistrez-les ici.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lignes.map((l, i) => {
                const prix = l.prixDetail ?? l.prixSemiGros ?? l.prixGros ?? 0;
                const total = prix * l.quantite;
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[--card-border] hover:bg-[--accent]/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[--background-muted] flex items-center justify-center text-lg shrink-0">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.produitNom ?? "—"}</div>
                      <div className="text-[11px] text-[--foreground-muted]">
                        {l.quantite} unité(s) ·{" "}
                        {new Intl.NumberFormat("fr-FR").format(total)} MGA
                      </div>
                    </div>
                    <button
                      onClick={() => removeLigne(l.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[--card-border] shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fermer
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={adding || lignes.length === 0}
            className="flex-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Ajouter au panier
          </Button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────
export function CompteListes() {
  const [listes, setListes] = useState<Liste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerCreate, setDrawerCreate] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { lignes: cartLignes } = useShopCart();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/listes");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      const data = await res.json();
      setListes(data.listes ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setListes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    useShopCart.persist.rehydrate();
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/shop/listes/${id}`, { method: "DELETE" });
      toast.success("Liste supprimée");
      setConfirmDelete(null);
      load();
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  const frequenceLabel = (f: string | null) => {
    if (!f) return null;
    return FREQUENCES.find((x) => x.key === f)?.label ?? f;
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <ListChecks className="w-10 h-10 text-[--foreground-subtle] mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">Compte requis</h2>
        <p className="text-sm text-[--foreground-muted]">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <ListChecks className="w-6 h-6 text-[--primary]" />
        <h1 className="text-2xl font-bold text-[--foreground] flex-1">Mes listes d&apos;achat</h1>
        <Button onClick={() => setDrawerCreate(true)}>
          <Plus className="w-4 h-4" />
          Nouvelle liste
        </Button>
      </div>
      <p className="text-sm text-[--foreground-muted] mb-6">
        Enregistrez vos paniers types pour passer commande en un clic.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-muted]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Chargement...</span>
        </div>
      ) : listes.length === 0 ? (
        <div className="rounded-2xl border border-[--card-border] bg-[--card] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[--background-muted] flex items-center justify-center mx-auto mb-4">
            <ListChecks className="w-8 h-8 text-[--foreground-subtle]" />
          </div>
          <h3 className="font-bold text-lg mb-1">Aucune liste enregistrée</h3>
          <p className="text-sm text-[--foreground-muted] mb-6 max-w-md mx-auto">
            Créez une première liste à partir de votre panier actuel ou de toute pièce.
            Idéal pour vos réapprovisionnements récurrents.
          </p>
          <Button onClick={() => setDrawerCreate(true)} size="lg">
            <Plus className="w-4 h-4" />
            Créer ma première liste
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {listes.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-[--card-border] bg-[--card] p-4 hover:border-[--primary]/30 transition-colors group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: PALETTE(i) + "20" }}
                >
                  <ListChecks className="w-5 h-5" style={{ color: PALETTE(i) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{l.nom}</h3>
                  <div className="text-[11px] text-[--foreground-muted] mt-0.5">
                    Créée le {new Date(l.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  <Package className="w-3 h-3" />
                  {l.nbArticles} article{l.nbArticles > 1 ? "s" : ""}
                </Badge>
                {l.frequence && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3" />
                    {frequenceLabel(l.frequence)}
                  </Badge>
                )}
              </div>

              {l.derniereCommandeAt && (
                <div className="text-[11px] text-[--foreground-muted] mb-3">
                  Dernière commande : {new Date(l.derniereCommandeAt).toLocaleDateString("fr-FR")}
                </div>
              )}

              {confirmDelete === l.id ? (
                <div className="flex items-center gap-2 pt-2 border-t border-[--card-border]">
                  <span className="text-xs text-red-500 font-medium flex-1">Supprimer ?</span>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="p-1.5 rounded-md hover:bg-[--accent] text-[--foreground-subtle]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 pt-2 border-t border-[--card-border]">
                  <button
                    onClick={() => setDrawerDetail(l.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md hover:bg-[--accent] text-[--foreground-muted]"
                  >
                    <Edit3 className="w-3 h-3" />
                    Voir / Éditer
                  </button>
                  <button
                    onClick={() => setConfirmDelete(l.id)}
                    className="flex items-center justify-center px-3 py-1.5 text-xs rounded-md hover:bg-red-500/10 text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Lien vers compte */}
      <div className="mt-8 pt-6 border-t border-[--card-border]">
        <Link
          href="/compte"
          className="text-sm text-[--primary] hover:underline flex items-center gap-1"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Retour à mon compte
        </Link>
      </div>

      <AnimatePresence>
        {drawerCreate && (
          <CreateListeDrawer
            cartLignes={cartLignes}
            onClose={() => setDrawerCreate(false)}
            onSaved={() => { setDrawerCreate(false); load(); }}
          />
        )}
        {drawerDetail && (
          <DetailListeDrawer
            listeId={drawerDetail}
            onClose={() => setDrawerDetail(null)}
            onChanged={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
