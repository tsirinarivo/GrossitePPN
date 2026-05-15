"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  Filter,
  Download,
  Loader2,
  Warehouse,
  X,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type ProduitStock = {
  id: string;
  code: string;
  nom: string;
  nomMG: string | null;
  categorie: string;
  uniteBase: string;
  stockBase: number;
  seuilAlerte: number;
  alerteRupture: boolean;
  prixAchat: number;
  prixVente: number;
  valeurStock: number;
  mouvementsJour: number;
  entreesJour: number;
  sortiesJour: number;
};

type Stats = {
  valeurTotale: number;
  nbAlertes: number;
  totalMvt: number;
  totalEntrees: number;
  totalSorties: number;
};

type Depot = {
  id: string;
  nom: string;
  adresse: string | null;
  estPrincipal: boolean;
};

export function StockView() {
  const [recherche, setRecherche] = useState("");
  const [alerteOnly, setAlerteOnly] = useState(false);
  const [produitsDB, setProduitsDB] = useState<ProduitStock[]>([]);
  const [stats, setStats] = useState<Stats>({ valeurTotale: 0, nbAlertes: 0, totalMvt: 0, totalEntrees: 0, totalSorties: 0 });
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [depotId, setDepotId] = useState<string | null>(null);

  // Drawer stock par dépôt
  const [drawerProduit, setDrawerProduit] = useState<ProduitStock | null>(null);
  const [stocksDepot, setStocksDepot] = useState<{ depotId: string; depotNom: string; estPrincipal: boolean; quantiteBase: number }[]>([]);
  const [stocksEdites, setStocksEdites] = useState<Record<string, string>>({});
  const [stocksLoading, setStocksLoading] = useState(false);
  const [savingDepotId, setSavingDepotId] = useState<string | null>(null);

  // Fetch depots list once
  useEffect(() => {
    fetch("/api/depots")
      .then((r) => r.json())
      .then((data) => setDepots(data.depots ?? []))
      .catch(() => {});
  }, []);

  // Fetch stock whenever depot selection changes
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const url = depotId ? `/api/stock?depotId=${depotId}` : "/api/stock";

    setLoading(true);
    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { produits: ProduitStock[]; stats: Stats }) => {
        setProduitsDB(data.produits ?? []);
        setStats(data.stats ?? { valeurTotale: 0, nbAlertes: 0, totalMvt: 0, totalEntrees: 0, totalSorties: 0 });
        setErreur(false);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") console.error("[stock-view]", e);
        setErreur(true);
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [depotId]);

  const produits = produitsDB.filter((p) => {
    const q = recherche.toLowerCase();
    const matchQ = !q || p.nom.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const matchAlerte = !alerteOnly || p.alerteRupture;
    return matchQ && matchAlerte;
  });

  const statsCards = [
    {
      label: "Valeur totale",
      valeur: formatMGA(stats.valeurTotale, { compact: true }),
      sous: `${produitsDB.length} produits en stock`,
      icon: BarChart2,
      couleur: "text-[--primary]",
    },
    {
      label: "Alertes rupture",
      valeur: String(stats.nbAlertes),
      sous: stats.nbAlertes === 0 ? "Aucune alerte" : `${stats.nbAlertes} produit(s) critique(s)`,
      icon: AlertTriangle,
      couleur: "text-[--destructive]",
    },
    {
      label: "Mouvements du jour",
      valeur: String(stats.totalMvt),
      sous: `+${stats.totalEntrees} entrées, −${stats.totalSorties} sorties`,
      icon: ArrowUpRight,
      couleur: "text-[--success]",
    },
    {
      label: "Produits actifs",
      valeur: String(produitsDB.length),
      sous: "Dans le catalogue",
      icon: Package,
      couleur: "text-[--foreground-muted]",
    },
  ];

  function ouvrirDrawer(p: ProduitStock) {
    setDrawerProduit(p);
    setStocksEdites({});
    setStocksLoading(true);
    fetch(`/api/stock/${p.id}/depots`)
      .then((r) => r.json())
      .then((d) => {
        setStocksDepot(d.stocks ?? []);
        const init: Record<string, string> = {};
        for (const s of d.stocks ?? []) init[s.depotId] = String(s.quantiteBase);
        setStocksEdites(init);
      })
      .catch(() => toast.error("Impossible de charger les stocks"))
      .finally(() => setStocksLoading(false));
  }

  async function sauvegarderDepot(cibleDepotId: string) {
    if (!drawerProduit || savingDepotId) return;
    const qte = parseFloat(stocksEdites[cibleDepotId] ?? "0");
    if (isNaN(qte) || qte < 0) { toast.error("Quantité invalide"); return; }
    setSavingDepotId(cibleDepotId);
    try {
      const res = await fetch(`/api/stock/${drawerProduit.id}/depots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depotId: cibleDepotId, quantiteBase: qte }),
      });
      if (res.ok) {
        toast.success("Stock mis à jour");
        setStocksDepot((prev) =>
          prev.map((s) => s.depotId === cibleDepotId ? { ...s, quantiteBase: qte } : s)
        );
        // Rafraîchir la liste principale avec le filtre actif
        const refreshUrl = depotId ? `/api/stock?depotId=${depotId}` : "/api/stock";
        fetch(refreshUrl).then(r => r.json()).then(data => {
          setProduitsDB(data.produits ?? []);
          setStats(data.stats ?? stats);
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSavingDepotId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Stock & Entrepôt</h1>
          <p className="text-[--foreground-muted] mt-1">
            {depotId ? (depots.find((d) => d.id === depotId)?.nom ?? "Dépôt sélectionné") : "Tous les dépôts"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Button size="sm" asChild>
            <Link href="/stock/produits/nouveau">
              <Plus className="w-4 h-4" />
              Nouveau produit
            </Link>
          </Button>
        </div>
      </div>

      {/* Sélecteur dépôt — visible seulement si plusieurs dépôts */}
      {depots.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Warehouse className="w-4 h-4 text-[--foreground-muted] shrink-0" />
          <button
            onClick={() => setDepotId(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              !depotId
                ? "bg-[--primary] text-white"
                : "bg-[--accent] text-[--foreground-muted] hover:text-[--foreground]"
            )}
          >
            Tous
          </button>
          {depots.map((d) => (
            <button
              key={d.id}
              onClick={() => setDepotId(d.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                depotId === d.id
                  ? "bg-[--primary] text-white"
                  : "bg-[--accent] text-[--foreground-muted] hover:text-[--foreground]"
              )}
            >
              {d.nom}
              {d.estPrincipal && <span className="ml-1 text-[10px] opacity-60">★</span>}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
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

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-subtle]" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setAlerteOnly(!alerteOnly)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
            alerteOnly
              ? "bg-[--destructive]/10 border-[--destructive]/30 text-[--destructive]"
              : "border-[--border] text-[--foreground-muted] hover:border-[--border-strong] hover:text-[--foreground]"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Alertes seulement
        </button>
      </div>

      {/* Tableau stock */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[--foreground-muted]">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">Chargement du stock…</span>
              </div>
            ) : erreur ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--destructive]">
                <AlertTriangle className="w-10 h-10 opacity-60" />
                <p className="text-sm font-medium">Impossible de charger le stock</p>
                <p className="text-xs text-[--foreground-muted]">Vérifiez la connexion au serveur puis rechargez la page.</p>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Réessayer</Button>
              </div>
            ) : produits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-muted]">
                <Package className="w-10 h-10 opacity-30" />
                <p className="text-sm">
                  {alerteOnly ? "Aucune alerte de rupture" : "Aucun produit dans le catalogue"}
                </p>
                {!alerteOnly && (
                  <Button size="sm" asChild>
                    <Link href="/stock/produits/nouveau">
                      <Plus className="w-4 h-4" />
                      Ajouter le premier produit
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[--background-subtle] border-b border-[--border]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Produit</th>
                    <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Stock</th>
                    <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden md:table-cell">Valeur stock</th>
                    <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden sm:table-cell">Seuil alerte</th>
                    <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border]">
                  {produits.map((p, i) => {
                    const pourcentageSeuil = p.seuilAlerte > 0
                      ? Math.min(100, (p.stockBase / p.seuilAlerte) * 100)
                      : 100;
                    const critique = p.alerteRupture;

                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          "hover:bg-[--accent] transition-colors",
                          critique && "bg-[--destructive]/3"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-[--accent] items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-[--foreground-muted]" />
                            </div>
                            <div>
                              <p className="font-semibold text-[--foreground]">{p.nom}</p>
                              {p.nomMG && <p className="text-[11px] text-[--foreground-muted] italic">{p.nomMG}</p>}
                              <p className="text-xs font-mono text-[--foreground-subtle]">{p.code}</p>
                            </div>
                          </div>
                        </td>

                        <td className="text-right px-4 py-3">
                          <p className={cn("font-bold", critique ? "text-[--destructive]" : "text-[--foreground]")}>
                            {p.stockBase.toLocaleString("fr-FR")} {p.uniteBase}
                          </p>
                          <div className="w-24 h-1.5 bg-[--border] rounded-full mt-1 ml-auto">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                critique ? "bg-[--destructive]" : pourcentageSeuil < 150 ? "bg-[--warning]" : "bg-[--success]"
                              )}
                              style={{ width: `${Math.min(100, pourcentageSeuil / 3)}%` }}
                            />
                          </div>
                        </td>

                        <td className="text-right px-4 py-3 hidden md:table-cell">
                          <p className="font-medium text-sm">{formatMGA(p.valeurStock, { compact: true })}</p>
                        </td>

                        <td className="text-right px-4 py-3 hidden sm:table-cell text-[--foreground-muted] text-xs">
                          {p.seuilAlerte > 0 ? `${p.seuilAlerte} ${p.uniteBase}` : "—"}
                        </td>

                        <td className="text-center px-4 py-3">
                          {critique ? (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                              Rupture
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              OK
                            </Badge>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Stock par dépôt"
                              onClick={() => ouvrirDrawer(p)}
                            >
                              <Warehouse className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <Link href={`/stock/produits/${p.id}`}>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </div>
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
      {/* ── Drawer stock par dépôt ── */}
      <AnimatePresence>
        {drawerProduit && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setDrawerProduit(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[--card] border-l border-[--border] flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 p-5 border-b border-[--border] shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-[--primary] shrink-0" />
                    <h2 className="font-bold text-[--foreground] truncate">{drawerProduit.nom}</h2>
                  </div>
                  <p className="text-xs text-[--foreground-muted] mt-1 font-mono">{drawerProduit.code} · {drawerProduit.uniteBase}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setDrawerProduit(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Corps */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {stocksLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[--foreground-muted]" /></div>
                ) : stocksDepot.length === 0 ? (
                  <div className="text-center py-10 text-[--foreground-muted]">
                    <Warehouse className="w-8 h-8 opacity-20 mx-auto mb-2" />
                    <p className="text-sm">Aucun dépôt actif trouvé</p>
                    <p className="text-xs mt-1">Créez des dépôts dans Admin → Dépôts</p>
                  </div>
                ) : (
                  stocksDepot.map((s) => (
                    <div key={s.depotId} className="rounded-xl border border-[--border] bg-[--accent]/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-[--primary] shrink-0" />
                        <span className="font-semibold text-sm text-[--foreground]">{s.depotNom}</span>
                        {s.estPrincipal && <Badge variant="default" className="text-[10px]">Principal</Badge>}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-[--foreground-muted] mb-1 block">
                            Quantité ({drawerProduit.uniteBase})
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={stocksEdites[s.depotId] ?? "0"}
                            onChange={(e) => setStocksEdites((prev) => ({ ...prev, [s.depotId]: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                        <div className="shrink-0 mt-5">
                          <Button
                            size="sm"
                            onClick={() => sauvegarderDepot(s.depotId)}
                            disabled={savingDepotId === s.depotId || String(stocksEdites[s.depotId] ?? "0") === String(s.quantiteBase)}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Enregistrer
                          </Button>
                        </div>
                      </div>

                      {s.quantiteBase !== parseFloat(stocksEdites[s.depotId] ?? String(s.quantiteBase)) && (
                        <p className="text-xs text-[--foreground-muted]">
                          Stock actuel : <span className="font-medium">{s.quantiteBase} {drawerProduit.uniteBase}</span>
                          {" → "}
                          <span className="font-semibold text-[--primary]">
                            {stocksEdites[s.depotId]} {drawerProduit.uniteBase}
                          </span>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer total */}
              {stocksDepot.length > 0 && (
                <div className="border-t border-[--border] p-4 bg-[--accent]/30 shrink-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[--foreground-muted]">Total tous dépôts</span>
                    <span className="font-bold text-[--foreground]">
                      {stocksDepot.reduce((s, d) => s + d.quantiteBase, 0).toLocaleString("fr-FR")} {drawerProduit.uniteBase}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[--foreground-muted] mt-1">
                    <span>Valeur stock</span>
                    <span>{formatMGA(stocksDepot.reduce((s, d) => s + d.quantiteBase, 0) * drawerProduit.prixAchat, { compact: true })}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
