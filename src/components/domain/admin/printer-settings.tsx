"use client";

import { useState, useEffect, useTransition } from "react";
import { Printer, Wifi, WifiOff, AlertTriangle, RefreshCw, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PrinterConfig {
  enabled: boolean;
  user: string;
  key: string;
  sn: string;
  baseUrl: string;
  copies: number;
  voice: number;
  header: string;
  footer: string;
  autoOnFacture: boolean;
}

interface PrinterStatus {
  configured: boolean;
  online?: boolean;
  anomalie?: boolean;
  raw?: number | null;
}

interface PrintLog {
  id: string;
  kind: string;
  status: string;
  copies: number;
  orderId: string | null;
  error: string | null;
  createdAt: string;
}

const DEFAULT_BASE_URL = "https://open.xpyun.net/api/openapi/xprinter";

export function PrinterSettings() {
  const [config, setConfig] = useState<PrinterConfig>({
    enabled: false,
    user: "",
    key: "",
    sn: "",
    baseUrl: DEFAULT_BASE_URL,
    copies: 1,
    voice: 0,
    header: "",
    footer: "",
    autoOnFacture: true,
  });
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savePending, startSave] = useTransition();
  const [testPending, startTest] = useTransition();
  const [refreshPending, startRefresh] = useTransition();

  useEffect(() => {
    fetchConfig();
    fetchStatus();
    fetchLogs();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch("/api/admin/printer");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch("/api/print/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      // ignore
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch("/api/admin/printer/logs");
      if (res.ok) setLogs(await res.json());
    } catch {
      // ignore
    }
  }

  function saveConfig() {
    startSave(async () => {
      const res = await fetch("/api/admin/printer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success("Configuration sauvegardée");
        fetchStatus();
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  }

  function sendTest() {
    startTest(async () => {
      try {
        const res = await fetch("/api/print/test", { method: "POST" });
        const data = await res.json();
        if (data.ok) {
          toast.success("Ticket de test envoyé à l'imprimante");
          fetchLogs();
        } else {
          toast.error("Échec d'impression", {
            description: data.errorMessage ?? `Erreur HTTP ${res.status}`,
          });
        }
      } catch (e) {
        toast.error("Erreur réseau", { description: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  function refreshLogs() {
    startRefresh(async () => {
      const res = await fetch("/api/print/logs/refresh", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success(`${data.updated} log(s) mis à jour`);
        fetchLogs();
      }
    });
  }

  const StatusBadge = () => {
    if (!status?.configured) {
      return <span className="text-xs text-[--foreground-subtle]">Non configurée</span>;
    }
    if (status.anomalie) {
      return (
        <span className="flex items-center gap-1 text-xs text-amber-500">
          <AlertTriangle className="w-3 h-3" /> Anomalie
        </span>
      );
    }
    if (status.online) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-500">
          <Wifi className="w-3 h-3" /> En ligne
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <WifiOff className="w-3 h-3" /> Hors ligne
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[--foreground-subtle] py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center">
            <Printer className="w-5 h-5 text-[--primary]" />
          </div>
          <div>
            <h3 className="font-semibold text-[--foreground]">Imprimante thermique Xprinter</h3>
            <StatusBadge />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          <RefreshCw className="w-3 h-3" />
          Actualiser statut
        </Button>
      </div>

      {/* Activer/désactiver */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[--border] bg-[--background-subtle]">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.enabled}
            onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
          />
          <div className="w-11 h-6 bg-[--border] rounded-full peer peer-checked:bg-[--primary] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
        <span className="text-sm font-medium text-[--foreground]">
          Activer l&apos;impression cloud xpyun.net
        </span>
      </div>

      {config.enabled && (
        <>
          {/* Identifiants */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[--foreground] uppercase tracking-wide">
              Identifiants développeur
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">User (identifiant xpyun)</label>
                <Input
                  value={config.user}
                  onChange={(e) => setConfig((c) => ({ ...c, user: e.target.value }))}
                  placeholder="votre_user_xpyun"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">UserKEY (secret)</label>
                <Input
                  type="password"
                  value={config.key}
                  onChange={(e) => setConfig((c) => ({ ...c, key: e.target.value }))}
                  placeholder="••••••••••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">N° de série imprimante (SN)</label>
                <Input
                  value={config.sn}
                  onChange={(e) => setConfig((c) => ({ ...c, sn: e.target.value }))}
                  placeholder="XP-00000000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">Copies</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={config.copies}
                  onChange={(e) => setConfig((c) => ({ ...c, copies: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
          </div>

          {/* Options auto */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[--foreground] uppercase tracking-wide">
              Impression automatique
            </h4>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoOnFacture}
                onChange={(e) => setConfig((c) => ({ ...c, autoOnFacture: e.target.checked }))}
                className="rounded border-[--border] text-[--primary]"
              />
              <span className="text-sm text-[--foreground]">
                Imprimer automatiquement à la validation d&apos;une facture
              </span>
            </label>
          </div>

          {/* En-tête / pied */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-[--foreground-muted]">En-tête personnalisé</label>
              <textarea
                className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] resize-none focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                value={config.header}
                onChange={(e) => setConfig((c) => ({ ...c, header: e.target.value }))}
                placeholder="Ex: Grossiste PPN Madagascar&#10;Antananarivo 101"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[--foreground-muted]">Pied de ticket personnalisé</label>
              <textarea
                className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] resize-none focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                value={config.footer}
                onChange={(e) => setConfig((c) => ({ ...c, footer: e.target.value }))}
                placeholder="Ex: Merci de votre confiance&#10;+261 34 00 000 00"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={saveConfig} loading={savePending}>
              Sauvegarder
            </Button>
            <Button variant="outline" onClick={sendTest} loading={testPending}>
              <Send className="w-4 h-4" />
              Ticket de test
            </Button>
          </div>

          {/* Logs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[--foreground] uppercase tracking-wide">
                Derniers envois
              </h4>
              <Button variant="outline" size="sm" onClick={refreshLogs} loading={refreshPending}>
                <RefreshCw className="w-3 h-3" />
                Rafraîchir statuts
              </Button>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm text-[--foreground-subtle]">Aucun envoi pour l&apos;instant.</p>
            ) : (
              <div className="rounded-xl border border-[--border] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[--background-subtle]">
                    <tr>
                      <th className="text-left px-4 py-2 text-[--foreground-muted] font-medium">Type</th>
                      <th className="text-left px-4 py-2 text-[--foreground-muted] font-medium">Statut</th>
                      <th className="text-left px-4 py-2 text-[--foreground-muted] font-medium">Copies</th>
                      <th className="text-left px-4 py-2 text-[--foreground-muted] font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t border-[--border]">
                        <td className="px-4 py-2 text-[--foreground]">{log.kind}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.status === "printed"
                              ? "bg-green-100 text-green-700"
                              : log.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {log.status === "printed" ? "Imprimé" : log.status === "failed" ? "Échec" : "En attente"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[--foreground-muted]">{log.copies}</td>
                        <td className="px-4 py-2 text-[--foreground-muted]">
                          {new Date(log.createdAt).toLocaleString("fr-MG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
