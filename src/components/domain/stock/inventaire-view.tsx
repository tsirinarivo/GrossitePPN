"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  ClipboardList,
  Loader2,
  Check,
  AlertTriangle,
  Package,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Depot = {
  id: string;
  nom: string;
  adresse: string | null;
  actif: boolean;
  estPrincipal: boolean;
};

type ProduitInventaire = {
  produitId: string;
  designation: string;
  code: string;
  uniteBase: string;
  seuilAlerte: number | null;
  stockActuel: number | null;
  depotId: string | null;
};

type LigneEdition = {
  produitId: string;
  designation: string;
  code: string;
  uniteBase: string;
  stockSysteme: number;
  quantiteComptee: string;
};

export function InventaireView() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [depotId, setDepotId] = useState<string>("");
  const [lignes, setLignes] = useState<LigneEdition[]>([]);
  const [recherche, setRecherche] = useState("");
  const [ecartSeulement, setEcartSeulement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(
    async (depot: string) => {
      setLoading(true);
      setErreur(false);
      try {
        const url = depot
          ? `/api/stock/inventaire?depotId=${depot}`
          : "/api/stock/inventaire";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { depots: Depot[]; produits: ProduitInventaire[] } =
          await res.json();

        if (depots.length === 0) {
          setDepots(data.depots ?? []);
          if (!depot && data.depots.length > 0) {
            setDepotId(data.depots[0]!.id);
            return; // will re-trigger via useEffect
          }
        }

        // Deduplicate: one row per produit (take first stockActuel found)
        const map = new Map<string, ProduitInventaire>();
        for (const row of data.produits ?? []) {
          if (!map.has(row.produitId)) map.set(row.produitId, row);
        }

        setLignes(
          Array.from(map.values()).map((p) => ({
            produitId: p.produitId,
            designation: p.designation,
            code: p.code,
            uniteBase: p.uniteBase,
            stockSysteme: p.stockActuel ?? 0,
            quantiteComptee: String(p.stockActuel ?? 0),
          }))
        );
      } catch (e) {
        console.error("[inventaire-view]", e);
        setErreur(true);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Load depots first
  useEffect(() => {
    charger("");
  }, [charger]);

  // Re-load when depotId changes (after initial depot list is set)
  useEffect(() => {
    if (depotId) {
      charger(depotId);
    }
  }, [depotId, charger]);

  // Also set depots on first load (when depots state is updated via charger)
  // and pick first depot
  useEffect(() => {
    if (depots.length > 0 && !depotId) {
      setDepotId(depots[0]!.id);
    }
  }, [depots, depotId]);

  function updateQuantite(produitId: string, val: string) {
    setLignes((prev) =>
      prev.map((l) =>
        l.produitId === produitId ? { ...l, quantiteComptee: val } : l
      )
    );
  }

  const lignesFiltrees = lignes.filter((l) => {
    const q = recherche.toLowerCase();
    const matchQ =
      !q ||
      l.designation.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q);
    if (!matchQ) return false;
    if (ecartSeulement) {
      const compte = parseFloat(l.quantiteComptee);
      return !isNaN(compte) && compte !== l.stockSysteme;
    }
    return true;
  });

  const nbEcarts = lignes.filter((l) => {
    const compte = parseFloat(l.quantiteComptee);
    return !isNaN(compte) && compte !== l.stockSysteme;
  }).length;

  async function validerInventaire() {
    if (!depotId) {
      toast.error("Sélectionnez un dépôt");
      return;
    }
    const lignesModifiees = lignes
      .map((l) => ({
        produitId: l.produitId,
        quantiteComptee: parseFloat(l.quantiteComptee),
      }))
      .filter((l) => !isNaN(l.quantiteComptee));

    if (lignesModifiees.length === 0) {
      toast.error("Aucune ligne valide");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/stock/inventaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depotId, lignes: lignesModifiees }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Inventaire validé — ${data.ecarts ?? nbEcarts} produit(s) ajusté(s)`
        );
        // Reset to stock system values
        setLignes((prev) =>
          prev.map((l) => {
            const modif = lignesModifiees.find(
              (m) => m.produitId === l.produitId
            );
            const nouv = modif?.quantiteComptee ?? l.stockSysteme;
            return { ...l, stockSysteme: nouv, quantiteComptee: String(nouv) };
          })
        );
        setEcartSeulement(false);
      } else {
        toast.error(data.error ?? "Erreur lors de la validation");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/stock">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-display-sm text-[--foreground] flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[--primary]" />
              Inventaire physique
            </h1>
            <p className="text-[--foreground-muted] mt-1 text-sm">
              Comptez les produits et ajustez le stock système
            </p>
          </div>
        </div>
        <Button
          onClick={validerInventaire}
          disabled={saving || nbEcarts === 0 || loading}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Valider l&apos;inventaire
          {nbEcarts > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs font-bold">
              {nbEcarts}
            </span>
          )}
        </Button>
      </div>

      {/* Sélecteur dépôt */}
      {depots.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Warehouse className="w-4 h-4 text-[--foreground-muted] shrink-0" />
          <span className="text-sm text-[--foreground-muted]">Dépôt :</span>
          <select
            value={depotId}
            onChange={(e) => setDepotId(e.target.value)}
            className="rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] text-[--foreground]"
          >
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom}
                {d.estPrincipal ? " ★" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-subtle]" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un produit…"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[--foreground-muted] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ecartSeulement}
            onChange={(e) => setEcartSeulement(e.target.checked)}
            className="w-4 h-4 rounded accent-[--primary]"
          />
          Modifier uniquement les lignes avec écart
          {nbEcarts > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-[--warning]/20 text-[--warning] text-xs font-semibold">
              {nbEcarts}
            </span>
          )}
        </label>
      </div>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[--foreground-muted]">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">Chargement…</span>
              </div>
            ) : erreur ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--destructive]">
                <AlertTriangle className="w-10 h-10 opacity-60" />
                <p className="text-sm font-medium">
                  Impossible de charger les produits
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => charger(depotId)}
                >
                  Réessayer
                </Button>
              </div>
            ) : lignesFiltrees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-muted]">
                <Package className="w-10 h-10 opacity-30" />
                <p className="text-sm">
                  {ecartSeulement
                    ? "Aucune ligne avec écart"
                    : "Aucun produit trouvé"}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[--background-subtle] border-b border-[--border]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">
                      Produit
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden sm:table-cell">
                      Code
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">
                      Stock système
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">
                      Qté comptée
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">
                      Écart
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-[--foreground-muted] hidden md:table-cell">
                      Unité
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border]">
                  {lignesFiltrees.map((l) => {
                    const compte = parseFloat(l.quantiteComptee);
                    const ecart = isNaN(compte)
                      ? null
                      : compte - l.stockSysteme;
                    return (
                      <tr
                        key={l.produitId}
                        className={cn(
                          "hover:bg-[--accent]/50 transition-colors",
                          ecart !== null &&
                            ecart !== 0 &&
                            "bg-[--warning]/5"
                        )}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[--foreground]">
                            {l.designation}
                          </p>
                          <p className="text-xs font-mono text-[--foreground-subtle] sm:hidden">
                            {l.code}
                          </p>
                        </td>
                        <td className="text-right px-4 py-3 font-mono text-xs text-[--foreground-muted] hidden sm:table-cell">
                          {l.code}
                        </td>
                        <td className="text-right px-4 py-3 text-[--foreground-muted]">
                          {l.stockSysteme.toLocaleString("fr-FR")}
                        </td>
                        <td className="text-right px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.quantiteComptee}
                            onChange={(e) =>
                              updateQuantite(l.produitId, e.target.value)
                            }
                            className="w-28 text-right ml-auto h-8 text-sm"
                          />
                        </td>
                        <td
                          className={cn(
                            "text-right px-4 py-3 font-semibold text-sm",
                            ecart === null
                              ? "text-[--foreground-muted]"
                              : ecart === 0
                              ? "text-[--foreground-muted]"
                              : ecart > 0
                              ? "text-amber-500"
                              : "text-[--destructive]"
                          )}
                        >
                          {ecart === null
                            ? "—"
                            : ecart === 0
                            ? "OK"
                            : `${ecart > 0 ? "+" : ""}${ecart.toLocaleString("fr-FR")}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-[--foreground-muted] hidden md:table-cell">
                          {l.uniteBase}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résumé bas */}
      {!loading && lignes.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[--foreground-muted] px-1">
          <span>
            {lignes.length} produit(s) au total ·{" "}
            {nbEcarts > 0 ? (
              <span className="text-amber-500 font-medium">
                {nbEcarts} écart(s) détecté(s)
              </span>
            ) : (
              <span className="text-[--success]">Aucun écart</span>
            )}
          </span>
          <Button
            onClick={validerInventaire}
            disabled={saving || nbEcarts === 0}
            size="sm"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Valider
          </Button>
        </div>
      )}
    </div>
  );
}
