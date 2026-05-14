"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Clock,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Package,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { usePOSStore } from "@/store/pos.store";
import type { LignePanier } from "@/store/pos.store";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CommandeResumee = {
  id: string;
  numero: string;
  statut: string;
  client: string;
  totalTTC: number;
  nbArticles: number;
  soumiseAt: string;
};

type LigneAPI = {
  id: string;
  nom: string;
  unite: string;
  qte: number;
  prix: number;
  total: number;
  tauxTVA: number;
  totalTTC: number;
};

type Props = {
  onClose: () => void;
};

export function POSMesCommandes({ onClose }: Props) {
  const [commandes, setCommandes] = useState<CommandeResumee[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargementId, setChargementId] = useState<string | null>(null);
  const { chargerPourEdition } = usePOSStore();

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pos/commandes");
      const data = await res.json();
      setCommandes(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Impossible de charger vos commandes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const handleModifier = async (cmd: CommandeResumee) => {
    if (cmd.statut !== "soumise") {
      toast.error("Commande déjà prise en charge", {
        description: "La caisse a déjà commencé le traitement, modification impossible.",
      });
      return;
    }
    setChargementId(cmd.id);
    try {
      const res = await fetch(`/api/caisse/commandes/${cmd.id}`);
      const data: { lignes: LigneAPI[] } = await res.json();

      // Convertir les lignes API → LignePanier
      const lignesPanier: LignePanier[] = data.lignes.map((l) => ({
        id: crypto.randomUUID(),
        produitId: l.id, // On utilise l'id ligne comme référence
        nomProduit: l.nom,
        uniteId: "default",
        nomUnite: l.unite,
        facteurConversion: 1,
        quantite: l.qte,
        quantiteBase: l.qte,
        prixUnitaire: l.prix,
        tauxRemise: 0,
        montantRemise: 0,
        tauxTVA: l.tauxTVA,
        totalHT: l.total,
        totalTVA: Math.round(l.total * l.tauxTVA / 100),
        totalTTC: l.totalTTC,
      }));

      chargerPourEdition({ id: cmd.id, numero: cmd.numero }, lignesPanier);
      toast.success(`Commande ${cmd.numero} chargée`, {
        description: "Modifiez le panier puis cliquez sur 'Mettre à jour'",
      });
      onClose();
    } catch {
      toast.error("Impossible de charger la commande");
    } finally {
      setChargementId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[--pos-surface] text-[--pos-text]">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-[--pos-border] shrink-0">
        <Edit3 className="w-5 h-5 text-[--pos-primary]" />
        <span className="font-semibold flex-1 text-sm">Mes commandes envoyées</span>
        <button
          onClick={charger}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-[--pos-surface-hover] text-[--pos-text-muted] transition-colors"
          title="Actualiser"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[--pos-surface-hover] text-[--pos-text-muted] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[--pos-text-muted]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : commandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--pos-text-muted]">
            <Package className="w-10 h-10 opacity-30" />
            <p className="text-sm">Aucune commande en attente</p>
          </div>
        ) : (
          <div className="divide-y divide-[--pos-border]">
            {commandes.map((cmd) => {
              const modifiable = cmd.statut === "soumise";
              return (
                <div key={cmd.id} className="px-4 py-3 hover:bg-[--pos-surface-hover] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-[--pos-text-muted]">{cmd.numero}</span>
                        <Badge
                          className={cn(
                            "text-[9px] py-0 px-1.5",
                            modifiable
                              ? "bg-[--pos-warning]/20 text-[--pos-warning] border-[--pos-warning]/30"
                              : "bg-[--pos-success]/20 text-[--pos-success] border-[--pos-success]/30"
                          )}
                        >
                          {modifiable ? (
                            <><AlertCircle className="w-2.5 h-2.5 mr-0.5" />En attente</>
                          ) : (
                            <><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Prise en charge</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{cmd.client}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[--pos-text-muted]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{cmd.soumiseAt}
                        </span>
                        <span>{cmd.nbArticles} art.</span>
                        <span className="font-semibold text-[--pos-text]">{formatMGA(cmd.totalTTC)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleModifier(cmd)}
                      disabled={!modifiable || chargementId === cmd.id}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0",
                        modifiable
                          ? "bg-[--pos-primary]/15 text-[--pos-primary] hover:bg-[--pos-primary]/25"
                          : "bg-[--pos-surface-hover] text-[--pos-text-muted] cursor-not-allowed"
                      )}
                    >
                      {chargementId === cmd.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Edit3 className="w-3.5 h-3.5" />
                      )}
                      Modifier
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-3 border-t border-[--pos-border] bg-[--pos-surface-hover]">
        <p className="text-[11px] text-[--pos-text-muted] text-center">
          Seules les commandes encore en attente peuvent être modifiées
        </p>
      </div>
    </div>
  );
}
