"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, CreditCard, Star, X, Search, UserPlus, Loader2, AlertTriangle } from "lucide-react";
import { usePOSStore } from "@/store/pos.store";
import type { ClientPOS } from "@/store/pos.store";
import { formatMGA } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CLIENTS_DEMO: ClientPOS[] = [
  { id: "c1", code: "CLI-001", raisonSociale: "Épicerie Rasoamanarivo", telephone: "034 12 345 67",
    palier: "semi_gros", creditAutorise: true, encoursCourant: 150000, plafondCredit: 500000, pointsFidelite: 1240 },
  { id: "c2", code: "CLI-002", raisonSociale: "Supérette Analakely", telephone: "033 98 765 43",
    palier: "gros", creditAutorise: true, encoursCourant: 890000, plafondCredit: 2000000, pointsFidelite: 5820 },
  { id: "c3", code: "CLI-003", raisonSociale: "Particulier", telephone: "",
    palier: "detail", creditAutorise: false, encoursCourant: 0, plafondCredit: 0, pointsFidelite: 0 },
];

const PALIER_LABELS = { gros: "Gros", semi_gros: "Semi-gros", detail: "Détail" };
const PALIER_VARIANTS = { gros: "success", semi_gros: "secondary", detail: "muted" } as const;

function genCode() {
  return `CLI-${Date.now().toString().slice(-5)}`;
}

export function POSClientBar() {
  const { client, setClient } = usePOSStore();
  const [clients, setClients] = useState<ClientPOS[]>([]);
  const [recherche, setRecherche] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  // Formulaire nouveau client
  const [showForm, setShowForm] = useState(false);
  const [formNom, setFormNom] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formTel, setFormTel] = useState("");
  const [formPalier, setFormPalier] = useState<"gros" | "semi_gros" | "detail">("detail");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const reloadClients = () =>
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        const list: ClientPOS[] = (data.clients ?? data ?? []).map((c: ClientPOS) => ({
          id: c.id, code: c.code, raisonSociale: c.raisonSociale, telephone: c.telephone,
          palier: c.palier, creditAutorise: c.creditAutorise, encoursCourant: c.encoursCourant,
          plafondCredit: c.plafondCredit, pointsFidelite: c.pointsFidelite,
        }));
        setClients(list.length > 0 ? list : CLIENTS_DEMO);
      })
      .catch(() => setClients(CLIENTS_DEMO));

  useEffect(() => { reloadClients(); }, []);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = recherche.toLowerCase();
  const clientsFiltres = clients.filter(
    (c) => !q || c.raisonSociale.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  );
  const aucunResultat = recherche.length > 0 && clientsFiltres.length === 0;

  const openDropdown = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    }
    setDropdownOpen(true);
  };

  const handleSelect = (c: ClientPOS) => {
    setClient(c); setRecherche(""); setDropdownOpen(false);
  };

  const handleDeselect = () => {
    setClient(null); setRecherche("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openNewClientForm = () => {
    setDropdownOpen(false);
    setFormNom(recherche);
    setFormCode(genCode());
    setFormTel("");
    setFormPalier("detail");
    setFormError("");
    setShowForm(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNom.trim()) { setFormError("Le nom est obligatoire"); return; }
    if (!formCode.trim()) { setFormError("Le code est obligatoire"); return; }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raisonSociale: formNom.trim(),
          code: formCode.trim(),
          telephone: formTel.trim() || null,
          palier: formPalier,
          creditAutorise: false,
          plafondCredit: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Erreur lors de la création"); return; }
      const nouveau: ClientPOS = {
        id: data.client.id,
        code: data.client.code,
        raisonSociale: data.client.raisonSociale,
        telephone: data.client.telephone,
        palier: data.client.palier,
        creditAutorise: false,
        encoursCourant: 0,
        plafondCredit: 0,
        pointsFidelite: 0,
      };
      await reloadClients();
      setClient(nouveau);
      setRecherche("");
      setShowForm(false);
    } catch {
      setFormError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className="flex items-center gap-2 px-4 py-2 border-b border-[--pos-border] bg-[--pos-surface] shrink-0"
      >
        {client ? (
          /* ── Client sélectionné ── */
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[--pos-primary]/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" style={{ color: "#FF4D00" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[--pos-text] truncate">{client.raisonSociale}</span>
                <Badge variant={PALIER_VARIANTS[client.palier]} className="text-[10px]">
                  {PALIER_LABELS[client.palier]}
                </Badge>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-[--pos-text-muted] flex-wrap">
                {client.creditAutorise && (() => {
                  const pct = client.plafondCredit > 0 ? Math.round((client.encoursCourant / client.plafondCredit) * 100) : 0;
                  const sature = pct >= 90;
                  const alerte = pct >= 75;
                  return (
                    <span className={`flex items-center gap-1 ${sature ? "text-red-400" : alerte ? "text-yellow-400" : ""}`}>
                      {sature ? <AlertTriangle className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                      Crédit: {formatMGA(client.plafondCredit - client.encoursCourant)} dispo
                      {sature && " — LIMITÉ"}
                    </span>
                  );
                })()}
                {(client.pointsFidelite ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {(client.pointsFidelite ?? 0).toLocaleString("fr-FR")} pts fidélité
                  </span>
                )}
              </div>
            </div>
            <Button variant="pos-ghost" size="icon-sm" onClick={handleDeselect} className="shrink-0 text-[--pos-text-muted]">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* ── Champ de recherche ── */
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--pos-text-muted] pointer-events-none" />
            <input
              ref={inputRef}
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); openDropdown(); }}
              onFocus={() => openDropdown()}
              placeholder="Rechercher un client…"
              className="w-full pl-9 pr-4 h-9 rounded-xl text-sm border border-[--pos-border] focus:outline-none focus:border-[--pos-primary] transition-colors text-[--pos-text] placeholder:text-[--pos-text-muted]"
              style={{ backgroundColor: "#1a1a1a" }}
            />

            {/* Dropdown via portal */}
            {mounted && dropdownOpen && (clientsFiltres.length > 0 || aucunResultat) && createPortal(
              <div
                className="border border-[--pos-border] rounded-xl shadow-2xl overflow-hidden"
                style={{ ...dropdownStyle, backgroundColor: "#232630" }}
              >
                {/* Résultats */}
                {clientsFiltres.length > 0 && (
                  <div className="max-h-52 overflow-y-auto">
                    {clientsFiltres.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                        className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                        style={{ backgroundColor: "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#333744")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div className="w-7 h-7 rounded-full bg-[--pos-primary]/20 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" style={{ color: "#FF4D00" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[--pos-text] truncate">{c.raisonSociale}</div>
                          <div className="text-[11px] text-[--pos-text-muted]">{c.code} · {PALIER_LABELS[c.palier]}</div>
                        </div>
                        <Badge variant={PALIER_VARIANTS[c.palier]} className="text-[10px] shrink-0">
                          {PALIER_LABELS[c.palier]}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Message aucun résultat + bouton créer */}
                {aucunResultat && (
                  <div className="px-4 py-3 text-sm text-[--pos-text-muted]">
                    Aucun client pour «&nbsp;<span className="text-[--pos-text] font-medium">{recherche}</span>&nbsp;»
                  </div>
                )}

                {/* Bouton nouveau client — toujours visible quand on tape */}
                {recherche.length > 0 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); openNewClientForm(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-t transition-colors text-left"
                    style={{ borderColor: "#333744", backgroundColor: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a2a1a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FF4D0020" }}>
                      <UserPlus className="w-3.5 h-3.5" style={{ color: "#FF4D00" }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "#FF4D00" }}>
                        Créer «&nbsp;{recherche}&nbsp;»
                      </div>
                      <div className="text-[11px] text-[--pos-text-muted]">Nouveau client</div>
                    </div>
                  </button>
                )}
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      {/* ── Modal création rapide client ── */}
      {mounted && showForm && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ zIndex: 10000 }}
            onMouseDown={() => setShowForm(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border shadow-2xl p-6 space-y-4"
            style={{ zIndex: 10001, backgroundColor: "#232630", borderColor: "#333744" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" style={{ color: "#FF4D00" }} />
                <h2 className="text-base font-bold text-[--pos-text]">Nouveau client</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[--pos-text-muted] hover:text-[--pos-text]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[--pos-text-muted]">Nom / Raison sociale *</label>
                <input
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  placeholder="Épicerie Dupont…"
                  required
                  autoFocus
                  className="w-full h-9 px-3 rounded-lg text-sm text-[--pos-text] placeholder:text-[--pos-text-muted] border border-[--pos-border] focus:outline-none focus:border-[--pos-primary]"
                  style={{ backgroundColor: "#1a1a1a" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[--pos-text-muted]">Code *</label>
                  <input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="CLI-00001"
                    required
                    className="w-full h-9 px-3 rounded-lg text-sm font-mono text-[--pos-text] placeholder:text-[--pos-text-muted] border border-[--pos-border] focus:outline-none focus:border-[--pos-primary]"
                    style={{ backgroundColor: "#1a1a1a" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[--pos-text-muted]">Palier</label>
                  <select
                    value={formPalier}
                    onChange={(e) => setFormPalier(e.target.value as typeof formPalier)}
                    className="w-full h-9 px-3 rounded-lg text-sm text-[--pos-text] border border-[--pos-border] focus:outline-none focus:border-[--pos-primary]"
                    style={{ backgroundColor: "#1a1a1a" }}
                  >
                    <option value="detail">Détail</option>
                    <option value="semi_gros">Semi-gros</option>
                    <option value="gros">Gros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[--pos-text-muted]">Téléphone</label>
                <input
                  value={formTel}
                  onChange={(e) => setFormTel(e.target.value)}
                  placeholder="034 00 000 00"
                  type="tel"
                  className="w-full h-9 px-3 rounded-lg text-sm text-[--pos-text] placeholder:text-[--pos-text-muted] border border-[--pos-border] focus:outline-none focus:border-[--pos-primary]"
                  style={{ backgroundColor: "#1a1a1a" }}
                />
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-9 rounded-lg text-sm font-medium text-[--pos-text-muted] border border-[--pos-border] hover:bg-[--pos-surface-hover] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-9 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {saving ? "Création…" : "Créer et sélectionner"}
                </button>
              </div>
            </form>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
