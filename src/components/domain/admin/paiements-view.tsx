"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Check, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Cfg {
  mvolaNumero: string; mvolaNom: string;
  orangeNumero: string; orangeNom: string;
  airtelNumero: string; airtelNom: string;
  instructions: string;
}

const EMPTY: Cfg = {
  mvolaNumero: "", mvolaNom: "", orangeNumero: "", orangeNom: "",
  airtelNumero: "", airtelNom: "", instructions: "",
};

const OPS: { key: string; num: keyof Cfg; nom: keyof Cfg; label: string; color: string }[] = [
  { key: "mvola", num: "mvolaNumero", nom: "mvolaNom", label: "MVola", color: "#FFC400" },
  { key: "orange_money", num: "orangeNumero", nom: "orangeNom", label: "Orange Money", color: "#FF7900" },
  { key: "airtel_money", num: "airtelNumero", nom: "airtelNom", label: "Airtel Money", color: "#E4002B" },
];

export function PaiementsView() {
  const [cfg, setCfg] = useState<Cfg>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, startSave] = useTransition();

  useEffect(() => {
    fetch("/api/admin/paiements").then((r) => r.json()).then((d) => {
      setCfg({
        mvolaNumero: d.mvolaNumero ?? "", mvolaNom: d.mvolaNom ?? "",
        orangeNumero: d.orangeNumero ?? "", orangeNom: d.orangeNom ?? "",
        airtelNumero: d.airtelNumero ?? "", airtelNom: d.airtelNom ?? "",
        instructions: d.instructions ?? "",
      });
    }).finally(() => setLoading(false));
  }, []);

  function save() {
    startSave(async () => {
      const res = await fetch("/api/admin/paiements", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (res.ok) toast.success("Numéros de paiement enregistrés");
      else toast.error("Erreur lors de la sauvegarde");
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-display-sm text-[--foreground]">Paiement Mobile Money</h1>
        <p className="text-[--foreground-muted] mt-1">Numéros marchands affichés aux clients sur la page de souscription</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[--foreground-muted] py-8"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      ) : (
        <div className="space-y-4">
          {OPS.map((o) => (
            <div key={o.key} className="rounded-xl border border-[--border] bg-[--card] p-4">
              <p className="font-semibold text-[--foreground] mb-3 inline-flex items-center gap-2">
                <Smartphone className="w-4 h-4" style={{ color: o.color }} /> {o.label}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[--foreground-muted] mb-1 block">Numéro marchand</label>
                  <Input value={cfg[o.num]} onChange={(e) => setCfg((c) => ({ ...c, [o.num]: e.target.value }))} placeholder="034 XX XXX XX" className="font-mono" />
                </div>
                <div>
                  <label className="text-xs text-[--foreground-muted] mb-1 block">Nom du titulaire</label>
                  <Input value={cfg[o.nom]} onChange={(e) => setCfg((c) => ({ ...c, [o.nom]: e.target.value }))} placeholder="Nom affiché au client" />
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-[--border] bg-[--card] p-4">
            <label className="text-xs text-[--foreground-muted] mb-1 block">Instructions (affichées sous les numéros)</label>
            <textarea value={cfg.instructions} onChange={(e) => setCfg((c) => ({ ...c, instructions: e.target.value }))}
              rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] resize-none focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
              placeholder="Ex : Après paiement, saisissez la référence reçue par SMS. Activation sous 24h." />
          </div>

          <div className="flex justify-end">
            <Button onClick={save} loading={saving}><Check className="w-4 h-4" /> Enregistrer</Button>
          </div>
        </div>
      )}
    </div>
  );
}
