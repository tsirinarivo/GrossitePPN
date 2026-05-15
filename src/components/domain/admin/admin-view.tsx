"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, Wallet, Warehouse, Settings as SettingsIcon,
  ShieldCheck, Receipt, Smartphone, Check, Printer, Loader2,
  Plus, X, Eye, EyeOff, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrinterSettings } from "./printer-settings";
import { toast } from "sonner";

type Section = "entreprise" | "depots" | "utilisateurs" | "paiements" | "imprimante";

const ROLES = ["admin", "gerant", "caissier", "agent", "magasinier", "chauffeur", "livreur"];
const ROLE_COLOR: Record<string, "default" | "warning" | "outline" | "success"> = {
  admin: "default", gerant: "warning", caissier: "success",
  agent: "outline", magasinier: "outline", chauffeur: "outline", livreur: "outline",
};

interface Entreprise {
  nom: string; nif: string; stat: string; rcs: string;
  adresse: string; telephone: string; email: string; siteWeb: string;
  assujettieTV: boolean; tauxTVADefaut: number; prefixeFacture: string;
  ecommerceActif: boolean; fideliteActif: boolean;
}

interface User {
  id: string; name: string; email: string; role: string; actif: boolean; createdAt: string;
}

interface Depot {
  id: string; nom: string; adresse: string | null; telephone: string | null;
  estPrincipal: boolean; actif: boolean; createdAt: string;
}

function Toggle({ active, onClick, label, description }: {
  active: boolean; onClick: () => void; label: string; description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="font-medium text-[--foreground]">{label}</p>
        <p className="text-xs text-[--foreground-muted] mt-0.5">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={cn("shrink-0 relative w-11 h-6 rounded-full transition-colors", active ? "bg-[--primary]" : "bg-[--border]")}
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

  // ── Entreprise ────────────────────────────────────────────────────────────
  const [ent, setEnt] = useState<Entreprise>({
    nom: "", nif: "", stat: "", rcs: "", adresse: "", telephone: "",
    email: "", siteWeb: "", assujettieTV: false, tauxTVADefaut: 20,
    prefixeFacture: "FAC", ecommerceActif: true, fideliteActif: true,
  });
  const [entLoading, setEntLoading] = useState(true);
  const [entSaving, startEntSave] = useTransition();

  useEffect(() => {
    fetch("/api/admin/entreprise").then(r => r.json()).then(d => {
      if (d.nom) setEnt({
        nom: d.nom ?? "", nif: d.nif ?? "", stat: d.stat ?? "", rcs: d.rcs ?? "",
        adresse: d.adresse ?? "", telephone: d.telephone ?? "", email: d.email ?? "",
        siteWeb: d.siteWeb ?? "", assujettieTV: d.assujettieTV ?? false,
        tauxTVADefaut: d.tauxTVADefaut ?? 20, prefixeFacture: d.prefixeFacture ?? "FAC",
        ecommerceActif: d.ecommerceActif ?? true, fideliteActif: d.fideliteActif ?? true,
      });
    }).finally(() => setEntLoading(false));
  }, []);

  function saveEntreprise() {
    startEntSave(async () => {
      const res = await fetch("/api/admin/entreprise", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ent),
      });
      if (res.ok) toast.success("Entreprise mise à jour");
      else toast.error("Erreur lors de la sauvegarde");
    });
  }

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "agent" });
  const [showPwd, setShowPwd] = useState(false);
  const [newUserSaving, startNewUserSave] = useTransition();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPwd, setEditPwd] = useState("");
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [editSaving, startEditSave] = useTransition();

  function loadUsers() {
    setUsersLoading(true);
    fetch("/api/admin/users").then(r => r.json()).then(setUsers).finally(() => setUsersLoading(false));
  }

  useEffect(() => { if (section === "utilisateurs") loadUsers(); }, [section]);

  // ── Dépôts ────────────────────────────────────────────────────────────────
  const [depots, setDepots] = useState<Depot[]>([]);
  const [depotsLoading, setDepotsLoading] = useState(false);
  const [showNewDepot, setShowNewDepot] = useState(false);
  const [newDepot, setNewDepot] = useState({ nom: "", adresse: "", telephone: "" });
  const [newDepotSaving, startNewDepotSave] = useTransition();
  const [editDepot, setEditDepot] = useState<Depot | null>(null);
  const [editDepotData, setEditDepotData] = useState({ nom: "", adresse: "", telephone: "" });
  const [editDepotSaving, startEditDepotSave] = useTransition();

  function loadDepots() {
    setDepotsLoading(true);
    fetch("/api/depots").then(r => r.json()).then(d => setDepots(d.depots ?? [])).finally(() => setDepotsLoading(false));
  }

  useEffect(() => { if (section === "depots") loadDepots(); }, [section]);

  function createDepot() {
    startNewDepotSave(async () => {
      const res = await fetch("/api/depots", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDepot),
      });
      if (res.ok) {
        toast.success("Dépôt créé");
        setShowNewDepot(false);
        setNewDepot({ nom: "", adresse: "", telephone: "" });
        loadDepots();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Erreur");
      }
    });
  }

  function saveDepot() {
    if (!editDepot) return;
    startEditDepotSave(async () => {
      const res = await fetch(`/api/depots/${editDepot.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDepotData),
      });
      if (res.ok) {
        toast.success("Dépôt mis à jour");
        setEditDepot(null);
        loadDepots();
      } else toast.error("Erreur lors de la sauvegarde");
    });
  }

  async function setPrincipal(id: string) {
    await fetch(`/api/depots/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estPrincipal: true }),
    });
    loadDepots();
  }

  async function toggleDepotActif(depot: Depot) {
    await fetch(`/api/depots/${depot.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !depot.actif }),
    });
    loadDepots();
  }

  function createUser() {
    startNewUserSave(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Utilisateur créé");
        setShowNewUser(false);
        setNewUser({ name: "", email: "", password: "", role: "agent" });
        loadUsers();
      } else {
        toast.error(data.error ?? "Erreur création");
      }
    });
  }

  function saveEditUser() {
    if (!editUser) return;
    startEditSave(async () => {
      const payload: Record<string, unknown> = {
        name: editUser.name,
        role: editUser.role,
        actif: editUser.actif,
      };
      if (editPwd.trim().length >= 6) payload.password = editPwd.trim();
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Utilisateur mis à jour");
        setEditUser(null);
        setEditPwd("");
        loadUsers();
      } else {
        toast.error("Erreur mise à jour");
      }
    });
  }

  const sections: { id: Section; label: string; icon: typeof Building2 }[] = [
    { id: "entreprise", label: "Entreprise", icon: Building2 },
    { id: "depots", label: "Dépôts", icon: Warehouse },
    { id: "utilisateurs", label: "Utilisateurs & rôles", icon: Users },
    { id: "paiements", label: "Moyens de paiement", icon: Wallet },
    { id: "imprimante", label: "Imprimante thermique", icon: Printer },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-display-sm text-[--foreground]">Administration</h1>
        <p className="text-[--foreground-muted] mt-1">Paramètres de l&apos;entreprise et configuration</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Navigation sections — horizontal sur mobile, vertical sur desktop */}
        <nav className="flex overflow-x-auto gap-1 pb-1 no-scrollbar lg:flex-col lg:overflow-visible lg:gap-0 lg:space-y-1 lg:pb-0">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 lg:w-full",
                section === s.id ? "bg-[--primary]/10 text-[--primary]" : "text-[--foreground-muted] hover:bg-[--accent] hover:text-[--foreground]"
              )}
            >
              <s.icon className="w-4 h-4" />{s.label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3 space-y-4">

          {/* ── ENTREPRISE ── */}
          {section === "entreprise" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {entLoading ? (
                <div className="flex items-center gap-2 text-[--foreground-subtle] py-8">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base inline-flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Informations légales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          { label: "Raison sociale", key: "nom" },
                          { label: "NIF", key: "nif" },
                          { label: "STAT", key: "stat" },
                          { label: "RCS", key: "rcs" },
                          { label: "Adresse", key: "adresse" },
                          { label: "Téléphone", key: "telephone" },
                          { label: "Email", key: "email" },
                          { label: "Site web", key: "siteWeb" },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <label className="text-xs text-[--foreground-muted] mb-1 block">{label}</label>
                            <Input
                              value={(ent as unknown as Record<string, string>)[key] ?? ""}
                              onChange={e => setEnt(c => ({ ...c, [key]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs text-[--foreground-muted] mb-1 block">Préfixe facture</label>
                        <Input
                          value={ent.prefixeFacture} className="max-w-[120px]"
                          onChange={e => setEnt(c => ({ ...c, prefixeFacture: e.target.value }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base inline-flex items-center gap-2">
                        <Receipt className="w-4 h-4" /> Fiscalité TVA
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-[--border]">
                      <Toggle active={ent.assujettieTV} onClick={() => setEnt(c => ({ ...c, assujettieTV: !c.assujettieTV }))}
                        label="Entreprise assujettie à la TVA"
                        description="Si désactivé, aucune mention TVA n'apparaît sur les factures." />
                      {ent.assujettieTV && (
                        <div className="pt-3">
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Taux TVA par défaut (%)</label>
                          <Input type="number" value={ent.tauxTVADefaut} className="max-w-[160px]"
                            onChange={e => setEnt(c => ({ ...c, tauxTVADefaut: parseInt(e.target.value) || 20 }))} />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base inline-flex items-center gap-2">
                        <SettingsIcon className="w-4 h-4" /> Modules optionnels
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-[--border]">
                      <Toggle active={ent.ecommerceActif} onClick={() => setEnt(c => ({ ...c, ecommerceActif: !c.ecommerceActif }))}
                        label="Portail e-commerce B2B" description="Active le site /shop, catalogue, panier et compte client B2B." />
                      <Toggle active={ent.fideliteActif} onClick={() => setEnt(c => ({ ...c, fideliteActif: !c.fideliteActif }))}
                        label="Programme fidélité" description="Points cumulés, paliers Bronze/Argent/Or/Platine." />
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEntLoading(true) as unknown as void}>Annuler</Button>
                    <Button onClick={saveEntreprise} loading={entSaving}>
                      <Check className="w-4 h-4" /> Enregistrer
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── DÉPÔTS ── */}
          {section === "depots" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Warehouse className="w-4 h-4" /> Dépôts & Entrepôts
                  </CardTitle>
                  <Button size="sm" onClick={() => { setShowNewDepot(true); setEditDepot(null); }}>
                    <Plus className="w-4 h-4" /> Nouveau dépôt
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {depotsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[--foreground-muted]" /></div>
                  ) : depots.length === 0 ? (
                    <div className="text-center py-10 text-[--foreground-muted]">
                      <Warehouse className="w-10 h-10 opacity-20 mx-auto mb-3" />
                      <p className="text-sm">Aucun dépôt configuré</p>
                      <Button size="sm" className="mt-3" onClick={() => setShowNewDepot(true)}>
                        <Plus className="w-4 h-4" /> Créer le premier dépôt
                      </Button>
                    </div>
                  ) : depots.map((d) => (
                    <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-[--border] bg-[--accent]/30">
                      <div className="w-9 h-9 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
                        <Warehouse className="w-4 h-4 text-[--primary]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-[--foreground]">{d.nom}</span>
                          {d.estPrincipal && <Badge variant="default" className="text-[10px]">Principal</Badge>}
                          {!d.actif && <Badge variant="outline" className="text-[10px]">Inactif</Badge>}
                        </div>
                        {d.adresse && <p className="text-xs text-[--foreground-muted] mt-0.5">{d.adresse}</p>}
                        {d.telephone && <p className="text-xs text-[--foreground-subtle] font-mono">{d.telephone}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!d.estPrincipal && d.actif && (
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setPrincipal(d.id)}>
                            Définir principal
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" onClick={() => {
                          setEditDepot(d);
                          setEditDepotData({ nom: d.nom, adresse: d.adresse ?? "", telephone: d.telephone ?? "" });
                          setShowNewDepot(false);
                        }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => toggleDepotActif(d)}
                          className={d.actif ? "text-[--foreground-muted]" : "text-green-500"}>
                          {d.actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Formulaire nouveau dépôt */}
              <AnimatePresence>
                {showNewDepot && !editDepot && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm">Nouveau dépôt</CardTitle>
                        <Button variant="ghost" size="icon-sm" onClick={() => setShowNewDepot(false)}><X className="w-4 h-4" /></Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-[--foreground-muted]">Nom *</label>
                          <Input value={newDepot.nom} onChange={e => setNewDepot(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Entrepôt Tana Nord" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[--foreground-muted]">Adresse</label>
                          <Input value={newDepot.adresse} onChange={e => setNewDepot(p => ({ ...p, adresse: e.target.value }))} placeholder="Rue, quartier, ville" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[--foreground-muted]">Téléphone</label>
                          <Input value={newDepot.telephone} onChange={e => setNewDepot(p => ({ ...p, telephone: e.target.value }))} placeholder="034 XX XXX XX" className="mt-1" />
                        </div>
                        <Button onClick={createDepot} loading={newDepotSaving} disabled={!newDepot.nom.trim()}>
                          <Check className="w-4 h-4" /> Créer le dépôt
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Formulaire édition dépôt */}
              <AnimatePresence>
                {editDepot && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm">Modifier — {editDepot.nom}</CardTitle>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditDepot(null)}><X className="w-4 h-4" /></Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-[--foreground-muted]">Nom *</label>
                          <Input value={editDepotData.nom} onChange={e => setEditDepotData(p => ({ ...p, nom: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[--foreground-muted]">Adresse</label>
                          <Input value={editDepotData.adresse} onChange={e => setEditDepotData(p => ({ ...p, adresse: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[--foreground-muted]">Téléphone</label>
                          <Input value={editDepotData.telephone} onChange={e => setEditDepotData(p => ({ ...p, telephone: e.target.value }))} className="mt-1" />
                        </div>
                        <Button onClick={saveDepot} loading={editDepotSaving} disabled={!editDepotData.nom.trim()}>
                          <Check className="w-4 h-4" /> Enregistrer
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── UTILISATEURS ── */}
          {section === "utilisateurs" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Utilisateurs & rôles
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowNewUser(true)}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {usersLoading ? (
                    <div className="flex items-center gap-2 text-[--foreground-subtle] p-6">
                      <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
                    </div>
                  ) : (
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
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-[--accent]">
                            <td className="px-4 py-2.5">
                              <p className="font-semibold text-[--foreground]">{u.name}</p>
                              <p className="text-[11px] text-[--foreground-muted]">{u.email}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant={ROLE_COLOR[u.role] ?? "outline"} className="capitalize">{u.role}</Badge>
                            </td>
                            <td className="text-center px-4 py-2.5">
                              {u.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="outline">Désactivé</Badge>}
                            </td>
                            <td className="px-4 py-2.5">
                              <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Modal nouvel utilisateur */}
              <AnimatePresence>
                {showNewUser && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                      className="bg-[--background] rounded-2xl border border-[--border] p-6 w-full max-w-md space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[--foreground]">Nouvel utilisateur</h3>
                        <button onClick={() => setShowNewUser(false)} className="text-[--foreground-muted] hover:text-[--foreground]">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Nom complet</label>
                          <Input value={newUser.name} onChange={e => setNewUser(c => ({ ...c, name: e.target.value }))} placeholder="Nom Prénom" />
                        </div>
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Email</label>
                          <Input type="email" value={newUser.email} onChange={e => setNewUser(c => ({ ...c, email: e.target.value }))} placeholder="nom@grossiteppn.mg" />
                        </div>
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Mot de passe</label>
                          <div className="relative">
                            <Input type={showPwd ? "text" : "password"} value={newUser.password}
                              onChange={e => setNewUser(c => ({ ...c, password: e.target.value }))}
                              placeholder="Minimum 6 caractères" className="pr-10" />
                            <button type="button" onClick={() => setShowPwd(p => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]">
                              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Rôle</label>
                          <select value={newUser.role} onChange={e => setNewUser(c => ({ ...c, role: e.target.value }))}
                            className="w-full h-10 px-3 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40">
                            {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowNewUser(false)}>Annuler</Button>
                        <Button onClick={createUser} loading={newUserSaving}>
                          <Check className="w-4 h-4" /> Créer
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Modal édition utilisateur */}
              <AnimatePresence>
                {editUser && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                      className="bg-[--background] rounded-2xl border border-[--border] p-6 w-full max-w-md space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[--foreground]">Modifier {editUser.name}</h3>
                        <button onClick={() => { setEditUser(null); setEditPwd(""); }} className="text-[--foreground-muted] hover:text-[--foreground]">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Nom complet</label>
                          <Input value={editUser.name} onChange={e => setEditUser(u => u ? { ...u, name: e.target.value } : u)} />
                        </div>
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Email</label>
                          <Input value={editUser.email} disabled className="opacity-60" />
                        </div>
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">Rôle</label>
                          <select value={editUser.role} onChange={e => setEditUser(u => u ? { ...u, role: e.target.value } : u)}
                            className="w-full h-10 px-3 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-[--foreground-muted] mb-1 block">
                            Nouveau mot de passe <span className="text-[--foreground-subtle]">(laisser vide pour ne pas modifier)</span>
                          </label>
                          <div className="relative">
                            <Input
                              type={showEditPwd ? "text" : "password"}
                              value={editPwd}
                              onChange={e => setEditPwd(e.target.value)}
                              placeholder="Minimum 6 caractères"
                              className="pr-10"
                            />
                            <button type="button" onClick={() => setShowEditPwd(p => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]">
                              {showEditPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={editUser.actif}
                              onChange={e => setEditUser(u => u ? { ...u, actif: e.target.checked } : u)} />
                            <div className="w-11 h-6 bg-[--border] rounded-full peer peer-checked:bg-[--primary] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                          </label>
                          <span className="text-sm text-[--foreground]">Compte actif</span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
                        <Button onClick={saveEditUser} loading={editSaving}>
                          <Check className="w-4 h-4" /> Enregistrer
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── PAIEMENTS ── */}
          {section === "paiements" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Mobile Money
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[--foreground-muted]">Configuration Mobile Money disponible prochainement.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Modes de paiement actifs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["Espèces", "Crédit client", "Virement bancaire", "Chèque", "Mvola", "Orange Money"].map(m => (
                    <div key={m} className="flex items-center gap-2 text-sm text-[--foreground]">
                      <Check className="w-4 h-4 text-green-500" />{m}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── IMPRIMANTE ── */}
          {section === "imprimante" && (
            <motion.div key="imprimante" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="pt-6">
                  <PrinterSettings />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
