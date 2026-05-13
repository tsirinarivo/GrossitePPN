"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  FileText,
  ChevronRight,
  MapPin,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUTS: Record<string, { label: string; icon: typeof Clock; couleur: string; bg: string }> = {
  soumise: { label: "En attente", icon: Clock, couleur: "text-[--warning-foreground]", bg: "bg-[--warning]/10" },
  validee: { label: "Validée", icon: CheckCircle2, couleur: "text-[--success]", bg: "bg-[--success]/10" },
  preparee: { label: "En préparation", icon: Package, couleur: "text-[--color-indigo-600]", bg: "bg-[--color-indigo-50]" },
  en_livraison: { label: "En livraison", icon: Truck, couleur: "text-[--primary]", bg: "bg-[--primary]/10" },
  livree: { label: "Livrée", icon: CheckCircle2, couleur: "text-[--success]", bg: "bg-[--success]/15" },
  annulee: { label: "Annulée", icon: RotateCcw, couleur: "text-[--foreground-muted]", bg: "bg-[--border]" },
};

type Commande = {
  id: string;
  numero: string;
  date: string;
  montant: number;
  nbArticles: number;
  statut: string;
  produits: string[];
};

export function CompteCommandes() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shop/commandes")
      .then((r) => r.json())
      .then((data: Commande[]) => setCommandes(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[--foreground-muted]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[--foreground]">Mes commandes</h1>
        <Badge>{commandes.length} commande{commandes.length !== 1 ? "s" : ""}</Badge>
      </div>

      {commandes.length === 0 ? (
        <div className="text-center py-16 text-[--foreground-muted]">
          <Package className="w-12 h-12 opacity-20 mx-auto mb-4" />
          <p className="font-medium">Aucune commande pour le moment</p>
          <p className="text-sm mt-1">Vos commandes apparaîtront ici.</p>
          <Button className="mt-6" asChild>
            <Link href="/shop">Parcourir le catalogue</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {commandes.map((cmd, i) => {
            const statutInfo = STATUTS[cmd.statut] ?? STATUTS["soumise"]!;
            return (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  {cmd.statut === "en_livraison" && (
                    <div className="h-1 bg-gradient-to-r from-[--primary] to-[--secondary]" />
                  )}

                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-mono font-semibold text-[--foreground]">
                            {cmd.numero}
                          </span>
                          <span
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                              statutInfo.bg,
                              statutInfo.couleur
                            )}
                          >
                            <statutInfo.icon className="w-3 h-3" />
                            {statutInfo.label}
                          </span>
                        </div>

                        <p className="text-xs text-[--foreground-muted] mb-2">{cmd.date}</p>

                        <div className="text-xs text-[--foreground-muted] space-y-0.5">
                          {cmd.produits.slice(0, 2).map((p) => (
                            <p key={p}>• {p}</p>
                          ))}
                          {cmd.produits.length > 2 && (
                            <p>+ {cmd.produits.length - 2} autre(s)</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-[--foreground]">
                          {formatMGA(cmd.montant)}
                        </p>
                        <p className="text-xs text-[--foreground-muted] mt-0.5">
                          {cmd.nbArticles} article{cmd.nbArticles !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[--border]">
                      {cmd.statut === "en_livraison" && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/suivi/${cmd.id}`}>
                            <MapPin className="w-3.5 h-3.5" />
                            Suivre
                          </Link>
                        </Button>
                      )}
                      {cmd.statut === "livree" && (
                        <Button size="sm" variant="outline">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Recommander
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="ml-auto">
                        <FileText className="w-3.5 h-3.5" />
                        Facture PDF
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
