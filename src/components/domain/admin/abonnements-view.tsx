"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, X, CreditCard, Smartphone, Hash, Mail, Building, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

interface Abonnement {
  id: string;
  tenantId: string | null;
  entrepriseNom: string;
  slug: string | null;
  plan: string;
  montant: number;
  operateur: string;
  telephone: string | null;
  reference: string | null;
  contactEmail: string | null;
  statut: string;
  createdAt: string;
}

const OPERATEUR_LABEL: Record<string, string> = {
  mvola: "MVola", orange_money: "Orange Money", airtel_money: "Airtel Money",
};
const PLAN_LABEL: Record<string, string> = { essai: "Essai", standard: "Standard", pro: "Pro", entreprise: "Entreprise" };
const STATUT_META: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  en_attente: { label: "En attente", variant: "warning" },
  valide: { label: "Validé", variant: "success" },
  rejete: { label: "Rejeté", variant: "destructive" },
};

export function AbonnementsView() {
  const [rows, setRows] = useState<Abonnement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/abonnements");
      const d = await res.json();
      setRows(d.abonnements ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function action(a: Abonnement, act: "valider" | "rejeter") {
    if (act === "valider" && !window.confirm(`Valider le paiement de « ${a.entrepriseNom} » ? Le tenant sera activé et ses identifiants envoyés par email.`)) return;
    if (act === "rejeter" && !window.confirm(`Rejeter la demande de « ${a.entrepriseNom} » ?`)) return;
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/abonnements/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        if (act === "valider") {
          toast.success("Abonnement validé — tenant activé", {
            description: d.email?.sent ? "Identifiants envoyés par email" : "Email non envoyé (SMTP ?) — pense à renvoyer les identifiants",
          });
        } else {
          toast.success("Demande rejetée");
        }
        load();
      } else {
        toast.error(d.error ?? "Erreur");
      }
    } finally {
      setBusy(null);
    }
  }

  const enAttente = rows.filter((r) => r.statut === "en_attente");
  const traites = rows.filter((r) => r.statut !== "en_attente");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-display-sm text-[--foreground]">Abonnements</h1>
        <p className="text-[--foreground-muted] mt-1">Demandes de souscription Mobile Money à valider</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-[--foreground-muted] mb-3 inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> À valider ({enAttente.length})
            </h2>
            {enAttente.length === 0 ? (
              <div className="rounded-xl border border-[--border] bg-[--card] p-8 text-center text-sm text-[--foreground-muted]">
                Aucune demande en attente.
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {enAttente.map((a) => (
                    <motion.div key={a.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="rounded-xl border border-amber-500/30 bg-[--card] p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[--foreground] inline-flex items-center gap-1.5">
                              <Building className="w-4 h-4 text-[--primary]" />{a.entrepriseNom}
                            </span>
                            <Badge variant="outline" className="text-[10px]">{PLAN_LABEL[a.plan] ?? a.plan}</Badge>
                            {a.slug && <span className="text-[11px] font-mono text-[--foreground-muted]">/{a.slug}</span>}
                          </div>
                          <div className="flex items-center gap-x-4 gap-y-1 text-xs text-[--foreground-muted] mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[--foreground] font-semibold"><CreditCard className="w-3.5 h-3.5" />{formatMGA(a.montant)}</span>
                            <span className="inline-flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" />{OPERATEUR_LABEL[a.operateur] ?? a.operateur}{a.telephone ? ` · ${a.telephone}` : ""}</span>
                            <span className="inline-flex items-center gap-1"><Hash className="w-3.5 h-3.5" />Réf : <span className="font-mono text-[--foreground]">{a.reference ?? "—"}</span></span>
                            {a.contactEmail && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{a.contactEmail}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="destructive" className="h-8" disabled={busy === a.id} onClick={() => action(a, "rejeter")}>
                            <X className="w-4 h-4" /> Rejeter
                          </Button>
                          <Button size="sm" className="h-8" disabled={busy === a.id} onClick={() => action(a, "valider")}>
                            {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Valider
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {traites.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[--foreground-muted] mb-3">Historique</h2>
              <div className="rounded-xl border border-[--border] bg-[--card] divide-y divide-[--border]">
                {traites.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-[--foreground]">{a.entrepriseNom}</span>
                      <span className="text-[--foreground-muted]"> · {PLAN_LABEL[a.plan] ?? a.plan} · {formatMGA(a.montant)}</span>
                    </div>
                    <Badge variant={STATUT_META[a.statut]?.variant ?? "outline"} className="text-[10px] shrink-0">
                      {STATUT_META[a.statut]?.label ?? a.statut}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
