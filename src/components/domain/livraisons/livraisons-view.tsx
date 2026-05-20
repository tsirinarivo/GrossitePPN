"use client";

import { useState, useEffect } from "react";
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
  Loader2,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMGA } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

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
  tourneeId?: string | null;
  livraisonAt?: string | null;
  motifRefus?: string | null;
}

/** Map DB statuts to UI Statut */
function mapStatut(dbStatut: string): Statut {
  switch (dbStatut) {
    case "en_route":
      return "en_route";
    case "livree":
      return "livree";
    case "echec":
    case "refusee":
      return "echec";
    default:
      // en_attente, preparee, chargee → preparation
      return "preparation";
  }
}

const STATUT_CONF: Record<Statut, { label: string; couleur: string; icon: typeof Truck }> = {
  preparation: { label: "En préparation", couleur: "text-[--warning-foreground] bg-[--warning]/15", icon: Package },
  en_route: { label: "En route", couleur: "text-[--primary] bg-[--primary]/15", icon: Truck },
  livree: { label: "Livrée", couleur: "text-[--success] bg-[--success]/15", icon: CheckCircle2 },
  echec: { label: "Échec", couleur: "text-[--destructive] bg-[--destructive]/15", icon: XCircle },
};

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function LivraisonsView() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dateFiltre, setDateFiltre] = useState<string>(todayISO());
  const [reloadKey, setReloadKey] = useState(0);
  const [selection, setSelection] = useState<Livraison | null>(null);
  const [statsApi, setStatsApi] = useState({ total: 0, enRoute: 0, livrees: 0, echecs: 0 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);

    fetch(`/api/livraisons?date=${dateFiltre}`)
      .then((r) => r.json())
      .then((data: { livraisons: Array<Record<string, unknown>>; stats: typeof statsApi }) => {
        if (cancelled) return;
        const mapped: Livraison[] = (data.livraisons ?? []).map(
          (r: Record<string, unknown>, i: number) => ({
            id: r.id as string,
            numero: r.numero as string,
            client: r.client as string,
            ville: r.ville as string,
            adresse: r.adresse as string,
            chauffeur: r.chauffeur as string,
            vehicule: r.vehicule as string,
            eta: r.eta as string,
            montant: r.montant as number,
            nbColis: r.nbColis as number,
            statut: mapStatut(r.statut as string),
            tokenPublic: r.tokenPublic as string,
            position: (r.position as { x: number; y: number }) ?? { x: 20 + (i * 15) % 70, y: 25 + (i * 20) % 55 },
            tourneeId: (r.tourneeId as string | null) ?? null,
            livraisonAt: (r.livraisonAt as string | null) ?? null,
            motifRefus: (r.motifRefus as string | null) ?? null,
          })
        );
        setLivraisons(mapped);
        setStatsApi(data.stats ?? { total: 0, enRoute: 0, livrees: 0, echecs: 0 });
        setSelection((prev) => {
          if (!prev) return mapped[0] ?? null;
          const refreshed = mapped.find((l) => l.id === prev.id);
          return refreshed ?? mapped[0] ?? null;
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setErreur("Impossible de charger les livraisons");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [dateFiltre, reloadKey]);

  function imprimerBL(l: Livraison) {
    const date = new Date().toLocaleDateString("fr-FR");
    const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BL ${l.numero}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:20px;color:#000}
  h1{font-size:18px;margin:0 0 4px}
  .header{display:flex;justify-content:space-between;margin-bottom:20px}
  .info-block{margin-bottom:12px}
  .label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px}
  .value{font-weight:bold;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#f0f0f0;padding:8px;text-align:left;font-size:11px;border:1px solid #ddd}
  td{padding:8px;border:1px solid #ddd;font-size:12px}
  .footer{margin-top:32px;border-top:1px solid #ddd;padding-top:12px;display:flex;justify-content:space-between}
  .signature-box{border:1px solid #999;width:180px;height:60px;padding:6px;font-size:10px;color:#999}
  @media print{body{padding:0}.no-print{display:none}}
</style></head><body>
<div class="header">
  <div><h1>BON DE LIVRAISON</h1><div style="font-size:11px;color:#666">${l.numero}</div></div>
  <div style="text-align:right"><div class="label">Date</div><div class="value">${date} ${heure}</div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div class="info-block"><div class="label">Client</div><div class="value">${l.client}</div><div>${l.adresse}</div><div>${l.ville}</div></div>
  <div class="info-block">
    <div class="label">Chauffeur / Véhicule</div><div class="value">${l.chauffeur}</div><div>${l.vehicule}</div>
    <div class="label" style="margin-top:8px">Montant</div><div class="value">${l.montant.toLocaleString("fr-FR")} MGA</div>
  </div>
</div>
<table><thead><tr><th>#</th><th>Désignation</th><th>Quantité</th><th>Observations</th></tr></thead>
<tbody>${[...Array(8)].map((_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td></tr>`).join("")}</tbody></table>
<div class="footer">
  <div><div class="label">Signature client (BL reçu)</div><div class="signature-box">Nom &amp; signature</div></div>
  <div style="text-align:right"><div class="label">Signature chauffeur</div><div class="signature-box">Nom &amp; signature</div></div>
</div>
<p class="no-print" style="margin-top:20px"><button onclick="window.print()">Imprimer</button></p>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
  }

  async function patchLivraison(id: string, body: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/livraisons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Erreur lors de la mise à jour");
        return;
      }
      toast.success("Livraison mise à jour");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur réseau");
    }
  }

  const stats = {
    total: statsApi.total,
    enRoute: statsApi.enRoute,
    livrees: statsApi.livrees,
    retards: statsApi.echecs,
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Livraisons</h1>
          <p className="text-[--foreground-muted] mt-1">Tournées du jour — {new Date().toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFiltre}
            onChange={(e) => setDateFiltre(e.target.value)}
            className="text-sm border border-[--border] rounded-md px-2 py-1.5 bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/50"
          />
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nouvelle tournée
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Livraisons du jour", valeur: stats.total.toString(), sous: "tournées planifiées", icon: Truck, couleur: "text-[--primary]" },
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

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[--primary]" />
        </div>
      ) : erreur ? (
        <div className="text-center py-16 text-[--destructive]">{erreur}</div>
      ) : livraisons.length === 0 ? (
        <div className="text-center py-16 text-[--foreground-muted]">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucune livraison pour cette date</p>
          <p className="text-sm mt-1">Changez la date ou créez une nouvelle tournée.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 min-h-[500px]">
          <Card className="lg:col-span-2 overflow-hidden">
            <CardContent className="p-0">
              <div className="px-4 py-3 bg-[--background-subtle] border-b border-[--border]">
                <h2 className="text-sm font-semibold text-[--foreground]">File des livraisons</h2>
              </div>
              <div className="divide-y divide-[--border] max-h-[45vh] md:max-h-[600px] overflow-y-auto">
                {livraisons.map((l, i) => {
                  const conf = STATUT_CONF[l.statut];
                  const active = selection?.id === l.id;
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
                  {livraisons.map((l) => {
                    const conf = STATUT_CONF[l.statut];
                    const active = selection?.id === l.id;
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
                            className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap font-medium text-white border border-brand-border shadow-xl"
                            style={{ backgroundColor: "#050508" }}
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

            {selection && (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selection.tokenPublic).then(() => {
                          toast.success("Token copié !");
                        }).catch(() => {
                          toast.error("Impossible de copier");
                        });
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1">Voir lignes commande</Button>
                    {selection.statut === "echec" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => patchLivraison(selection.id, { statut: "en_attente" })}
                      >
                        Reprogrammer
                      </Button>
                    ) : selection.statut === "preparation" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => patchLivraison(selection.id, { statut: "en_route" })}
                      >
                        Démarrer la tournée
                      </Button>
                    ) : selection.statut === "en_route" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => patchLivraison(selection.id, { statut: "livree", livraisonAt: new Date().toISOString() })}
                      >
                        Marquer Livrée
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => imprimerBL(selection)}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Bon de livraison
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
