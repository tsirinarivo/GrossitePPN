"use client";

import { useState, useCallback, useEffect } from "react";
import { useCommandeStream } from "@/hooks/use-commande-stream";
import type { CommandeEvent } from "@/lib/sse/broadcast";
import {
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Globe,
  ShoppingCart,
  ChevronRight,
  Banknote,
  Smartphone,
  CreditCard,
  Printer,
  FileText,
  Loader2,
} from "lucide-react";
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
  const [commandeDetail, setCommandeDetail] = useState<CommandeDetail | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [loadingLignes, setLoadingLignes] = useState(false);
  const [modePaiement, setModePaiement] = useState<string>("especes");
  const [etape, setEtape] = useState<"detail" | "paiement" | "confirmation">("detail");

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

  // Écoute les nouvelles commandes en temps réel via SSE
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

  useCommandeStream(handleNouvelleCommande);

  const totalHT = commandeDetail?.totalHT ?? lignes.reduce((s, l) => s + l.total, 0);
  const totalTVA = commandeDetail?.totalTVA ?? 0;
  const totalTTC = commandeDetail?.totalTTC ?? lignes.reduce((s, l) => s + l.totalTTC, 0);
  const assujettieTV = commandeDetail?.assujettieTV ?? false;

  const handleCommandeSuivante = () => {
    setFileCommandes((prev) => prev.filter((c) => c.id !== commandeSelectee?.id));
    setCommandeSelectee(null);
    setCommandeDetail(null);
    setLignes([]);
    setEtape("detail");
  };

  return (
    <div className="flex h-screen bg-[--background] overflow-hidden">
      {/* ── File d'attente ── */}
      <div className="w-80 xl:w-96 flex flex-col border-r border-[--border] bg-[--card] shrink-0">
        <div className="h-14 flex items-center gap-3 px-4 border-b border-[--border]">
          <Receipt className="w-5 h-5 text-[--primary]" />
          <span className="font-semibold flex-1">File d'attente</span>
          <Badge variant="destructive" className="text-xs">
            {fileCommandes.length}
          </Badge>
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

                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-[11px] text-[--foreground-subtle]">
                    <Clock className="w-3 h-3" />
                    {cmd.soumiseAt}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[--foreground-subtle] mt-1 ml-auto" />
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
      <div className="flex-1 overflow-auto p-6">
        {commandeSelectee ? (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Étapes */}
            <div className="flex items-center gap-3">
              {(["detail", "paiement", "confirmation"] as const).map((e, i) => (
                <div key={e} className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    etape === e || (e === "detail" && etape === "paiement") || (etape === "confirmation")
                      ? "bg-[--primary] text-white"
                      : "bg-[--border] text-[--foreground-muted]"
                  )}>
                    {i + 1}
                  </div>
                  <span className={cn(
                    "text-sm font-medium capitalize",
                    etape === e ? "text-[--foreground]" : "text-[--foreground-muted]"
                  )}>
                    {e === "detail" ? "Commande" : e === "paiement" ? "Paiement" : "Confirmation"}
                  </span>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-[--foreground-subtle]" />}
                </div>
              ))}
            </div>

            {etape === "detail" && (
              <Card>
                <CardHeader>
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
                <CardContent className="space-y-4">
                  {/* Lignes commande */}
                  <div className="rounded-xl border border-[--border] overflow-hidden">
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
                  <div className="space-y-1.5 text-sm">
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
                    className="w-full"
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
              <Card>
                <CardHeader>
                  <CardTitle>Encaissement</CardTitle>
                  <p className="text-sm text-[--foreground-muted]">
                    Montant à régler : <strong className="text-[--foreground] text-mga">{formatMGA(totalTTC)}</strong>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setEtape("detail")}>
                      Retour
                    </Button>
                    <Button className="flex-1" size="lg" onClick={() => setEtape("confirmation")}>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmer l'encaissement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {etape === "confirmation" && (
              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[--success]/15 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-[--success]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Paiement confirmé</h3>
                    <p className="text-[--foreground-muted] text-sm mt-1">
                      {commandeSelectee.numero} — {formatMGA(totalTTC)}
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={async () => {
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
                            totalHT,
                            totalTVA,
                            totalTTC,
                            modePaiement,
                            assujettieTV,
                          });
                          await releasePrinter(printer);
                        } catch (e) {
                          alert(`Imprimante : ${e instanceof Error ? e.message : String(e)}`);
                        }
                      }}
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer ticket
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={async () => {
                        const { genererFacturePDF, downloadPDF } = await import("@/lib/print/pdf-facture");
                        const bytes = await genererFacturePDF({
                          nomEntreprise: "GrossistePPN SARL",
                          adresseEntreprise: "Analakely, Antananarivo 101",
                          numero: commandeSelectee.numero,
                          date: new Date().toLocaleDateString("fr-FR"),
                          client: commandeSelectee.client,
                          lignes: lignes.map((l) => ({
                            description: l.nom,
                            unite: l.unite,
                            quantite: l.qte,
                            prixUnitaire: l.prix,
                            totalHT: l.total,
                            tauxTVA: l.tauxTVA,
                            totalTVA: Math.round(l.total * l.tauxTVA / 100),
                            totalTTC: l.totalTTC,
                          })),
                          totalHT,
                          totalTVA,
                          totalTTC,
                          totalRegle: totalTTC,
                          soldeRestant: 0,
                          assujettieTV,
                          modePaiement,
                        });
                        downloadPDF(bytes, `facture-${commandeSelectee.numero}.pdf`);
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      PDF A4
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={handleCommandeSuivante}>
                    Commande suivante
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[--foreground-muted]">
            <ShoppingCart className="w-12 h-12 opacity-20" />
            <p className="text-sm">Sélectionnez une commande dans la file d'attente</p>
          </div>
        )}
      </div>
    </div>
  );
}
