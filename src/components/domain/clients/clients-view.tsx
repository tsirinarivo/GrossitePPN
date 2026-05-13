"use client";

import { useMemo, useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Palier = "gros" | "semi_gros" | "detail";

interface ClientDB {
  id: string;
  code: string;
  raisonSociale: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  palier: Palier;
  creditAutorise: boolean;
  plafondCredit: number;
  encoursCourant: number;
  pointsFidelite: number;
  statutFidelite: string | null;
  totalAchats: number;
  nbCommandes: number;
  panierMoyen: number | null;
  dernierAchat: string | null;
  actif: boolean;
  notes: string | null;
  createdAt: string;
}

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

function getStatut(c: ClientDB): "actif" | "inactif" | "depassement" {
  if (!c.actif) return "inactif";
  if (c.plafondCredit > 0 && c.encoursCourant > c.plafondCredit) return "depassement";
  return "actif";
}

export function ClientsView() {
  const [recherche, setRecherche] = useState("");
  const [palierFiltre, setPalierFiltre] = useState<Palier | "tous">("tous");
  const [selection, setSelection] = useState<ClientDB | null>(null);
  const [clientsDB, setClientsDB] = useState<ClientDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: ClientDB[]) => setClientsDB(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clients = useMemo(() => {
    const q = recherche.toLowerCase();
    return clientsDB.filter((c) => {
      const matchQ =
        !q ||
        c.raisonSociale.toLowerCase().includes(q) ||
        (c.telephone ?? "").toLowerCase().includes(q) ||
        (c.adresse ?? "").toLowerCase().includes(q);
      const matchP = palierFiltre === "tous" || c.palier === palierFiltre;
      return matchQ && matchP;
    });
  }, [recherche, palierFiltre, clientsDB]);

  const stats = useMemo(() => {
    const actifs = clientsDB.filter((c) => c.actif).length;
    const encours = clientsDB.reduce((s, c) => s + c.encoursCourant, 0);
    const depassements = clientsDB.filter((c) => getStatut(c) === "depassement").length;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const nouveaux = clientsDB.filter((c) => new Date(c.createdAt) >= thisMonth).length;
    return { actifs, encours, depassements, nouveaux };
  }, [clientsDB]);

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
          { label: "Clients actifs", valeur: stats.actifs.toString(), sous: `sur ${clientsDB.length} total`, icon: Users, couleur: "text-[--primary]" },
          { label: "Encours total", valeur: formatMGA(stats.encours, { compact: true }), sous: "Crédit utilisé", icon: CreditCard, couleur: "text-[--foreground-muted]" },
          { label: "Dépassements", valeur: stats.depassements.toString(), sous: "À relancer", icon: AlertCircle, couleur: "text-[--destructive]" },
          { label: "Nouveaux ce mois", valeur: stats.nouveaux.toString(), sous: "Nouveaux clients", icon: TrendingUp, couleur: "text-[--success]" },
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

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-subtle]" />
          <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un client, téléphone..." className="pl-9" />
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
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[--foreground-muted]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-muted]">
                <Users className="w-10 h-10 opacity-30" />
                <p className="text-sm">
                  {clientsDB.length === 0 ? "Aucun client enregistré" : "Aucun client correspond aux filtres"}
                </p>
                {clientsDB.length === 0 && (
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                    Ajouter le premier client
                  </Button>
                )}
              </div>
            ) : (
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
                    const statut = getStatut(c);
                    const tauxCredit = c.plafondCredit > 0 ? (c.encoursCourant / c.plafondCredit) * 100 : 0;
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
                              {c.raisonSociale.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[--foreground]">{c.raisonSociale}</p>
                              <p className="text-[11px] text-[--foreground-muted]">{c.telephone ?? c.email ?? c.code}</p>
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
                          <p className={cn("font-bold", statut === "depassement" ? "text-[--destructive]" : "text-[--foreground]")}>
                            {formatMGA(c.encoursCourant, { compact: true })}
                          </p>
                          <p className="text-[10px] text-[--foreground-subtle]">/ {formatMGA(c.plafondCredit, { compact: true })}</p>
                          {c.plafondCredit > 0 && (
                            <div className="w-24 h-1 bg-[--border] rounded-full mt-1 ml-auto">
                              <div
                                className={cn("h-full rounded-full", tauxCredit > 100 ? "bg-[--destructive]" : tauxCredit > 80 ? "bg-[--warning]" : "bg-[--success]")}
                                style={{ width: `${Math.min(100, tauxCredit)}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="text-right px-4 py-3 hidden md:table-cell">
                          <div className="inline-flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-[--warning-foreground]" />
                            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", tier.couleur)}>{tier.nom}</span>
                          </div>
                          <p className="text-[10px] text-[--foreground-muted] mt-0.5">{c.pointsFidelite} pts</p>
                        </td>
                        <td className="text-right px-4 py-3 hidden lg:table-cell">
                          <p className="font-medium text-sm">{formatMGA(c.totalAchats, { compact: true })}</p>
                          <p className="text-[10px] text-[--foreground-muted]">{c.nbCommandes} cmd</p>
                        </td>
                        <td className="text-center px-4 py-3">
                          {statut === "depassement" ? (
                            <Badge variant="destructive" className="text-[10px]">Dépassement</Badge>
                          ) : statut === "inactif" ? (
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
            )}
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
                    <h2 className="text-xl font-bold text-[--foreground]">{selection.raisonSociale}</h2>
                    <p className="text-sm text-[--foreground-muted]">{selection.code}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSelection(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  {selection.telephone && (
                    <div className="flex items-center gap-2 text-[--foreground-muted]">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selection.telephone}</span>
                    </div>
                  )}
                  {selection.adresse && (
                    <div className="flex items-center gap-2 text-[--foreground-muted]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{selection.adresse}</span>
                    </div>
                  )}
                </div>

                {selection.plafondCredit > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[--foreground-muted]">Crédit utilisé</span>
                        <span className="text-xs font-semibold">
                          {formatMGA(selection.encoursCourant)} / {formatMGA(selection.plafondCredit)}
                        </span>
                      </div>
                      <div className="h-2 bg-[--border] rounded-full">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            getStatut(selection) === "depassement" ? "bg-[--destructive]" : "bg-[--primary]"
                          )}
                          style={{ width: `${Math.min(100, (selection.encoursCourant / selection.plafondCredit) * 100)}%` }}
                        />
                      </div>
                      {getStatut(selection) === "depassement" && (
                        <p className="text-[11px] text-[--destructive] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Plafond dépassé — relance à faire
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[--foreground-muted]">Programme fidélité</span>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", tierFidelite(selection.pointsFidelite).couleur)}>
                        {tierFidelite(selection.pointsFidelite).nom}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-[--foreground]">{selection.pointsFidelite}</p>
                    <p className="text-xs text-[--foreground-muted]">points cumulés</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-[--border] p-3">
                    <p className="text-xs text-[--foreground-muted]">CA total</p>
                    <p className="font-bold mt-0.5">{formatMGA(selection.totalAchats, { compact: true })}</p>
                  </div>
                  <div className="rounded-lg border border-[--border] p-3">
                    <p className="text-xs text-[--foreground-muted]">Commandes</p>
                    <p className="font-bold mt-0.5">{selection.nbCommandes}</p>
                  </div>
                </div>

                {selection.notes && (
                  <div className="rounded-lg bg-[--background-subtle] p-3">
                    <p className="text-xs font-medium text-[--foreground-muted] mb-1">Notes</p>
                    <p className="text-sm text-[--foreground]">{selection.notes}</p>
                  </div>
                )}

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
