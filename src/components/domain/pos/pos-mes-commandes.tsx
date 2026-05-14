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
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { usePOSStore } from "@/store/pos.store";
import type { LignePanier } from "@/store/pos.store";
import { toast } from "sonner";

// Palette fixe — indépendante des variables CSS
const C = {
  bg:       "#0d1117",
  surface:  "#161b22",
  hover:    "#1e2530",
  border:   "#30363d",
  text:     "#e2e8f0",
  muted:    "#8b949e",
  primary:  "#d97706",
  success:  "#22c55e",
  warning:  "#f59e0b",
};

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
  produitId: string;
  uniteVenteId: string | null;
  nom: string;
  unite: string;
  facteurConversion: number;
  qte: number;
  qteBase: number;
  prix: number;
  tauxRemise: number;
  montantRemise: number;
  total: number;
  tauxTVA: number;
  totalTTC: number;
};

type Props = { onClose: () => void };

export function POSMesCommandes({ onClose }: Props) {
  const [commandes, setCommandes] = useState<CommandeResumee[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargementId, setChargementId] = useState<string | null>(null);
  const [annulationId, setAnnulationId] = useState<string | null>(null);
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
        description: "La caisse a déjà commencé le traitement.",
      });
      return;
    }
    setChargementId(cmd.id);
    try {
      const res = await fetch(`/api/caisse/commandes/${cmd.id}`);
      const data: { lignes: LigneAPI[] } = await res.json();

      const lignesPanier: LignePanier[] = data.lignes.map((l) => ({
        id: crypto.randomUUID(),
        produitId: l.produitId,
        nomProduit: l.nom,
        uniteId: l.uniteVenteId ?? "default",
        nomUnite: l.unite,
        facteurConversion: l.facteurConversion,
        quantite: l.qte,
        quantiteBase: l.qteBase,
        prixUnitaire: l.prix,
        tauxRemise: l.tauxRemise,
        montantRemise: l.montantRemise,
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

  const handleAnnuler = async (cmd: CommandeResumee) => {
    if (cmd.statut !== "soumise") {
      toast.error("Annulation impossible", { description: "La caisse a déjà commencé le traitement." });
      return;
    }
    if (!confirm(`Annuler la commande ${cmd.numero} ?`)) return;
    setAnnulationId(cmd.id);
    try {
      const res = await fetch(`/api/caisse/commandes/${cmd.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Annulation impossible", { description: data.error });
        return;
      }
      setCommandes((prev) => prev.filter((c) => c.id !== cmd.id));
      toast.success(`Commande ${cmd.numero} annulée`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAnnulationId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: C.bg, color: C.text, borderLeft: `1px solid ${C.border}` }}>

      {/* Header */}
      <div style={{ height: 56, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, backgroundColor: C.surface }}>
        <Edit3 size={18} color={C.primary} />
        <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: C.text }}>Mes commandes envoyées</span>
        <button
          onClick={charger}
          disabled={loading}
          style={{ padding: 6, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: C.muted }}
          title="Actualiser"
        >
          <RefreshCw size={16} className={cn(loading && "animate-spin")} />
        </button>
        <button
          onClick={onClose}
          style={{ padding: 6, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: C.muted }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px 0", color: C.muted }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : commandes.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 16px", gap: 12, color: C.muted }}>
            <Package size={40} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>Aucune commande en attente</p>
          </div>
        ) : (
          <div>
            {commandes.map((cmd) => {
              const modifiable = cmd.statut === "soumise";
              return (
                <div
                  key={cmd.id}
                  style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.bg)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Numéro + badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: C.muted }}>{cmd.numero}</span>
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 9999, fontWeight: 600,
                          backgroundColor: modifiable ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                          color: modifiable ? C.warning : C.success,
                          display: "inline-flex", alignItems: "center", gap: 3,
                        }}>
                          {modifiable
                            ? <><AlertCircle size={10} />En attente</>
                            : <><CheckCircle2 size={10} />Prise en charge</>
                          }
                        </span>
                      </div>
                      {/* Client */}
                      <p style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cmd.client}
                      </p>
                      {/* Méta */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: C.muted }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} />{cmd.soumiseAt}
                        </span>
                        <span>{cmd.nbArticles} art.</span>
                        <span style={{ fontWeight: 600, color: C.text }}>{formatMGA(cmd.totalTTC)}</span>
                      </div>
                    </div>

                    {/* Boutons action */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleModifier(cmd)}
                        disabled={!modifiable || chargementId === cmd.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          fontSize: 12, fontWeight: 600,
                          padding: "6px 12px", borderRadius: 8, border: "none",
                          cursor: modifiable ? "pointer" : "not-allowed",
                          backgroundColor: modifiable ? "rgba(217,119,6,0.2)" : "rgba(255,255,255,0.05)",
                          color: modifiable ? C.primary : C.muted,
                        }}
                      >
                        {chargementId === cmd.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Edit3 size={14} />
                        }
                        Modifier
                      </button>
                      <button
                        onClick={() => handleAnnuler(cmd)}
                        disabled={!modifiable || annulationId === cmd.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          fontSize: 12, fontWeight: 600,
                          padding: "6px 12px", borderRadius: 8, border: "none",
                          cursor: modifiable ? "pointer" : "not-allowed",
                          backgroundColor: modifiable ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                          color: modifiable ? "#ef4444" : C.muted,
                        }}
                      >
                        {annulationId === cmd.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, backgroundColor: C.surface, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
          Seules les commandes en attente peuvent être modifiées
        </p>
      </div>
    </div>
  );
}
