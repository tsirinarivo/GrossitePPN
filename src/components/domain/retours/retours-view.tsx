"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw, Plus, Loader2, X, Search, FileText,
  CheckCircle2, Clock, BanknoteArrowDown, Ban,
  TrendingDown, FileWarning, Receipt, Printer, MoreVertical,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

// ── Constants ────────────────────────────────────────────────────────────────

const MOTIFS = [
  { value: "qualite", label: "Problème qualité" },
  { value: "erreur_livraison", label: "Erreur de livraison" },
  { value: "refus_client", label: "Refus client" },
  { value: "produit_endommage", label: "Produit endommagé" },
  { value: "autre", label: "Autre" },
] as const;

const STATUTS = [
  { value: "brouillon", label: "Brouillon", color: "#94a3b8", icon: Clock },
  { value: "valide", label: "Validé", color: "#3b82f6", icon: CheckCircle2 },
  { value: "rembourse", label: "Remboursé", color: "#22c55e", icon: BanknoteArrowDown },
  { value: "annule", label: "Annulé", color: "#ef4444", icon: Ban },
] as const;

const MODES_REMB = [
  { value: "credit_compte", label: "Crédit en compte" },
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement" },
  { value: "mvola", label: "Mvola" },
  { value: "orange_money", label: "Orange Money" },
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

type Retour = {
  id: string;
  numero: string;
  factureId: string | null;
  factureNumero: string | null;
  clientId: string | null;
  clientNom: string;
  motif: string;
  statut: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  notes: string | null;
  createdAt: string;
  valideeAt: string | null;
};

type Facture = {
  id: string;
  numero: string;
  clientId: string | null;
  clientNom: string;
  totalTTC: number;
  createdAt: string;
};

type LigneFacture = {
  id: string;
  produitId: string;
  nomProduit: string;
  nomUnite?: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
};

type LigneRetour = {
  ligneCommandeId?: string;
  produitId?: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  motifLigne?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMotifLabel(motif: string): string {
  return MOTIFS.find((m) => m.value === motif)?.label ?? motif;
}

function getStatutMeta(statut: string) {
  return STATUTS.find((s) => s.value === statut) ?? STATUTS[0];
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof RotateCcw;
  color: string;
}) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--foreground-subtle] truncate">{label}</p>
        <p className="text-base font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] mt-0.5 text-[--foreground-subtle]">{sub}</p>}
      </div>
    </div>
  );
}

// ── Drawer création ──────────────────────────────────────────────────────────

function CreateRetourDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  // Step 1: chercher / sélectionner la facture
  const [search, setSearch] = useState("");
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loadingFactures, setLoadingFactures] = useState(false);

  const [selectedFac, setSelectedFac] = useState<Facture | null>(null);
  const [factureLignes, setFactureLignes] = useState<LigneFacture[]>([]);
  const [loadingLignes, setLoadingLignes] = useState(false);

  // Step 2: sélectionner les lignes + quantités à retourner
  const [retourLignes, setRetourLignes] = useState<Record<string, { qte: number; motif: string }>>({});
  const [motif, setMotif] = useState<string>("qualite");
  const [notes, setNotes] = useState("");
  const [modeRemboursement, setModeRemboursement] = useState<string>("credit_compte");
  const [saving, setSaving] = useState(false);

  // Charger les factures récentes
  useEffect(() => {
    const t = setTimeout(() => {
      setLoadingFactures(true);
      fetch(`/api/factures?q=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setFactures(d.factures ?? []))
        .catch(() => setFactures([]))
        .finally(() => setLoadingFactures(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const selectFacture = async (f: Facture) => {
    setSelectedFac(f);
    setLoadingLignes(true);
    try {
      const r = await fetch(`/api/factures/${f.id}`);
      const d = await r.json();
      setFactureLignes(d.lignes ?? []);
    } catch {
      setFactureLignes([]);
    } finally {
      setLoadingLignes(false);
    }
  };

  const toggleLigne = (ligne: LigneFacture) => {
    setRetourLignes((prev) => {
      const next = { ...prev };
      if (next[ligne.id]) delete next[ligne.id];
      else next[ligne.id] = { qte: ligne.quantite, motif: "" };
      return next;
    });
  };

  const updateQte = (ligneId: string, qte: number) => {
    setRetourLignes((prev) => {
      const existing = prev[ligneId] ?? { qte: 0, motif: "" };
      return { ...prev, [ligneId]: { qte: Math.max(0, qte), motif: existing.motif } };
    });
  };

  const updateMotifLigne = (ligneId: string, m: string) => {
    setRetourLignes((prev) => {
      const existing = prev[ligneId] ?? { qte: 0, motif: "" };
      return { ...prev, [ligneId]: { qte: existing.qte, motif: m } };
    });
  };

  const totalRetour = useMemo(() => {
    let ht = 0, tva = 0, ttc = 0;
    for (const ligne of factureLignes) {
      const sel = retourLignes[ligne.id];
      if (!sel || sel.qte <= 0) continue;
      const lht = Math.round(ligne.prixUnitaire * sel.qte);
      const ltva = Math.round((lht * (ligne.tauxTVA ?? 0)) / 100);
      ht += lht;
      tva += ltva;
      ttc += lht + ltva;
    }
    return { ht, tva, ttc };
  }, [factureLignes, retourLignes]);

  const handleSave = async (validerImmediat: boolean) => {
    const lignes: LigneRetour[] = factureLignes
      .filter((l) => {
        const s = retourLignes[l.id];
        return s !== undefined && s.qte > 0;
      })
      .map((l) => {
        const sel = retourLignes[l.id]!;
        const ht = Math.round(l.prixUnitaire * sel.qte);
        const tva = Math.round((ht * (l.tauxTVA ?? 0)) / 100);
        return {
          ligneCommandeId: l.id,
          produitId: l.produitId,
          nomProduit: l.nomProduit,
          quantite: sel.qte,
          prixUnitaire: l.prixUnitaire,
          tauxTVA: l.tauxTVA ?? 0,
          totalHT: ht,
          totalTVA: tva,
          totalTTC: ht + tva,
          motifLigne: sel.motif || undefined,
        };
      });

    if (lignes.length === 0) {
      toast.error("Sélectionnez au moins une ligne à retourner");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factureId: selectedFac?.id,
          clientId: selectedFac?.clientId,
          motif,
          notes: notes.trim() || undefined,
          lignes,
          modeRemboursement,
          validerImmediat,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur sauvegarde");
      }
      toast.success(validerImmediat ? "Retour validé et avoir généré" : "Retour enregistré en brouillon");
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la sauvegarde";
      toast.error(msg);
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
        className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border] shrink-0">
          <RotateCcw className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Nouveau retour client</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

          {/* Recherche facture */}
          {!selectedFac && (
            <div className="flex flex-col gap-3">
              <label className="text-xs text-[--foreground-subtle] font-medium">1. Sélectionner la facture d&apos;origine</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Numéro facture ou client..."
                  className="w-full border border-[--border] rounded-lg pl-9 pr-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
                  autoFocus
                />
              </div>
              <div className="border border-[--border] rounded-lg overflow-hidden divide-y divide-[--border] max-h-[40vh] overflow-y-auto">
                {loadingFactures && (
                  <div className="p-4 text-center text-xs text-[--foreground-subtle]">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Chargement...
                  </div>
                )}
                {!loadingFactures && factures.length === 0 && (
                  <div className="p-6 text-center text-xs text-[--foreground-subtle]">Aucune facture trouvée</div>
                )}
                {factures.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => selectFacture(f)}
                    className="w-full px-3 py-2.5 text-left hover:bg-[--muted]/40 transition-colors flex items-center gap-3"
                  >
                    <FileText className="w-4 h-4 text-[--foreground-subtle] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.numero}</div>
                      <div className="text-[11px] text-[--foreground-subtle] truncate">
                        {f.clientNom} · {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div className="text-xs font-semibold">{formatMGA(f.totalTTC)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Détail facture + sélection lignes */}
          {selectedFac && (
            <>
              <div className="bg-[--muted]/30 rounded-lg p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-[--primary] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{selectedFac.numero}</div>
                  <div className="text-[11px] text-[--foreground-subtle]">{selectedFac.clientNom} · {formatMGA(selectedFac.totalTTC)}</div>
                </div>
                <button
                  onClick={() => { setSelectedFac(null); setFactureLignes([]); setRetourLignes({}); }}
                  className="text-[11px] text-[--primary] hover:underline"
                >
                  Changer
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-[--foreground-subtle] font-medium">2. Lignes à retourner</label>
                {loadingLignes ? (
                  <div className="text-center py-6 text-xs text-[--foreground-subtle]">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Chargement des lignes...
                  </div>
                ) : factureLignes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[--foreground-subtle]">Aucune ligne sur cette facture</div>
                ) : (
                  <div className="border border-[--border] rounded-lg divide-y divide-[--border]">
                    {factureLignes.map((l) => {
                      const selected = !!retourLignes[l.id];
                      return (
                        <div key={l.id} className={`p-3 ${selected ? "bg-[--primary]/5" : ""}`}>
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleLigne(l)}
                              className="mt-1 accent-[--primary]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{l.nomProduit}</div>
                              <div className="text-[11px] text-[--foreground-subtle]">
                                Facturé : {l.quantite} {l.nomUnite ?? ""} × {formatMGA(l.prixUnitaire)}
                              </div>
                              {selected && (
                                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                  <div className="flex items-center gap-2">
                                    <label className="text-[11px] text-[--foreground-subtle]">Qté retour :</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={l.quantite}
                                      step={0.1}
                                      value={retourLignes[l.id]?.qte ?? 0}
                                      onChange={(e) => updateQte(l.id, Number(e.target.value))}
                                      className="w-20 border border-[--border] rounded px-2 py-1 text-xs bg-[--background]"
                                    />
                                  </div>
                                  <input
                                    value={retourLignes[l.id]?.motif ?? ""}
                                    onChange={(e) => updateMotifLigne(l.id, e.target.value)}
                                    placeholder="Motif ligne (optionnel)"
                                    className="flex-1 border border-[--border] rounded px-2 py-1 text-xs bg-[--background]"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="text-xs font-semibold whitespace-nowrap">{formatMGA(l.totalTTC)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Motif global */}
              <div>
                <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">3. Motif principal *</label>
                <select
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
                >
                  {MOTIFS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Mode remboursement */}
              <div>
                <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Mode de remboursement</label>
                <select
                  value={modeRemboursement}
                  onChange={(e) => setModeRemboursement(e.target.value)}
                  className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
                >
                  {MODES_REMB.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">Notes (optionnel)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] resize-none"
                  placeholder="Détails complémentaires..."
                />
              </div>

              {/* Totaux */}
              <div className="bg-[--muted]/20 rounded-lg p-3">
                <div className="flex justify-between text-xs text-[--foreground-subtle] py-0.5">
                  <span>Total HT</span><span>{formatMGA(totalRetour.ht)}</span>
                </div>
                {totalRetour.tva > 0 && (
                  <div className="flex justify-between text-xs text-[--foreground-subtle] py-0.5">
                    <span>TVA</span><span>{formatMGA(totalRetour.tva)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1.5 mt-1.5 border-t border-[--border]">
                  <span>Montant avoir</span>
                  <span className="text-[--primary]">{formatMGA(totalRetour.ttc)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {selectedFac && (
          <div className="flex gap-2 px-5 py-4 border-t border-[--border] shrink-0">
            <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">
              Annuler
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving || totalRetour.ttc === 0}
              className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Brouillon
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || totalRetour.ttc === 0}
              className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Valider & générer avoir
            </button>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────

export function RetoursView() {
  const [retours, setRetours] = useState<Retour[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtreStatut !== "tous") params.set("statut", filtreStatut);
      const r = await fetch(`/api/retours?${params.toString()}`);
      const d = await r.json();
      setRetours(d.retours ?? []);
    } catch {
      toast.error("Impossible de charger les retours");
    } finally {
      setLoading(false);
    }
  }, [filtreStatut]);

  useEffect(() => { load(); }, [load]);

  const changerStatut = async (retour: Retour, statut: string) => {
    setActionMenu(null);
    try {
      const res = await fetch(`/api/retours/${retour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(statut === "valide" ? "Retour validé · avoir généré" : `Retour passé à : ${statut}`);
      if (statut === "valide" && data.avoir?.id) {
        setTimeout(() => window.open(`/api/avoirs/${data.avoir.id}/pdf`, "_blank"), 300);
      }
      load();
    } catch {
      toast.error("Erreur de mise à jour");
    }
  };

  const ouvrirAvoir = async (retour: Retour) => {
    try {
      const res = await fetch(`/api/retours/${retour.id}`);
      const data = await res.json();
      if (data.avoir?.id) {
        window.open(`/api/avoirs/${data.avoir.id}/pdf`, "_blank");
      } else {
        toast.error("Aucun avoir associé");
      }
    } catch {
      toast.error("Erreur");
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = retours.reduce((s, r) => s + (r.totalTTC ?? 0), 0);
    const enAttente = retours.filter((r) => r.statut === "brouillon").length;
    const rembourses = retours.filter((r) => r.statut === "rembourse").length;
    const totalAvoirs = retours
      .filter((r) => r.statut === "valide" || r.statut === "rembourse")
      .reduce((s, r) => s + (r.totalTTC ?? 0), 0);
    return { total, count: retours.length, enAttente, rembourses, totalAvoirs };
  }, [retours]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0 flex-wrap gap-y-2">
        <RotateCcw className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Retours & avoirs</h1>

        {/* Filtres */}
        <div className="flex items-center gap-1 bg-[--muted]/40 rounded-lg p-0.5">
          {["tous", ...STATUTS.map((s) => s.value)].map((st) => (
            <button
              key={st}
              onClick={() => setFiltreStatut(st)}
              className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
                filtreStatut === st ? "bg-[--card] shadow-sm" : "text-[--foreground-subtle] hover:text-[--foreground]"
              }`}
            >
              {st === "tous" ? "Tous" : STATUTS.find((s) => s.value === st)?.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau retour
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 flex flex-col gap-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Total retours"
              value={String(kpis.count)}
              sub={`${formatMGA(kpis.total)} TTC`}
              icon={RotateCcw}
              color="#ef4444"
            />
            <KpiCard
              label="En attente validation"
              value={String(kpis.enAttente)}
              sub={kpis.enAttente === 1 ? "brouillon" : "brouillons"}
              icon={Clock}
              color="#f59e0b"
            />
            <KpiCard
              label="Avoirs émis"
              value={formatMGA(kpis.totalAvoirs)}
              sub="Validés ou remboursés"
              icon={FileText}
              color="#3b82f6"
            />
            <KpiCard
              label="Remboursements"
              value={String(kpis.rembourses)}
              sub={kpis.rembourses === 1 ? "effectué" : "effectués"}
              icon={BanknoteArrowDown}
              color="#22c55e"
            />
          </div>

          {/* Liste retours */}
          <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5 text-[--foreground-subtle]" />
              <p className="text-xs font-medium text-[--foreground-subtle]">Liste des retours</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : retours.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                <FileWarning className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucun retour enregistré</p>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-xs text-[--primary] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Créer un retour
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">N° retour</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Facture</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Client</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden lg:table-cell">Motif</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Statut</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Montant</th>
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Date</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {retours.map((r, i) => {
                      const sMeta = getStatutMeta(r.statut);
                      const SIcon = sMeta.icon;
                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-[--border] last:border-0 hover:bg-[--muted]/10"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold">{r.numero}</td>
                          <td className="px-3 py-2.5 text-xs text-[--foreground-subtle] hidden md:table-cell">{r.factureNumero ?? "—"}</td>
                          <td className="px-3 py-2.5 text-sm">{r.clientNom}</td>
                          <td className="px-3 py-2.5 text-xs text-[--foreground-subtle] hidden lg:table-cell">{getMotifLabel(r.motif)}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1"
                              style={{ backgroundColor: sMeta.color + "20", color: sMeta.color }}
                            >
                              <SIcon className="w-3 h-3" />
                              {sMeta.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-sm">{formatMGA(r.totalTTC)}</td>
                          <td className="px-3 py-2.5 text-xs text-[--foreground-subtle] hidden md:table-cell">
                            {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-3 py-2.5 relative">
                            <button
                              onClick={() => setActionMenu(actionMenu === r.id ? null : r.id)}
                              className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {actionMenu === r.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                                <div className="absolute right-2 top-9 z-20 bg-[--card] border border-[--border] rounded-lg shadow-xl py-1 min-w-[200px]">
                                  {r.statut === "brouillon" && (
                                    <button
                                      onClick={() => changerStatut(r, "valide")}
                                      className="w-full px-3 py-2 text-xs text-left hover:bg-[--muted] flex items-center gap-2"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                      Valider & générer avoir
                                    </button>
                                  )}
                                  {r.statut === "valide" && (
                                    <button
                                      onClick={() => changerStatut(r, "rembourse")}
                                      className="w-full px-3 py-2 text-xs text-left hover:bg-[--muted] flex items-center gap-2"
                                    >
                                      <BanknoteArrowDown className="w-3.5 h-3.5 text-green-500" />
                                      Marquer remboursé
                                    </button>
                                  )}
                                  {(r.statut === "valide" || r.statut === "rembourse") && (
                                    <button
                                      onClick={() => { setActionMenu(null); ouvrirAvoir(r); }}
                                      className="w-full px-3 py-2 text-xs text-left hover:bg-[--muted] flex items-center gap-2"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-[--primary]" />
                                      Imprimer l&apos;avoir
                                    </button>
                                  )}
                                  {(r.statut === "brouillon" || r.statut === "valide") && (
                                    <button
                                      onClick={() => changerStatut(r, "annule")}
                                      className="w-full px-3 py-2 text-xs text-left hover:bg-[--muted] flex items-center gap-2 text-red-500"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      Annuler le retour
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[--border] bg-[--muted]/30">
                      <td colSpan={5} className="px-3 py-2.5 text-xs font-semibold text-[--foreground-subtle]">
                        TOTAL ({retours.length} retours)
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[--primary]">
                        <span className="inline-flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          {formatMGA(kpis.total)}
                        </span>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <CreateRetourDrawer
            onClose={() => setDrawerOpen(false)}
            onSaved={() => { setDrawerOpen(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
