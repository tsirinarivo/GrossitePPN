"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Plus,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  X,
  ChevronRight,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Statut = "brouillon" | "envoye" | "confirme" | "partiellement_recu" | "recu" | "annule";
type Vue = "bons_commande" | "fournisseurs";

interface BonCommande {
  id: string;
  numero: string;
  fournisseur: string;
  dateCommande: string;
  datePrevue: string;
  statut: Statut;
  totalHT: number;
  totalTTC: number;
  nbLignes: number;
  referenceFournisseur?: string;
}

interface Fournisseur {
  id: string;
  nom: string;
  contact?: string;
  telephone?: string;
  email?: string;
  ville?: string;
  conditionsPaiement: number;
  nbCommandes: number;
  totalAchats: number;
  actif: boolean;
}

const BONS_DEMO: BonCommande[] = [
  { id: "bc1", numero: "BC-2026-0034", fournisseur: "Importateur RizCo MG", dateCommande: "2026-05-10", datePrevue: "2026-05-17", statut: "confirme", totalHT: 12_500_000, totalTTC: 12_500_000, nbLignes: 3 },
  { id: "bc2", numero: "BC-2026-0035", fournisseur: "Huileries de Madagascar", dateCommande: "2026-05-11", datePrevue: "2026-05-18", statut: "envoye", totalHT: 4_200_000, totalTTC: 4_200_000, nbLignes: 2, referenceFournisseur: "HM-2026-089" },
  { id: "bc3", numero: "BC-2026-0033", fournisseur: "SIRAMA Sucre", dateCommande: "2026-05-08", datePrevue: "2026-05-14", statut: "recu", totalHT: 22_000_000, totalTTC: 22_000_000, nbLignes: 1 },
  { id: "bc4", numero: "BC-2026-0032", fournisseur: "Importateur RizCo MG", dateCommande: "2026-05-05", datePrevue: "2026-05-12", statut: "partiellement_recu", totalHT: 8_000_000, totalTTC: 8_000_000, nbLignes: 4 },
  { id: "bc5", numero: "BC-2026-0036", fournisseur: "Madar SARL", dateCommande: "2026-05-13", datePrevue: "2026-05-20", statut: "brouillon", totalHT: 3_600_000, totalTTC: 3_600_000, nbLignes: 5 },
];

const FOURNISSEURS_DEMO: Fournisseur[] = [
  { id: "f1", nom: "Importateur RizCo MG", contact: "M. Randria", telephone: "+261 34 00 111 22", email: "contact@rizco.mg", ville: "Antananarivo", conditionsPaiement: 30, nbCommandes: 24, totalAchats: 145_000_000, actif: true },
  { id: "f2", nom: "Huileries de Madagascar", contact: "Mme Ratsima", telephone: "+261 33 00 222 33", ville: "Tamatave", conditionsPaiement: 15, nbCommandes: 18, totalAchats: 54_000_000, actif: true },
  { id: "f3", nom: "SIRAMA Sucre", contact: "M. Rakoton.", telephone: "+261 34 00 333 44", ville: "Mahajanga", conditionsPaiement: 45, nbCommandes: 12, totalAchats: 88_000_000, actif: true },
  { id: "f4", nom: "Madar SARL", contact: "Mme Ravelona", telephone: "+261 32 00 444 55", ville: "Antananarivo", conditionsPaiement: 30, nbCommandes: 9, totalAchats: 22_000_000, actif: true },
  { id: "f5", nom: "Import Export Tana", contact: "M. Razafin.", telephone: "+261 34 00 555 66", ville: "Antananarivo", conditionsPaiement: 60, nbCommandes: 3, totalAchats: 8_000_000, actif: false },
];

const STATUT_CONF: Record<Statut, { label: string; variant: "default" | "success" | "warning" | "outline" | "destructive"; icon: typeof Clock }> = {
  brouillon: { label: "Brouillon", variant: "outline", icon: FileText },
  envoye: { label: "Envoyé", variant: "default", icon: Send },
  confirme: { label: "Confirmé", variant: "warning", icon: CheckCircle2 },
  partiellement_recu: { label: "Partiel", variant: "warning", icon: Package },
  recu: { label: "Reçu", variant: "success", icon: CheckCircle2 },
  annule: { label: "Annulé", variant: "destructive", icon: AlertCircle },
};

const LIGNES_BC_DEMO = [
  { produit: "Riz Makalioka", unite: "Sac 50 kg", qteCmd: 200, qteRecue: 200, prixHT: 48_000, totalHT: 9_600_000 },
  { produit: "Riz Makalioka Supérieur", unite: "Sac 50 kg", qteCmd: 50, qteRecue: 50, prixHT: 58_000, totalHT: 2_900_000 },
];

export function AchatsView() {
  const [vue, setVue] = useState<Vue>("bons_commande");
  const [recherche, setRecherche] = useState("");
  const [selectionBC, setSelectionBC] = useState<BonCommande | null>(null);

  const bonsFiltres = BONS_DEMO.filter((bc) => {
    const q = recherche.toLowerCase();
    return !q || bc.numero.toLowerCase().includes(q) || bc.fournisseur.toLowerCase().includes(q);
  });

  const stats = {
    enAttente: BONS_DEMO.filter((b) => ["envoye", "confirme"].includes(b.statut)).length,
    totalMoisHT: BONS_DEMO.reduce((s, b) => s + b.totalHT, 0),
    fournisseursActifs: FOURNISSEURS_DEMO.filter((f) => f.actif).length,
    receptionsEnCours: BONS_DEMO.filter((b) => b.statut === "partiellement_recu").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Achats & Fournisseurs</h1>
          <p className="text-[--foreground-muted] mt-1">Bons de commande, réceptions, valorisation stock</p>
        </div>
        <div className="flex gap-2">
          {vue === "bons_commande" && (
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Nouveau BC
            </Button>
          )}
          {vue === "fournisseurs" && (
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Nouveau fournisseur
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "BC en attente", valeur: stats.enAttente.toString(), sous: "Envoyés / Confirmés", icon: Clock, couleur: "text-[--warning-foreground]" },
          { label: "Achats du mois", valeur: formatMGA(stats.totalMoisHT, { compact: true }), sous: "Valeur HT totale", icon: ShoppingBag, couleur: "text-[--primary]" },
          { label: "Fournisseurs actifs", valeur: stats.fournisseursActifs.toString(), sous: `sur ${FOURNISSEURS_DEMO.length} total`, icon: Building2, couleur: "text-[--foreground-muted]" },
          { label: "Réceptions en cours", valeur: stats.receptionsEnCours.toString(), sous: "Livraisons partielles", icon: Truck, couleur: "text-[--success]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[--foreground-muted]">{s.label}</p>
                    <p className="text-xl font-bold text-[--foreground] mt-1 text-mga">{s.valeur}</p>
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

      <div className="flex items-center gap-2">
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

      {vue === "bons_commande" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[--background-subtle] border-b border-[--border]">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">N° BC</th>
                      <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Fournisseur</th>
                      <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Statut</th>
                      <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden md:table-cell">Date commande</th>
                      <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden md:table-cell">Date prévue</th>
                      <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Total HT</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--border]">
                    {bonsFiltres.map((bc, i) => {
                      const conf = STATUT_CONF[bc.statut];
                      return (
                        <motion.tr
                          key={bc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => setSelectionBC(bc)}
                          className="hover:bg-[--accent] cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-semibold text-[--foreground]">{bc.numero}</p>
                            {bc.referenceFournisseur && <p className="text-[10px] text-[--foreground-muted]">Réf. {bc.referenceFournisseur}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[--foreground]">{bc.fournisseur}</p>
                            <p className="text-[10px] text-[--foreground-muted]">{bc.nbLignes} ligne{bc.nbLignes > 1 ? "s" : ""}</p>
                          </td>
                          <td className="text-center px-4 py-3">
                            <Badge variant={conf.variant} className="text-[10px] inline-flex items-center gap-1">
                              <conf.icon className="w-3 h-3" />
                              {conf.label}
                            </Badge>
                          </td>
                          <td className="text-right px-4 py-3 hidden md:table-cell text-[--foreground-muted] text-xs">{bc.dateCommande}</td>
                          <td className="text-right px-4 py-3 hidden md:table-cell text-[--foreground-muted] text-xs">{bc.datePrevue}</td>
                          <td className="text-right px-4 py-3 font-semibold text-mga">{formatMGA(bc.totalHT, { compact: true })}</td>
                          <td className="px-4 py-3">
                            <ChevronRight className="w-4 h-4 text-[--foreground-subtle]" />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {vue === "fournisseurs" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-3">
          {FOURNISSEURS_DEMO.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center font-bold text-sm shrink-0">
                    {f.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[--foreground] truncate">{f.nom}</p>
                      {!f.actif && <Badge variant="outline" className="text-[9px]">Inactif</Badge>}
                    </div>
                    <p className="text-xs text-[--foreground-muted] mt-0.5">
                      {f.contact && `${f.contact} · `}{f.ville} · Paiement J+{f.conditionsPaiement}
                    </p>
                    {f.telephone && <p className="text-[10px] text-[--foreground-subtle] font-mono">{f.telephone}</p>}
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-[--foreground-muted]">{f.nbCommandes} BC</p>
                    <p className="font-semibold text-mga text-sm">{formatMGA(f.totalAchats, { compact: true })}</p>
                  </div>
                  <Button variant="outline" size="sm">Modifier</Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {selectionBC && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectionBC(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[--background] border-l border-[--border] z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-xs text-[--foreground-subtle]">{selectionBC.numero}</p>
                    <h2 className="text-xl font-bold text-[--foreground] mt-0.5">{selectionBC.fournisseur}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      {(() => {
                        const conf = STATUT_CONF[selectionBC.statut];
                        return (
                          <Badge variant={conf.variant} className="text-xs inline-flex items-center gap-1">
                            <conf.icon className="w-3.5 h-3.5" />
                            {conf.label}
                          </Badge>
                        );
                      })()}
                      <span className="text-xs text-[--foreground-muted]">Prévu le {selectionBC.datePrevue}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSelectionBC(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Card>
                  <CardHeader>
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
                        {LIGNES_BC_DEMO.map((l, i) => (
                          <tr key={i} className="hover:bg-[--accent]">
                            <td className="px-4 py-2">
                              <p className="font-medium text-[--foreground]">{l.produit}</p>
                              <p className="text-[10px] text-[--foreground-muted]">{l.unite}</p>
                            </td>
                            <td className="text-right px-4 py-2 text-[--foreground-muted] text-xs">{l.qteCmd}</td>
                            <td className="text-right px-4 py-2">
                              <span className={cn("text-xs font-semibold", l.qteRecue >= l.qteCmd ? "text-[--success]" : "text-[--warning-foreground]")}>
                                {l.qteRecue}/{l.qteCmd}
                              </span>
                            </td>
                            <td className="text-right px-4 py-2 font-semibold text-mga text-xs">{formatMGA(l.totalHT, { compact: true })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <div className="p-4 rounded-xl bg-[--background-subtle] space-y-1 text-sm">
                  <div className="flex justify-between text-[--foreground-muted]">
                    <span>Total HT</span>
                    <span className="text-mga font-semibold">{formatMGA(selectionBC.totalHT)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[--foreground]">
                    <span>Total TTC</span>
                    <span className="text-mga">{formatMGA(selectionBC.totalTTC)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectionBC.statut === "brouillon" && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1">Modifier</Button>
                      <Button size="sm" className="flex-1">
                        <Send className="w-4 h-4" />
                        Envoyer au fournisseur
                      </Button>
                    </>
                  )}
                  {["confirme", "partiellement_recu"].includes(selectionBC.statut) && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1">Voir BC PDF</Button>
                      <Button size="sm" className="flex-1">
                        <Package className="w-4 h-4" />
                        Enregistrer réception
                      </Button>
                    </>
                  )}
                  {selectionBC.statut === "recu" && (
                    <Button variant="outline" size="sm" className="flex-1">Voir BC PDF</Button>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
