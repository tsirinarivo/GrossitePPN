"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Printer,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Send,
  Loader2,
  Info,
} from "lucide-react";
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
  autoOnBonLivraison: boolean;
  autoOnReceptionStock: boolean;
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

const KIND_LABELS: Record<string, string> = {
  facture: "Facture",
  bon_livraison: "Bon livraison",
  inventaire: "Inventaire",
  test: "Test",
};

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
    autoOnBonLivraison: false,
    autoOnReceptionStock: false,
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
      if (res.ok) setConfig(await res.json());
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
        toast.success(`${data.updated ?? 0} log(s) mis à jour`);
        fetchLogs();
      }
    });
  }

  const Toggle = ({
    checked,
    onChange,
    label,
    description,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-10 h-6 bg-[--border] rounded-full peer peer-checked:bg-[--primary] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-[--foreground]">{label}</p>
        {description && <p className="text-xs text-[--foreground-muted] mt-0.5">{description}</p>}
      </div>
    </label>
  );

  const StatusBadge = () => {
    if (!status?.configured) {
      return <span className="text-xs text-[--foreground-subtle]">Non configurée</span>;
    }
    if (status.anomalie) {
      return (
        <span className="flex items-center gap-1 text-xs text-amber-500">
          <AlertTriangle className="w-3 h-3" /> Anomalie hardware
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
        <WifiOff className="w-3 h-3" /> Hors ligne (file en attente active)
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

      {/* Note technique */}
      <div className="flex gap-2 p-3 rounded-xl border border-[--border] bg-[--background-subtle] text-sm text-[--foreground-muted]">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[--primary]" />
        <p>
          Impression cloud via <strong>xpyun.net</strong> — aucun driver, aucun câble USB.
          L&apos;imprimante reçoit les tickets par WiFi ou 4G.
          Si hors ligne, les jobs sont mis en file d&apos;attente et imprimés au retour.
        </p>
      </div>

      {/* Activer/désactiver */}
      <div className="p-4 rounded-xl border border-[--border] bg-[--background-subtle]">
        <Toggle
          checked={config.enabled}
          onChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
          label="Activer l'impression cloud xpyun.net"
        />
      </div>

      {config.enabled && (
        <>
          {/* Identifiants */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[--foreground] uppercase tracking-wide">
              Identifiants développeur
            </h4>
            <div className="rounded-lg border border-[--border] bg-[--background-subtle] px-4 py-3 text-xs text-[--foreground-muted] space-y-1">
              <p>1. Créer un compte : <strong>admin.xpyun.net</strong></p>
              <p>2. Open Platform → noter <strong>User</strong> + <strong>UserKEY</strong></p>
              <p>3. Configurer le WiFi via l&apos;app Xprinter (iOS/Android)</p>
              <p>4. Récupérer le <strong>SN</strong> gravé sous l&apos;imprimante</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">User (identifiant xpyun)</label>
                <Input
                  value={config.user}
                  onChange={(e) => setConfig((c) => ({ ...c, user: e.target.value }))}
                  placeholder="votre_user_xpyun"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">UserKEY (secret)</label>
                <Input
                  type="password"
                  value={config.key}
                  onChange={(e) => setConfig((c) => ({ ...c, key: e.target.value }))}
                  placeholder="••••••••••••••••"
                  autoComplete="new-password"
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
                <label className="text-sm text-[--foreground-muted]">Serveur xpyun</label>
                <select
                  value={config.baseUrl}
                  onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                >
                  <option value="https://open.xpyun.net/api/openapi/xprinter">
                    International — open.xpyun.net (recommandé Madagascar)
                  </option>
                  <option value="https://api.xpyun.net/api/openapi/xprinter">
                    Asie — api.xpyun.net
                  </option>
                  <option value="https://open2.xpyun.net/api/openapi/xprinter">
                    Chine — open2.xpyun.net
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">Nombre de copies (1-5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={config.copies}
                  onChange={(e) => setConfig((c) => ({ ...c, copies: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">Volume sonnerie (0 = muet, 1-15)</label>
                <Input
                  type="number"
                  min={0}
                  max={15}
                  value={config.voice}
                  onChange={(e) => setConfig((c) => ({ ...c, voice: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          {/* Impression automatique */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[--foreground] uppercase tracking-wide">
              Impression automatique
            </h4>
            <div className="space-y-4">
              <Toggle
                checked={config.autoOnFacture}
                onChange={(v) => setConfig((c) => ({ ...c, autoOnFacture: v }))}
                label="Après validation d'une facture"
                description="Imprime le ticket de caisse dès qu'une facture est validée"
              />
              <Toggle
                checked={config.autoOnBonLivraison}
                onChange={(v) => setConfig((c) => ({ ...c, autoOnBonLivraison: v }))}
                label="Après création d'un bon de livraison"
                description="Imprime le bon à faire signer par le client à la livraison"
              />
              <Toggle
                checked={config.autoOnReceptionStock}
                onChange={(v) => setConfig((c) => ({ ...c, autoOnReceptionStock: v }))}
                label="Lors d'une réception / fiche inventaire"
                description="Imprime la fiche de comptage pour signature du responsable"
              />
            </div>
          </div>

          {/* En-tête / pied */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[--foreground] uppercase tracking-wide">
              Texte du ticket
            </h4>
            <p className="text-xs text-[--foreground-muted]">
              Le NIF, STAT et RCS s&apos;affichent automatiquement depuis la fiche entreprise ci-dessus.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">En-tête personnalisé</label>
                <textarea
                  className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] resize-none focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                  value={config.header}
                  onChange={(e) => setConfig((c) => ({ ...c, header: e.target.value }))}
                  placeholder={"Grossiste PPN Madagascar\nAntananarivo 101"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-[--foreground-muted]">Pied de ticket personnalisé</label>
                <textarea
                  className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] resize-none focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                  value={config.footer}
                  onChange={(e) => setConfig((c) => ({ ...c, footer: e.target.value }))}
                  placeholder={"Marchandise vendue non reprise.\nMerci de votre confiance."}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={saveConfig} loading={savePending}>
              Sauvegarder la configuration
            </Button>
            <Button variant="outline" onClick={sendTest} loading={testPending} disabled={!config.sn}>
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
                      <th className="text-left px-4 py-2 text-[--foreground-muted] font-medium hidden sm:table-cell">Erreur</th>
                      <th className="text-left px-4 py-2 text-[--foreground-muted] font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t border-[--border]">
                        <td className="px-4 py-2 text-[--foreground]">
                          {KIND_LABELS[log.kind] ?? log.kind}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.status === "printed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : log.status === "failed"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {log.status === "printed" ? "Imprimé" : log.status === "failed" ? "Échec" : "En attente"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[--foreground-muted]">{log.copies}</td>
                        <td className="px-4 py-2 text-[--foreground-muted] text-xs hidden sm:table-cell max-w-[200px] truncate">
                          {log.error ?? "—"}
                        </td>
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
