"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Filter,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Données de démo
const STOCK_DEMO = [
  {
    id: "p1", code: "RIZ-MAKA-001", nom: "Riz Makalioka", nomMG: "Vary Makalioka",
    categorie: "Riz", emoji: "🌾", uniteBase: "kg",
    stockBase: 2500, seuilAlerte: 500,
    unitesPrincipales: [
      { nom: "Sac 50 kg", facteur: 50 },
      { nom: "kg", facteur: 1 },
    ],
    prixAchat: 2500, prixVente: 3200, valeurStock: 6250000,
    tendance: "stable" as const,
  },
  {
    id: "p2", code: "HUI-TIKO-001", nom: "Huile Tiko 1L", nomMG: "Menaka Tiko",
    categorie: "Huile", emoji: "🫙", uniteBase: "bouteille",
    stockBase: 48, seuilAlerte: 120,
    unitesPrincipales: [
      { nom: "Carton 12 btl", facteur: 12 },
      { nom: "Bouteille", facteur: 1 },
    ],
    prixAchat: 9500, prixVente: 12000, valeurStock: 456000,
    tendance: "bas" as const,
    alerteRupture: true,
  },
  {
    id: "p3", code: "SUC-BLA-001", nom: "Sucre Blanc", nomMG: "Siramamy Fotsy",
    categorie: "Sucre", emoji: "🍬", uniteBase: "kg",
    stockBase: 3000, seuilAlerte: 200,
    unitesPrincipales: [
      { nom: "Sac 50 kg", facteur: 50 },
    ],
    prixAchat: 4000, prixVente: 4800, valeurStock: 12000000,
    tendance: "hausse" as const,
  },
  {
    id: "p4", code: "SAV-MAD-001", nom: "Savon Madar", nomMG: "Savony Madar",
    categorie: "Savon", emoji: "🧼", uniteBase: "pièce",
    stockBase: 2400, seuilAlerte: 300,
    unitesPrincipales: [
      { nom: "Carton 100 pcs", facteur: 100 },
      { nom: "Pièce", facteur: 1 },
    ],
    prixAchat: 600, prixVente: 800, valeurStock: 1440000,
    tendance: "stable" as const,
  },
  {
    id: "p5", code: "LAI-GLO-001", nom: "Lait Gloria concentré", nomMG: "Ronono Gloria",
    categorie: "Lait", emoji: "🥛", uniteBase: "boîte",
    stockBase: 96, seuilAlerte: 96,
    unitesPrincipales: [
      { nom: "Carton 48 btes", facteur: 48 },
    ],
    prixAchat: 3500, prixVente: 4500, valeurStock: 336000,
    tendance: "bas" as const,
    alerteRupture: true,
  },
];

const STATS_STOCK = [
  { label: "Valeur totale", valeur: "20.5 M Ar", sous: "5 produits en stock", icon: BarChart2, couleur: "text-[--primary]" },
  { label: "Alertes rupture", valeur: "2", sous: "Huile Tiko, Lait Gloria", icon: AlertTriangle, couleur: "text-[--destructive]" },
  { label: "Mouvements du jour", valeur: "18", sous: "+12 entrées, −6 sorties", icon: ArrowUpRight, couleur: "text-[--success]" },
  { label: "Valeur casse", valeur: "45 000 Ar", sous: "Ce mois-ci", icon: TrendingDown, couleur: "text-[--warning-foreground]" },
];

export function StockView() {
  const [recherche, setRecherche] = useState("");
  const [alerteOnly, setAlerteOnly] = useState(false);

  const produits = STOCK_DEMO.filter((p) => {
    const q = recherche.toLowerCase();
    const matchQ = !q || p.nom.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const matchAlerte = !alerteOnly || !!p.alerteRupture;
    return matchQ && matchAlerte;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Stock & Entrepôt</h1>
          <p className="text-[--foreground-muted] mt-1">Dépôt principal — Antananarivo</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS_STOCK.map((s, i) => (
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
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
            alerteOnly
              ? "bg-[--destructive]/10 border-[--destructive]/30 text-[--destructive]"
              : "border-[--border] text-[--foreground-muted] hover:border-[--border-strong] hover:text-[--foreground]"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Alertes seulement
        </button>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4" />
          Filtres
        </Button>
      </div>

      {/* Tableau stock */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[--background-subtle] border-b border-[--border]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Produit</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Stock (unité base)</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden sm:table-cell">Équivalences</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted] hidden md:table-cell">Valeur stock</th>
                  <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {produits.map((p, i) => {
                  const pourcentageSeuil = Math.min(100, (p.stockBase / p.seuilAlerte) * 100);
                  const critique = p.stockBase <= p.seuilAlerte;

                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "hover:bg-[--accent] transition-colors",
                        critique && "bg-[--destructive]/3"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{p.emoji}</span>
                          <div>
                            <p className="font-semibold text-[--foreground]">{p.nom}</p>
                            <p className="text-[11px] text-[--foreground-muted] italic">{p.nomMG}</p>
                            <p className="text-[10px] font-mono text-[--foreground-subtle]">{p.code}</p>
                          </div>
                        </div>
                      </td>

                      <td className="text-right px-4 py-3">
                        <div>
                          <p className={cn("font-bold text-mga", critique ? "text-[--destructive]" : "text-[--foreground]")}>
                            {p.stockBase.toLocaleString("fr-FR")} {p.uniteBase}
                          </p>
                          {/* Barre de stock */}
                          <div className="w-24 h-1.5 bg-[--border] rounded-full mt-1 ml-auto">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                critique ? "bg-[--destructive]" : pourcentageSeuil < 200 ? "bg-[--warning]" : "bg-[--success]"
                              )}
                              style={{ width: `${Math.min(100, pourcentageSeuil / 3)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="text-right px-4 py-3 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {p.unitesPrincipales.map((u) => (
                            <p key={u.nom} className="text-xs text-[--foreground-muted]">
                              ≈ {Math.floor(p.stockBase / u.facteur)} {u.nom}
                              {p.stockBase % u.facteur > 0 && u.facteur > 1 && (
                                <span className="opacity-60">
                                  {" "}+ {p.stockBase % u.facteur} {p.uniteBase}
                                </span>
                              )}
                            </p>
                          ))}
                        </div>
                      </td>

                      <td className="text-right px-4 py-3 hidden md:table-cell">
                        <p className="font-medium text-mga text-sm">{formatMGA(p.valeurStock, { compact: true })}</p>
                      </td>

                      <td className="text-center px-4 py-3">
                        {critique ? (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                            Rupture
                          </Badge>
                        ) : p.tendance === "bas" ? (
                          <Badge variant="warning" className="text-[10px]">
                            <ArrowDownRight className="w-2.5 h-2.5 mr-1" />
                            Bas
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            OK
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/stock/produits/${p.id}`}>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
