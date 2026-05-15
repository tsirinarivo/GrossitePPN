"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  X,
  Send,
  ChevronDown,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Edit3,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePOSStore, usePOSTotaux } from "@/store/pos.store";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { LignePanier } from "@/store/pos.store";
import { toast } from "sonner";

type Props = {
  onClose?: () => void;
  totalTTC: number;
  nbArticles: number;
};

export function POSPanier({ onClose, totalTTC, nbArticles }: Props) {
  const {
    lignes,
    notes,
    setNotes,
    modifierQuantite,
    supprimerLigne,
    viderPanier,
    client,
    modeHorsLigne,
    agentId,
    depotId,
    commandeEnEdition,
    annulerEdition,
  } = usePOSStore();
  const { totalHT, totalTVA, totalRemise } = usePOSTotaux();
  const [notesVisible, setNotesVisible] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const handleEnvoyer = async () => {
    if (lignes.length === 0) return;
    setEnvoiEnCours(true);
    try {
      // Mode édition → PUT pour mettre à jour la commande existante
      if (commandeEnEdition) {
        const res = await fetch(`/api/caisse/commandes/${commandeEnEdition.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lignes, totalHT, totalTVA, totalTTC, totalRemise }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Erreur ${res.status}`);
        }
        toast.success("Commande mise à jour", {
          description: `${commandeEnEdition.numero} — ${formatMGA(totalTTC)}`,
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
        });
        annulerEdition();
        return;
      }

      // Mode normal → POST nouvelle commande
      const res = await fetch("/api/caisse/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lignes,
          client,
          notes,
          agentId,
          depotId,
          totalHT,
          totalTVA,
          totalTTC,
          totalRemise,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erreur ${res.status}`);
      }
      toast.success(
        modeHorsLigne
          ? "Commande sauvegardée — sera envoyée dès le retour du réseau"
          : "Commande envoyée à la caisse",
        {
          description: `${nbArticles} article(s) — ${formatMGA(totalTTC)}`,
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
        }
      );
      viderPanier();
    } catch (e) {
      toast.error("Échec de l'envoi", {
        description: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (lignes.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PanierHeader nbArticles={0} onClose={onClose} commandeEnEdition={commandeEnEdition ?? undefined} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[--pos-surface-hover] flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-[--pos-text-muted]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[--pos-text]">Panier vide</p>
            <p className="text-xs text-[--pos-text-muted] mt-1">
              Ajoutez des produits depuis le catalogue
            </p>
          </div>
          {commandeEnEdition && (
            <button
              onClick={annulerEdition}
              className="text-xs text-[--pos-text-muted] underline hover:text-[--pos-text]"
            >
              Annuler la modification
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PanierHeader
        nbArticles={nbArticles}
        onClose={onClose}
        onVider={commandeEnEdition ? annulerEdition : viderPanier}
        commandeEnEdition={commandeEnEdition ?? undefined}
      />

      {/* Lignes */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[--pos-border]">
          {lignes.map((ligne) => (
            <LignePanierItem
              key={ligne.id}
              ligne={ligne}
              onModifier={(delta) => modifierQuantite(ligne.id, delta)}
              onSupprimer={() => supprimerLigne(ligne.id)}
            />
          ))}
        </div>

        {/* Notes */}
        <div className="p-4">
          <button
            onClick={() => setNotesVisible(!notesVisible)}
            className="flex items-center gap-2 text-xs text-[--pos-text-muted] hover:text-[--pos-text] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Notes pour la caisse</span>
            <ChevronDown
              className={cn("w-3 h-3 transition-transform", notesVisible && "rotate-180")}
            />
          </button>
          {notesVisible && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions spéciales, livraison partielle..."
              rows={3}
              className={cn(
                "mt-2 w-full text-xs rounded-lg px-3 py-2",
                "bg-[--pos-surface-hover] border border-[--pos-border]",
                "text-[--pos-text] placeholder:text-[--pos-text-muted]",
                "focus:outline-none focus:border-[--pos-primary]",
                "resize-none"
              )}
            />
          )}
        </div>
      </div>

      {/* Footer totaux + actions */}
      <div className="border-t border-[--pos-border] bg-[--pos-surface] p-4 space-y-3">
        {/* Totaux */}
        <div className="space-y-1.5 text-sm">
          {totalRemise > 0 && (
            <div className="flex justify-between text-[--pos-text-muted]">
              <span>Remises</span>
              <span className="text-[--pos-success] font-medium text-mga">
                −{formatMGA(totalRemise)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[--pos-text-muted]">
            <span>Total HT</span>
            <span className="text-mga">{formatMGA(totalHT)}</span>
          </div>
          {totalTVA > 0 && (
            <div className="flex justify-between text-[--pos-text-muted]">
              <span>TVA</span>
              <span className="text-mga">{formatMGA(totalTVA)}</span>
            </div>
          )}
          <Separator className="bg-[--pos-border]" />
          <div className="flex justify-between text-base font-bold text-[--pos-text]">
            <span>TOTAL TTC</span>
            <span className="text-[--pos-primary] text-mga text-lg">{formatMGA(totalTTC)}</span>
          </div>
        </div>

        {/* Alerte crédit */}
        {client?.creditAutorise && (
          (() => {
            const creditRestant = client.plafondCredit - client.encoursCourant;
            const depassement = totalTTC > creditRestant;
            if (!depassement) return null;
            return (
              <div className="flex items-start gap-2 text-xs text-[--pos-danger] bg-[--pos-danger]/10 rounded-lg p-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Plafond de crédit dépassé de {formatMGA(totalTTC - creditRestant)}
                </span>
              </div>
            );
          })()
        )}

        {/* Mode hors-ligne */}
        {modeHorsLigne && (
          <div className="flex items-center gap-2 text-xs text-[--pos-text-muted] bg-[--pos-surface-hover] rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 text-[--warning] shrink-0" />
            <span>Mode hors-ligne — commande mise en file</span>
          </div>
        )}

        {/* CTA */}
        <Button
          variant="pos"
          size="pos-lg"
          className={cn(
            "w-full",
            commandeEnEdition && "!bg-none !bg-blue-500 hover:!bg-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
          )}
          onClick={handleEnvoyer}
          loading={envoiEnCours}
        >
          {commandeEnEdition ? (
            <><RefreshCw className="w-5 h-5" />Mettre à jour la commande</>
          ) : modeHorsLigne ? (
            <><Send className="w-5 h-5" />Sauvegarder la commande</>
          ) : (
            <><Send className="w-5 h-5" />Envoyer à la caisse</>
          )}
        </Button>
        {commandeEnEdition && (
          <button
            onClick={annulerEdition}
            className="w-full text-center text-xs text-[--pos-text-muted] hover:text-[--pos-text] transition-colors pt-1"
          >
            Annuler la modification
          </button>
        )}
      </div>
    </div>
  );
}

function PanierHeader({
  nbArticles,
  onClose,
  onVider,
  commandeEnEdition,
}: {
  nbArticles: number;
  onClose?: () => void;
  onVider?: () => void;
  commandeEnEdition?: { id: string; numero: string };
}) {
  return (
    <div className={cn(
      "h-14 flex items-center gap-3 px-4 border-b border-[--pos-border] shrink-0",
      commandeEnEdition && "bg-sky-500/10 border-sky-500/30"
    )}>
      {commandeEnEdition ? (
        <Edit3 className="w-5 h-5 text-sky-400 shrink-0" />
      ) : (
        <ShoppingCart className="w-5 h-5 text-[--pos-text-muted] shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-[--pos-text] text-sm block truncate">
          {commandeEnEdition ? `Modification` : "Panier"}
        </span>
        {commandeEnEdition && (
          <span className="text-[10px] text-sky-400 font-mono">{commandeEnEdition.numero}</span>
        )}
      </div>
      {nbArticles > 0 && (
        <Badge className="bg-[--pos-primary]/20 text-[--pos-primary] ring-0 text-xs">
          {nbArticles} article{nbArticles > 1 ? "s" : ""}
        </Badge>
      )}
      {onVider && nbArticles > 0 && (
        <button
          onClick={onVider}
          title="Vider le panier"
          className="text-[--pos-text-muted] hover:text-[--pos-danger] transition-colors p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden text-[--pos-text-muted] hover:text-[--pos-text] transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function LignePanierItem({
  ligne,
  onModifier,
  onSupprimer,
}: {
  ligne: LignePanier;
  onModifier: (delta: number) => void;
  onSupprimer: () => void;
}) {
  return (
    <div className="px-4 py-3 hover:bg-[--pos-surface-hover] transition-colors group">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[--pos-text] leading-tight truncate">
            {ligne.nomProduit}
          </p>
          <p className="text-[11px] text-[--pos-text-muted] mt-0.5">
            {ligne.nomUnite} — {formatMGA(ligne.prixUnitaire)}/unité
          </p>
          {ligne.tauxRemise > 0 && (
            <p className="text-[11px] text-[--pos-success]">
              Remise {ligne.tauxRemise}% (−{formatMGA(ligne.montantRemise)})
            </p>
          )}
        </div>

        {/* Contrôle quantité */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onModifier(-1)}
            className="w-9 h-9 rounded-lg bg-[--pos-surface-hover] hover:bg-[--pos-border] flex items-center justify-center text-[--pos-text-muted] hover:text-[--pos-text] transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-bold text-[--pos-text] min-w-[2ch] text-center">
            {ligne.quantite}
          </span>
          <button
            onClick={() => onModifier(1)}
            className="w-9 h-9 rounded-lg bg-[--pos-surface-hover] hover:bg-[--pos-border] flex items-center justify-center text-[--pos-text-muted] hover:text-[--pos-text] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total + supprimer */}
        <div className="text-right shrink-0 min-w-[72px]">
          <p className="text-sm font-bold text-[--pos-text] text-mga">
            {formatMGA(ligne.totalTTC)}
          </p>
          <button
            onClick={onSupprimer}
            className="text-[--pos-text-muted] hover:text-[--pos-danger] transition-colors mt-0.5 opacity-60 sm:opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5 inline" />
          </button>
        </div>
      </div>
    </div>
  );
}
