"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Download,
  AlertCircle,
  Award,
  TrendingUp,
  Phone,
  MapPin,
  X,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Palier = "gros" | "semi_gros" | "detail";
type Statut = "actif" | "inactif" | "depassement";

interface ClientDemo {
  id: string;
  nom: string;
  contact: string;
  telephone: string;
  ville: string;
  palier: Palier;
  encours: number;
  plafondCredit: number;
  pointsFidelite: number;
  totalCA: number;
  statut: Statut;
  derniereCommande: string;
  nbCommandes: number;
}

const CLIENTS_DEMO: ClientDemo[] = [
  {
    id: "c1", nom: "Épicerie Rabe", contact: "Mme Rasoa",
    telephone: "+261 34 12 345 67", ville: "Antananarivo",
    palier: "gros", encours: 4_500_000, plafondCredit: 8_000_000,
    pointsFidelite: 1_240, totalCA: 48_500_000,
    statut: "actif", derniereCommande: "2026-05-12", nbCommandes: 87,
  },
  {
    id: "c2", nom: "Tana Distribution", contact: "M. Andry",
    telephone: "+261 33 55 678 90", ville: "Antananarivo",
    palier: "gros", encours: 9_200_000, plafondCredit: 7_000_000,
    pointsFidelite: 2_180, totalCA: 124_300_000,
    statut: "depassement", derniereCommande: "2026-05-13", nbCommandes: 142,
  },
  {
    id: "c3", nom: "Magasin Soa", contact: "Mme Hery",
    telephone: "+261 32 11 223 34", ville: "Tamatave",
    palier: "semi_gros", encours: 850_000, plafondCredit: 2_000_000,
    pointsFidelite: 420, totalCA: 8_900_000,
    statut: "actif", derniereCommande: "2026-05-11", nbCommandes: 34,
  },
  {
    id: "c4", nom: "Boutique Tiana", contact: "M. Naivo",
    telephone: "+261 34 78 901 23", ville: "Mahajanga",
    palier: "detail", encours: 0, plafondCredit: 500_000,
    pointsFidelite: 95, totalCA: 1_240_000,
    statut: "actif", derniereCommande: "2026-05-10", nbCommandes: 12,
  },
  {
    id: "c5", nom: "Coopérative Vita", contact: "Mme Lalao",
    telephone: "+261 33 44 567 89", ville: "Fianarantsoa",
    palier: "semi_gros", encours: 1_650_000, plafondCredit: 3_000_000,
    pointsFidelite: 780, totalCA: 22_700_000,
    statut: "actif", derniereCommande: "2026-05-13", nbCommandes: 56,
  },
  {
    id: "c6", nom: "Snack Mamy", contact: "M. Rakoto",
    telephone: "+261 34 23 456 78", ville: "Antsirabe",
    palier: "detail", encours: 120_000, plafondCredit: 300_000,
    pointsFidelite: 45, totalCA: 680_000,
    statut: "inactif", derniereCommande: "2026-03-22", nbCommandes: 7,
  },
];

const PALIER_LABEL: Record<Palier, string> = {
  gros: "Gros",
  semi_gros: "Semi-gros",
  detail: "Détail",
};

function tierFidelite(points: number): { nom: string; couleur: string } {
  if (points >= 2000) return { nom: "Platine", couleur: "text-[--foreground] bg-[--foreground]/10" };
  if (points >= 1000) return { nom: "Or", couleur: "text-[--warning-foreground] bg-[--warning]/20" };
  if (points >= 300) return { nom: "Argent", couleur: "text-[--foreground-muted] bg-[--border]" };
  return { nom: "Bronze", couleur: "text-[--warning-foreground] bg-[--warning]/10" };
}

const COMMANDES_FAKE = [
  { id: "CMD-2034", date: "2026-05-12", montant: 1_240_000, statut: "Livrée" },
  { id: "CMD-2018", date: "2026-05-08", montant: 890_000, statut: "Livrée" },
  { id: "CMD-1987", date: "2026-05-03", montant: 2_100_000, statut: "Livrée" },
  { id: "CMD-1954", date: "2026-04-28", montant: 540_000, statut: "Livrée" },
  { id: "CMD-1921", date: "2026-04-22", montant: 1_780_000, statut: "Livrée" },
];

export function ClientsView() {
  const [recherche, setRecherche] = useState("");
  const [palierFiltre, setPalierFiltre] = useState<Palier | "tous">("tous");
  const [selection, setSelection] = useState<ClientDemo | null>(null);

  const clients = useMemo(() => {
    const q = recherche.toLowerCase();
    return CLIENTS_DEMO.filter((c) => {
      const matchQ = !q || c.nom.toLowerCase().includes(q) || c.ville.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q);
      const matchP = palierFiltre === "tous" || c.palier === palierFiltre;
      return matchQ && matchP;
    });
  }, [recherche, palierFiltre]);

  const stats = useMemo(() => {
    const actifs = CLIENTS_DEMO.filter((c) => c.statut !== "inactif").length;
    const encours = CLIENTS_DEMO.reduce((s, c) => s + c.encours, 0);
    const depassements = CLIENTS_DEMO.filter((c) => c.statut === "depassement").length;
    return { actifs, encours, depassements };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">CRM Clients</h1>
          <p className="text-[--foreground-muted] mt-1">Gestion relations & encours</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nouveau client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Clients actifs", valeur: stats.actifs.toString(), sous: `sur ${CLIENTS_DEMO.length} total`, icon: Users, couleur: "text-[--primary]" },
          { label: "Encours total", valeur: formatMGA(stats.encours, { compact: true }), sous: "Crédit utilisé", icon: CreditCard, couleur: "text-[--foreground-muted]" },
          { label: "Dépassements", valeur: stats.depassements.toString(), sous: "À relancer", icon: AlertCircle, couleur: "text-[--destructive]" },
          { label: "Nouveaux ce mois", valeur: "4", sous: "+33% vs avril", icon: TrendingUp, couleur: "text-[--success]" },
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

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-subtle]" />
          <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un client, une ville..." className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(["tous", "gros", "semi_gros", "detail"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPalierFiltre(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                palierFiltre === p
                  ? "bg-[--primary] text-[--primary-foreground] border-[--primary]"
                  : "border-[--border] text-[--foreground-muted] hover:border-[--border-strong] hover:text-[--foreground]"
              )}
            >
              {p === "tous" ? "Tous" : PALIER_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[--background-subtle] border-b border-[--border]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Client</th>
                  <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Palier</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Encours / Plafond</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden md:table-cell">Fidélité</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden lg:table-cell">CA total</th>
                  <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {clients.map((c, i) => {
                  const tier = tierFidelite(c.pointsFidelite);
                  const tauxCredit = c.plafondCredit > 0 ? (c.encours / c.plafondCredit) * 100 : 0;
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelection(c)}
                      className="hover:bg-[--accent] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center font-semibold text-sm">
                            {c.nom.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[--foreground]">{c.nom}</p>
                            <p className="text-[11px] text-[--foreground-muted]">{c.contact} · {c.ville}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3">
                        <Badge
                          variant={c.palier === "gros" ? "default" : c.palier === "semi_gros" ? "warning" : "outline"}
                          className="text-[10px]"
                        >
                          {PALIER_LABEL[c.palier]}
                        </Badge>
                      </td>
                      <td className="text-right px-4 py-3">
                        <p className={cn("font-bold text-mga", c.statut === "depassement" ? "text-[--destructive]" : "text-[--foreground]")}>
                          {formatMGA(c.encours, { compact: true })}
                        </p>
                        <p className="text-[10px] text-[--foreground-subtle]">/ {formatMGA(c.plafondCredit, { compact: true })}</p>
                        <div className="w-24 h-1 bg-[--border] rounded-full mt-1 ml-auto">
                          <div
                            className={cn("h-full rounded-full", tauxCredit > 100 ? "bg-[--destructive]" : tauxCredit > 80 ? "bg-[--warning]" : "bg-[--success]")}
                            style={{ width: `${Math.min(100, tauxCredit)}%` }}
                          />
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 hidden md:table-cell">
                        <div className="inline-flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[--warning-foreground]" />
                          <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", tier.couleur)}>{tier.nom}</span>
                        </div>
                        <p className="text-[10px] text-[--foreground-muted] mt-0.5">{c.pointsFidelite} pts</p>
                      </td>
                      <td className="text-right px-4 py-3 hidden lg:table-cell">
                        <p className="font-medium text-mga text-sm">{formatMGA(c.totalCA, { compact: true })}</p>
                        <p className="text-[10px] text-[--foreground-muted]">{c.nbCommandes} cmd</p>
                      </td>
                      <td className="text-center px-4 py-3">
                        {c.statut === "depassement" ? (
                          <Badge variant="destructive" className="text-[10px]">Dépassement</Badge>
                        ) : c.statut === "inactif" ? (
                          <Badge variant="outline" className="text-[10px]">Inactif</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">Actif</Badge>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selection && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelection(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[--background] border-l border-[--border] z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-2">{PALIER_LABEL[selection.palier]}</Badge>
                    <h2 className="text-xl font-bold text-[--foreground]">{selection.nom}</h2>
                    <p className="text-sm text-[--foreground-muted]">{selection.contact}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSelection(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[--foreground-muted]">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selection.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[--foreground-muted]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selection.ville}</span>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[--foreground-muted]">Crédit utilisé</span>
                      <span className="text-xs font-semibold text-mga">
                        {formatMGA(selection.encours)} / {formatMGA(selection.plafondCredit)}
                      </span>
                    </div>
                    <div className="h-2 bg-[--border] rounded-full">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          selection.statut === "depassement" ? "bg-[--destructive]" : "bg-[--primary]"
                        )}
                        style={{ width: `${Math.min(100, (selection.encours / selection.plafondCredit) * 100)}%` }}
                      />
                    </div>
                    {selection.statut === "depassement" && (
                      <p className="text-[11px] text-[--destructive] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Plafond dépassé — relance à faire
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[--foreground-muted]">Programme fidélité</span>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", tierFidelite(selection.pointsFidelite).couleur)}>
                        {tierFidelite(selection.pointsFidelite).nom}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-[--foreground] text-mga">{selection.pointsFidelite}</p>
                    <p className="text-xs text-[--foreground-muted]">points cumulés</p>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="text-sm font-semibold text-[--foreground] mb-2 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Dernières commandes
                  </h3>
                  <div className="space-y-1.5">
                    {COMMANDES_FAKE.map((cmd) => (
                      <div key={cmd.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-[--border] text-sm">
                        <div>
                          <p className="font-mono text-xs text-[--foreground]">{cmd.id}</p>
                          <p className="text-[10px] text-[--foreground-muted]">{cmd.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-mga text-xs">{formatMGA(cmd.montant, { compact: true })}</p>
                          <Badge variant="success" className="text-[9px] mt-0.5">{cmd.statut}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">Modifier</Button>
                  <Button size="sm" className="flex-1">Nouvelle commande</Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
