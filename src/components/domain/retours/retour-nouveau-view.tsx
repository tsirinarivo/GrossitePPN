"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, FileText, Loader2, Save, RotateCcw,
  AlertCircle, Minus, Plus, Check, X, Wallet, Banknote, Building2, Smartphone,
} from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

type FactureRecente = {
  id: string;
  numero: string;
  commandeId: string;
  clientId: string | null;
  clientNom: string | null;
  totalTTC: number;
  createdAt: string;
  statut: string;
};

type LigneRetournable = {
  id: string;
  produitId: string;
  nomProduit: string;
  nomUnite: string;
  quantite: number;
  quantiteBase: number;
  prixUnitaire: number;
  tauxTVA: number | null;
  totalHT: number;
  totalTVA: number | null;
  totalTTC: number;
  dejaRetourne: number;
  quantiteRetournable: number;
};

type FactureDetail = {
  id: string;
  numero: string;
  commandeId: string;
  clientId: string | null;
  totalTTC: number;
  totalHT: number;
  totalTVA: number;
  createdAt: string;
};

type ClientDetail = {
  id: string;
  raisonSociale: string;
  telephone: string | null;
  encoursCourant: number;
};

type LigneAretourner = {
  ligneCommandeId: string;
  produitId: string;
  nomProduit: string;
  nomUnite: string;
  quantite: number;
  quantiteMax: number;
  prixUnitaire: number;
  tauxTVA: number;
  motifLigne: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const MOTIFS = [
  { key: "defectueux", label: "Produit défectueux", desc: "Article cassé, abîmé ou inutilisable", color: "#ef4444" },
  { key: "non_conforme", label: "Non conforme", desc: "Produit ne correspond pas à la commande", color: "#f97316" },
  { key: "erreur_livraison", label: "Erreur livraison", desc: "Mauvais article livré", color: "#3b82f6" },
  { key: "date_peremption", label: "Date péremption", desc: "DLC trop proche ou dépassée", color: "#f59e0b" },
  { key: "geste_commercial", label: "Geste commercial", desc: "Compensation client", color: "#22c55e" },
  { key: "autre", label: "Autre motif", desc: "Préciser dans le détail", color: "#94a3b8" },
] as const;

type Motif = (typeof MOTIFS)[number]["key"];

const MODES = [
  { key: "avoir_credit", label: "Avoir crédité", desc: "À valoir sur prochaines commandes", icon: Wallet, color: "#3b82f6" },
  { key: "remboursement_especes", label: "Espèces", desc: "Remise immédiate en caisse", icon: Banknote, color: "#22c55e" },
  { key: "remboursement_virement", label: "Virement", desc: "Crédit sur compte bancaire client", icon: Building2, color: "#6366f1" },
  { key: "remboursement_mobile", label: "Mobile Money", desc: "Mvola / Orange / Airtel", icon: Smartphone, color: "#f97316" },
] as const;

type Mode = (typeof MODES)[number]["key"];

// ── Component ──────────────────────────────────────────────────────────────────

export function RetourNouveauView() {
  const router = useRouter();

  const [step, setStep] = useState<"facture" | "lignes" | "details">("facture");

  // Step 1 — facture
  const [search, setSearch] = useState("");
  const [recentes, setRecentes] = useState<FactureRecente[]>([]);
  const [searching, setSearching] = useState(false);
  const [factureChoisie, setFactureChoisie] = useState<FactureDetail | null>(null);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [lignesFacture, setLignesFacture] = useState<LigneRetournable[]>([]);
  const [loadingFacture, setLoadingFacture] = useState(false);

  // Step 2 — lignes à retourner
  const [lignesRetour, setLignesRetour] = useState<LigneAretourner[]>([]);

  // Step 3 — détails
  const [motif, setMotif] = useState<Motif>("defectueux");
  const [motifDetail, setMotifDetail] = useState("");
  const [mode, setMode] = useState<Mode>("avoir_credit");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Fetch factures récentes ─────────────────────────────────────────────────
  const loadRecentes = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const url = q.trim() ? `/api/retours/factures-recentes?q=${encodeURIComponent(q)}` : "/api/retours/factures-recentes";
      const res = await fetch(url);
      const data = await res.json();
      setRecentes(data.factures ?? []);
    } catch {
      setRecentes([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    loadRecentes("");
  }, [loadRecentes]);

  useEffect(() => {
    const t = setTimeout(() => loadRecentes(search), 250);
    return () => clearTimeout(t);
  }, [search, loadRecentes]);

  // ── Choisir une facture ─────────────────────────────────────────────────────
  const choisirFacture = async (fId: string) => {
    setLoadingFacture(true);
    try {
      const res = await fetch(`/api/factures/${fId}/lignes-retournables`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFactureChoisie(data.facture);
      setClient(data.client);
      setLignesFacture(data.lignes ?? []);
      setLignesRetour([]);
      setStep("lignes");
    } catch {
      toast.error("Impossible de charger la facture");
    } finally {
      setLoadingFacture(false);
    }
  };

  // ── Toggle ligne ────────────────────────────────────────────────────────────
  const toggleLigne = (ligne: LigneRetournable) => {
    const exists = lignesRetour.find((l) => l.ligneCommandeId === ligne.id);
    if (exists) {
      setLignesRetour(lignesRetour.filter((l) => l.ligneCommandeId !== ligne.id));
    } else {
      setLignesRetour([
        ...lignesRetour,
        {
          ligneCommandeId: ligne.id,
          produitId: ligne.produitId,
          nomProduit: ligne.nomProduit,
          nomUnite: ligne.nomUnite,
          quantite: Math.min(1, ligne.quantiteRetournable),
          quantiteMax: ligne.quantiteRetournable,
          prixUnitaire: ligne.prixUnitaire,
          tauxTVA: Number(ligne.tauxTVA ?? 0),
          motifLigne: "",
        },
      ]);
    }
  };

  const updateQuantite = (lcId: string, delta: number) => {
    setLignesRetour((prev) =>
      prev.map((l) => {
        if (l.ligneCommandeId !== lcId) return l;
        const next = Math.max(0, Math.min(l.quantiteMax, l.quantite + delta));
        return { ...l, quantite: next };
      })
    );
  };

  const setQuantiteDirecte = (lcId: string, val: string) => {
    const n = Math.max(0, Number(val) || 0);
    setLignesRetour((prev) =>
      prev.map((l) => (l.ligneCommandeId === lcId ? { ...l, quantite: Math.min(l.quantiteMax, n) } : l))
    );
  };

  const updateMotifLigne = (lcId: string, val: string) => {
    setLignesRetour((prev) => prev.map((l) => (l.ligneCommandeId === lcId ? { ...l, motifLigne: val } : l)));
  };

  // ── Totaux ──────────────────────────────────────────────────────────────────
  const totaux = useMemo(() => {
    let ht = 0,
      tva = 0,
      ttc = 0;
    for (const l of lignesRetour) {
      const lht = Math.round(l.quantite * l.prixUnitaire);
      const ltva = Math.round(lht * (l.tauxTVA / 100));
      ht += lht;
      tva += ltva;
      ttc += lht + ltva;
    }
    return { ht, tva, ttc };
  }, [lignesRetour]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const lignesValides = lignesRetour.filter((l) => l.quantite > 0);
    if (lignesValides.length === 0) {
      toast.error("Sélectionnez au moins une ligne avec une quantité > 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factureId: factureChoisie?.id,
          commandeId: factureChoisie?.commandeId,
          clientId: factureChoisie?.clientId,
          motif,
          motifDetail: motifDetail.trim() || undefined,
          modeRemboursement: mode,
          notes: notes.trim() || undefined,
          lignes: lignesValides.map((l) => ({
            ligneCommandeId: l.ligneCommandeId,
            produitId: l.produitId,
            nomProduit: l.nomProduit,
            nomUnite: l.nomUnite,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            tauxTVA: l.tauxTVA,
            motifLigne: l.motifLigne || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      const data = await res.json();
      toast.success(`Retour ${data.retour?.numero ?? ""} enregistré`);
      if (data.retour?.id) {
        window.open(`/api/retours/${data.retour.id}/avoir-pdf`, "_blank");
      }
      router.push("/retours");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const motifInfo = MOTIFS.find((m) => m.key === motif)!;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] shrink-0">
        <Link
          href="/retours"
          className="p-1.5 rounded-lg hover:bg-[--muted] text-[--foreground-subtle]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <RotateCcw className="w-5 h-5 text-[--primary] shrink-0" />
        <h1 className="text-lg font-bold flex-1">Nouveau retour</h1>

        {/* Stepper */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {(["facture", "lignes", "details"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold transition-colors"
                style={{
                  backgroundColor: step === s ? "#FF4D00" : "transparent",
                  border: step === s ? "1px solid #FF4D00" : "1px solid var(--border)",
                  color: step === s ? "white" : "var(--foreground-subtle)",
                }}
              >
                {i + 1}
              </div>
              <span className={step === s ? "font-semibold" : "text-[--foreground-subtle]"}>
                {s === "facture" ? "Facture" : s === "lignes" ? "Articles" : "Détails"}
              </span>
              {i < 2 && <div className="w-6 h-px bg-[--border]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ── STEP 1 : choix facture ─────────────────────────────────── */}
            {step === "facture" && (
              <motion.div
                key="facture"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[--card] border border-[--border] rounded-xl p-5">
                  <h2 className="font-bold text-sm mb-1">Étape 1 — Choisir la facture d&apos;origine</h2>
                  <p className="text-xs text-[--foreground-subtle] mb-4">
                    Sélectionnez la facture liée aux articles à retourner. Les quantités déjà retournées sont prises en compte.
                  </p>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher par n° facture ou nom client..."
                      className="w-full pl-9 pr-3 py-2.5 border border-[--border] rounded-lg bg-[--background] text-sm focus:outline-none focus:border-[--primary] transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[--foreground-subtle]" />
                    <p className="text-xs font-medium text-[--foreground-subtle]">
                      {searching ? "Recherche..." : `${recentes.length} facture(s)`}
                    </p>
                  </div>

                  {searching || loadingFacture ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-[--foreground-subtle]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  ) : recentes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                      <AlertCircle className="w-8 h-8 opacity-30" />
                      <p className="text-sm">Aucune facture trouvée.</p>
                      <p className="text-xs">Essayez un autre terme de recherche.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[--border]">
                      {recentes.map((f, i) => (
                        <motion.button
                          key={f.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => choisirFacture(f.id)}
                          className="w-full text-left px-4 py-3 hover:bg-[--muted]/30 transition-colors flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[--primary]/10 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-[--primary]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold">{f.numero}</span>
                              <span className="text-[10px] text-[--foreground-subtle]">
                                {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="text-xs text-[--foreground-subtle] truncate">
                              {f.clientNom ?? "Client comptoir"}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">{formatMGA(f.totalTTC)}</div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2 : choix des articles ────────────────────────────── */}
            {step === "lignes" && factureChoisie && (
              <motion.div
                key="lignes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[--card] border border-[--border] rounded-xl p-5 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-sm">Étape 2 — Sélectionner les articles à retourner</h2>
                    <p className="text-xs text-[--foreground-subtle] mt-0.5">
                      Facture <span className="font-mono font-semibold">{factureChoisie.numero}</span>
                      {client ? ` — ${client.raisonSociale}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFactureChoisie(null);
                      setStep("facture");
                    }}
                    className="text-xs text-[--foreground-subtle] hover:text-[--foreground] transition-colors"
                  >
                    Changer
                  </button>
                </div>

                <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                  {lignesFacture.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-subtle]">
                      <AlertCircle className="w-8 h-8 opacity-30" />
                      <p className="text-sm">Aucun article retournable sur cette facture.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[--border]">
                      {lignesFacture.map((l) => {
                        const selected = lignesRetour.find((lr) => lr.ligneCommandeId === l.id);
                        const epuise = l.quantiteRetournable <= 0;
                        return (
                          <div key={l.id} className={`px-4 py-3 transition-colors ${selected ? "bg-[--primary]/5" : ""}`}>
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => !epuise && toggleLigne(l)}
                                disabled={epuise}
                                className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                  selected
                                    ? "bg-[--primary] border-[--primary]"
                                    : epuise
                                    ? "border-[--border] opacity-40"
                                    : "border-[--border] hover:border-[--primary]"
                                }`}
                              >
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{l.nomProduit}</div>
                                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[--foreground-subtle]">
                                  <span>{Number(l.quantite).toLocaleString("fr-FR")} {l.nomUnite}</span>
                                  <span>·</span>
                                  <span>{formatMGA(l.prixUnitaire)} / unité</span>
                                  {l.dejaRetourne > 0 && (
                                    <>
                                      <span>·</span>
                                      <span className="text-amber-500">
                                        {l.dejaRetourne} déjà retourné{l.dejaRetourne > 1 ? "s" : ""}
                                      </span>
                                    </>
                                  )}
                                  {epuise && <span className="text-red-500">— Tout retourné</span>}
                                </div>
                              </div>
                              <div className="text-sm font-semibold shrink-0">{formatMGA(l.totalTTC)}</div>
                            </div>

                            {selected && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 ml-8 flex flex-wrap items-center gap-3"
                              >
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => updateQuantite(l.id, -1)}
                                    className="w-7 h-7 rounded-md border border-[--border] hover:bg-[--muted] flex items-center justify-center"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={l.quantiteRetournable}
                                    value={selected.quantite}
                                    onChange={(e) => setQuantiteDirecte(l.id, e.target.value)}
                                    className="w-16 text-center border border-[--border] rounded-md py-1 bg-[--background] text-sm focus:outline-none focus:border-[--primary]"
                                  />
                                  <button
                                    onClick={() => updateQuantite(l.id, 1)}
                                    className="w-7 h-7 rounded-md border border-[--border] hover:bg-[--muted] flex items-center justify-center"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <span className="text-[11px] text-[--foreground-subtle] ml-1">
                                    / {l.quantiteRetournable} max
                                  </span>
                                </div>
                                <input
                                  value={selected.motifLigne}
                                  onChange={(e) => updateMotifLigne(l.id, e.target.value)}
                                  placeholder="Motif spécifique (optionnel)"
                                  className="flex-1 min-w-[160px] border border-[--border] rounded-md px-2 py-1 text-xs bg-[--background] focus:outline-none focus:border-[--primary]"
                                />
                                <span className="text-xs font-semibold text-[--primary]">
                                  {formatMGA(Math.round(selected.quantite * selected.prixUnitaire * (1 + selected.tauxTVA / 100)))}
                                </span>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer step 2 */}
                <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-[--foreground-subtle]">Total retour</div>
                    <div className="text-lg font-bold">{formatMGA(totaux.ttc)}</div>
                    <div className="text-[11px] text-[--foreground-subtle]">
                      {lignesRetour.filter((l) => l.quantite > 0).length} article(s) sélectionné(s)
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("details")}
                    disabled={lignesRetour.filter((l) => l.quantite > 0).length === 0}
                    className="px-4 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    Continuer
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3 : détails ────────────────────────────────────────── */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[--card] border border-[--border] rounded-xl p-5">
                  <h2 className="font-bold text-sm mb-1">Étape 3 — Motif et remboursement</h2>
                  <p className="text-xs text-[--foreground-subtle]">Finalisez les conditions du retour.</p>
                </div>

                {/* Motif */}
                <div className="bg-[--card] border border-[--border] rounded-xl p-5">
                  <label className="text-xs text-[--foreground-subtle] font-medium uppercase tracking-wider mb-3 block">
                    Motif principal du retour
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MOTIFS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMotif(m.key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          motif === m.key ? "bg-[--primary]/10 border-[--primary]" : "border-[--border] hover:bg-[--muted]/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-xs font-semibold">{m.label}</span>
                        </div>
                        <p className="text-[10px] text-[--foreground-subtle] leading-snug">{m.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">
                      Détail complémentaire
                    </label>
                    <input
                      value={motifDetail}
                      onChange={(e) => setMotifDetail(e.target.value)}
                      placeholder={`Précisions sur "${motifInfo.label.toLowerCase()}"`}
                      className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary]"
                    />
                  </div>
                </div>

                {/* Mode remboursement */}
                <div className="bg-[--card] border border-[--border] rounded-xl p-5">
                  <label className="text-xs text-[--foreground-subtle] font-medium uppercase tracking-wider mb-3 block">
                    Mode de remboursement
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {MODES.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          mode === m.key ? "bg-[--primary]/10 border-[--primary]" : "border-[--border] hover:bg-[--muted]/30"
                        }`}
                      >
                        <m.icon className="w-4 h-4 mb-1.5" style={{ color: m.color }} />
                        <div className="text-xs font-semibold mb-0.5">{m.label}</div>
                        <p className="text-[10px] text-[--foreground-subtle] leading-snug">{m.desc}</p>
                      </button>
                    ))}
                  </div>

                  {mode === "avoir_credit" && client && (
                    <div className="mt-4 bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                      <Wallet className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>
                        L&apos;encours du client <strong>{client.raisonSociale}</strong> sera réduit de{" "}
                        <strong>{formatMGA(totaux.ttc)}</strong>.
                        <br />
                        Encours actuel : {formatMGA(client.encoursCourant ?? 0)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-[--card] border border-[--border] rounded-xl p-5">
                  <label className="text-xs text-[--foreground-subtle] mb-1 block font-medium">
                    Notes internes <span className="font-normal opacity-60">(optionnel)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Observations, suivi, références..."
                    className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] focus:outline-none focus:border-[--primary] resize-none"
                  />
                </div>

                {/* Footer */}
                <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-center gap-4">
                  <button
                    onClick={() => setStep("lignes")}
                    className="px-4 py-2 border border-[--border] text-sm rounded-lg hover:bg-[--muted] transition-colors"
                  >
                    Retour
                  </button>
                  <div className="flex-1">
                    <div className="text-xs text-[--foreground-subtle]">Montant total</div>
                    <div className="text-lg font-bold">{formatMGA(totaux.ttc)}</div>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={saving || totaux.ttc === 0}
                    className="px-4 py-2 bg-[--primary] text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Enregistrer le retour
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
