"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Wallet,
  Warehouse,
  Settings as SettingsIcon,
  ShieldCheck,
  Receipt,
  Smartphone,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Section = "entreprise" | "depots" | "utilisateurs" | "paiements";

const DEPOTS_DEMO = [
  { id: "d1", nom: "Dépôt principal Antananarivo", ville: "Antananarivo", responsable: "Hery R.", actif: true },
  { id: "d2", nom: "Dépôt Tamatave", ville: "Tamatave", responsable: "Naivo A.", actif: true },
  { id: "d3", nom: "Dépôt Mahajanga", ville: "Mahajanga", responsable: "Tovo R.", actif: false },
];

const USERS_DEMO = [
  { id: "u1", nom: "Admin Système", email: "admin@grossiteppn.mg", role: "admin", actif: true },
  { id: "u2", nom: "Soa Razafindra.", email: "soa@grossiteppn.mg", role: "gerant", actif: true },
  { id: "u3", nom: "Mamy Andriam.", email: "mamy@grossiteppn.mg", role: "caissier", actif: true },
  { id: "u4", nom: "Tina Rakoto", email: "tina@grossiteppn.mg", role: "agent", actif: true },
  { id: "u5", nom: "Hery Tovonir.", email: "hery@grossiteppn.mg", role: "magasinier", actif: true },
  { id: "u6", nom: "Naivo Andry", email: "naivo@grossiteppn.mg", role: "chauffeur", actif: false },
];

const ROLE_COLOR: Record<string, "default" | "warning" | "outline" | "success"> = {
  admin: "default",
  gerant: "warning",
  caissier: "success",
  agent: "outline",
  magasinier: "outline",
  chauffeur: "outline",
};

function Toggle({ active, onClick, label, description }: { active: boolean; onClick: () => void; label: string; description: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="font-medium text-[--foreground]">{label}</p>
        <p className="text-xs text-[--foreground-muted] mt-0.5">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={cn(
          "shrink-0 relative w-11 h-6 rounded-full transition-colors",
          active ? "bg-[--primary]" : "bg-[--border]"
        )}
      >
        <motion.span
          layout
          className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow", active ? "left-[22px]" : "left-0.5")}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

export function AdminView() {
  const [section, setSection] = useState<Section>("entreprise");
  const [assujettieTV, setAssujettieTV] = useState(false);
  const [tauxTVA, setTauxTVA] = useState("20");
  const [ecommerceActif, setEcommerceActif] = useState(true);
  const [fideliteActif, setFideliteActif] = useState(true);
  const [mvolaActif, setMvolaActif] = useState(true);
  const [orangeActif, setOrangeActif] = useState(true);
  const [airtelActif, setAirtelActif] = useState(false);

  const sections: { id: Section; label: string; icon: typeof Building2 }[] = [
    { id: "entreprise", label: "Entreprise", icon: Building2 },
    { id: "depots", label: "Dépôts", icon: Warehouse },
    { id: "utilisateurs", label: "Utilisateurs & rôles", icon: Users },
    { id: "paiements", label: "Moyens de paiement", icon: Wallet },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-display-sm text-[--foreground]">Administration</h1>
        <p className="text-[--foreground-muted] mt-1">Paramètres de l&apos;entreprise et configuration</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <nav className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                section === s.id
                  ? "bg-[--primary]/10 text-[--primary]"
                  : "text-[--foreground-muted] hover:bg-[--accent] hover:text-[--foreground]"
              )}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3 space-y-4">
          {section === "entreprise" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Informations légales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[--foreground-muted] mb-1 block">Raison sociale</label>
                      <Input defaultValue="Grossiste PPN SARL" />
                    </div>
                    <div>
                      <label className="text-xs text-[--foreground-muted] mb-1 block">NIF</label>
                      <Input defaultValue="3000123456" />
                    </div>
                    <div>
                      <label className="text-xs text-[--foreground-muted] mb-1 block">STAT</label>
                      <Input defaultValue="46900 11 2024 0 12345" />
                    </div>
                    <div>
                      <label className="text-xs text-[--foreground-muted] mb-1 block">RCS</label>
                      <Input defaultValue="2024 B 00789" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Fiscalité TVA
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-[--border]">
                  <Toggle
                    active={assujettieTV}
                    onClick={() => setAssujettieTV(!assujettieTV)}
                    label="Entreprise assujettie à la TVA"
                    description="Si désactivé, aucune mention TVA n'apparaît sur factures, devis ou catalogue."
                  />
                  {assujettieTV && (
                    <div className="pt-3">
                      <label className="text-xs text-[--foreground-muted] mb-1 block">Taux TVA par défaut (%)</label>
                      <Input value={tauxTVA} onChange={(e) => setTauxTVA(e.target.value)} className="max-w-[160px]" />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    Modules optionnels
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-[--border]">
                  <Toggle
                    active={ecommerceActif}
                    onClick={() => setEcommerceActif(!ecommerceActif)}
                    label="Portail e-commerce B2B"
                    description="Active le site /shop, catalogue, panier et compte client B2B."
                  />
                  <Toggle
                    active={fideliteActif}
                    onClick={() => setFideliteActif(!fideliteActif)}
                    label="Programme fidélité"
                    description="Points cumulés, paliers Bronze/Argent/Or/Platine, transactions automatiques."
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {section === "depots" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Warehouse className="w-4 h-4" />
                    Dépôts ({DEPOTS_DEMO.length})
                  </CardTitle>
                  <Button size="sm" variant="outline">Ajouter un dépôt</Button>
                </CardHeader>
                <CardContent className="divide-y divide-[--border] p-0">
                  {DEPOTS_DEMO.map((d) => (
                    <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[--foreground]">{d.nom}</p>
                        <p className="text-xs text-[--foreground-muted]">{d.ville} · Responsable {d.responsable}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="outline">Inactif</Badge>}
                        <Button variant="ghost" size="sm">Modifier</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {section === "utilisateurs" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Utilisateurs & rôles
                  </CardTitle>
                  <Button size="sm" variant="outline">Inviter un utilisateur</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-[--background-subtle] border-b border-[--border]">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-[--foreground-muted]">Utilisateur</th>
                        <th className="text-left px-4 py-2.5 font-medium text-[--foreground-muted]">Rôle</th>
                        <th className="text-center px-4 py-2.5 font-medium text-[--foreground-muted]">Statut</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border]">
                      {USERS_DEMO.map((u) => (
                        <tr key={u.id} className="hover:bg-[--accent]">
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-[--foreground]">{u.nom}</p>
                            <p className="text-[11px] text-[--foreground-muted]">{u.email}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={ROLE_COLOR[u.role] ?? "outline"} className="capitalize">{u.role}</Badge>
                          </td>
                          <td className="text-center px-4 py-2.5">
                            {u.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="outline">Désactivé</Badge>}
                          </td>
                          <td className="px-4 py-2.5">
                            <Button variant="ghost" size="sm">Modifier</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {section === "paiements" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Mobile Money
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-[--border]">
                  <Toggle active={mvolaActif} onClick={() => setMvolaActif(!mvolaActif)} label="Mvola (Telma)" description="Paiement instantané. Numéro marchand : +261 34 00 000 00" />
                  <Toggle active={orangeActif} onClick={() => setOrangeActif(!orangeActif)} label="Orange Money" description="Paiement instantané. Numéro marchand : +261 32 00 000 00" />
                  <Toggle active={airtelActif} onClick={() => setAirtelActif(!airtelActif)} label="Airtel Money" description="En attente d'activation contractuelle." />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Autres moyens
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["Espèces", "Crédit client", "Virement bancaire", "Chèque"].map((m) => (
                    <div key={m} className="flex items-center gap-2 text-sm text-[--foreground]">
                      <Check className="w-4 h-4 text-[--success]" />
                      {m}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline">Annuler</Button>
            <Button>
              <Check className="w-4 h-4" />
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
