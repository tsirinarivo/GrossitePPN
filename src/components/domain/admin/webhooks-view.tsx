"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Webhook, KeyRound, Plus, X, Check, Trash2, Loader2,
  ToggleLeft, ToggleRight, Send, Copy, Info, Globe, Activity,
  CheckCircle2, XCircle, Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebhookEvent { key: string; label: string; description: string }
interface WebhookRow {
  id: string; nom: string; url: string; secret: string;
  evenements: string[]; actif: boolean;
  dernierStatut: number | null; dernierSucces: boolean | null;
  derniereTentativeAt: string | null; nbEnvois: number; nbEchecs: number;
  createdAt: string;
}
interface Delivery {
  id: string; webhookNom: string | null; evenement: string;
  statusCode: number | null; succes: boolean; erreur: string | null;
  dureeMs: number | null; createdAt: string;
}
interface ApiKey {
  id: string; nom: string; cleMasquee: string; actif: boolean;
  nbAppels: number; derniereUtilisationAt: string | null; createdAt: string;
}

type Tab = "webhooks" | "deliveries" | "keys";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  } catch {
    toast.error("Copie impossible");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function WebhooksView() {
  const [tab, setTab] = useState<Tab>("webhooks");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-display-sm text-[--foreground]">Webhooks &amp; API partenaires</h1>
        <p className="text-[--foreground-muted] mt-1">
          Notifiez vos partenaires en temps réel et exposez votre catalogue en lecture
        </p>
      </div>

      <div className="flex gap-1 border-b border-[--border]">
        {([
          { id: "webhooks", label: "Webhooks", icon: Webhook },
          { id: "deliveries", label: "Livraisons", icon: Activity },
          { id: "keys", label: "Clés API", icon: KeyRound },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === t.id ? "border-[--primary] text-[--primary]" : "border-transparent text-[--foreground-muted] hover:text-[--foreground]"
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "webhooks" && <WebhooksTab />}
      {tab === "deliveries" && <DeliveriesTab />}
      {tab === "keys" && <KeysTab />}
    </div>
  );
}

// ── Webhooks Tab ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { nom: "", url: "", evenements: [] as string[] };

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, startSubmit] = useTransition();
  const [testing, setTesting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks ?? []);
        setEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleEvent(key: string) {
    setForm((f) => ({
      ...f,
      evenements: f.evenements.includes(key)
        ? f.evenements.filter((e) => e !== key)
        : [...f.evenements, key],
    }));
  }

  function submit() {
    if (!form.nom.trim() || !form.url.trim()) {
      toast.error("Nom et URL requis");
      return;
    }
    startSubmit(async () => {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Webhook créé");
        setDrawerOpen(false);
        setForm(EMPTY_FORM);
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Erreur");
      }
    });
  }

  async function toggleActif(w: WebhookRow) {
    const res = await fetch(`/api/admin/webhooks/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !w.actif }),
    });
    if (res.ok) setWebhooks((prev) => prev.map((x) => x.id === w.id ? { ...x, actif: !x.actif } : x));
  }

  async function testWebhook(w: WebhookRow) {
    setTesting(w.id);
    try {
      const res = await fetch(`/api/admin/webhooks/${w.id}/test`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.succes) toast.success(`Ping OK (HTTP ${data.statusCode})`);
      else toast.error(`Échec : ${data.erreur ?? "inconnu"}`);
    } finally {
      setTesting(null);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWebhooks((prev) => prev.filter((x) => x.id !== id));
      setDeleteId(null);
      toast.success("Webhook supprimé");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }}>
          <Plus className="w-4 h-4" /> Nouveau webhook
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-xl border border-[--border] bg-[--card] text-center py-16">
          <Webhook className="w-10 h-10 opacity-20 mx-auto mb-3 text-[--foreground-muted]" />
          <p className="text-sm text-[--foreground-muted]">Aucun webhook configuré</p>
          <Button size="sm" className="mt-3" onClick={() => setDrawerOpen(true)}>
            <Plus className="w-4 h-4" /> Créer le premier
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w, i) => (
            <motion.div key={w.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-[--border] bg-[--card] p-4"
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  w.actif ? "bg-[--primary]/10" : "bg-[--accent]")}>
                  <Webhook className={cn("w-4 h-4", w.actif ? "text-[--primary]" : "text-[--foreground-muted]")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[--foreground]">{w.nom}</span>
                    {w.dernierSucces === true && <Badge variant="success" className="text-[10px]">OK {w.dernierStatut}</Badge>}
                    {w.dernierSucces === false && <Badge variant="destructive" className="text-[10px]">Échec {w.dernierStatut ?? ""}</Badge>}
                  </div>
                  <p className="text-xs text-[--foreground-muted] font-mono truncate mt-0.5 flex items-center gap-1">
                    <Globe className="w-3 h-3 shrink-0" /> {w.url}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {w.evenements.map((e) => (
                      <span key={e} className="text-[10px] font-mono bg-[--accent] border border-[--border] rounded px-1.5 py-0.5 text-[--foreground-muted]">{e}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-[--foreground-subtle]">
                    <span>{w.nbEnvois} envois</span>
                    {w.nbEchecs > 0 && <span className="text-red-400">{w.nbEchecs} échecs</span>}
                    <span>Dernier : {formatDateTime(w.derniereTentativeAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => testWebhook(w)} disabled={testing === w.id}>
                    {testing === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Tester
                  </Button>
                  <button onClick={() => toggleActif(w)} title={w.actif ? "Désactiver" : "Activer"}>
                    {w.actif ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-[--foreground-muted]" />}
                  </button>
                  {deleteId === w.id ? (
                    <>
                      <Button variant="destructive" size="icon-sm" onClick={() => remove(w.id)}><Check className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(null)}><X className="w-3.5 h-3.5" /></Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="icon-sm" className="text-[--foreground-muted] hover:text-red-400" onClick={() => setDeleteId(w.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[--border] flex items-center gap-2 text-[11px] text-[--foreground-muted]">
                <span className="font-medium">Secret :</span>
                <code className="font-mono bg-[--background] border border-[--border] rounded px-1.5 py-0.5">{w.secret.slice(0, 14)}…</code>
                <button onClick={() => copyText(w.secret, "Secret")} className="hover:text-[--foreground]"><Copy className="w-3 h-3" /></button>
                <span className="text-[--foreground-subtle]">(signature HMAC SHA-256 envoyée dans X-Webhook-Signature)</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Drawer création */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-[--background] border-l border-[--border] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[--border] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[--primary]/10 flex items-center justify-center">
                    <Webhook className="w-4 h-4 text-[--primary]" />
                  </div>
                  <h2 className="font-semibold text-[--foreground]">Nouveau webhook</h2>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Nom <span className="text-red-400">*</span></label>
                  <Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Ex: ERP partenaire transport" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-1">URL de destination <span className="text-red-400">*</span></label>
                  <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://partenaire.mg/webhook" className="font-mono text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--foreground-muted] block mb-2">Événements à notifier</label>
                  <div className="space-y-1.5">
                    {events.map((ev) => {
                      const checked = form.evenements.includes(ev.key);
                      return (
                        <button key={ev.key} onClick={() => toggleEvent(ev.key)}
                          className={cn("w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors",
                            checked ? "border-[--primary]/40 bg-[--primary]/5" : "border-[--border] hover:bg-[--accent]")}
                        >
                          <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5",
                            checked ? "bg-[--primary] border-[--primary]" : "border-[--border]")}>
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[--foreground] font-mono">{ev.key}</div>
                            <div className="text-[11px] text-[--foreground-muted]">{ev.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[--border] flex justify-end gap-2 shrink-0">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>Annuler</Button>
                <Button onClick={submit} loading={submitting} disabled={!form.nom.trim() || !form.url.trim()}>
                  <Check className="w-4 h-4" /> Créer le webhook
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Deliveries Tab ──────────────────────────────────────────────────────────────

function DeliveriesTab() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/webhooks/deliveries");
        if (res.ok) {
          const data = await res.json();
          setDeliveries(data.deliveries ?? []);
          setIsDemo(!!data.demo);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0" /> Données de démonstration — les livraisons réelles apparaîtront ici.
        </div>
      )}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-16 text-[--foreground-muted]">
            <Activity className="w-10 h-10 opacity-20 mx-auto mb-3" />
            <p className="text-sm">Aucune livraison enregistrée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[--accent]/50 border-b border-[--border]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Horodatage</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Webhook</th>
                  <th className="text-left px-4 py-3 font-medium text-[--foreground-muted]">Événement</th>
                  <th className="text-center px-4 py-3 font-medium text-[--foreground-muted]">Statut</th>
                  <th className="text-right px-4 py-3 font-medium text-[--foreground-muted]">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {deliveries.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }} className="hover:bg-[--accent]/30">
                    <td className="px-4 py-3 whitespace-nowrap text-[--foreground-muted]">{formatDateTime(d.createdAt)}</td>
                    <td className="px-4 py-3 text-[--foreground]">{d.webhookNom ?? "—"}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-[--accent] border border-[--border] px-2 py-0.5 rounded">{d.evenement}</span></td>
                    <td className="px-4 py-3 text-center">
                      {d.succes ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> {d.statusCode}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3.5 h-3.5" /> {d.erreur ?? d.statusCode}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[--foreground-muted]">{d.dureeMs != null ? `${d.dureeMs} ms` : "—"}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Keys Tab ────────────────────────────────────────────────────────────────────

function KeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [creating, startCreate] = useTransition();
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      if (res.ok) setKeys((await res.json()).keys ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function create() {
    if (!nom.trim()) { toast.error("Nom requis"); return; }
    startCreate(async () => {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.cle);
        setNom("");
        await load();
      } else {
        toast.error("Erreur lors de la création");
      }
    });
  }

  async function toggle(k: ApiKey) {
    const res = await fetch(`/api/admin/api-keys/${k.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !k.actif }),
    });
    if (res.ok) setKeys((prev) => prev.map((x) => x.id === k.id ? { ...x, actif: !x.actif } : x));
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) { setKeys((prev) => prev.filter((x) => x.id !== id)); toast.success("Clé révoquée"); }
  }

  return (
    <div className="space-y-5">
      {/* Doc API publique */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[--foreground]">
          <Code className="w-4 h-4 text-[--primary]" /> API publique — accès lecture
        </div>
        <p className="text-xs text-[--foreground-muted] mb-3">
          Authentifiez chaque requête avec l'en-tête <code className="font-mono bg-[--background] border border-[--border] rounded px-1">X-API-Key</code>.
        </p>
        <div className="space-y-2 font-mono text-xs">
          {[
            { m: "GET", path: "/api/public/catalogue", d: "Catalogue produits visibles" },
            { m: "GET", path: "/api/public/stock", d: "Niveaux de stock temps réel" },
          ].map((e) => (
            <div key={e.path} className="flex items-center gap-2 bg-[--background] border border-[--border] rounded-lg px-3 py-2">
              <Badge variant="success" className="text-[10px]">{e.m}</Badge>
              <code className="text-[--foreground]">{e.path}</code>
              <span className="text-[--foreground-subtle] font-sans">— {e.d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Création clé */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-[--foreground-muted] block mb-1">Nom de la clé</label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Intégration marketplace" />
          </div>
          <Button onClick={create} loading={creating} disabled={!nom.trim()}>
            <Plus className="w-4 h-4" /> Générer
          </Button>
        </div>
        <AnimatePresence>
          {newKey && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-400 mb-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Copiez cette clé maintenant — elle ne sera plus affichée en entier.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-[--background] border border-[--border] rounded px-2 py-1.5 text-[--foreground] truncate">{newKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copyText(newKey, "Clé API")}><Copy className="w-3.5 h-3.5" /> Copier</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Liste clés */}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[--foreground-muted]">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16 text-[--foreground-muted]">
            <KeyRound className="w-10 h-10 opacity-20 mx-auto mb-3" />
            <p className="text-sm">Aucune clé API générée</p>
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            {keys.map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} className="flex items-center gap-3 p-3.5 hover:bg-[--accent]/30">
                <div className="w-9 h-9 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 text-[--primary]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[--foreground]">{k.nom}</span>
                    {!k.actif && <Badge variant="outline" className="text-[10px]">Révoquée</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[--foreground-muted] mt-0.5">
                    <code className="font-mono">{k.cleMasquee}</code>
                    <span>{k.nbAppels} appels</span>
                    <span>Dernier : {formatDateTime(k.derniereUtilisationAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggle(k)} title={k.actif ? "Désactiver" : "Réactiver"}>
                    {k.actif ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-[--foreground-muted]" />}
                  </button>
                  <Button variant="ghost" size="icon-sm" className="text-[--foreground-muted] hover:text-red-400" onClick={() => revoke(k.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
