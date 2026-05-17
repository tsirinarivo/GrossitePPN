"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, CreditCard, Star, X, Search } from "lucide-react";
import { usePOSStore } from "@/store/pos.store";
import type { ClientPOS } from "@/store/pos.store";
import { formatMGA } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CLIENTS_DEMO: ClientPOS[] = [
  {
    id: "c1",
    code: "CLI-001",
    raisonSociale: "Épicerie Rasoamanarivo",
    telephone: "034 12 345 67",
    palier: "semi_gros",
    creditAutorise: true,
    encoursCourant: 150000,
    plafondCredit: 500000,
    pointsFidelite: 1240,
  },
  {
    id: "c2",
    code: "CLI-002",
    raisonSociale: "Supérette Analakely",
    telephone: "033 98 765 43",
    palier: "gros",
    creditAutorise: true,
    encoursCourant: 890000,
    plafondCredit: 2000000,
    pointsFidelite: 5820,
  },
  {
    id: "c3",
    code: "CLI-003",
    raisonSociale: "Particulier",
    telephone: "",
    palier: "detail",
    creditAutorise: false,
    encoursCourant: 0,
    plafondCredit: 0,
    pointsFidelite: 0,
  },
];

const PALIER_LABELS = {
  gros: "Gros",
  semi_gros: "Semi-gros",
  detail: "Détail",
};

const PALIER_VARIANTS = {
  gros: "success",
  semi_gros: "secondary",
  detail: "muted",
} as const;

export function POSClientBar() {
  const { client, setClient } = usePOSStore();
  const [clients, setClients] = useState<ClientPOS[]>([]);
  const [recherche, setRecherche] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        const list: ClientPOS[] = (data.clients ?? data ?? []).map((c: ClientPOS) => ({
          id: c.id,
          code: c.code,
          raisonSociale: c.raisonSociale,
          telephone: c.telephone,
          palier: c.palier,
          creditAutorise: c.creditAutorise,
          encoursCourant: c.encoursCourant,
          plafondCredit: c.plafondCredit,
          pointsFidelite: c.pointsFidelite,
        }));
        setClients(list.length > 0 ? list : CLIENTS_DEMO);
      })
      .catch(() => setClients(CLIENTS_DEMO));
  }, []);

  // Fermer le dropdown au clic extérieur
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
    (c) =>
      !q ||
      c.raisonSociale.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
  );

  const openDropdown = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setDropdownOpen(true);
  };

  const handleSelect = (c: ClientPOS) => {
    setClient(c);
    setRecherche("");
    setDropdownOpen(false);
  };

  const handleDeselect = () => {
    setClient(null);
    setRecherche("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
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
              <span className="text-sm font-semibold text-[--pos-text] truncate">
                {client.raisonSociale}
              </span>
              <Badge variant={PALIER_VARIANTS[client.palier]} className="text-[10px]">
                {PALIER_LABELS[client.palier]}
              </Badge>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[--pos-text-muted]">
              {client.creditAutorise && (
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  Encours: {formatMGA(client.encoursCourant)} / {formatMGA(client.plafondCredit)}
                </span>
              )}
              {client.pointsFidelite > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {client.pointsFidelite} pts
                </span>
              )}
            </div>
          </div>
          <Button
            variant="pos-ghost"
            size="icon-sm"
            onClick={handleDeselect}
            className="shrink-0 text-[--pos-text-muted]"
          >
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

          {/* Dropdown via portal — échappe overflow-hidden du container POS */}
          {mounted && dropdownOpen && clientsFiltres.length > 0 && createPortal(
            <div
              className="border border-[--pos-border] rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
              style={{ ...dropdownStyle, backgroundColor: "#111118" }}
            >
              {clientsFiltres.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="w-7 h-7 rounded-full bg-[--pos-primary]/20 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" style={{ color: "#FF4D00" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[--pos-text] truncate">
                      {c.raisonSociale}
                    </div>
                    <div className="text-[11px] text-[--pos-text-muted]">
                      {c.code} · {PALIER_LABELS[c.palier]}
                    </div>
                  </div>
                  <Badge variant={PALIER_VARIANTS[c.palier]} className="text-[10px] shrink-0">
                    {PALIER_LABELS[c.palier]}
                  </Badge>
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}
