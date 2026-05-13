"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  User,
  Navigation,
  Copy,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Statut = "preparation" | "en_route" | "livree" | "echec";

interface Livraison {
  id: string;
  numero: string;
  client: string;
  ville: string;
  adresse: string;
  chauffeur: string;
  vehicule: string;
  eta: string;
  montant: number;
  nbColis: number;
  statut: Statut;
  tokenPublic: string;
  position: { x: number; y: number };
}

const LIVRAISONS_DEMO: Livraison[] = [
  { id: "l1", numero: "LIV-2034", client: "Épicerie Rabe", ville: "Antananarivo", adresse: "Lot II M 45 Bis, Analakely",
    chauffeur: "Hery Rakoto", vehicule: "Camion 3.5T — 1234 TBM", eta: "14:30", montant: 1_240_000, nbColis: 12,
    statut: "en_route", tokenPublic: "trk-abc123def456", position: { x: 35, y: 45 } },
  { id: "l2", numero: "LIV-2035", client: "Tana Distribution", ville: "Antananarivo", adresse: "Rue Rainandriamampandry, Tsaralalàna",
    chauffeur: "Hery Rakoto", vehicule: "Camion 3.5T — 1234 TBM", eta: "15:45", montant: 3_400_000, nbColis: 28,
    statut: "preparation", tokenPublic: "trk-xyz789ghi012", position: { x: 42, y: 38 } },
  { id: "l3", numero: "LIV-2036", client: "Magasin Soa", ville: "Tamatave", adresse: "Bd Joffre, Bazar Be",
    chauffeur: "Naivo Andriam.", vehicule: "Camion 5T — 5678 TBE", eta: "Demain 09:00", montant: 890_000, nbColis: 8,
    statut: "preparation", tokenPublic: "trk-jkl345mno678", position: { x: 78, y: 50 } },
  { id: "l4", numero: "LIV-2032", client: "Boutique Tiana", ville: "Mahajanga", adresse: "Av. de France",
    chauffeur: "Tovo Razafy", vehicule: "Fourgonnette — 9012 TBA", eta: "Livrée 11:20", montant: 540_000, nbColis: 4,
    statut: "livree", tokenPublic: "trk-pqr901stu234", position: { x: 22, y: 22 } },
  { id: "l5", numero: "LIV-2031", client: "Snack Mamy", ville: "Antsirabe", adresse: "Av. de l'Indépendance",
    chauffeur: "Naivo Andriam.", vehicule: "Fourgonnette — 9012 TBA", eta: "Échec — réessai", montant: 220_000, nbColis: 2,
    statut: "echec", tokenPublic: "trk-vwx567yza890", position: { x: 40, y: 65 } },
];

const STATUT_CONF: Record<Statut, { label: string; couleur: string; icon: typeof Truck }> = {
  preparation: { label: "En préparation", couleur: "text-[--warning-foreground] bg-[--warning]/15", icon: Package },
  en_route: { label: "En route", couleur: "text-[--primary] bg-[--primary]/15", icon: Truck },
  livree: { label: "Livrée", couleur: "text-[--success] bg-[--success]/15", icon: CheckCircle2 },
  echec: { label: "Échec", couleur: "text-[--destructive] bg-[--destructive]/15", icon: XCircle },
};

export function LivraisonsView() {
  const [selection, setSelection] = useState<Livraison>(LIVRAISONS_DEMO[0]!);

  const stats = {
    total: LIVRAISONS_DEMO.length,
    enRoute: LIVRAISONS_DEMO.filter((l) => l.statut === "en_route").length,
    livrees: LIVRAISONS_DEMO.filter((l) => l.statut === "livree").length,
    retards: LIVRAISONS_DEMO.filter((l) => l.statut === "echec").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Livraisons</h1>
          <p className="text-[--foreground-muted] mt-1">Tournées du jour — {new Date().toLocaleDateString("fr-FR")}</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4" />
          Nouvelle tournée
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Livraisons du jour", valeur: stats.total.toString(), sous: "5 tournées planifiées", icon: Truck, couleur: "text-[--primary]" },
          { label: "En route", valeur: stats.enRoute.toString(), sous: "Suivi temps réel", icon: Navigation, couleur: "text-[--primary]" },
          { label: "Livrées", valeur: stats.livrees.toString(), sous: "Taux ponctualité 94%", icon: CheckCircle2, couleur: "text-[--success]" },
          { label: "Échecs / retards", valeur: stats.retards.toString(), sous: "À reprogrammer", icon: AlertTriangle, couleur: "text-[--destructive]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
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

      <div className="grid lg:grid-cols-5 gap-4 min-h-[500px]">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 py-3 bg-[--background-subtle] border-b border-[--border]">
              <h2 className="text-sm font-semibold text-[--foreground]">File des livraisons</h2>
            </div>
            <div className="divide-y divide-[--border] max-h-[600px] overflow-y-auto">
              {LIVRAISONS_DEMO.map((l, i) => {
                const conf = STATUT_CONF[l.statut];
                const active = selection.id === l.id;
                return (
                  <motion.button
                    key={l.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelection(l)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-[--accent]",
                      active && "bg-[--accent] border-l-2 border-[--primary]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-mono text-[10px] text-[--foreground-subtle]">{l.numero}</p>
                        <p className="font-semibold text-sm text-[--foreground]">{l.client}</p>
                      </div>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1", conf.couleur)}>
                        <conf.icon className="w-3 h-3" />
                        {conf.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[--foreground-muted] mt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {l.ville}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {l.eta}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {l.nbColis}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative h-64 bg-gradient-to-br from-[--primary]/10 via-[--background-subtle] to-[--success]/10">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid-livraisons" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[--border]" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-livraisons)" />
                </svg>
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-[--background]/80 backdrop-blur text-[10px] text-[--foreground-muted] font-mono">
                  Madagascar — vue carte (démo)
                </div>
                {LIVRAISONS_DEMO.map((l) => {
                  const conf = STATUT_CONF[l.statut];
                  const active = selection.id === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setSelection(l)}
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 transition-all",
                        active ? "scale-125 z-10" : "scale-100 hover:scale-110"
                      )}
                      style={{ left: `${l.position.x}%`, top: `${l.position.y}%` }}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-lg ring-2 ring-[--background]", conf.couleur)}>
                        <conf.icon className="w-4 h-4" />
                      </div>
                      {active && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-[--foreground] text-[--background] text-[10px] whitespace-nowrap font-medium"
                        >
                          {l.ville}
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] text-[--foreground-subtle]">{selection.numero}</p>
                  <h3 className="text-lg font-bold text-[--foreground]">{selection.client}</h3>
                  <p className="text-sm text-[--foreground-muted] inline-flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {selection.adresse}, {selection.ville}
                  </p>
                </div>
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5", STATUT_CONF[selection.statut].couleur)}>
                  {(() => {
                    const Icon = STATUT_CONF[selection.statut].icon;
                    return <Icon className="w-3.5 h-3.5" />;
                  })()}
                  {STATUT_CONF[selection.statut].label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-[--background-subtle]">
                  <p className="text-[10px] text-[--foreground-muted] uppercase tracking-wide">Chauffeur</p>
                  <p className="font-semibold text-[--foreground] inline-flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                    {selection.chauffeur}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[--background-subtle]">
                  <p className="text-[10px] text-[--foreground-muted] uppercase tracking-wide">Véhicule</p>
                  <p className="font-semibold text-[--foreground] inline-flex items-center gap-1.5 mt-0.5">
                    <Truck className="w-3.5 h-3.5" />
                    {selection.vehicule}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[--background-subtle]">
                  <p className="text-[10px] text-[--foreground-muted] uppercase tracking-wide">ETA</p>
                  <p className="font-semibold text-[--foreground] inline-flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    {selection.eta}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[--background-subtle]">
                  <p className="text-[10px] text-[--foreground-muted] uppercase tracking-wide">Montant</p>
                  <p className="font-semibold text-[--foreground] text-mga mt-0.5">{formatMGA(selection.montant)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-[--border]">
                <div>
                  <p className="text-[10px] text-[--foreground-muted] uppercase tracking-wide">Lien public tracking</p>
                  <p className="font-mono text-xs text-[--foreground] mt-0.5">/livraisons/track/{selection.tokenPublic}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Copy className="w-3.5 h-3.5" />
                  Copier
                </Button>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1">Voir lignes commande</Button>
                {selection.statut === "echec" ? (
                  <Button size="sm" className="flex-1">Reprogrammer</Button>
                ) : selection.statut === "preparation" ? (
                  <Button size="sm" className="flex-1">Démarrer la tournée</Button>
                ) : selection.statut === "en_route" ? (
                  <Badge variant="success" className="text-xs">En cours · suivi GPS actif</Badge>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1">Bon de livraison</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
