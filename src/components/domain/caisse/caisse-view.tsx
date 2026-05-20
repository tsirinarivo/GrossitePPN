"use client";

import { useState, useCallback, useEffect } from "react";
import { useCommandeStream } from "@/hooks/use-commande-stream";
import type { CommandeEvent, CommandeAnnuleeEvent } from "@/lib/sse/broadcast";
import {
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Globe,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Banknote,
  Smartphone,
  CreditCard,
  Printer,
  FileText,
  Loader2,
  Wifi,
  Menu,
  Ban,
  Trash2,
  BarChart2,
  X,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type CommandeFile = {
  id: string;
  numero: string;
  client: string;
  montant: number;
  nbArticles: number;
  source: "pos_agent" | "ecommerce";
  agentNom?: string;
  soumiseAt: string;
  priorite: number;
  statut: "en_attente" | "en_cours";
};

type Ligne = {
  id: string;
  nom: string;
  unite: string;
  qte: number;
  prix: number;
  total: number;
  tauxTVA: number;
  totalTTC: number;
};

type CommandeDetail = {
  id: string;
  numero: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  assujettieTV: boolean;
};

export function CaisseView() {
  const [fileCommandes, setFileCommandes] = useState<CommandeFile[]>([]);
  const [loadingFile, setLoadingFile] = useState(true);
  const [commandeSelectee, setCommandeSelectee] = useState<CommandeFile | null>(null);
  const [fileOuverte, setFileOuverte] = useState(false);
  const [commandeDetail, setCommandeDetail] = useState<CommandeDetail | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [loadingLignes, setLoadingLignes] = useState(false);
  const [modePaiement, setModePaiement] = useState<string>("especes");
  const [modeImpression, setModeImpression] = useState<"ticket" | "pdf" | "aucune">("ticket");
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [etape, setEtape] = useState<"detail" | "paiement">("detail");

  // Rapport Z
  const [showRapportZ, setShowRapportZ] = useState(false);
  const [rapportZDate, setRapportZDate] = useState(new Date().toISOString().slice(0, 10));
  const [rapportZ, setRapportZ] = useState<null | {
    date: string; nbCommandes: number; totalHT: number; totalTVA: number;
    totalTTC: number; totalRemise: number;
    parMode: Record<string, { montant: number; count: number }>;
    topProduits: { produitId: string; nom: string; qteBase: number; ca: number }[];
    agentsActifs: { id: string; nom: string; nbCommandes: number; ca: number }[];
  }>(null);
  const [loadingRapport, setLoadingRapport] = useState(false);

  const fetchRapportZ = async (date: string) => {
    setLoadingRapport(true);
    try {
      const res = await fetch(`/api/caisse/rapport-z?date=${date}`);
      if (res.ok) setRapportZ(await res.json());
    } finally { setLoadingRapport(false); }
  };

  // Load queue on mount
  useEffect(() => {
    fetch("/api/caisse/commandes")
      .then((r) => r.json())
      .then((data: CommandeFile[]) => {
        setFileCommandes(data ?? []);
        if (data.length > 0) {
          setCommandeSelectee(data[0] ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFile(false));
  }, []);

  // Load lines when a commande is selected
  useEffect(() => {
    if (!commandeSelectee) {
      setLignes([]);
      setCommandeDetail(null);
      return;
    }
    setLoadingLignes(true);
    fetch(`/api/caisse/commandes/${commandeSelectee.id}`)
      .then((r) => r.json())
      .then((data: { commande: CommandeDetail | null; lignes: Ligne[] }) => {
        setCommandeDetail(data.commande);
        setLignes(data.lignes ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingLignes(false));
  }, [commandeSelectee?.id]);

  // Nouvelle commande via SSE
  const handleNouvelleCommande = useCallback((event: CommandeEvent) => {
    const nouvelleCommande: CommandeFile = {
      id: event.commandeId,
      numero: event.numero,
      client: event.clientId ?? "Client comptoir",
      montant: event.totalTTC,
      nbArticles: 1,
      source: event.source as CommandeFile["source"],
      soumiseAt: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      priorite: 0,
      statut: "en_attente",
    };
    setFileCommandes((prev) => [nouvelleCommande, ...prev]);
  }, []);

  // Mise à jour commande existante via SSE
  const handleMiseAJour = useCallback((event: import("@/lib/sse/broadcast").CommandeMiseAJourEvent) => {
    setFileCommandes((prev) =>
      prev.map((c) =>
        c.id === event.commandeId
          ? { ...c, montant: event.totalTTC, nbArticles: event.nbArticles }
          : c
      )
    );
    // Si c'est la commande sélectionnée, recharger ses lignes
    setCommandeSelectee((prev) =>
      prev?.id === event.commandeId ? { ...prev, montant: event.totalTTC } : prev
    );
    toast.info(`Commande ${event.numero} modifiée par l'agent`, {
      description: "Les lignes ont été mises à jour.",
    });
  }, []);

  const handleAnnulationSSE = useCallback((event: CommandeAnnuleeEvent) => {
    setFileCommandes((prev) => prev.filter((c) => c.id !== event.commandeId));
    if (commandeSelectee?.id === event.commandeId) {
      setCommandeSelectee(null);
      setCommandeDetail(null);
      setLignes([]);
      setEtape("detail");
    }
    toast.info(`Commande ${event.numero} annulée`);
  }, [commandeSelectee?.id]);

  const handleAnnuler = useCallback(async (cmd: { id: string; numero: string }) => {
    if (!confirm(`Annuler la commande ${cmd.numero} ?`)) return;
    try {
      const res = await fetch(`/api/caisse/commandes/${cmd.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Annulation impossible", { description: data.error });
        return;
      }
      setFileCommandes((prev) => prev.filter((c) => c.id !== cmd.id));
      if (commandeSelectee?.id === cmd.id) {
        setFileCommandes((prev) => {
          setCommandeSelectee(prev[0] ?? null);
          return prev;
        });
        setCommandeDetail(null);
        setLignes([]);
        setEtape("detail");
      }
      toast.success(`Commande ${cmd.numero} annulée`);
    } catch {
      toast.error("Erreur réseau");
    }
  }, [commandeSelectee?.id]);

  useCommandeStream({ onNouvelle: handleNouvelleCommande, onMiseAJour: handleMiseAJour, onAnnulation: handleAnnulationSSE });

  const totalHT = commandeDetail?.totalHT ?? lignes.reduce((s, l) => s + l.total, 0);
  const totalTVA = commandeDetail?.totalTVA ?? 0;
  const totalTTC = commandeDetail?.totalTTC ?? lignes.reduce((s, l) => s + l.totalTTC, 0);
  const assujettieTV = commandeDetail?.assujettieTV ?? false;

  const imprimerTicket = useCallback(async () => {
    if (!commandeSelectee) return;
    try {
      const res = await fetch("/api/print/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: commandeSelectee.numero,
          client: commandeSelectee.client,
          commandeId: commandeSelectee.id,
          lignes: lignes.map((l) => ({ nom: l.nom, unite: l.unite, qte: l.qte, prix: l.prix, total: l.total })),
          totalHT, totalTVA, totalTTC, modePaiement, assujettieTV,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Ticket envoyé à l'imprimante cloud");
        return;
      }
      if (!data.errorMessage?.includes("non configurée")) {
        toast.error("Échec impression cloud", { description: data.errorMessage });
        return;
      }
    } catch { /* fall through to WebUSB */ }
    try {
      const { connectPrinter, printTicket, releasePrinter } = await import("@/lib/print/escpos");
      const printer = await connectPrinter();
      await printTicket(printer, {
        nomEntreprise: "GrossistePPN SARL",
        adresseEntreprise: "Analakely, Antananarivo 101",
        numero: commandeSelectee.numero,
        date: new Date().toLocaleString("fr-FR"),
        caissier: "Caissier",
        client: commandeSelectee.client,
        lignes: lignes.map((l) => ({ nom: l.nom, unite: l.unite, qte: l.qte, prix: l.prix, total: l.total })),
        totalHT, totalTVA, totalTTC, modePaiement, assujettieTV,
      });
      await releasePrinter(printer);
    } catch (e) {
      toast.error("Imprimante USB", { description: e instanceof Error ? e.message : String(e) });
    }
  }, [commandeSelectee, lignes, totalHT, totalTVA, totalTTC, modePaiement, assujettieTV]);

  const imprimerPDF = useCallback(async () => {
    if (!commandeSelectee) return;
    const { genererFacturePDF, downloadPDF } = await import("@/lib/print/pdf-facture");
    const bytes = await genererFacturePDF({
      nomEntreprise: "GrossistePPN SARL",
      adresseEntreprise: "Analakely, Antananarivo 101",
      numero: commandeSelectee.numero,
      date: new Date().toLocaleDateString("fr-FR"),
      client: commandeSelectee.client,
      lignes: lignes.map((l) => ({
        description: l.nom, unite: l.unite, quantite: l.qte,
        prixUnitaire: l.prix, totalHT: l.total, tauxTVA: l.tauxTVA,
        totalTVA: Math.round(l.total * l.tauxTVA / 100), totalTTC: l.totalTTC,
      })),
      totalHT, totalTVA, totalTTC, totalRegle: totalTTC, soldeRestant: 0,
      assujettieTV, modePaiement,
    });
    downloadPDF(bytes, `facture-${commandeSelectee.numero}.pdf`);
  }, [commandeSelectee, lignes, totalHT, totalTVA, totalTTC, assujettieTV, modePaiement]);

  const handleConfirmer = useCallback(async () => {
    if (!commandeSelectee) return;
    setLoadingConfirm(true);
    try {
      // Marquer comme encaissée en DB (retire de la file pour tous les postes)
      await fetch(`/api/caisse/commandes/${commandeSelectee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modePaiement }),
      });
      if (modeImpression === "ticket") await imprimerTicket();
      else if (modeImpression === "pdf") await imprimerPDF();
      handleCommandeSuivante();
    } finally {
      setLoadingConfirm(false);
    }
  }, [commandeSelectee, modePaiement, modeImpression, imprimerTicket, imprimerPDF]);

  const handleCommandeSuivante = () => {
    setFileCommandes((prev) => {
      const restantes = prev.filter((c) => c.id !== commandeSelectee?.id);
      setCommandeSelectee(restantes[0] ?? null);
      return restantes;
    });
    setCommandeDetail(null);
    setLignes([]);
    setEtape("detail");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen bg-[--background] overflow-hidden relative">
      {/* Mobile overlay backdrop */}
      {fileOuverte && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setFileOuverte(false)}
        />
      )}

      {/* ── File d'attente ── */}
      <div className={cn(
        "flex flex-col border-r border-[--border] bg-[--card] shrink-0",
        // Mobile: pleine largeur pour couvrir tout l'écran, sm+: 320px
        "w-full sm:w-80 xl:w-96",
        // Mobile: hidden drawer sliding in from left
        "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
        // hauteur fixe pour mobile (top: 0 à bottom: 0)
        "h-full",
        "transition-transform duration-200 ease-in-out",
        fileOuverte ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-14 flex items-center gap-3 px-4 border-b border-[--border]">
          <Receipt className="w-5 h-5 text-[--primary]" />
          <span className="font-semibold flex-1">File d'attente</span>
          <Badge variant="destructive" className="text-xs">{fileCommandes.length}</Badge>
          <button
            onClick={() => { setShowRapportZ(true); fetchRapportZ(rapportZDate); }}
            className="p-1.5 rounded-lg text-[--foreground-muted] hover:bg-[--accent] transition-colors"
            title="Rapport Z — Clôture journée"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFileOuverte(false)}
            className="lg:hidden p-1 rounded-lg text-[--foreground-muted] hover:bg-[--accent] transition-colors"
            aria-label="Fermer la file"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[--border]">
          {loadingFile ? (
            <div className="flex items-center justify-center py-12 text-[--foreground-muted]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : fileCommandes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[--foreground-muted]">
              <CheckCircle2 className="w-8 h-8 opacity-30" />
              <p className="text-sm">File vide — aucune commande en attente</p>
            </div>
          ) : (
            fileCommandes.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => { setCommandeSelectee(cmd); setEtape("detail"); }}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left",
                  "hover:bg-[--accent] transition-colors",
                  commandeSelectee?.id === cmd.id && "bg-[--primary]/5 border-l-2 border-l-[--primary]"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  cmd.source === "ecommerce"
                    ? "bg-[--color-indigo-100] dark:bg-[--color-indigo-950]"
                    : "bg-[--color-ocre-100] dark:bg-[--color-ocre-950]"
                )}>
                  {cmd.source === "ecommerce" ? (
                    <Globe className="w-4 h-4 text-[--color-indigo-600]" />
                  ) : (
                    <Monitor className="w-4 h-4 text-[--color-ocre-600]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-[--foreground-subtle]">
                      {cmd.numero}
                    </span>
                    <Badge
                      variant={cmd.source === "ecommerce" ? "web" : "pos"}
                      className="text-[9px] py-0"
                    >
                      {cmd.source === "ecommerce" ? "WEB" : "POS"}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-[--foreground] truncate mt-0.5">
                    {cmd.client}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[--foreground-muted]">
                      {cmd.nbArticles} art.
                    </span>
                    <span className="text-xs font-semibold text-[--foreground] text-mga">
                      {formatMGA(cmd.montant)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-[11px] text-[--foreground-subtle]">
                    <Clock className="w-3 h-3" />
                    {cmd.soumiseAt}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAnnuler(cmd); }}
                    className="p-1 rounded-lg text-[--destructive]/60 hover:text-[--destructive] hover:bg-[--destructive]/10 transition-colors"
                    title="Annuler la commande"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Stats session */}
        <div className="p-4 border-t border-[--border] bg-[--background-subtle]">
          <div className="text-xs text-[--foreground-muted] space-y-1">
            <div className="flex justify-between">
              <span>En attente</span>
              <span className="font-semibold text-[--foreground]">{fileCommandes.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Détail commande / facturation ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile queue toggle bar */}
        <button
          onClick={() => setFileOuverte(true)}
          className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-[--border] bg-[--card] shrink-0 w-full text-left hover:bg-[--accent] transition-colors"
        >
          <Menu className="w-5 h-5 text-[--foreground-muted] shrink-0" />
          <span className="text-sm font-semibold text-[--foreground] flex-1">
            {commandeSelectee ? commandeSelectee.numero : "File d'attente"}
          </span>
          <Badge variant="destructive" className="text-xs shrink-0">
            {fileCommandes.length}
          </Badge>
          <ChevronRight className="w-4 h-4 text-[--foreground-muted] shrink-0" />
        </button>
      <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6">
        {commandeSelectee ? (
          <div className="max-w-2xl w-full mx-auto flex flex-col flex-1 min-h-0 gap-6 animate-fade-in">
            {/* Étapes */}
            <div className="flex items-center gap-3 shrink-0">
              {(["detail", "paiement"] as const).map((e, i) => (
                <div key={e} className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    etape === e || (e === "detail" && etape === "paiement")
                      ? "bg-[--primary] text-white"
                      : "bg-[--border] text-[--foreground-muted]"
                  )}>
                    {i + 1}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    etape === e ? "text-[--foreground]" : "text-[--foreground-muted]"
                  )}>
                    {e === "detail" ? "Commande" : "Encaissement"}
                  </span>
                  {i < 1 && <ChevronRight className="w-4 h-4 text-[--foreground-subtle]" />}
                </div>
              ))}
            </div>

            {etape === "detail" && (
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{commandeSelectee.numero}</CardTitle>
                      <p className="text-sm text-[--foreground-muted] mt-1">
                        {commandeSelectee.client}
                        {commandeSelectee.agentNom && ` — Agent: ${commandeSelectee.agentNom}`}
                      </p>
                    </div>
                    <Badge variant={commandeSelectee.source === "ecommerce" ? "web" : "pos"}>
                      {commandeSelectee.source === "ecommerce" ? "E-commerce" : "POS Agent"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0 gap-4 pb-6">
                  {/* Lignes commande — scrollable */}
                  <div className="flex-1 min-h-0 rounded-xl border border-[--border] overflow-hidden overflow-x-auto overflow-y-auto">
                    {loadingLignes ? (
                      <div className="flex items-center justify-center py-8 text-[--foreground-muted]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-[--background-subtle]">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-[--foreground-muted] font-medium">Produit</th>
                            <th className="text-right px-4 py-2.5 text-[--foreground-muted] font-medium">Qté</th>
                            <th className="text-right px-4 py-2.5 text-[--foreground-muted] font-medium">P.U.</th>
                            <th className="text-right px-4 py-2.5 text-[--foreground-muted] font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[--border]">
                          {lignes.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-6 text-[--foreground-muted] text-sm">
                                Aucune ligne de commande
                              </td>
                            </tr>
                          ) : (
                            lignes.map((l) => (
                              <tr key={l.id} className="hover:bg-[--accent] transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="font-medium">{l.nom}</div>
                                  <div className="text-[11px] text-[--foreground-muted]">{l.unite}</div>
                                </td>
                                <td className="text-right px-4 py-2.5">{l.qte}</td>
                                <td className="text-right px-4 py-2.5 text-mga">{formatMGA(l.prix)}</td>
                                <td className="text-right px-4 py-2.5 font-semibold text-mga">{formatMGA(l.total)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Totaux */}
                  <div className="space-y-1.5 text-sm shrink-0">
                    <div className="flex justify-between text-[--foreground-muted]">
                      <span>Total HT</span>
                      <span className="text-mga">{formatMGA(totalHT)}</span>
                    </div>
                    {assujettieTV ? (
                      <div className="flex justify-between text-[--foreground-muted]">
                        <span>TVA</span>
                        <span className="text-mga">{formatMGA(totalTVA)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[--foreground-muted]">
                        <span>TVA non applicable</span>
                        <span>—</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>TOTAL TTC</span>
                      <span className="text-[--primary] text-mga">{formatMGA(totalTTC)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full shrink-0"
                    size="lg"
                    disabled={loadingLignes}
                    onClick={() => setEtape("paiement")}
                  >
                    <Receipt className="w-4 h-4" />
                    Générer la facture & Encaisser
                  </Button>
                </CardContent>
              </Card>
            )}

            {etape === "paiement" && (
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="shrink-0">
                  <CardTitle>Encaissement</CardTitle>
                  <p className="text-sm text-[--foreground-muted]">
                    Montant à régler : <strong className="text-[--foreground] text-mga">{formatMGA(totalTTC)}</strong>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0 gap-5 overflow-y-auto pb-6">
                  {/* Mode de paiement */}
                  <div>
                    <p className="text-[11px] font-semibold text-[--foreground-subtle] uppercase tracking-wider mb-2">
                      Mode de paiement
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "especes", label: "Espèces", icon: Banknote },
                        { id: "mvola", label: "Mvola", icon: Smartphone },
                        { id: "orange_money", label: "Orange Money", icon: Smartphone },
                        { id: "airtel_money", label: "Airtel Money", icon: Smartphone },
                        { id: "virement", label: "Virement", icon: CreditCard },
                        { id: "credit", label: "Crédit client", icon: CreditCard },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setModePaiement(m.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-sm font-medium",
                            "transition-all duration-150",
                            modePaiement === m.id
                              ? "border-[--primary] bg-[--primary]/5 text-[--primary]"
                              : "border-[--border] hover:border-[--border-strong] text-[--foreground-muted]"
                          )}
                        >
                          <m.icon className="w-4 h-4 shrink-0" />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode impression */}
                  <div>
                    <p className="text-[11px] font-semibold text-[--foreground-subtle] uppercase tracking-wider mb-2">
                      Impression
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "ticket" as const, label: "Ticket", icon: Printer },
                        { id: "pdf"    as const, label: "PDF A4",  icon: FileText },
                        { id: "aucune" as const, label: "Aucune",  icon: Ban },
                      ].map((imp) => (
                        <button
                          key={imp.id}
                          onClick={() => setModeImpression(imp.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium",
                            "transition-all duration-150",
                            modeImpression === imp.id
                              ? "border-[--primary] bg-[--primary]/5 text-[--primary]"
                              : "border-[--border] hover:border-[--border-strong] text-[--foreground-muted]"
                          )}
                        >
                          <imp.icon className="w-5 h-5 shrink-0" />
                          {imp.label}
                          {imp.id === "ticket" && modeImpression === "ticket" && (
                            <span className="text-[9px] bg-[--primary] text-white rounded-full px-1.5 py-0.5 leading-none">
                              défaut
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setEtape("detail")}>
                      Retour
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      disabled={loadingConfirm}
                      onClick={handleConfirmer}
                    >
                      {loadingConfirm
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />
                      }
                      Confirmer l'encaissement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[--foreground-muted]">
            <ShoppingCart className="w-12 h-12 opacity-20" />
            <p className="text-sm">Sélectionnez une commande dans la file d&apos;attente</p>
          </div>
        )}
      </div>
      </div>

      {/* ── Modal Rapport Z ───────────────────────────────────────────────── */}
      {showRapportZ && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRapportZ(false)} />
          <div className="relative bg-[--card] border border-[--border] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-[--border] shrink-0">
              <BarChart2 className="w-5 h-5 text-[--primary]" />
              <h2 className="font-bold text-lg flex-1">Rapport Z — Clôture journée</h2>
              <input
                type="date"
                value={rapportZDate}
                onChange={(e) => { setRapportZDate(e.target.value); fetchRapportZ(e.target.value); }}
                className="rounded-lg border border-[--border] bg-[--background] px-2 py-1 text-sm"
              />
              <button onClick={() => setShowRapportZ(false)} className="p-1.5 rounded-lg hover:bg-[--accent]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingRapport ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[--foreground-muted]" /></div>
              ) : !rapportZ ? null : (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Transactions", val: rapportZ.nbCommandes.toString(), icon: Receipt },
                      { label: "CA TTC", val: formatMGA(rapportZ.totalTTC, { compact: true }), icon: TrendingUp },
                      { label: "TVA collectée", val: formatMGA(rapportZ.totalTVA, { compact: true }), icon: FileText },
                      { label: "Remises", val: formatMGA(rapportZ.totalRemise, { compact: true }), icon: AlertCircle },
                    ].map((k) => (
                      <div key={k.label} className="bg-[--accent] rounded-xl p-3">
                        <p className="text-xs text-[--foreground-muted]">{k.label}</p>
                        <p className="text-xl font-bold mt-1">{k.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Par mode de paiement */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-[--foreground-muted]">Répartition par mode de paiement</h3>
                    <div className="space-y-2">
                      {Object.entries(rapportZ.parMode).length === 0 ? (
                        <p className="text-sm text-[--foreground-muted]">Aucun paiement enregistré</p>
                      ) : Object.entries(rapportZ.parMode).map(([mode, data]) => (
                        <div key={mode} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[--accent]/50">
                          <div className="flex items-center gap-2">
                            {mode === "especes" ? <Banknote className="w-4 h-4 text-[--success]" /> :
                             mode === "mvola" || mode === "orange_money" || mode === "airtel_money" ? <Smartphone className="w-4 h-4 text-[--primary]" /> :
                             <CreditCard className="w-4 h-4 text-[--foreground-muted]" />}
                            <span className="text-sm capitalize">{mode.replace(/_/g, " ")}</span>
                            <Badge variant="muted" className="text-[10px]">{data.count} tx</Badge>
                          </div>
                          <span className="font-semibold text-sm">{formatMGA(data.montant)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top produits */}
                  {rapportZ.topProduits.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-[--foreground-muted]">Top produits vendus</h3>
                      <div className="space-y-1">
                        {rapportZ.topProduits.slice(0, 5).map((p, i) => (
                          <div key={p.produitId} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-[--accent]/40">
                            <span className="text-xs font-mono text-[--foreground-subtle] w-4">#{i + 1}</span>
                            <span className="text-sm flex-1 truncate">{p.nom}</span>
                            <span className="text-xs text-[--foreground-muted]">{p.qteBase.toLocaleString("fr-FR")}</span>
                            <span className="text-sm font-medium">{formatMGA(p.ca, { compact: true })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agents */}
                  {rapportZ.agentsActifs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-[--foreground-muted]">Performance agents</h3>
                      <div className="space-y-1">
                        {rapportZ.agentsActifs.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-[--accent]/40">
                            <Monitor className="w-4 h-4 text-[--foreground-muted]" />
                            <span className="text-sm flex-1">{a.nom}</span>
                            <Badge variant="muted" className="text-[10px]">{a.nbCommandes} cmd</Badge>
                            <span className="text-sm font-medium">{formatMGA(a.ca, { compact: true })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-[--border] shrink-0 flex justify-end">
              <Button onClick={() => setShowRapportZ(false)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
