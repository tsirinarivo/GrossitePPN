"use client";

import { useState, useCallback } from "react";
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

const COMMANDES_DEMO: CommandeFile[] = [
  {
    id: "cmd1",
    numero: "CMD-2026-0847",
    client: "Épicerie Rasoamanarivo",
    montant: 385000,
    nbArticles: 6,
    source: "pos_agent",
    agentNom: "Hery",
    soumiseAt: "14:32",
    priorite: 1,
    statut: "en_attente",
  },
  {
    id: "cmd2",
    numero: "CMD-2026-0848",
    client: "Supérette Analakely",
    montant: 1250000,
    nbArticles: 12,
    source: "ecommerce",
    soumiseAt: "14:18",
    priorite: 2,
    statut: "en_attente",
  },
  {
    id: "cmd3",
    numero: "CMD-2026-0849",
    client: "Restaurant Colbert",
    montant: 320000,
    nbArticles: 4,
    source: "ecommerce",
    soumiseAt: "13:41",
    priorite: 3,
    statut: "en_attente",
  },
  {
    id: "cmd4",
    numero: "CMD-2026-0850",
    client: "Épicerie Ambatonakanga",
    montant: 75000,
    nbArticles: 3,
    source: "pos_agent",
    agentNom: "Nivo",
    soumiseAt: "13:20",
    priorite: 4,
    statut: "en_attente",
  },
];

const LIGNES_DEMO = [
  { nom: "Riz Makalioka", unite: "Sac 50 kg", qte: 2, prix: 145000, total: 290000 },
  { nom: "Huile Tiko 1L", unite: "Carton 12 btl", qte: 1, prix: 118000, total: 118000 },
  { nom: "Sucre Blanc", unite: "kg", qte: 25, prix: 4800, total: 120000 },
];

export function CaisseView() {
  const [fileCommandes, setFileCommandes] = useState<CommandeFile[]>(COMMANDES_DEMO);
  const [commandeSelectee, setCommandeSelectee] = useState<CommandeFile | null>(
    COMMANDES_DEMO[0] ?? null
  );
  const [modePaiement, setModePaiement] = useState<string>("especes");
  const [etape, setEtape] = useState<"detail" | "paiement" | "confirmation">("detail");

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

  const totalHT = LIGNES_DEMO.reduce((s, l) => s + l.total, 0);
  const totalTTC = totalHT;

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
          {fileCommandes.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => { setCommandeSelectee(cmd); setEtape("detail"); }}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left",
                "hover:bg-[--accent] transition-colors",
                commandeSelectee?.id === cmd.id && "bg-[--primary]/5 border-l-2 border-l-[--primary]"
              )}
            >
              {/* Icône source */}
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
          ))}
        </div>

        {/* Stats session */}
        <div className="p-4 border-t border-[--border] bg-[--background-subtle]">
          <div className="text-xs text-[--foreground-muted] space-y-1">
            <div className="flex justify-between">
              <span>Encaissé aujourd'hui</span>
              <span className="font-semibold text-[--foreground] text-mga">{formatMGA(3_850_000)}</span>
            </div>
            <div className="flex justify-between">
              <span>Factures émises</span>
              <span className="font-semibold text-[--foreground]">24</span>
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
                        {LIGNES_DEMO.map((l, i) => (
                          <tr key={i} className="hover:bg-[--accent] transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="font-medium">{l.nom}</div>
                              <div className="text-[11px] text-[--foreground-muted]">{l.unite}</div>
                            </td>
                            <td className="text-right px-4 py-2.5">{l.qte}</td>
                            <td className="text-right px-4 py-2.5 text-mga">{formatMGA(l.prix)}</td>
                            <td className="text-right px-4 py-2.5 font-semibold text-mga">{formatMGA(l.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totaux */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-[--foreground-muted]">
                      <span>Total HT</span>
                      <span className="text-mga">{formatMGA(totalHT)}</span>
                    </div>
                    <div className="flex justify-between text-[--foreground-muted]">
                      <span>TVA non applicable</span>
                      <span>—</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>TOTAL TTC</span>
                      <span className="text-[--primary] text-mga">{formatMGA(totalTTC)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
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
                  {/* Modes de paiement */}
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
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEtape("detail")}
                    >
                      Retour
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={() => setEtape("confirmation")}
                    >
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
                      Facture FAC-2026-0847 émise — {formatMGA(totalTTC)}
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
                            numero: commandeSelectee?.numero ?? "---",
                            date: new Date().toLocaleString("fr-FR"),
                            caissier: "Caissier",
                            client: commandeSelectee?.client,
                            lignes: LIGNES_DEMO,
                            totalHT,
                            totalTVA: 0,
                            totalTTC,
                            modePaiement: modePaiement,
                            assujettieTV: false,
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
                          numero: commandeSelectee?.numero ?? "---",
                          date: new Date().toLocaleDateString("fr-FR"),
                          client: commandeSelectee?.client ?? "Comptoir",
                          lignes: LIGNES_DEMO.map((l) => ({
                            description: l.nom,
                            unite: l.unite,
                            quantite: l.qte,
                            prixUnitaire: l.prix,
                            totalHT: l.total,
                            tauxTVA: 0,
                            totalTVA: 0,
                            totalTTC: l.total,
                          })),
                          totalHT,
                          totalTVA: 0,
                          totalTTC,
                          totalRegle: totalTTC,
                          soldeRestant: 0,
                          assujettieTV: false,
                          modePaiement,
                        });
                        downloadPDF(bytes, `facture-${commandeSelectee?.numero ?? "ppn"}.pdf`);
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      PDF A4
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => { setCommandeSelectee(null); setEtape("detail"); }}
                  >
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
