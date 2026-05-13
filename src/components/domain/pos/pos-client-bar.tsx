"use client";

import { useState } from "react";
import { User, CreditCard, Star, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePOSStore } from "@/store/pos.store";
import { formatMGA } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CLIENTS_DEMO = [
  {
    id: "c1",
    code: "CLI-001",
    raisonSociale: "Épicerie Rasoamanarivo",
    telephone: "034 12 345 67",
    palier: "semi_gros" as const,
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
    palier: "gros" as const,
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
    palier: "detail" as const,
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
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[--pos-border] bg-[--pos-surface] shrink-0">
      {client ? (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[--pos-primary]/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[--pos-primary]" />
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
            <div className="flex items-center gap-3 text-[11px] text-[--pos-text-muted]">
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
            onClick={() => setClient(null)}
            className="shrink-0 text-[--pos-text-muted]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-[--pos-text-muted] hover:text-[--pos-text] transition-colors"
        >
          <User className="w-4 h-4" />
          <span>Sélectionner un client</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Mini-modal sélection client */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-[--pos-surface] border border-[--pos-border] rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-[--pos-border]">
              <h3 className="text-sm font-semibold text-[--pos-text]">Sélectionner un client</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {CLIENTS_DEMO.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setClient(c);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[--pos-surface-hover] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[--pos-primary]/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[--pos-primary]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[--pos-text] truncate">
                      {c.raisonSociale}
                    </div>
                    <div className="text-[11px] text-[--pos-text-muted]">
                      {c.code} — {PALIER_LABELS[c.palier]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
