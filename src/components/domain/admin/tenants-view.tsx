"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building, Plus, X, Check, Trash2, Loader2, Search, Info,
  Pause, Play, Pencil, Users, Warehouse, Mail, Phone, CalendarClock, Send, KeyRound, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Tenant {
  id: string;
  nom: string;
  slug: string;
  statut: string;
  plan: string;
  contactNom: string | null;
  contactEmail: string | null;
  contactTelephone: string | null;
  maxUtilisateurs: number;
  maxDepots: number;
  finEssaiAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUT_META: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  actif: { label: "Actif", variant: "success" },
  essai: { label: "Essai", variant: "warning" },
  suspendu: { label: "Suspendu", variant: "destructive" },
  resilie: { label: "Résilié", variant: "outline" },
};

const PLAN_LABEL: Record<string, string> = {
  essai: "Essai", standard: "Standard", pro: "Pro", entreprise: "Entreprise",
};

const EMPTY = {
  nom: "", slug: "", statut: "essai", plan: "essai",
  contactNom: "", contactEmail: "", contactTelephone: "",
  maxUtilisateurs: "5", maxDepots: "1", finEssaiAt: "", notes: "",
};

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[--foreground-muted] mb-0.5">{label}</p>
        <p className="text-lg font-bold text-[--foreground]">{value}</p>
      </div>
    </div>
  );
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime() - Date.now();
  return Math.ceil(d / (24 * 60 * 60 * 1000));
}

export function TenantsView() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, startSubmit] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants ?? []);
        setIsDemo(!!data.demo);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tenants.filter((t) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return t.nom.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s) || (t.contactEmail ?? "").toLowerCase().includes(s);
  });

  const kActifs = tenants.filter((t) => t.statut === "actif").length;
  const kEssais = tenants.filter((t) => t.statut === "essai").length;
  const kSuspendus = tenants.filter((t) => t.statut === "suspendu").length;

  function openCreate() {
    setEditId(null);
    setForm(EMPTY);
    setDrawerOpen(true);
  }

  function openEdit(t: Tenant) {
    setEditId(t.id);
    setForm({
      nom: t.nom, slug: t.slug, statut: t.statut, plan: t.plan,
      contactNom: t.contactNom ?? "", contactEmail: t.contactEmail ?? "",
      contactTelephone: t.contactTelephone ?? "",
      maxUtilisateurs: String(t.maxUtilisateurs), maxDepots: String(t.maxDepots),
      finEssaiAt: t.finEssaiAt ? t.finEssaiAt.slice(0, 10) : "",
      notes: t.notes ?? "",
    });
    setDrawerOpen(true);
  }

  function submit() {
    if (!form.nom.trim()) { toast.error("Nom requis"); return; }
    startSubmit(async () => {
      const payload = {
        ...form,
        maxUtilisateurs: parseInt(form.maxUtilisateurs, 10) || 5,
        maxDepots: parseInt(form.maxDepots, 10) || 1,
        finEssaiAt: form.finEssaiAt || null,
      };
      const url = editId ? `/api/admin/tenants/${editId}` : "/api/admin/tenants";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (editId) {
          toast.success("Tenant mis à jour");
        } else if (data.email?.sent) {
          toast.success("Tenant créé", { description: `Infos envoyées à ${data.tenant?.contactEmail}` });
        } else if (data.tenant?.contactEmail) {
          toast.warning("Tenant créé — email non envoyé", {
            description: data.email?.reason ?? "SMTP non configuré",
          });
        } else {
          toast.success("Tenant créé");
        }
        setDrawerOpen(false);
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Erreur");
      }
    });
  }

  async function setStatut(t: Tenant, statut: string) {
    setBusy(t.id);
    try {
      const res = await fetch(`/api/admin/tenants/${t.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (res.ok) {
        setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, statut } : x));
        toast.success(`« ${t.nom} » → ${STATUT_META[statut]?.label ?? statut}`);
      } else toast.error("Action impossible (mode démo ?)");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTenants((prev) => prev.filter((x) => x.id !== id));
      setDeleteId(null);
      toast.success("Tenant supprimé");
    } else toast.error("Suppression impossible");
  }

  async function impersonate(t: Tenant) {
    setBusy(t.id);
    try {
      const res = await fetch(`/api/admin/tenants/${t.id}/impersonate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        toast.success(`Ouverture de l'espace « ${t.nom} »…`);
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(data.error ?? "Impossible d'accéder à l'espace");
      }
    } finally {
      setBusy(null);
    }
  }

  async function renvoyer(t: Tenant) {
    if (!t.contactEmail) {
      toast.error("Aucun email de contact pour ce tenant");
      return;
    }
    setBusy(t.id);
    try {
      const res = await fetch(`/api/admin/tenants/${t.id}/envoyer`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sent) {
        toast.success(`Infos renvoyées à ${data.to}`);
      } else {
        toast.error(data.error ?? "Envoi impossible");
      }
    } finally {
      setBusy(null);
    }
  }

  async function renvoyerIdentifiants(t: Tenant) {
    if (!t.contactEmail) {
      toast.error("Aucun email de contact pour ce tenant");
      return;
    }
    if (!window.confirm(`Réinitialiser le mot de passe du compte de « ${t.nom} » et l'envoyer à ${t.contactEmail} ?`)) {
      return;
    }
    setBusy(t.id);
    try {
      const res = await fetch(`/api/admin/tenants/${t.id}/envoyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sent) {
        toast.success(`Identifiants (nouveau mot de passe) envoyés à ${data.to}`);
      } else {
        toast.error(data.error ?? "Envoi impossible");
      }
    } finally {
      setBusy(null);
    }
  }

  const selectCls = "w-full h-10 px-3 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-[--foreground]">Tenants</h1>
          <p className="text-[--foreground-muted] mt-1">Administration des espaces clients de la plateforme (multi-tenant)</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Nouveau tenant</Button>
      </div>

      {isDemo && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0" /> Données de démonstration — créez un tenant pour activer la table réelle.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total tenants" value={tenants.length} icon={Building} color="#FF4D00" />
        <KpiCard label="Actifs" value={kActifs} icon={Play} color="#22C55E" />
        <KpiCard label="En essai" value={kEssais} icon={CalendarClock} color="#F59E0B" />
        <KpiCard label="Suspendus" value={kSuspendus} icon={Pause} color="#EF4444" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--foreground-muted]" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un tenant…" className="pl-9" />
      </div>

      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[--foreground-muted]">
            <Building className="w-10 h-10 opacity-20 mx-auto mb-3" />
            <p className="text-sm">Aucun tenant</p>
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            <AnimatePresence initial={false}>
              {filtered.map((t, i) => {
                const restants = daysUntil(t.finEssaiAt);
                return (
                  <motion.div key={t.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="flex items-center gap-3 p-4 hover:bg-[--accent]/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0 font-bold text-sm text-[--primary]">
                      {t.nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[--foreground]">{t.nom}</span>
                        <Badge variant={STATUT_META[t.statut]?.variant ?? "outline"} className="text-[10px]">
                          {STATUT_META[t.statut]?.label ?? t.statut}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{PLAN_LABEL[t.plan] ?? t.plan}</Badge>
                        {t.statut === "essai" && restants != null && (
                          <span className={cn("text-[10px]", restants <= 3 ? "text-red-400" : "text-[--foreground-muted]")}>
                            {restants > 0 ? `essai J-${restants}` : "essai expiré"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[--foreground-muted] mt-1 flex-wrap">
                        <span className="font-mono">/{t.slug}</span>
                        {t.contactEmail && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{t.contactEmail}</span>}
                        {t.contactTelephone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{t.contactTelephone}</span>}
                        <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{t.maxUtilisateurs}</span>
                        <span className="inline-flex items-center gap-1"><Warehouse className="w-3 h-3" />{t.maxDepots}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.statut === "actif" || t.statut === "essai" ? (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-400" disabled={busy === t.id}
                          onClick={() => setStatut(t, "suspendu")} title="Suspendre">
                          <Pause className="w-3.5 h-3.5" /> Suspendre
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-green-400" disabled={busy === t.id}
                          onClick={() => setStatut(t, "actif")} title="Réactiver">
                          <Play className="w-3.5 h-3.5" /> Activer
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-[--foreground-muted] hover:text-[--primary]" disabled={busy === t.id}
                        onClick={() => impersonate(t)} title="Se connecter dans l'espace de ce tenant (voir ce qui s'y passe)">
                        <LogIn className="w-3.5 h-3.5" /> Se connecter
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={busy === t.id || !t.contactEmail}
                        onClick={() => renvoyer(t)} title={t.contactEmail ? `Renvoyer les infos à ${t.contactEmail}` : "Aucun email de contact"}>
                        <Send className="w-3.5 h-3.5" /> Renvoyer
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-[--foreground-muted] hover:text-[--primary]" disabled={busy === t.id || !t.contactEmail}
                        onClick={() => renvoyerIdentifiants(t)} title={t.contactEmail ? "Réinitialiser et envoyer les identifiants" : "Aucun email de contact"}>
                        <KeyRound className="w-3.5 h-3.5" /> Identifiants
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {deleteId === t.id ? (
                        <>
                          <Button variant="destructive" size="icon-sm" onClick={() => remove(t.id)}><Check className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(null)}><X className="w-3.5 h-3.5" /></Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon-sm" className="text-[--foreground-muted] hover:text-red-400" onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Drawer création / édition */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-[--background] border-l border-[--border] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[--border] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[--primary]/10 flex items-center justify-center">
                    <Building className="w-4 h-4 text-[--primary]" />
                  </div>
                  <h2 className="font-semibold text-[--foreground]">{editId ? "Modifier le tenant" : "Nouveau tenant"}</h2>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(false)}><X className="w-4 h-4" /></Button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Nom <span className="text-red-400">*</span></label>
                  <Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Ex: Grossiste Analakely" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">
                    Slug / sous-domaine <span className="text-[--foreground-subtle]">(auto si vide)</span>
                  </label>
                  <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="analakely" className="font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Statut</label>
                    <select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))} className={selectCls}>
                      <option value="essai">Essai</option>
                      <option value="actif">Actif</option>
                      <option value="suspendu">Suspendu</option>
                      <option value="resilie">Résilié</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Plan</label>
                    <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className={selectCls}>
                      <option value="essai">Essai</option>
                      <option value="standard">Standard</option>
                      <option value="pro">Pro</option>
                      <option value="entreprise">Entreprise</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Contact — nom</label>
                  <Input value={form.contactNom} onChange={(e) => setForm((f) => ({ ...f, contactNom: e.target.value }))} placeholder="Responsable" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Email</label>
                    <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@…" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Téléphone</label>
                    <Input value={form.contactTelephone} onChange={(e) => setForm((f) => ({ ...f, contactTelephone: e.target.value }))} placeholder="034 …" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Max utilisateurs</label>
                    <Input type="number" min={1} value={form.maxUtilisateurs} onChange={(e) => setForm((f) => ({ ...f, maxUtilisateurs: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Max dépôts</label>
                    <Input type="number" min={1} value={form.maxDepots} onChange={(e) => setForm((f) => ({ ...f, maxDepots: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Fin d&apos;essai</label>
                  <Input type="date" value={form.finEssaiAt} onChange={(e) => setForm((f) => ({ ...f, finEssaiAt: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3} className={cn(selectCls, "h-auto py-2 resize-none")} placeholder="Notes internes…" />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[--border] flex justify-end gap-2 shrink-0">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>Annuler</Button>
                <Button onClick={submit} loading={submitting} disabled={!form.nom.trim()}>
                  <Check className="w-4 h-4" /> {editId ? "Enregistrer" : "Créer le tenant"}
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
