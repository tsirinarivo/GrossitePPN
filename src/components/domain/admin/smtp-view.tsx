"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, Check, Send, Info, Server, Eye, EyeOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SmtpForm {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromNom: string;
  actif: boolean;
}

const EMPTY: SmtpForm = {
  host: "", port: "587", secure: false, username: "", password: "",
  fromEmail: "", fromNom: "GrossistePPN", actif: false,
};

// Réglages fréquents pour pré-remplir host/port/secure
const PRESETS: Record<string, { host: string; port: string; secure: boolean }> = {
  "OVH": { host: "ssl0.ovh.net", port: "465", secure: true },
  "Gmail": { host: "smtp.gmail.com", port: "465", secure: true },
  "Zoho": { host: "smtp.zoho.com", port: "465", secure: true },
  "Brevo": { host: "smtp-relay.brevo.com", port: "587", secure: false },
  "Outlook": { host: "smtp.office365.com", port: "587", secure: false },
};

export function SmtpView() {
  const [form, setForm] = useState<SmtpForm>(EMPTY);
  const [hasPassword, setHasPassword] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, startSave] = useTransition();
  const [showPwd, setShowPwd] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/smtp")
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setForm({
            host: d.config.host ?? "",
            port: String(d.config.port ?? 587),
            secure: !!d.config.secure,
            username: d.config.username ?? "",
            password: "",
            fromEmail: d.config.fromEmail ?? "",
            fromNom: d.config.fromNom ?? "GrossistePPN",
            actif: !!d.config.actif,
          });
          setHasPassword(!!d.config.hasPassword);
        }
        setEnvConfigured(!!d.envConfigured);
      })
      .finally(() => setLoading(false));
  }, []);

  function applyPreset(name: string) {
    const p = PRESETS[name];
    if (!p) return;
    setForm((f) => ({ ...f, host: p.host, port: p.port, secure: p.secure }));
    toast.success(`Préréglage ${name} appliqué`);
  }

  function save() {
    if (!form.host.trim() || !form.username.trim()) {
      toast.error("Serveur et identifiant requis");
      return;
    }
    if (!hasPassword && !form.password) {
      toast.error("Mot de passe requis");
      return;
    }
    startSave(async () => {
      const res = await fetch("/api/admin/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, port: parseInt(form.port, 10) || 587 }),
      });
      if (res.ok) {
        toast.success("Configuration SMTP enregistrée");
        if (form.password) setHasPassword(true);
        setForm((f) => ({ ...f, password: "" }));
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Erreur");
      }
    });
  }

  async function test() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo.trim() || undefined,
          host: form.host, port: parseInt(form.port, 10) || 587, secure: form.secure,
          username: form.username, password: form.password || undefined,
          fromEmail: form.fromEmail, fromNom: form.fromNom,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.sent) toast.success(`Email de test envoyé à ${d.to}`);
      else toast.error(d.error ?? "Échec du test");
    } finally {
      setTesting(false);
    }
  }

  const inputCls = "";
  const labelCls = "text-xs font-medium text-[--foreground-muted] block mb-1";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[--foreground-muted]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-display-sm text-[--foreground] flex items-center gap-2">
          <Mail className="w-6 h-6 text-[--primary]" /> Configuration Email (SMTP)
        </h1>
        <p className="text-[--foreground-muted] mt-1">
          Sert à l'envoi automatique des accès aux tenants et aux emails transactionnels.
        </p>
      </div>

      {envConfigured && (
        <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Une configuration SMTP existe aussi dans les variables d'environnement du serveur.
          La configuration ci-dessous (si activée) est prioritaire.
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[--border] bg-[--card] p-5 space-y-4">

        {/* Préréglages */}
        <div>
          <label className={labelCls}>Préréglages fournisseurs</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(PRESETS).map((name) => (
              <button key={name} onClick={() => applyPreset(name)}
                className="text-xs px-2.5 py-1 rounded-full border border-[--border] text-[--foreground-muted] hover:bg-[--accent] hover:text-[--foreground] transition-colors inline-flex items-center gap-1">
                <Zap className="w-3 h-3" /> {name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Serveur SMTP <span className="text-red-400">*</span></label>
            <Input value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} placeholder="mail.dago-it.com" className={cn(inputCls, "font-mono text-sm")} />
          </div>
          <div>
            <label className={labelCls}>Port</label>
            <Input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} placeholder="587" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[--foreground] cursor-pointer">
          <input type="checkbox" checked={form.secure} onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))}
            className="w-4 h-4 accent-[--primary]" />
          Connexion sécurisée SSL/TLS (port 465). Décoché = STARTTLS (port 587).
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Identifiant <span className="text-red-400">*</span></label>
            <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="no-reply@dago-it.com" className="font-mono text-sm" />
          </div>
          <div>
            <label className={labelCls}>Mot de passe {hasPassword && <span className="text-[--foreground-subtle]">(laisser vide pour garder)</span>}</label>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={hasPassword ? "••••••••" : "Mot de passe"} className="pr-10" />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle]">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Email expéditeur</label>
            <Input value={form.fromEmail} onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))} placeholder="no-reply@dago-it.com" className="font-mono text-sm" />
          </div>
          <div>
            <label className={labelCls}>Nom expéditeur</label>
            <Input value={form.fromNom} onChange={(e) => setForm((f) => ({ ...f, fromNom: e.target.value }))} placeholder="GrossistePPN" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[--border]">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <span className={cn("relative w-11 h-6 rounded-full transition-colors", form.actif ? "bg-[--primary]" : "bg-[--border]")}
              onClick={() => setForm((f) => ({ ...f, actif: !f.actif }))}>
              <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", form.actif ? "left-[22px]" : "left-0.5")} />
            </span>
            <span className="text-sm text-[--foreground]">Activer cet envoi SMTP</span>
          </label>
          <Button onClick={save} loading={saving}>
            <Check className="w-4 h-4" /> Enregistrer
          </Button>
        </div>
      </motion.div>

      {/* Test */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[--foreground]">
          <Server className="w-4 h-4 text-[--primary]" /> Tester l'envoi
        </div>
        <p className="text-xs text-[--foreground-muted]">
          Envoie un email de test avec les valeurs du formulaire ci-dessus (pas besoin d'enregistrer d'abord).
        </p>
        <div className="flex gap-2">
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Adresse de test (défaut : votre email)" className="flex-1" />
          <Button variant="outline" onClick={test} loading={testing} disabled={!form.host.trim() || !form.username.trim()}>
            <Send className="w-4 h-4" /> Envoyer un test
          </Button>
        </div>
      </div>
    </div>
  );
}
