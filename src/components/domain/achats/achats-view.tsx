"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Plus, Search, Package, Truck, CheckCircle2,
  Clock, AlertCircle, FileText, Building2, X, ChevronRight,
  Send, RefreshCw, Loader2, Trash2, Edit3, ReceiptText, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Statut = "brouillon" | "envoye" | "confirme" | "partiellement_recu" | "recu" | "annule";
type Vue = "bons_commande" | "fournisseurs";

interface BonCommande {
  id: string;
  numero: string;
  fournisseurId: string;
  fournisseurNom: string;
  dateCommande: string;
  dateLivraisonPrevue: string | null;
  statut: Statut;
  totalHT: number;
  totalTTC: number;
  nbLignes: number;
  referenceFournisseur?: string | null;
  notes?: string | null;
}

interface LigneBonCommande {
  id: string;
  produitId: string;
  nomProduit: string;
  nomUnite: string;
  quantiteCommandee: number;
  quantiteRecue: number;
  prixUnitaireHT: number;
  tauxTVA: number;
  totalHT: number;
  totalTTC: number;
}

interface BonCommandeDetail extends BonCommande {
  lignes: LigneBonCommande[];
  depotId?: string | null;
  conditions?: string | null;
}

interface Fournisseur {
  id: string;
  nom: string;
  nomCourt?: string | null;
  contact?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays: string;
  conditionsPaiement: number;
  nif?: string | null;
  notes?: string | null;
  nbCommandes: number;
  totalAchats: number;
  detteEnCours: number;
  actif: boolean;
}

type FournisseurStats = {
  bons: { id: string; numero: string; statut: string; totalTTC: number; dateCommande: string | null; dateLivraisonPrevue: string | null; dateReceptionEffective: string | null }[];
  delaiMoyen: number | null;
  parStatut: Record<string, { totalTTC: number; nbBons: number }>;
  totalAchats12m: number;
  nbBonsTotal: number;
};

interface ProduitSimple {
  id: string;
  code: string;
  nom: string;
  prixAchat: number;
  uniteBase: string;
}

const STATUT_CONF: Record<Statut, { label: string; variant: "default" | "success" | "warning" | "outline" | "destructive"; icon: typeof Clock; next?: string }> = {
  brouillon:         { label: "Brouillon",         variant: "outline",     icon: FileText,     next: "Envoyer au fournisseur" },
  envoye:            { label: "Envoyé",             variant: "default",     icon: Send,         next: "Marquer confirmé" },
  confirme:          { label: "Confirmé",           variant: "warning",     icon: CheckCircle2, next: "Enregistrer réception" },
  partiellement_recu:{ label: "Partiel",            variant: "warning",     icon: Package,      next: "Enregistrer réception" },
  recu:              { label: "Reçu",               variant: "success",     icon: CheckCircle2 },
  annule:            { label: "Annulé",             variant: "destructive", icon: AlertCircle },
};

export function AchatsView() {
  const [vue, setVue] = useState<Vue>("bons_commande");
  const [recherche, setRecherche] = useState("");
  const [commandes, setCommandes] = useState<BonCommande[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionBC, setSelectionBC] = useState<BonCommandeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  // Modaux
  const [showNouveauBC, setShowNouveauBC] = useState(false);
  const [showNouveauFournisseur, setShowNouveauFournisseur] = useState(false);
  const [showReception, setShowReception] = useState(false);
  const [fournisseurEdit, setFournisseurEdit] = useState<Fournisseur | null>(null);

  // Fournisseur detail drawer
  const [fournisseurDetail, setFournisseurDetail] = useState<Fournisseur | null>(null);
  const [fournisseurStats, setFournisseurStats] = useState<FournisseurStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  async function ouvrirFournisseurDetail(f: Fournisseur) {
    setFournisseurDetail(f);
    setFournisseurStats(null);
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/achats/fournisseurs/${f.id}/stats`);
      if (res.ok) setFournisseurStats(await res.json());
    } finally { setLoadingStats(false); }
  }

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [resC, resF] = await Promise.all([
        fetch("/api/achats/commandes"),
        fetch("/api/achats/fournisseurs"),
      ]);
      const [dataC, dataF] = await Promise.all([resC.json(), resF.json()]);
      setCommandes(dataC.commandes ?? []);
      setFournisseurs(dataF.fournisseurs ?? []);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirDetail = async (bc: BonCommande) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/achats/commandes/${bc.id}`);
      const data = await res.json();
      setSelectionBC(data);
    } catch {
      toast.error("Impossible de charger le détail");
    } finally {
      setLoadingDetail(false);
    }
  };

  const executerAction = async (action: string, bcId: string) => {
    setActionEnCours(action);
    try {
      const res = await fetch(`/api/achats/commandes/${bcId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erreur"); return; }
      toast.success(
        action === "envoyer"  ? "Bon de commande envoyé" :
        action === "confirmer" ? "Commande confirmée" :
        action === "annuler"   ? "Commande annulée" : "Mis à jour"
      );
      await charger();
      if (selectionBC?.id === bcId) {
        const res2 = await fetch(`/api/achats/commandes/${bcId}`);
        setSelectionBC(await res2.json());
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setActionEnCours(null);
    }
  };

  const commandesFiltrees = commandes.filter((bc) => {
    const q = recherche.toLowerCase();
    return !q || bc.numero.toLowerCase().includes(q) || bc.fournisseurNom.toLowerCase().includes(q);
  });

  const stats = {
    enAttente: commandes.filter((b) => ["envoye", "confirme"].includes(b.statut)).length,
    totalMoisHT: commandes.reduce((s, b) => s + b.totalHT, 0),
    fournisseursActifs: fournisseurs.filter((f) => f.actif).length,
    receptionsEnCours: commandes.filter((b) => b.statut === "partiellement_recu").length,
    totalDette: fournisseurs.reduce((s, f) => s + (f.detteEnCours ?? 0), 0),
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Achats & Fournisseurs</h1>
          <p className="text-[--foreground-muted] mt-1 text-sm">Bons de commande, réceptions, valorisation stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={charger} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          {vue === "bons_commande" && (
            <Button size="sm" onClick={() => setShowNouveauBC(true)}>
              <Plus className="w-4 h-4" />
              Nouveau BC
            </Button>
          )}
          {vue === "fournisseurs" && (
            <Button size="sm" onClick={() => setShowNouveauFournisseur(true)}>
              <Plus className="w-4 h-4" />
              Nouveau fournisseur
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "BC en attente",        valeur: stats.enAttente.toString(),                            sous: "Envoyés / Confirmés",    icon: Clock,       couleur: "text-[--warning-foreground]" },
          { label: "Achats (total)",        valeur: formatMGA(stats.totalMoisHT, { compact: true }),       sous: "Valeur HT tous BC",      icon: ShoppingBag, couleur: "text-[--primary]" },
          { label: "Dette fournisseurs",    valeur: formatMGA(stats.totalDette, { compact: true }),         sous: "Commandes non soldées",  icon: AlertCircle, couleur: "text-red-400" },
          { label: "Fournisseurs actifs",   valeur: stats.fournisseursActifs.toString(),                   sous: `sur ${fournisseurs.length} total`, icon: Building2, couleur: "text-[--foreground-muted]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[--foreground-muted]">{s.label}</p>
                    <p className="text-xl font-bold text-[--foreground] mt-1">{s.valeur}</p>
                    <p className="text-xs text-[--foreground-subtle] mt-0.5">{s.sous}</p>
                  </div>
                  <div className={cn("w-9 h-9 rounded-xl bg-[--accent] flex items-center justify-center", s.couleur)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-[--border] p-0.5 text-sm">
          {([["bons_commande", "Bons de commande"], ["fournisseurs", "Fournisseurs"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors",
                vue === v ? "bg-[--primary] text-[--primary-foreground]" : "text-[--foreground-muted] hover:text-[--foreground]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {vue === "bons_commande" && (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-subtle]" />
            <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="N° BC, fournisseur..." className="pl-9" />
          </div>
        )}
      </div>

      {/* Liste BC */}
      {vue === "bons_commande" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-[--foreground-muted]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : commandesFiltrees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-muted]">
                  <ShoppingBag className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Aucun bon de commande</p>
                  <Button size="sm" onClick={() => setShowNouveauBC(true)}><Plus className="w-4 h-4" />Créer le premier BC</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[--background-subtle] border-b border-[--border]">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">N° BC</th>
                        <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Fournisseur</th>
                        <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Statut</th>
                        <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden md:table-cell">Date prévue</th>
                        <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Total HT</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border]">
                      {commandesFiltrees.map((bc, i) => {
                        const conf = STATUT_CONF[bc.statut];
                        return (
                          <motion.tr
                            key={bc.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => ouvrirDetail(bc)}
                            className="hover:bg-[--accent] cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="font-mono text-xs font-semibold text-[--foreground]">{bc.numero}</p>
                              {bc.referenceFournisseur && <p className="text-[10px] text-[--foreground-muted]">Réf. {bc.referenceFournisseur}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-[--foreground]">{bc.fournisseurNom}</p>
                              <p className="text-[10px] text-[--foreground-muted]">{bc.nbLignes} ligne{bc.nbLignes > 1 ? "s" : ""}</p>
                            </td>
                            <td className="text-center px-4 py-3">
                              <Badge variant={conf.variant} className="text-[10px] inline-flex items-center gap-1">
                                <conf.icon className="w-3 h-3" />
                                {conf.label}
                              </Badge>
                            </td>
                            <td className="text-right px-4 py-3 hidden md:table-cell text-[--foreground-muted] text-xs">
                              {bc.dateLivraisonPrevue ? new Date(bc.dateLivraisonPrevue).toLocaleDateString("fr-FR") : "—"}
                            </td>
                            <td className="text-right px-4 py-3 font-semibold text-[--foreground]">{formatMGA(bc.totalHT, { compact: true })}</td>
                            <td className="px-4 py-3">
                              <ChevronRight className="w-4 h-4 text-[--foreground-subtle]" />
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Liste Fournisseurs */}
      {vue === "fournisseurs" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[--foreground-muted]"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : fournisseurs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-muted]">
              <Building2 className="w-10 h-10 opacity-20" />
              <p className="text-sm">Aucun fournisseur</p>
              <Button size="sm" onClick={() => setShowNouveauFournisseur(true)}><Plus className="w-4 h-4" />Ajouter le premier</Button>
            </div>
          ) : (
            fournisseurs.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center font-bold text-sm shrink-0">
                      {f.nomCourt?.slice(0, 2).toUpperCase() ?? f.nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[--foreground] truncate">{f.nom}</p>
                        {!f.actif && <Badge variant="outline" className="text-[9px]">Inactif</Badge>}
                      </div>
                      <p className="text-xs text-[--foreground-muted] mt-0.5">
                        {f.contact && `${f.contact} · `}{f.ville ?? "—"} · Paiement J+{f.conditionsPaiement}
                      </p>
                      {f.telephone && <p className="text-[10px] text-[--foreground-subtle] font-mono">{f.telephone}</p>}
                    </div>
                    <div className="text-right hidden sm:block shrink-0">
                      <p className="text-xs text-[--foreground-muted]">{f.nbCommandes} BC · {formatMGA(f.totalAchats, { compact: true })}</p>
                      {f.detteEnCours > 0 ? (
                        <p className="font-semibold text-sm text-red-400">
                          Dette : {formatMGA(f.detteEnCours, { compact: true })}
                        </p>
                      ) : (
                        <p className="text-xs text-green-500 font-medium">Soldé</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => ouvrirFournisseurDetail(f)} title="Fiche fournisseur">
                      <BarChart2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setFournisseurEdit(f)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* ── Drawer détail BC ── */}
      <AnimatePresence>
        {(selectionBC || loadingDetail) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelectionBC(null); }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[--background] border-l border-[--border] z-50 overflow-y-auto"
            >
              {loadingDetail ? (
                <div className="flex items-center justify-center h-full text-[--foreground-muted]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : selectionBC ? (
                <div className="p-6 space-y-5">
                  {/* En-tête */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-[--foreground-subtle]">{selectionBC.numero}</p>
                      <h2 className="text-xl font-bold text-[--foreground] mt-0.5">{selectionBC.fournisseurNom}</h2>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {(() => {
                          const conf = STATUT_CONF[selectionBC.statut];
                          return (
                            <Badge variant={conf.variant} className="text-xs inline-flex items-center gap-1">
                              <conf.icon className="w-3.5 h-3.5" />{conf.label}
                            </Badge>
                          );
                        })()}
                        {selectionBC.dateLivraisonPrevue && (
                          <span className="text-xs text-[--foreground-muted]">
                            Prévu le {new Date(selectionBC.dateLivraisonPrevue).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                        {selectionBC.referenceFournisseur && (
                          <span className="text-xs text-[--foreground-subtle]">Réf. {selectionBC.referenceFournisseur}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => setSelectionBC(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Lignes */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">Lignes de commande</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-[--background-subtle]">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs text-[--foreground-muted] font-medium">Produit</th>
                            <th className="text-right px-4 py-2 text-xs text-[--foreground-muted] font-medium">Cmd</th>
                            <th className="text-right px-4 py-2 text-xs text-[--foreground-muted] font-medium">Reçu</th>
                            <th className="text-right px-4 py-2 text-xs text-[--foreground-muted] font-medium">Total HT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[--border]">
                          {selectionBC.lignes?.map((l) => (
                            <tr key={l.id} className="hover:bg-[--accent]">
                              <td className="px-4 py-2">
                                <p className="font-medium text-[--foreground]">{l.nomProduit}</p>
                                <p className="text-[10px] text-[--foreground-muted]">{l.nomUnite}</p>
                              </td>
                              <td className="text-right px-4 py-2 text-[--foreground-muted] text-xs">{l.quantiteCommandee}</td>
                              <td className="text-right px-4 py-2">
                                <span className={cn("text-xs font-semibold",
                                  l.quantiteRecue >= l.quantiteCommandee ? "text-[--success]" : "text-[--warning-foreground]"
                                )}>
                                  {l.quantiteRecue}/{l.quantiteCommandee}
                                </span>
                              </td>
                              <td className="text-right px-4 py-2 font-semibold text-xs">{formatMGA(l.totalHT, { compact: true })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Totaux */}
                  <div className="p-4 rounded-xl bg-[--background-subtle] space-y-1.5 text-sm">
                    <div className="flex justify-between text-[--foreground-muted]">
                      <span>Total HT</span>
                      <span className="font-semibold">{formatMGA(selectionBC.totalHT)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-[--foreground]">
                      <span>Total TTC</span>
                      <span>{formatMGA(selectionBC.totalTTC)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectionBC.notes && (
                    <p className="text-xs text-[--foreground-muted] bg-[--accent] rounded-lg p-3">{selectionBC.notes}</p>
                  )}

                  {/* PDF */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/achats/commandes/${selectionBC.id}/pdf`, "_blank")}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4" />
                    Imprimer / PDF
                  </Button>

                  {/* Actions selon statut */}
                  <div className="flex flex-col gap-2">
                    {selectionBC.statut === "brouillon" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowNouveauBC(true)}>
                          <Edit3 className="w-4 h-4" />Modifier
                        </Button>
                        <Button size="sm" className="flex-1"
                          disabled={actionEnCours === "envoyer"}
                          onClick={() => executerAction("envoyer", selectionBC.id)}
                        >
                          {actionEnCours === "envoyer" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Envoyer au fournisseur
                        </Button>
                      </div>
                    )}
                    {selectionBC.statut === "envoye" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1"
                          disabled={actionEnCours === "annuler"}
                          onClick={() => executerAction("annuler", selectionBC.id)}
                        >
                          <Trash2 className="w-4 h-4" />Annuler
                        </Button>
                        <Button size="sm" className="flex-1"
                          disabled={actionEnCours === "confirmer"}
                          onClick={() => executerAction("confirmer", selectionBC.id)}
                        >
                          {actionEnCours === "confirmer" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Marquer confirmé
                        </Button>
                      </div>
                    )}
                    {["confirme", "partiellement_recu"].includes(selectionBC.statut) && (
                      <Button size="sm" className="w-full"
                        onClick={() => setShowReception(true)}
                      >
                        <Package className="w-4 h-4" />
                        Enregistrer réception
                      </Button>
                    )}
                    {selectionBC.statut === "recu" && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[--success]/10 text-[--success] text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Commande entièrement reçue
                      </div>
                    )}
                    {["brouillon", "envoye"].includes(selectionBC.statut) && selectionBC.statut !== "envoye" && (
                      <Button variant="ghost" size="sm" className="text-[--destructive] hover:bg-[--destructive]/10"
                        disabled={actionEnCours === "annuler"}
                        onClick={() => executerAction("annuler", selectionBC.id)}
                      >
                        <Trash2 className="w-4 h-4" />Annuler le BC
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Modal Nouveau BC ── */}
      <AnimatePresence>
        {showNouveauBC && (
          <NouveauBCModal
            fournisseurs={fournisseurs}
            onClose={() => setShowNouveauBC(false)}
            onCreated={() => { setShowNouveauBC(false); charger(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Modal Nouveau / Edit Fournisseur ── */}
      <AnimatePresence>
        {(showNouveauFournisseur || fournisseurEdit) && (
          <FournisseurModal
            fournisseur={fournisseurEdit}
            onClose={() => { setShowNouveauFournisseur(false); setFournisseurEdit(null); }}
            onSaved={() => { setShowNouveauFournisseur(false); setFournisseurEdit(null); charger(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Modal Réception ── */}
      <AnimatePresence>
        {showReception && selectionBC && (
          <ReceptionModal
            bc={selectionBC}
            onClose={() => setShowReception(false)}
            onSaved={async () => {
              setShowReception(false);
              await charger();
              const res = await fetch(`/api/achats/commandes/${selectionBC.id}`);
              setSelectionBC(await res.json());
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Drawer fournisseur detail ── */}
      <AnimatePresence>
        {fournisseurDetail && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setFournisseurDetail(null)}
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 inset-y-0 z-50 w-full max-w-md flex flex-col shadow-2xl overflow-hidden"
              style={{ backgroundColor: "#232630", borderLeft: "1px solid #333744" }}
            >
              <div className="flex items-center gap-3 p-4 border-b shrink-0" style={{ borderColor: "#333744" }}>
                <div className="w-9 h-9 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center font-bold text-sm shrink-0">
                  {fournisseurDetail.nomCourt?.slice(0, 2).toUpperCase() ?? fournisseurDetail.nom.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{fournisseurDetail.nom}</p>
                  <p className="text-xs" style={{ color: "#666" }}>{fournisseurDetail.ville ?? ""} · J+{fournisseurDetail.conditionsPaiement}</p>
                </div>
                <button onClick={() => setFournisseurDetail(null)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "#666" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {loadingStats ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#FF4D00" }} /></div>
                ) : fournisseurStats ? (
                  <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Total achats", value: formatMGA(fournisseurStats.totalAchats12m, { compact: true }), color: "#3B82F6" },
                        { label: "Bons de commande", value: String(fournisseurStats.nbBonsTotal), color: "#8B5CF6" },
                        { label: "Délai moyen", value: fournisseurStats.delaiMoyen !== null ? `${fournisseurStats.delaiMoyen}j` : "—", color: "#F59E0B" },
                        { label: "Dette en cours", value: formatMGA(fournisseurDetail.detteEnCours, { compact: true }), color: fournisseurDetail.detteEnCours > 0 ? "#EF4444" : "#22C55E" },
                      ].map((k) => (
                        <div key={k.label} className="rounded-xl p-3" style={{ backgroundColor: "#1B1D24", border: "1px solid #333744" }}>
                          <p className="text-[10px] mb-1" style={{ color: "#666" }}>{k.label}</p>
                          <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Coordonnées */}
                    {(fournisseurDetail.contact || fournisseurDetail.telephone || fournisseurDetail.email) && (
                      <div className="rounded-xl p-3 space-y-1 text-sm" style={{ backgroundColor: "#1B1D24", border: "1px solid #333744" }}>
                        {fournisseurDetail.contact && <p style={{ color: "#888" }}><span style={{ color: "#555" }}>Contact : </span>{fournisseurDetail.contact}</p>}
                        {fournisseurDetail.telephone && <p style={{ color: "#888" }}><span style={{ color: "#555" }}>Tél : </span>{fournisseurDetail.telephone}</p>}
                        {fournisseurDetail.email && <p style={{ color: "#888" }}><span style={{ color: "#555" }}>Email : </span>{fournisseurDetail.email}</p>}
                        {fournisseurDetail.adresse && <p style={{ color: "#888" }}><span style={{ color: "#555" }}>Adresse : </span>{fournisseurDetail.adresse}</p>}
                      </div>
                    )}

                    {/* Derniers BCs */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555" }}>Derniers bons de commande</p>
                      {fournisseurStats.bons.length === 0 ? (
                        <p className="text-sm" style={{ color: "#555" }}>Aucun bon de commande</p>
                      ) : (
                        <div className="space-y-2">
                          {fournisseurStats.bons.slice(0, 8).map((b) => {
                            const conf = STATUT_CONF[b.statut as Statut];
                            return (
                              <div key={b.id} className="flex items-center gap-3 rounded-lg p-2.5" style={{ backgroundColor: "#1B1D24", border: "1px solid #333744" }}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white font-mono">{b.numero}</p>
                                  {b.dateCommande && (
                                    <p className="text-[10px]" style={{ color: "#555" }}>
                                      {new Date(b.dateCommande).toLocaleDateString("fr-FR")}
                                      {b.dateReceptionEffective && ` → reçu ${new Date(b.dateReceptionEffective).toLocaleDateString("fr-FR")}`}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs font-mono text-white">{formatMGA(b.totalTTC, { compact: true })}</span>
                                {conf && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#333744", color: "#888" }}>
                                    {conf.label}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "#555" }}>Impossible de charger les données</p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Modal : Nouveau Bon de Commande
─────────────────────────────────────────────── */
function NouveauBCModal({ fournisseurs, onClose, onCreated }: {
  fournisseurs: Fournisseur[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fournisseurId, setFournisseurId] = useState(fournisseurs[0]?.id ?? "");
  const [datePrevue, setDatePrevue] = useState("");
  const [refFourn, setRefFourn] = useState("");
  const [notes, setNotes] = useState("");
  const [lignes, setLignes] = useState([
    { nomProduit: "", nomUnite: "", quantiteCommandee: 1, prixUnitaireHT: 0, tauxTVA: 0 }
  ]);
  const [saving, setSaving] = useState(false);

  const addLigne = () => setLignes((prev) => [...prev, { nomProduit: "", nomUnite: "", quantiteCommandee: 1, prixUnitaireHT: 0, tauxTVA: 0 }]);
  const removeLigne = (i: number) => setLignes((prev) => prev.filter((_, idx) => idx !== i));
  const updateLigne = (i: number, field: string, value: string | number) =>
    setLignes((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const totalHT = lignes.reduce((s, l) => s + l.quantiteCommandee * l.prixUnitaireHT, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseurId) { toast.error("Sélectionnez un fournisseur"); return; }
    if (lignes.some((l) => !l.nomProduit)) { toast.error("Remplissez tous les produits"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/achats/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fournisseurId,
          dateLivraisonPrevue: datePrevue || null,
          referenceFournisseur: refFourn || null,
          notes: notes || null,
          lignes: lignes.map((l) => ({
            produitId: null,
            nomProduit: l.nomProduit,
            nomUnite: l.nomUnite || "Unité",
            facteurConversion: 1,
            quantiteCommandee: Number(l.quantiteCommandee),
            quantiteBase: Number(l.quantiteCommandee),
            prixUnitaireHT: Math.round(Number(l.prixUnitaireHT)),
            tauxTVA: Number(l.tauxTVA),
          })),
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Erreur"); return; }
      toast.success("Bon de commande créé");
      onCreated();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-2xl mx-auto bg-[--background] rounded-2xl border border-[--border] shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-[--border]">
            <h2 className="text-lg font-bold">Nouveau bon de commande</h2>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <div className="p-6 space-y-4">
            {/* Fournisseur */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Fournisseur *</label>
                <select
                  value={fournisseurId}
                  onChange={(e) => setFournisseurId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {fournisseurs.filter((f) => f.actif).map((f) => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Date livraison prévue</label>
                <Input type="date" value={datePrevue} onChange={(e) => setDatePrevue(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Réf. fournisseur</label>
                <Input value={refFourn} onChange={(e) => setRefFourn(e.target.value)} placeholder="Optionnel" className="mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Instructions de livraison, conditions particulières..."
                  className="mt-1 w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            {/* Lignes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Lignes de commande</label>
                <Button type="button" variant="outline" size="sm" onClick={addLigne}><Plus className="w-3 h-3" />Ajouter</Button>
              </div>
              <div className="space-y-2">
                {lignes.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-[--accent]">
                    <div className="col-span-4">
                      <Input
                        placeholder="Produit *"
                        value={l.nomProduit}
                        onChange={(e) => updateLigne(i, "nomProduit", e.target.value)}
                        required
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Unité"
                        value={l.nomUnite}
                        onChange={(e) => updateLigne(i, "nomUnite", e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number" min={1}
                        placeholder="Qté"
                        value={l.quantiteCommandee}
                        onChange={(e) => updateLigne(i, "quantiteCommandee", Number(e.target.value))}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number" min={0}
                        placeholder="Prix HT (Ar)"
                        value={l.prixUnitaireHT || ""}
                        onChange={(e) => updateLigne(i, "prixUnitaireHT", Number(e.target.value))}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {lignes.length > 1 && (
                        <button type="button" onClick={() => removeLigne(i)} className="text-[--destructive]/60 hover:text-[--destructive]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right text-sm font-semibold text-[--foreground]">
                Total HT : {formatMGA(totalHT)}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 pb-6">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ReceiptText className="w-4 h-4" />}
              Créer le bon de commande
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

/* ───────────────────────────────────────────────
   Modal : Fournisseur (create / edit)
─────────────────────────────────────────────── */
function FournisseurModal({ fournisseur, onClose, onSaved }: {
  fournisseur: Fournisseur | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nom: fournisseur?.nom ?? "",
    nomCourt: fournisseur?.nomCourt ?? "",
    contact: fournisseur?.contact ?? "",
    telephone: fournisseur?.telephone ?? "",
    email: fournisseur?.email ?? "",
    adresse: fournisseur?.adresse ?? "",
    ville: fournisseur?.ville ?? "",
    nif: fournisseur?.nif ?? "",
    conditionsPaiement: fournisseur?.conditionsPaiement ?? 30,
    notes: fournisseur?.notes ?? "",
    actif: fournisseur?.actif ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) { toast.error("Le nom est requis"); return; }
    setSaving(true);
    try {
      const url = fournisseur ? `/api/achats/fournisseurs/${fournisseur.id}` : "/api/achats/fournisseurs";
      const res = await fetch(url, {
        method: fournisseur ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Erreur"); return; }
      toast.success(fournisseur ? "Fournisseur modifié" : "Fournisseur créé");
      onSaved();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto bg-[--background] rounded-2xl border border-[--border] shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-[--border]">
            <h2 className="text-lg font-bold">{fournisseur ? "Modifier fournisseur" : "Nouveau fournisseur"}</h2>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Nom *</label>
              <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} required className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Nom court</label>
              <Input value={form.nomCourt} onChange={(e) => set("nomCourt", e.target.value)} placeholder="Abréviation" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">NIF</label>
              <Input value={form.nif} onChange={(e) => set("nif", e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Contact</label>
              <Input value={form.contact} onChange={(e) => set("contact", e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Téléphone</label>
              <Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Email</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Ville</label>
              <Input value={form.ville} onChange={(e) => set("ville", e.target.value)} className="mt-1" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Adresse</label>
              <Input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Délai paiement (jours)</label>
              <Input type="number" min={0} value={form.conditionsPaiement} onChange={(e) => set("conditionsPaiement", Number(e.target.value))} className="mt-1" />
            </div>
            {fournisseur && (
              <div className="flex items-center gap-3 mt-2">
                <input type="checkbox" id="actif" checked={form.actif} onChange={(e) => set("actif", e.target.checked)} className="w-4 h-4" />
                <label htmlFor="actif" className="text-sm text-[--foreground]">Fournisseur actif</label>
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 pb-6">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              {fournisseur ? "Enregistrer" : "Créer le fournisseur"}
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

/* ───────────────────────────────────────────────
   Modal : Réception
─────────────────────────────────────────────── */
function ReceptionModal({ bc, onClose, onSaved }: {
  bc: BonCommandeDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qtesRecues, setQtesRecues] = useState<Record<string, number>>(
    Object.fromEntries(bc.lignes.map((l) => [l.id, l.quantiteCommandee - l.quantiteRecue]))
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<{ id: string; nom: string; estPrincipal: boolean }[]>([]);
  const [selectedDepotId, setSelectedDepotId] = useState<string>(bc.depotId ?? "");

  useEffect(() => {
    fetch("/api/depots")
      .then(r => r.json())
      .then(d => {
        const list = d.depots ?? [];
        setDepots(list);
        // Pré-sélectionner le dépôt du BC, sinon le dépôt principal, sinon le premier
        if (!selectedDepotId && list.length > 0) {
          const principal = list.find((d: { estPrincipal: boolean }) => d.estPrincipal);
          setSelectedDepotId(principal?.id ?? list[0]?.id ?? "");
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lignesRecep = bc.lignes
      .filter((l) => (qtesRecues[l.id] ?? 0) > 0)
      .map((l) => ({
        ligneBCId: l.id,
        produitId: l.produitId,
        quantiteRecue: qtesRecues[l.id] ?? 0,
        quantiteBase: qtesRecues[l.id] ?? 0,
      }));
    if (lignesRecep.length === 0) { toast.error("Aucune quantité renseignée"); return; }
    if (!selectedDepotId) { toast.error("Sélectionnez un dépôt de destination"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/achats/receptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonCommandeId: bc.id,
          depotId: selectedDepotId,
          notes: notes || null,
          lignes: lignesRecep,
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Erreur"); return; }
      toast.success("Réception enregistrée — stock mis à jour");
      onSaved();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto bg-[--background] rounded-2xl border border-[--border] shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-[--border]">
            <div>
              <h2 className="text-lg font-bold">Enregistrer une réception</h2>
              <p className="text-xs text-[--foreground-muted] mt-0.5">{bc.numero} — {bc.fournisseurNom}</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <div className="p-6 space-y-4">
            {/* Sélecteur dépôt destination */}
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">
                Dépôt de destination *
              </label>
              {depots.length === 0 ? (
                <p className="mt-1 text-xs text-[--foreground-muted]">Aucun dépôt actif — créez-en un dans Admin → Dépôts</p>
              ) : (
                <select
                  value={selectedDepotId}
                  onChange={e => setSelectedDepotId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm"
                >
                  <option value="">— Choisir un dépôt —</option>
                  {depots.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nom}{d.estPrincipal ? " ★" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider mb-2">Quantités reçues</p>
              <div className="space-y-2">
                {bc.lignes.map((l) => {
                  const restant = l.quantiteCommandee - l.quantiteRecue;
                  return (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-[--accent]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[--foreground] truncate">{l.nomProduit}</p>
                        <p className="text-[10px] text-[--foreground-muted]">{l.nomUnite} · Restant : {restant}</p>
                      </div>
                      <Input
                        type="number" min={0} max={restant}
                        value={qtesRecues[l.id] ?? 0}
                        onChange={(e) => setQtesRecues((q) => ({ ...q, [l.id]: Number(e.target.value) }))}
                        className="w-24 text-right h-8 text-sm"
                        disabled={restant <= 0}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[--foreground-muted] uppercase tracking-wider">Notes / Anomalies</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Produits endommagés, quantités incorrectes..."
                className="mt-1 w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 pb-6">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Valider la réception
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
